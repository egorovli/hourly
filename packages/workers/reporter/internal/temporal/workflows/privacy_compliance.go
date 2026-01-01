package workflows

import (
	"fmt"
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"

	"hourly/workers/reporter/internal/atlassian"
	"hourly/workers/reporter/internal/domain"
	"hourly/workers/reporter/internal/temporal/activities"
)

// PrivacyComplianceInput contains workflow parameters.
type PrivacyComplianceInput struct {
	// BatchSize is the number of accounts to fetch per page (default: 1000).
	BatchSize int `json:"batchSize,omitempty"`
	// Concurrency is the max parallel account processing operations (default: 10).
	Concurrency int `json:"concurrency,omitempty"`
}

// PrivacyComplianceOutput contains workflow results.
type PrivacyComplianceOutput struct {
	TotalAccountsReported int `json:"totalAccountsReported"`
	AccountsClosed        int `json:"accountsClosed"`
	AccountsRefreshed     int `json:"accountsRefreshed"`
	NewCyclePeriodDays    int `json:"newCyclePeriodDays,omitempty"`
}

// PrivacyCompliance is the main workflow for privacy compliance.
// It runs on a Temporal schedule (default 7 days) and:
// 1. Fetches all accounts to report (paginated)
// 2. Reports accounts to Atlassian in batches of 90
// 3. Processes accounts requiring action in parallel
// 4. Updates schedule if Atlassian returns new cycle period
func PrivacyCompliance(ctx workflow.Context, input PrivacyComplianceInput) (*PrivacyComplianceOutput, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("PrivacyCompliance workflow started")

	if input.BatchSize <= 0 {
		input.BatchSize = 1000
	}
	if input.Concurrency <= 0 {
		input.Concurrency = 10
	}

	// Activity options with retry policy
	activityOpts := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    5 * time.Minute,
			MaximumAttempts:    10,
			NonRetryableErrorTypes: []string{
				"ValidationError",
				"InvalidRequestError",
				"UnauthorizedError",
				"ForbiddenError",
			},
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOpts)

	output := &PrivacyComplianceOutput{}
	var latestCyclePeriod int

	// Ensure access token is available before proceeding.
	var tokenMeta activities.EnsureAccessTokenOutput
	if err := workflow.ExecuteActivity(ctx, "EnsureAccessToken", nil).Get(ctx, &tokenMeta); err != nil {
		return nil, fmt.Errorf("access token unavailable: %w", err)
	}

	// Collect all accounts to report
	var allAccounts []domain.Account
	offset := 0

	for {
		var getResult activities.GetAccountsToReportOutput
		err := workflow.ExecuteActivity(ctx, "GetAccountsToReport", &activities.GetAccountsToReportInput{
			Limit:  input.BatchSize,
			Offset: offset,
		}).Get(ctx, &getResult)
		if err != nil {
			return nil, fmt.Errorf("failed to get accounts: %w", err)
		}

		allAccounts = append(allAccounts, getResult.Accounts...)
		logger.Info("Fetched accounts page", "count", len(getResult.Accounts), "total", len(allAccounts))

		if !getResult.HasMore {
			break
		}
		offset += input.BatchSize
	}

	if len(allAccounts) == 0 {
		logger.Info("No accounts to report")
		return output, nil
	}

	// Collect accounts requiring action
	var accountsToClose []string
	var accountsToRefresh []string
	var reportedAccountIDs []string

	// Process accounts in batches of 90
	for i := 0; i < len(allAccounts); i += atlassian.MaxAccountsPerBatch {
		end := i + atlassian.MaxAccountsPerBatch
		if end > len(allAccounts) {
			end = len(allAccounts)
		}
		batch := allAccounts[i:end]

		var reportResult activities.ReportAccountsBatchOutput
		err := workflow.ExecuteActivity(ctx, "ReportAccountsBatch", &activities.ReportAccountsBatchInput{
			Accounts: batch,
		}).Get(ctx, &reportResult)
		if err != nil {
			logger.Error("Failed to report batch", "error", err, "batchStart", i)
			continue // Continue with other batches
		}

		// Track reported accounts
		for _, acc := range batch {
			reportedAccountIDs = append(reportedAccountIDs, acc.AccountID)
		}
		output.TotalAccountsReported += len(batch)

		// Update cycle period if returned
		if reportResult.CyclePeriodDays > 0 {
			latestCyclePeriod = reportResult.CyclePeriodDays
		}

		// Collect accounts requiring action
		accountsToClose = append(accountsToClose, reportResult.AccountsToClose...)
		accountsToRefresh = append(accountsToRefresh, reportResult.AccountsToRefresh...)
	}

	// Process accounts in parallel with concurrency limit
	if len(accountsToClose) > 0 || len(accountsToRefresh) > 0 {
		closedCount, refreshedCount := processAccountsParallel(
			ctx, logger, accountsToClose, accountsToRefresh, input.Concurrency,
		)
		output.AccountsClosed = closedCount
		output.AccountsRefreshed = refreshedCount
	}

	// Update reported accounts in registry
	if len(reportedAccountIDs) > 0 {
		err := workflow.ExecuteActivity(ctx, "UpdateReportedAccounts", &activities.UpdateReportedAccountsInput{
			AccountIDs: reportedAccountIDs,
		}).Get(ctx, nil)
		if err != nil {
			logger.Error("Failed to update reported accounts", "error", err)
		}
	}

	// Update schedule if cycle period changed
	if latestCyclePeriod > 0 {
		output.NewCyclePeriodDays = latestCyclePeriod
		err := workflow.ExecuteActivity(ctx, "UpdateSchedule", &activities.UpdateScheduleInput{
			IntervalDays: latestCyclePeriod,
		}).Get(ctx, nil)
		if err != nil {
			logger.Error("Failed to update schedule", "error", err)
		}
	}

	logger.Info("PrivacyCompliance workflow completed",
		"totalReported", output.TotalAccountsReported,
		"closed", output.AccountsClosed,
		"refreshed", output.AccountsRefreshed)

	return output, nil
}

// accountTask represents a task to process an account.
type accountTask struct {
	accountID string
	isClose   bool // true = delete, false = refresh
}

// processAccountsParallel processes accounts with a concurrency limit using semaphore pattern.
func processAccountsParallel(
	ctx workflow.Context,
	logger interface{ Error(string, ...interface{}) },
	toClose, toRefresh []string,
	concurrency int,
) (closedCount, refreshedCount int) {
	totalTasks := len(toClose) + len(toRefresh)
	if totalTasks == 0 {
		return 0, 0
	}

	// Create semaphore and result channels
	sem := workflow.NewBufferedChannel(ctx, concurrency)
	resultCh := workflow.NewBufferedChannel(ctx, totalTasks)

	// Fill semaphore with tokens
	for range concurrency {
		sem.Send(ctx, struct{}{})
	}

	// Build task list
	var tasks []accountTask
	for _, id := range toClose {
		tasks = append(tasks, accountTask{accountID: id, isClose: true})
	}
	for _, id := range toRefresh {
		tasks = append(tasks, accountTask{accountID: id, isClose: false})
	}

	// Launch goroutines for each task
	for _, task := range tasks {
		task := task // capture for closure
		workflow.Go(ctx, func(gCtx workflow.Context) {
			// Acquire semaphore
			var token struct{}
			sem.Receive(gCtx, &token)
			defer sem.Send(gCtx, token) // Release

			var err error
			if task.isClose {
				err = workflow.ExecuteActivity(gCtx, "DeleteUserData", &activities.DeleteUserDataInput{
					AccountID: task.accountID,
				}).Get(gCtx, nil)
			} else {
				err = workflow.ExecuteActivity(gCtx, "RefreshUserData", &activities.RefreshUserDataInput{
					AccountID: task.accountID,
				}).Get(gCtx, nil)
			}

			// Send result: nil for success, error for failure
			resultCh.Send(gCtx, accountTaskResult{task: task, err: err})
		})
	}

	// Wait for all results
	for range totalTasks {
		var result accountTaskResult
		resultCh.Receive(ctx, &result)
		if result.err != nil {
			logger.Error("Account processing failed",
				"accountId", result.task.accountID,
				"isClose", result.task.isClose,
				"error", result.err)
		} else {
			if result.task.isClose {
				closedCount++
			} else {
				refreshedCount++
			}
		}
	}

	return closedCount, refreshedCount
}

// accountTaskResult holds the result of processing an account.
type accountTaskResult struct {
	task accountTask
	err  error
}

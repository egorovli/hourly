package activities

import (
	"context"
	"errors"

	"go.temporal.io/sdk/temporal"

	"hourly/workers/reporter/internal/atlassian"
	"hourly/workers/reporter/internal/domain"
)

// ReportAccountsBatchInput contains accounts to report (max 90).
type ReportAccountsBatchInput struct {
	Accounts []domain.Account `json:"accounts"`
}

// ReportAccountsBatchOutput contains the API response.
type ReportAccountsBatchOutput struct {
	AccountsToClose   []string `json:"accountsToClose,omitempty"`
	AccountsToRefresh []string `json:"accountsToRefresh,omitempty"`
	CyclePeriodDays   int      `json:"cyclePeriodDays,omitempty"`
	NoActionRequired  bool     `json:"noActionRequired"`
}

// ReportAccountsBatch reports a batch of accounts (max 90) to Atlassian.
func (a *Activities) ReportAccountsBatch(ctx context.Context, input *ReportAccountsBatchInput) (*ReportAccountsBatchOutput, error) {
	if len(input.Accounts) > atlassian.MaxAccountsPerBatch {
		return nil, temporal.NewNonRetryableApplicationError(
			"batch size exceeds maximum",
			"ValidationError",
			nil,
		)
	}

	result, err := a.atlassian.ReportAccounts(ctx, input.Accounts)
	if err != nil {
		// Handle rate limiting - return retryable error
		var rateLimitErr *domain.ErrRateLimited
		if errors.As(err, &rateLimitErr) {
			return nil, temporal.NewApplicationError(
				err.Error(),
				"RateLimitedError",
				err,
			)
		}

		// Handle non-retryable errors
		var invalidErr *domain.ErrInvalidRequest
		if errors.As(err, &invalidErr) {
			return nil, temporal.NewNonRetryableApplicationError(
				err.Error(),
				"InvalidRequestError",
				err,
			)
		}

		var forbiddenErr *domain.ErrForbidden
		if errors.As(err, &forbiddenErr) {
			return nil, temporal.NewNonRetryableApplicationError(
				err.Error(),
				"ForbiddenError",
				err,
			)
		}

		// Other errors are retryable by default
		return nil, err
	}

	output := &ReportAccountsBatchOutput{
		CyclePeriodDays:  result.CyclePeriodDays,
		NoActionRequired: result.NoActionRequired,
	}

	if result.Response != nil {
		for _, acc := range result.Response.Accounts {
			switch acc.Status {
			case domain.AccountStatusClosed:
				output.AccountsToClose = append(output.AccountsToClose, acc.AccountID)
			case domain.AccountStatusUpdated:
				output.AccountsToRefresh = append(output.AccountsToRefresh, acc.AccountID)
			}
		}
	}

	return output, nil
}

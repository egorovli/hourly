package activities

import (
	"context"

	"hourly/workers/reporter/internal/domain"
	"hourly/workers/reporter/internal/store"
)

// GetAccountsToReportInput contains pagination parameters.
type GetAccountsToReportInput struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// GetAccountsToReportOutput contains accounts and pagination info.
type GetAccountsToReportOutput struct {
	Accounts   []domain.Account `json:"accounts"`
	TotalCount int              `json:"totalCount"`
	HasMore    bool             `json:"hasMore"`
}

// GetAccountsToReport fetches accounts that need to be reported.
func (a *Activities) GetAccountsToReport(ctx context.Context, input *GetAccountsToReportInput) (*GetAccountsToReportOutput, error) {
	result, err := a.store.UserData().GetAccountsToReport(ctx, &store.GetAccountsToReportInput{
		Limit:  input.Limit,
		Offset: input.Offset,
	})
	if err != nil {
		return nil, err
	}

	return &GetAccountsToReportOutput{
		Accounts:   result.Accounts,
		TotalCount: result.TotalCount,
		HasMore:    result.HasMore,
	}, nil
}

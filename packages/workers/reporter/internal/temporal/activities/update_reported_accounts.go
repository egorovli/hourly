package activities

import (
	"context"
	"time"

	"hourly/workers/reporter/internal/store"
)

// UpdateReportedAccountsInput contains account IDs to mark as reported.
type UpdateReportedAccountsInput struct {
	AccountIDs []string `json:"accountIds"`
}

// UpdateReportedAccounts marks accounts as reported at the current time.
func (a *Activities) UpdateReportedAccounts(ctx context.Context, input *UpdateReportedAccountsInput) error {
	return a.store.UserData().UpdateLastReported(ctx, &store.UpdateLastReportedInput{
		AccountIDs: input.AccountIDs,
		ReportedAt: time.Now().UTC(),
	})
}

package store

import (
	"context"
	"time"

	"hourly/workers/reporter/internal/domain"
)

// GetAccountsToReportInput contains parameters for fetching accounts to report.
type GetAccountsToReportInput struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// GetAccountsToReportOutput contains the paginated result.
type GetAccountsToReportOutput struct {
	Accounts   []domain.Account `json:"accounts"`
	TotalCount int              `json:"totalCount"`
	HasMore    bool             `json:"hasMore"`
}

// UpdateLastReportedInput contains parameters for updating report timestamps.
type UpdateLastReportedInput struct {
	AccountIDs []string  `json:"accountIds"`
	ReportedAt time.Time `json:"reportedAt"`
}

// DeleteUserDataInput contains parameters for deleting user data.
type DeleteUserDataInput struct {
	AccountID string `json:"accountId"`
}

// DeleteUserDataOutput contains the result of user data deletion.
type DeleteUserDataOutput struct {
	DeletedAt    string `json:"deletedAt"`
	ItemsDeleted int    `json:"itemsDeleted"`
}

// RefreshUserDataInput contains parameters for refreshing user data.
type RefreshUserDataInput struct {
	AccountID string `json:"accountId"`
}

// RefreshUserDataOutput contains the result of user data refresh.
type RefreshUserDataOutput struct {
	RefreshedAt  string `json:"refreshedAt"`
	ItemsUpdated int    `json:"itemsUpdated"`
}

// UserDataStore manages user data and account registry for privacy compliance.
type UserDataStore interface {
	// GetAccountsToReport returns accounts that need to be reported.
	// Accounts are selected based on:
	// - Never reported before, OR
	// - Last reported before (now - cycle period)
	GetAccountsToReport(ctx context.Context, input *GetAccountsToReportInput) (*GetAccountsToReportOutput, error)

	// UpdateLastReported marks accounts as reported at the given timestamp.
	UpdateLastReported(ctx context.Context, input *UpdateLastReportedInput) error

	// DeleteUserData removes all personal data for the given account.
	// Called when account status is "closed".
	DeleteUserData(ctx context.Context, input *DeleteUserDataInput) (*DeleteUserDataOutput, error)

	// RefreshUserData re-fetches and updates user data for the given account.
	// Called when account status is "updated".
	RefreshUserData(ctx context.Context, input *RefreshUserDataInput) (*RefreshUserDataOutput, error)
}

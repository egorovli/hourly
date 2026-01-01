package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"hourly/workers/reporter/internal/atlassian"
	"hourly/workers/reporter/internal/domain"
	"hourly/workers/reporter/internal/store"
)

type UserDataStore struct {
	db *sqlx.DB
}

const (
	defaultAccountsPage = 1000
)

const (
	countAccountsQuery = `
SELECT
	COUNT(*)
FROM
	profiles
WHERE
	provider = $1
	AND deleted_at IS NULL
	AND (
		reported_at IS NULL
		OR reported_at <= $2
	)`

	selectAccountsQuery = `
SELECT
	id AS account_id,
	updated_at
FROM
	profiles
WHERE
	provider = $1
	AND deleted_at IS NULL
	AND (
		reported_at IS NULL
		OR reported_at <= $2
	)
ORDER BY
	updated_at DESC,
	id
LIMIT $3
OFFSET $4`

	updateReportedAtQuery = `
UPDATE
	profiles
SET
	reported_at = $1
WHERE
	provider = $2
	AND id = ANY($3)
	AND deleted_at IS NULL`

	deleteTokensQuery = `
DELETE FROM
	tokens
WHERE
	provider = $1
	AND profile_id = $2`

	softDeleteAccountQuery = `
UPDATE
	profiles
SET
	data = NULL,
	reported_at = $3,
	deleted_at = $3,
	updated_at = now()
WHERE
	provider = $2
	AND id = $1`

	refreshAccountQuery = `
UPDATE
	profiles
SET
	updated_at = $1
WHERE
	provider = $2
	AND id = $3
	AND deleted_at IS NULL`
)

func (s *Store) UserData() store.UserDataStore {
	return s.userData
}

func (s *UserDataStore) GetAccountsToReport(ctx context.Context, input *store.GetAccountsToReportInput) (*store.GetAccountsToReportOutput, error) {
	if s.db == nil {
		return nil, fmt.Errorf("store not opened")
	}

	limit := defaultAccountsPage
	offset := 0

	if input != nil {
		if input.Limit > 0 {
			limit = input.Limit
		}
		if input.Offset > 0 {
			offset = input.Offset
		}
	}

	cutoff := time.Now().UTC().Add(-time.Duration(atlassian.DefaultCyclePeriodDays) * 24 * time.Hour)

	var total int
	if err := s.db.GetContext(ctx, &total, countAccountsQuery, store.ProviderAtlassian, cutoff); err != nil {
		return nil, fmt.Errorf("count accounts to report: %w", err)
	}

	var rows []struct {
		AccountID string    `db:"account_id"`
		UpdatedAt time.Time `db:"updated_at"`
	}

	if err := s.db.SelectContext(ctx, &rows, selectAccountsQuery, store.ProviderAtlassian, cutoff, limit, offset); err != nil {
		return nil, fmt.Errorf("list accounts to report: %w", err)
	}

	accounts := make([]domain.Account, 0, len(rows))
	for _, row := range rows {
		accounts = append(accounts, domain.Account{
			AccountID: row.AccountID,
			UpdatedAt: row.UpdatedAt,
		})
	}

	hasMore := offset+len(accounts) < total

	return &store.GetAccountsToReportOutput{
		Accounts:   accounts,
		TotalCount: total,
		HasMore:    hasMore,
	}, nil
}

func (s *UserDataStore) UpdateLastReported(ctx context.Context, input *store.UpdateLastReportedInput) error {
	if s.db == nil {
		return fmt.Errorf("store not opened")
	}

	if input == nil || len(input.AccountIDs) == 0 {
		return nil
	}

	if _, err := s.db.ExecContext(
		ctx,
		updateReportedAtQuery,
		input.ReportedAt.UTC(),
		store.ProviderAtlassian,
		pq.Array(input.AccountIDs),
	); err != nil {
		return fmt.Errorf("update reported_at: %w", err)
	}

	return nil
}

func (s *UserDataStore) DeleteUserData(ctx context.Context, input *store.DeleteUserDataInput) (*store.DeleteUserDataOutput, error) {
	now := time.Now().UTC()

	if s.db == nil {
		return nil, fmt.Errorf("store not opened")
	}

	if input == nil || input.AccountID == "" {
		return &store.DeleteUserDataOutput{
			DeletedAt:    now.Format(time.RFC3339),
			ItemsDeleted: 0,
		}, nil
	}

	var itemsDeleted int

	if tokenResult, err := s.db.ExecContext(ctx, deleteTokensQuery, store.ProviderAtlassian, input.AccountID); err == nil {
		if rows, _ := tokenResult.RowsAffected(); rows > 0 {
			itemsDeleted += int(rows)
		}
	} else {
		return nil, fmt.Errorf("delete tokens for account %s: %w", input.AccountID, err)
	}

	profileResult, err := s.db.ExecContext(ctx, softDeleteAccountQuery, input.AccountID, store.ProviderAtlassian, now)
	if err != nil {
		return nil, fmt.Errorf("soft delete account %s: %w", input.AccountID, err)
	}
	if rows, _ := profileResult.RowsAffected(); rows > 0 {
		itemsDeleted += int(rows)
	}

	return &store.DeleteUserDataOutput{
		DeletedAt:    now.Format(time.RFC3339),
		ItemsDeleted: itemsDeleted,
	}, nil
}

func (s *UserDataStore) RefreshUserData(ctx context.Context, input *store.RefreshUserDataInput) (*store.RefreshUserDataOutput, error) {
	now := time.Now().UTC()

	if s.db == nil {
		return nil, fmt.Errorf("store not opened")
	}

	if input == nil || input.AccountID == "" {
		return &store.RefreshUserDataOutput{
			RefreshedAt:  now.Format(time.RFC3339),
			ItemsUpdated: 0,
		}, nil
	}

	result, err := s.db.ExecContext(ctx, refreshAccountQuery, now, store.ProviderAtlassian, input.AccountID)
	if err != nil {
		return nil, fmt.Errorf("refresh account %s: %w", input.AccountID, err)
	}

	rows, _ := result.RowsAffected()

	return &store.RefreshUserDataOutput{
		RefreshedAt:  now.Format(time.RFC3339),
		ItemsUpdated: int(rows),
	}, nil
}

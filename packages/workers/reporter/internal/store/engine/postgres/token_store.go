package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"hourly/workers/reporter/internal/store"
)

type TokenStore struct {
	db *sqlx.DB
}

const getTokenQuery = `
SELECT
	t.access_token,
	t.refresh_token,
	t.expires_at,
	t.scopes
FROM
	tokens t
	JOIN profiles p ON p.id = t.profile_id AND p.provider = t.provider
WHERE
	t.profile_id = $1
	AND t.provider = $2
	AND p.deleted_at IS NULL`

const getRefreshableTokenQuery = `
SELECT
	t.access_token,
	t.refresh_token,
	t.expires_at,
	t.scopes
FROM
	tokens t
	JOIN profiles p ON p.id = t.profile_id AND p.provider = t.provider
WHERE
	t.profile_id = $1
	AND t.provider = $2
	AND p.deleted_at IS NULL
	AND t.refresh_token IS NOT NULL
	AND t.refresh_token <> ''`

const updateTokenQuery = `
UPDATE
	tokens
SET
	access_token = $1,
	refresh_token = $2,
	expires_at = $3,
	scopes = $4,
	updated_at = now()
WHERE
	profile_id = $5
	AND provider = $6`

func (s *TokenStore) GetToken(ctx context.Context, input *store.GetTokenInput) (*store.Token, error) {
	return s.fetchToken(ctx, getTokenQuery, input)
}

func (s *TokenStore) GetRefreshableToken(ctx context.Context, input *store.GetTokenInput) (*store.Token, error) {
	return s.fetchToken(ctx, getRefreshableTokenQuery, input)
}

func (s *TokenStore) fetchToken(ctx context.Context, query string, input *store.GetTokenInput) (*store.Token, error) {
	if s.db == nil {
		return nil, fmt.Errorf("store not opened")
	}

	if input == nil || input.ProfileID == "" || input.Provider == "" {
		return nil, fmt.Errorf("profile id and provider are required")
	}

	var row struct {
		AccessToken  string         `db:"access_token"`
		RefreshToken sql.NullString `db:"refresh_token"`
		ExpiresAt    sql.NullTime   `db:"expires_at"`
		Scopes       pq.StringArray `db:"scopes"`
	}

	err := s.db.GetContext(ctx, &row, query, input.ProfileID, input.Provider)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get token: %w", err)
	}

	var expires *time.Time
	if row.ExpiresAt.Valid {
		expires = &row.ExpiresAt.Time
	}

	return &store.Token{
		ProfileID:    input.ProfileID,
		Provider:     input.Provider,
		AccessToken:  row.AccessToken,
		RefreshToken: row.RefreshToken.String,
		ExpiresAt:    expires,
		Scopes:       row.Scopes,
	}, nil
}

func (s *TokenStore) UpdateToken(ctx context.Context, input *store.UpdateTokenInput) error {
	if s.db == nil {
		return fmt.Errorf("store not opened")
	}

	if input == nil {
		return fmt.Errorf("input is required")
	}

	if input.ProfileID == "" || input.Provider == "" || input.AccessToken == "" {
		return fmt.Errorf("profile id, provider, and access token are required")
	}

	refresh := sql.NullString{String: input.RefreshToken, Valid: input.RefreshToken != ""}
	var expires sql.NullTime
	if input.ExpiresAt != nil {
		expires = sql.NullTime{Time: input.ExpiresAt.UTC(), Valid: true}
	}

	result, err := s.db.ExecContext(
		ctx,
		updateTokenQuery,
		input.AccessToken,
		refresh,
		expires,
		pq.StringArray(input.Scopes),
		input.ProfileID,
		input.Provider,
	)
	if err != nil {
		return fmt.Errorf("update token: %w", err)
	}

	rows, err := result.RowsAffected()
	if err == nil && rows == 0 {
		return fmt.Errorf("token not found for profile %s and provider %s", input.ProfileID, input.Provider)
	}

	return nil
}

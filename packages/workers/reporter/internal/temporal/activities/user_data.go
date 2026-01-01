package activities

import (
	"context"

	"hourly/workers/reporter/internal/store"
)

// DeleteUserDataInput contains the account ID.
type DeleteUserDataInput struct {
	AccountID string `json:"accountId"`
}

// DeleteUserDataOutput contains deletion results.
type DeleteUserDataOutput struct {
	DeletedAt    string `json:"deletedAt"`
	ItemsDeleted int    `json:"itemsDeleted"`
}

// DeleteUserData removes all personal data for an account.
func (a *Activities) DeleteUserData(ctx context.Context, input *DeleteUserDataInput) (*DeleteUserDataOutput, error) {
	result, err := a.store.UserData().DeleteUserData(ctx, &store.DeleteUserDataInput{
		AccountID: input.AccountID,
	})
	if err != nil {
		return nil, err
	}
	return &DeleteUserDataOutput{
		DeletedAt:    result.DeletedAt,
		ItemsDeleted: result.ItemsDeleted,
	}, nil
}

// RefreshUserDataInput contains the account ID.
type RefreshUserDataInput struct {
	AccountID string `json:"accountId"`
}

// RefreshUserDataOutput contains refresh results.
type RefreshUserDataOutput struct {
	RefreshedAt  string `json:"refreshedAt"`
	ItemsUpdated int    `json:"itemsUpdated"`
}

// RefreshUserData re-fetches and updates user data for an account.
func (a *Activities) RefreshUserData(ctx context.Context, input *RefreshUserDataInput) (*RefreshUserDataOutput, error) {
	result, err := a.store.UserData().RefreshUserData(ctx, &store.RefreshUserDataInput{
		AccountID: input.AccountID,
	})
	if err != nil {
		return nil, err
	}
	return &RefreshUserDataOutput{
		RefreshedAt:  result.RefreshedAt,
		ItemsUpdated: result.ItemsUpdated,
	}, nil
}

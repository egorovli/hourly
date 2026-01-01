package store

import (
	"context"
)

// Store provides access to all data stores.
type Store interface {
	Open(ctx context.Context) error
	Close(ctx context.Context) error

	UserData() UserDataStore
	Tokens() TokenStore
}

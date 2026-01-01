package postgres

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"hourly/workers/reporter/internal/store"
)

type Store struct {
	db *sqlx.DB

	dsn                string
	maxIdleConnections int
	maxOpenConnections int

	userData *UserDataStore
	tokens   *TokenStore
}

type Options struct {
	Connection         string
	MaxIdleConnections int
	MaxOpenConnections int
}

func New(opts Options) (*Store, error) {
	if opts.Connection == "" {
		return nil, fmt.Errorf("postgres connection string is required")
	}

	return &Store{
		dsn:                opts.Connection,
		maxIdleConnections: opts.MaxIdleConnections,
		maxOpenConnections: opts.MaxOpenConnections,
		userData:           &UserDataStore{},
	}, nil
}

func (s *Store) Open(ctx context.Context) error {
	if s.db != nil {
		return nil
	}

	db, err := sqlx.ConnectContext(ctx, "postgres", s.dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres: %w", err)
	}

	if s.maxIdleConnections > 0 {
		db.SetMaxIdleConns(s.maxIdleConnections)
	}
	if s.maxOpenConnections > 0 {
		db.SetMaxOpenConns(s.maxOpenConnections)
	}

	s.db = db
	s.userData = &UserDataStore{db: db}
	s.tokens = &TokenStore{db: db}

	return nil
}

func (s *Store) Close(ctx context.Context) error {
	if s.db == nil {
		return nil
	}

	ch := make(chan error, 1)

	go func() {
		ch <- s.db.Close()
	}()

	select {
	case err := <-ch:
		if err == nil {
			s.db = nil
			s.userData = &UserDataStore{}
			s.tokens = &TokenStore{}
		}
		return err

	case <-ctx.Done():
		return ctx.Err()
	}
}

func (s *Store) Tokens() store.TokenStore {
	return s.tokens
}

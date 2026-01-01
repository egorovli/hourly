package activities

import (
	"go.temporal.io/sdk/client"

	"hourly/workers/reporter/internal/atlassian"
	"hourly/workers/reporter/internal/store"
)

// Activities contains all activity implementations for privacy compliance.
type Activities struct {
	store             store.Store
	temporal          client.Client
	atlassian         *atlassian.Client
	scheduleID        string
	ownerProfileID    string
	oauthClientID     string
	oauthClientSecret string
	oauthCallbackURL  string
}

// CreateActivitiesOptions contains dependencies for creating activities.
type CreateActivitiesOptions struct {
	Store             store.Store
	Temporal          client.Client
	Atlassian         *atlassian.Client
	ScheduleID        string
	OwnerProfileID    string
	OAuthClientID     string
	OAuthClientSecret string
	OAuthCallbackURL  string
}

// New creates a new Activities instance with the given dependencies.
func New(options *CreateActivitiesOptions) *Activities {
	return &Activities{
		store:             options.Store,
		atlassian:         options.Atlassian,
		temporal:          options.Temporal,
		scheduleID:        options.ScheduleID,
		ownerProfileID:    options.OwnerProfileID,
		oauthClientID:     options.OAuthClientID,
		oauthClientSecret: options.OAuthClientSecret,
		oauthCallbackURL:  options.OAuthCallbackURL,
	}
}

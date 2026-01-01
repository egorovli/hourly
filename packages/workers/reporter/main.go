package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/caarlos0/env/v11"
	enumspb "go.temporal.io/api/enums/v1"
	"go.temporal.io/api/serviceerror"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	_ "github.com/joho/godotenv/autoload"

	"hourly/workers/reporter/internal/atlassian"
	"hourly/workers/reporter/internal/store"
	"hourly/workers/reporter/internal/store/engine/postgres"
	"hourly/workers/reporter/internal/temporal/activities"
	"hourly/workers/reporter/internal/temporal/workflows"
)

type Config struct {
	Temporal struct {
		Address    string `env:"TEMPORAL_ADDRESS" envDefault:"localhost:7233"`
		TaskQueue  string `env:"TEMPORAL_TASK_QUEUE" envDefault:"privacy-compliance"`
		Namespace  string `env:"TEMPORAL_NAMESPACE" envDefault:"default"`
		ScheduleID string `env:"TEMPORAL_SCHEDULE_ID" envDefault:"privacy-compliance-schedule"`

		// TokenRefreshScheduleID is the schedule id for the owner access token refresh workflow.
		TokenRefreshScheduleID string `env:"TEMPORAL_TOKEN_REFRESH_SCHEDULE_ID" envDefault:"atlassian-token-refresh-schedule"`
		// TokenRefreshInterval controls how often the refresh workflow fires.
		TokenRefreshInterval time.Duration `env:"ATLASSIAN_TOKEN_REFRESH_INTERVAL" envDefault:"15m"`
	}

	Postgres struct {
		Connection string `env:"DATABASE_URL" envDefault:"postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"`
	}

	Atlassian struct {
		OwnerProfileID    string `env:"ATLASSIAN_OWNER_PROFILE_ID"`
		BaseURL           string `env:"ATLASSIAN_BASE_URL" envDefault:"https://api.atlassian.com"`
		OAuthClientID     string `env:"OAUTH_ATLASSIAN_CLIENT_ID"`
		OAuthClientSecret string `env:"OAUTH_ATLASSIAN_CLIENT_SECRET"`
		OAuthCallbackURL  string `env:"OAUTH_ATLASSIAN_CALLBACK_URL"`
	}
}

func ensureSchedule(ctx context.Context, scheduleClient client.ScheduleClient, opts client.ScheduleOptions) error {
	_, err := scheduleClient.Create(ctx, opts)
	if err == nil {
		return nil
	}

	handle := scheduleClient.GetHandle(ctx, opts.ID)

	update := func() error {
		return handle.Update(ctx, client.ScheduleUpdateOptions{
			DoUpdate: func(in client.ScheduleUpdateInput) (*client.ScheduleUpdate, error) {
				schedule := in.Description.Schedule

				schedule.Action = opts.Action
				schedule.Spec = &opts.Spec

				if schedule.Policy == nil {
					schedule.Policy = &client.SchedulePolicies{}
				}

				if opts.Overlap != 0 {
					schedule.Policy.Overlap = opts.Overlap
				}

				if opts.CatchupWindow != 0 {
					schedule.Policy.CatchupWindow = opts.CatchupWindow
				}

				schedule.Policy.PauseOnFailure = opts.PauseOnFailure

				if schedule.State == nil {
					schedule.State = &client.ScheduleState{}
				}

				schedule.State.Paused = false

				if opts.Note != "" {
					schedule.State.Note = opts.Note
				}

				if opts.RemainingActions > 0 {
					schedule.State.LimitedActions = true
					schedule.State.RemainingActions = opts.RemainingActions
				} else {
					schedule.State.LimitedActions = false
					schedule.State.RemainingActions = 0
				}

				return &client.ScheduleUpdate{
					Schedule: &schedule,
				}, nil
			},
		})
	}

	if err := update(); err == nil {
		return nil
	} else {
		var notFound *serviceerror.NotFound
		if errors.As(err, &notFound) {
			// Schedule vanished between create and update attempts; recreate.
			if _, createErr := scheduleClient.Create(ctx, opts); createErr == nil {
				return nil
			}
			return fmt.Errorf("recreate schedule %s after not found: %w", opts.ID, err)
		}

		return fmt.Errorf("update schedule %s: %w", opts.ID, err)
	}
}

func main() {
	ctx := context.Background()

	cfg, err := env.ParseAs[Config]()
	if err != nil {
		log.Fatalln("Unable to parse config", err)
	}

	co := client.Options{
		HostPort:  cfg.Temporal.Address,
		Namespace: cfg.Temporal.Namespace,
	}

	c, err := client.Dial(co)
	if err != nil {
		log.Fatalln("Unable to create client", err)
	}

	defer c.Close()

	st, err := postgres.New(postgres.Options{
		Connection: cfg.Postgres.Connection,
	})
	if err != nil {
		log.Fatalln("Unable to create store", err)
	}

	if err := st.Open(ctx); err != nil {
		log.Fatalln("Unable to open store", err)
	}
	defer st.Close(ctx)

	if cfg.Atlassian.OwnerProfileID == "" {
		log.Fatalln("ATLASSIAN_OWNER_PROFILE_ID is required")
	}

	if cfg.Atlassian.OAuthClientID == "" || cfg.Atlassian.OAuthClientSecret == "" || cfg.Atlassian.OAuthCallbackURL == "" {
		log.Fatalln("OAUTH_ATLASSIAN_CLIENT_ID, OAUTH_ATLASSIAN_CLIENT_SECRET, and OAUTH_ATLASSIAN_CALLBACK_URL are required")
	}

	tokenProvider := atlassian.NewTokenProvider(atlassian.TokenProviderOptions{
		GetToken: func(ctx context.Context) (string, error) {
			token, err := st.Tokens().GetToken(ctx, &store.GetTokenInput{
				ProfileID: cfg.Atlassian.OwnerProfileID,
				Provider:  store.ProviderAtlassian,
			})
			if err != nil {
				return "", err
			}
			if token == nil || token.AccessToken == "" {
				return "", fmt.Errorf("access token not found for profile %s", cfg.Atlassian.OwnerProfileID)
			}
			if token.ExpiresAt != nil && token.ExpiresAt.Before(time.Now().UTC()) {
				return "", fmt.Errorf("access token expired at %s", token.ExpiresAt)
			}

			return token.AccessToken, nil
		},
	})

	atl, err := atlassian.New(atlassian.Options{
		TokenProvider: tokenProvider,
		BaseURL:       cfg.Atlassian.BaseURL,
	})
	if err != nil {
		log.Fatalln("Unable to create Atlassian client", err)
	}

	// Create activities with Temporal client for schedule updates
	act := activities.New(&activities.CreateActivitiesOptions{
		// Store and Atlassian client would be injected here
		Store:             st,
		Atlassian:         atl,
		Temporal:          c,
		ScheduleID:        cfg.Temporal.ScheduleID,
		OwnerProfileID:    cfg.Atlassian.OwnerProfileID,
		OAuthClientID:     cfg.Atlassian.OAuthClientID,
		OAuthClientSecret: cfg.Atlassian.OAuthClientSecret,
		OAuthCallbackURL:  cfg.Atlassian.OAuthCallbackURL,
	})

	scheduleClient := c.ScheduleClient()

	if err := ensureSchedule(ctx, scheduleClient, client.ScheduleOptions{
		ID: cfg.Temporal.ScheduleID,
		Spec: client.ScheduleSpec{
			Intervals: []client.ScheduleIntervalSpec{{
				Every: time.Duration(atlassian.DefaultCyclePeriodDays) * 24 * time.Hour,
			}},
		},
		Action: &client.ScheduleWorkflowAction{
			ID:        "privacy-compliance",
			Workflow:  workflows.PrivacyCompliance,
			TaskQueue: cfg.Temporal.TaskQueue,
			Args:      []any{workflows.PrivacyComplianceInput{}},
		},
	}); err != nil {
		log.Fatalln("Unable to ensure privacy compliance schedule", err)
	}

	refreshInterval := cfg.Temporal.TokenRefreshInterval
	if refreshInterval <= 0 {
		refreshInterval = time.Hour
	}

	if err := ensureSchedule(ctx, scheduleClient, client.ScheduleOptions{
		ID: cfg.Temporal.TokenRefreshScheduleID,
		Spec: client.ScheduleSpec{
			Intervals: []client.ScheduleIntervalSpec{{
				Every: refreshInterval,
			}},
		},
		Action: &client.ScheduleWorkflowAction{
			ID:        "owner-token-refresh",
			Workflow:  workflows.RefreshOwnerAccessToken,
			TaskQueue: cfg.Temporal.TaskQueue,
			Args:      []any{workflows.RefreshOwnerTokenInput{}},
		},
		Overlap:       enumspb.SCHEDULE_OVERLAP_POLICY_SKIP,
		CatchupWindow: refreshInterval,
		Note:          "refresh Atlassian owner access token",
	}); err != nil {
		log.Fatalln("Unable to ensure owner token refresh schedule", err)
	}

	w := worker.New(c, cfg.Temporal.TaskQueue, worker.Options{})

	// Register workflow
	w.RegisterWorkflow(workflows.PrivacyCompliance)
	w.RegisterWorkflow(workflows.RefreshOwnerAccessToken)

	// Register activities
	w.RegisterActivity(act.GetAccountsToReport)
	w.RegisterActivity(act.ReportAccountsBatch)
	w.RegisterActivity(act.UpdateReportedAccounts)
	w.RegisterActivity(act.DeleteUserData)
	w.RegisterActivity(act.RefreshUserData)
	w.RegisterActivity(act.UpdateSchedule)
	w.RegisterActivity(act.EnsureAccessToken)
	w.RegisterActivity(act.DescribeRefreshableOwnerToken)
	w.RegisterActivity(act.RefreshOwnerAccessToken)

	err = w.Run(worker.InterruptCh())

	if err != nil {
		log.Fatalln("Unable to start worker", err)
	}
}

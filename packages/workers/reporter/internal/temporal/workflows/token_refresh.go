package workflows

import (
	"fmt"
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"

	"hourly/workers/reporter/internal/temporal/activities"
)

// RefreshOwnerTokenInput configures the refresh workflow behaviour.
type RefreshOwnerTokenInput struct{}

// RefreshOwnerTokenOutput describes the result of a refresh attempt.
type RefreshOwnerTokenOutput struct {
	Refreshed bool       `json:"refreshed"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

// RefreshOwnerAccessToken refreshes the Atlassian owner's access token when it is close to expiration.
func RefreshOwnerAccessToken(ctx workflow.Context, input RefreshOwnerTokenInput) (*RefreshOwnerTokenOutput, error) {
	logger := workflow.GetLogger(ctx)

	activityOpts := workflow.ActivityOptions{
		StartToCloseTimeout: 2 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    5,
			NonRetryableErrorTypes: []string{
				"MissingRefreshableToken",
				"MissingOAuthConfig",
			},
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOpts)

	var refreshResult activities.RefreshOwnerAccessTokenOutput
	if err := workflow.ExecuteActivity(ctx, "RefreshOwnerAccessToken", nil).Get(ctx, &refreshResult); err != nil {
		return nil, fmt.Errorf("refresh owner access token: %w", err)
	}

	logger.Info("Owner access token refreshed", "expiresAt", refreshResult.ExpiresAt)

	return &RefreshOwnerTokenOutput{
		Refreshed: true,
		ExpiresAt: refreshResult.ExpiresAt,
	}, nil
}

package activities

import (
	"context"
	"time"

	"go.temporal.io/sdk/client"
)

// UpdateScheduleInput contains the new interval for the schedule.
type UpdateScheduleInput struct {
	IntervalDays int `json:"intervalDays"`
}

// UpdateSchedule updates the Temporal schedule interval for privacy compliance.
func (a *Activities) UpdateSchedule(ctx context.Context, input *UpdateScheduleInput) error {
	if a.temporal == nil || a.scheduleID == "" {
		return nil // No schedule to update
	}

	scheduleHandle := a.temporal.ScheduleClient().GetHandle(ctx, a.scheduleID)

	return scheduleHandle.Update(ctx, client.ScheduleUpdateOptions{
		DoUpdate: func(in client.ScheduleUpdateInput) (*client.ScheduleUpdate, error) {
			schedule := in.Description.Schedule
			schedule.Spec.Intervals = []client.ScheduleIntervalSpec{{
				Every: time.Duration(input.IntervalDays) * 24 * time.Hour,
			}}
			return &client.ScheduleUpdate{Schedule: &schedule}, nil
		},
	})
}

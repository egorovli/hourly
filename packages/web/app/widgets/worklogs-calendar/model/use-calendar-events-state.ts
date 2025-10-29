import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import type { EventChange, EventChangesSummary } from './types.ts'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useUpdateWorklogEntriesMutation } from '~/features/update-worklog-entries/index.ts'

interface UseCalendarEventsStateParams {
	events: WorklogCalendarEvent[]
}

interface UseCalendarEventsStateResult {
	localEvents: WorklogCalendarEvent[]
	changesSummary: EventChangesSummary
	handleEventResize: (args: EventInteractionArgs<WorklogCalendarEvent>) => void
	handleEventDrop: (args: EventInteractionArgs<WorklogCalendarEvent>) => void
	handleSave: () => Promise<void>
	handleCancel: () => void
	isSaving: boolean
	saveError: Error | null
}

/**
 * Hook to manage local calendar event state with change tracking
 *
 * This hook:
 * 1. Creates a local copy of events when they change
 * 2. Tracks modifications (resizes) separately from original data
 * 3. Provides comparison to detect changes
 * 4. Provides handlers for save/cancel operations
 */
export function useCalendarEventsState({
	events
}: UseCalendarEventsStateParams): UseCalendarEventsStateResult {
	// Mutation for saving changes
	const mutation = useUpdateWorklogEntriesMutation()

	// Store original events for comparison
	const originalEventsRef = useRef<WorklogCalendarEvent[]>([])

	// Local mutable copy of events
	const [localEvents, setLocalEvents] = useState<WorklogCalendarEvent[]>([])

	// Track changes by event ID
	const [changes, setChanges] = useState<Map<string, EventChange>>(new Map())

	// Sync local events when original events change
	useEffect(() => {
		// Deep copy events to avoid mutations
		const eventsCopy = events.map(event => ({
			...event,
			start: new Date(event.start),
			end: new Date(event.end),
			resource: { ...event.resource }
		}))

		originalEventsRef.current = eventsCopy
		setLocalEvents(eventsCopy)
		setChanges(new Map()) // Reset changes when data refreshes
	}, [events])

	// Handle event resize
	const handleEventResize = useCallback((args: EventInteractionArgs<WorklogCalendarEvent>) => {
		const { event, start, end } = args

		// Convert start/end to Date if they're strings
		const startDate = start instanceof Date ? start : new Date(start)
		const endDate = end instanceof Date ? end : new Date(end)

		// Find original event for comparison
		const originalEvent = originalEventsRef.current.find(e => e.id === event.id)
		if (!originalEvent) {
			return
		}

		// Create updated event
		const updatedEvent: WorklogCalendarEvent = {
			...event,
			start: startDate,
			end: endDate,
			resource: {
				...event.resource,
				timeSpentSeconds: Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
			}
		}

		// Update local events
		setLocalEvents(prev => prev.map(e => (e.id === event.id ? updatedEvent : e)))

		// Track change
		setChanges(prev => {
			const newChanges = new Map(prev)
			newChanges.set(event.id, {
				eventId: event.id,
				originalEvent,
				modifiedEvent: updatedEvent,
				changeType: 'resize',
				timestamp: Date.now()
			})
			return newChanges
		})
	}, [])

	// Handle event drop (drag to move)
	const handleEventDrop = useCallback((args: EventInteractionArgs<WorklogCalendarEvent>) => {
		const { event, start, end } = args

		// Convert start/end to Date if they're strings
		const startDate = start instanceof Date ? start : new Date(start)
		const endDate = end instanceof Date ? end : new Date(end)

		// Find original event for comparison
		const originalEvent = originalEventsRef.current.find(e => e.id === event.id)
		if (!originalEvent) {
			return
		}

		// Create updated event
		const updatedEvent: WorklogCalendarEvent = {
			...event,
			start: startDate,
			end: endDate,
			resource: {
				...event.resource,
				timeSpentSeconds: Math.floor((endDate.getTime() - startDate.getTime()) / 1000),
				started: startDate.toISOString()
			}
		}

		// Update local events
		setLocalEvents(prev => prev.map(e => (e.id === event.id ? updatedEvent : e)))

		// Track change
		setChanges(prev => {
			const newChanges = new Map(prev)
			newChanges.set(event.id, {
				eventId: event.id,
				originalEvent,
				modifiedEvent: updatedEvent,
				changeType: 'move',
				timestamp: Date.now()
			})
			return newChanges
		})
	}, [])

	// Save handler using mutation
	const handleSave = useCallback(async () => {
		// Convert changes to API format
		const updates = Array.from(changes.values()).map(change => ({
			eventId: change.modifiedEvent.id,
			issueKey: change.modifiedEvent.resource.issueKey,
			started: change.modifiedEvent.start.toISOString(),
			timeSpentSeconds: change.modifiedEvent.resource.timeSpentSeconds,
			authorAccountId: change.modifiedEvent.resource.authorAccountId
		}))

		try {
			await mutation.mutateAsync({ updates })

			// Clear changes after successful save
			setChanges(new Map())
		} catch (error) {
			// Error is handled by mutation state, don't clear changes
			throw error
		}
	}, [changes, mutation])

	// Cancel handler - revert to original
	const handleCancel = useCallback(() => {
		// Restore original events
		const eventsCopy = originalEventsRef.current.map(event => ({
			...event,
			start: new Date(event.start),
			end: new Date(event.end),
			resource: { ...event.resource }
		}))

		setLocalEvents(eventsCopy)
		setChanges(new Map())
	}, [])

	// Compute changes summary
	const changesSummary = useMemo<EventChangesSummary>(
		() => ({
			hasChanges: changes.size > 0,
			totalChanges: changes.size,
			changes
		}),
		[changes]
	)

	return {
		localEvents,
		changesSummary,
		handleEventResize,
		handleEventDrop,
		handleSave,
		handleCancel,
		isSaving: mutation.isPending,
		saveError: mutation.error
	}
}

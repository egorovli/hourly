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
	handleCreateEvent: (
		start: Date,
		end: Date,
		currentUserAccountId: string,
		currentUserName: string,
		projectName?: string,
		issueData?: {
			issueKey: string
			issueSummary: string
		}
	) => WorklogCalendarEvent
	handleDeleteEvent: (eventId: string) => void
	handleDeleteAllEvents: () => void
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

		// Find original event for comparison (null for newly created events)
		const originalEvent = originalEventsRef.current.find(e => e.id === event.id) ?? null

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
			const existingChange = prev.get(event.id)
			newChanges.set(event.id, {
				eventId: event.id,
				originalEvent: existingChange?.originalEvent ?? originalEvent,
				modifiedEvent: updatedEvent,
				changeType: existingChange?.changeType === 'create' ? 'create' : 'resize',
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

		// Find original event for comparison (null for newly created events)
		const originalEvent = originalEventsRef.current.find(e => e.id === event.id) ?? null

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
			const existingChange = prev.get(event.id)
			newChanges.set(event.id, {
				eventId: event.id,
				originalEvent: existingChange?.originalEvent ?? originalEvent,
				modifiedEvent: updatedEvent,
				changeType: existingChange?.changeType === 'create' ? 'create' : 'move',
				timestamp: Date.now()
			})
			return newChanges
		})
	}, [])

	// Handle event creation (draw to create)
	const handleCreateEvent = useCallback(
		(
			start: Date,
			end: Date,
			currentUserAccountId: string,
			currentUserName: string,
			projectName = '',
			issueData?: {
				issueKey: string
				issueSummary: string
			}
		): WorklogCalendarEvent => {
			// Generate a temporary ID for the new event
			const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

			// Calculate time spent in seconds
			const timeSpentSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)

			// Determine title based on issue data
			const title = issueData ? `${issueData.issueKey} • ${issueData.issueSummary}` : 'New Event'

			// Create new event with default values
			const newEvent: WorklogCalendarEvent = {
				id: tempId,
				title,
				start,
				end,
				resource: {
					issueKey: issueData?.issueKey ?? '',
					issueSummary: issueData?.issueSummary ?? '',
					projectName,
					authorName: currentUserName,
					authorAccountId: currentUserAccountId,
					timeSpentSeconds,
					started: start.toISOString()
				}
			}

			// Add to local events
			setLocalEvents(prev => [...prev, newEvent])

			// Track as a new creation (originalEvent is null)
			setChanges(prev => {
				const newChanges = new Map(prev)
				newChanges.set(tempId, {
					eventId: tempId,
					originalEvent: null,
					modifiedEvent: newEvent,
					changeType: 'create',
					timestamp: Date.now()
				})
				return newChanges
			})

			return newEvent
		},
		[]
	)

	// Handle event deletion
	const handleDeleteEvent = useCallback(
		(eventId: string) => {
			// Find the event
			const existingChange = changes.get(eventId)

			// If it's a newly created event (not in original), just remove it
			if (existingChange?.changeType === 'create') {
				setLocalEvents(prev => prev.filter(e => e.id !== eventId))
				setChanges(prev => {
					const newChanges = new Map(prev)
					newChanges.delete(eventId)
					return newChanges
				})
				return
			}

			// For existing events, remove from local but track as deleted
			const originalEvent = originalEventsRef.current.find(e => e.id === eventId)
			if (originalEvent) {
				setLocalEvents(prev => prev.filter(e => e.id !== eventId))
				setChanges(prev => {
					const newChanges = new Map(prev)
					newChanges.set(eventId, {
						eventId,
						originalEvent,
						modifiedEvent: originalEvent, // Keep reference
						changeType: 'delete',
						timestamp: Date.now()
					})
					return newChanges
				})
			}
		},
		[changes]
	)

	// Handle delete all events
	const handleDeleteAllEvents = useCallback(() => {
		// Track all events as deleted
		const newChanges = new Map<string, EventChange>()

		for (const event of localEvents) {
			const originalEvent = originalEventsRef.current.find(e => e.id === event.id)
			const existingChange = changes.get(event.id)

			// If it's a newly created event, just remove it (no need to track)
			if (existingChange?.changeType === 'create') {
				continue
			}

			// For existing events, track as deleted
			if (originalEvent) {
				newChanges.set(event.id, {
					eventId: event.id,
					originalEvent,
					modifiedEvent: originalEvent,
					changeType: 'delete',
					timestamp: Date.now()
				})
			}
		}

		// Clear all local events
		setLocalEvents([])
		setChanges(newChanges)
	}, [localEvents, changes])

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

		await mutation.mutateAsync({ updates })

		// Clear changes after successful save
		setChanges(new Map())
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
		handleCreateEvent,
		handleDeleteEvent,
		handleDeleteAllEvents,
		handleSave,
		handleCancel,
		isSaving: mutation.isPending,
		saveError: mutation.error
	}
}

import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import type { EventChange, EventChangesSummary } from './types.ts'
import type { DateRange } from 'react-day-picker'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useUpdateWorklogEntriesMutation } from '~/features/update-worklog-entries/index.ts'

interface UseCalendarEventsStateParams {
	events: WorklogCalendarEvent[]
	dateRange?: DateRange
	currentUserAccountId?: string
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
	getWorklogChanges: () => {
		newEntries: Array<{
			localId: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
			isNew?: boolean
		}>
		modifiedEntries: Array<{
			localId: string
			id?: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
		}>
		deletedEntries: Array<{
			localId: string
			id?: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
		}>
		totalChanges: number
	}
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
	events,
	dateRange,
	currentUserAccountId
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
	// Strategy: Delete all existing worklogs for the user in the date range, then create all current events
	const handleSave = useCallback(async () => {
		if (!dateRange?.from || !dateRange?.to) {
			throw new Error('Date range is required to save worklogs')
		}

		// Convert dateRange to ISO date strings
		const fromDate = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from)
		const toDate = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to)
		const fromStr = fromDate.toISOString().split('T')[0]
		const toStr = toDate.toISOString().split('T')[0]

		if (!fromStr || !toStr) {
			throw new Error('Invalid date range format')
		}

		// Filter localEvents to only include those in the date range and for the current user
		const eventsInRange = localEvents.filter(event => {
			// Filter by user
			if (currentUserAccountId && event.resource.authorAccountId !== currentUserAccountId) {
				return false
			}

			// Filter by date range
			const eventDate = new Date(event.start)
			const eventDateStr = eventDate.toISOString().split('T')[0]
			if (!eventDateStr) {
				return false
			}
			return eventDateStr >= fromStr && eventDateStr <= toStr
		})

		// Get all existing worklogs (from original events) that should be deleted
		const existingEventsInRange = originalEventsRef.current.filter(event => {
			// Filter by user
			if (currentUserAccountId && event.resource.authorAccountId !== currentUserAccountId) {
				return false
			}

			// Filter by date range
			const eventDate = new Date(event.start)
			const eventDateStr = eventDate.toISOString().split('T')[0]
			if (!eventDateStr) {
				return false
			}
			return eventDateStr >= fromStr && eventDateStr <= toStr
		})

		// Convert existing events to deleted entries (only if they have a worklog ID)
		const deletedEntries = existingEventsInRange
			.filter(event => {
				// Only delete events that have a worklog ID (format: "issueId-worklogId")
				return event.id.includes('-') && event.id !== event.resource.issueKey
			})
			.map(event => ({
				localId: event.id,
				id: event.id, // This is the compound ID "issueId-worklogId"
				issueKey: event.resource.issueKey,
				summary: event.resource.issueSummary || event.title,
				projectName: event.resource.projectName || '',
				authorName: event.resource.authorName || '',
				started: event.resource.started || event.start.toISOString(),
				timeSpentSeconds: event.resource.timeSpentSeconds
			}))

		// Convert current events to new entries
		const newEntries = eventsInRange.map(event => ({
			localId: event.id,
			issueKey: event.resource.issueKey,
			summary: event.resource.issueSummary || event.title,
			projectName: event.resource.projectName || '',
			authorName: event.resource.authorName || '',
			started: event.resource.started || event.start.toISOString(),
			timeSpentSeconds: event.resource.timeSpentSeconds,
			isNew: true
		}))

		await mutation.mutateAsync({
			newEntries,
			modifiedEntries: [], // We're deleting and recreating, so no modifications needed
			deletedEntries,
			dateRange: {
				from: fromStr,
				to: toStr
			}
		})

		// Clear changes after successful save
		setChanges(new Map())
		// Update original events to match current state
		originalEventsRef.current = localEvents.map(event => ({
			...event,
			start: new Date(event.start),
			end: new Date(event.end),
			resource: { ...event.resource }
		}))
	}, [localEvents, dateRange, currentUserAccountId, mutation])

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

	// Helper to get worklog changes that will be saved (for confirmation dialog)
	// This computes a logical diff for UI display, not the technical implementation
	const getWorklogChanges = useCallback(() => {
		if (!dateRange?.from || !dateRange?.to) {
			return {
				newEntries: [],
				modifiedEntries: [],
				deletedEntries: [],
				totalChanges: 0
			}
		}

		// Convert dateRange to ISO date strings
		const fromDate = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from)
		const toDate = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to)
		const fromStr = fromDate.toISOString().split('T')[0]
		const toStr = toDate.toISOString().split('T')[0]

		if (!fromStr || !toStr) {
			return {
				newEntries: [],
				modifiedEntries: [],
				deletedEntries: [],
				totalChanges: 0
			}
		}

		// Filter events to only include those in the date range and for the current user
		const filterEvents = (events: WorklogCalendarEvent[]) => {
			return events.filter(event => {
				// Filter by user
				if (currentUserAccountId && event.resource.authorAccountId !== currentUserAccountId) {
					return false
				}

				// Filter by date range
				const eventDate = new Date(event.start)
				const eventDateStr = eventDate.toISOString().split('T')[0]
				if (!eventDateStr) {
					return false
				}
				return eventDateStr >= fromStr && eventDateStr <= toStr
			})
		}

		const localEventsInRange = filterEvents(localEvents)
		const originalEventsInRange = filterEvents(originalEventsRef.current)

		// Create a map of original events by ID for quick lookup
		const originalEventsMap = new Map<string, WorklogCalendarEvent>()
		for (const event of originalEventsInRange) {
			originalEventsMap.set(event.id, event)
		}

		// Create a map of local events by ID
		const localEventsMap = new Map<string, WorklogCalendarEvent>()
		for (const event of localEventsInRange) {
			localEventsMap.set(event.id, event)
		}

		const newEntries: Array<{
			localId: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
			isNew?: boolean
		}> = []
		const modifiedEntries: Array<{
			localId: string
			id?: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
		}> = []
		const deletedEntries: Array<{
			localId: string
			id?: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
		}> = []

		// Process local events: determine if they're new or modified
		for (const localEvent of localEventsInRange) {
			const originalEvent = originalEventsMap.get(localEvent.id)

			const entry = {
				localId: localEvent.id,
				id:
					localEvent.id.includes('-') && localEvent.id !== localEvent.resource.issueKey
						? localEvent.id
						: undefined,
				issueKey: localEvent.resource.issueKey,
				summary: localEvent.resource.issueSummary || localEvent.title,
				projectName: localEvent.resource.projectName || '',
				authorName: localEvent.resource.authorName || '',
				started: localEvent.resource.started || localEvent.start.toISOString(),
				timeSpentSeconds: localEvent.resource.timeSpentSeconds
			}

			if (originalEvent) {
				// Check if it's modified
				const isModified =
					originalEvent.resource.issueKey !== localEvent.resource.issueKey ||
					originalEvent.resource.started !== localEvent.resource.started ||
					originalEvent.resource.timeSpentSeconds !== localEvent.resource.timeSpentSeconds ||
					originalEvent.start.getTime() !== localEvent.start.getTime() ||
					originalEvent.end.getTime() !== localEvent.end.getTime()

				if (isModified) {
					modifiedEntries.push(entry)
				}
				// If not modified, it's unchanged (ignore it)
			} else {
				// New entry: doesn't exist in original
				newEntries.push({ ...entry, isNew: true })
			}
		}

		// Process original events: find deleted ones
		for (const originalEvent of originalEventsInRange) {
			// Only consider events with real worklog IDs (not just issue keys)
			if (!originalEvent.id.includes('-') || originalEvent.id === originalEvent.resource.issueKey) {
				continue
			}

			// If original event is not in local events, it's deleted
			if (!localEventsMap.has(originalEvent.id)) {
				deletedEntries.push({
					localId: originalEvent.id,
					id: originalEvent.id,
					issueKey: originalEvent.resource.issueKey,
					summary: originalEvent.resource.issueSummary || originalEvent.title,
					projectName: originalEvent.resource.projectName || '',
					authorName: originalEvent.resource.authorName || '',
					started: originalEvent.resource.started || originalEvent.start.toISOString(),
					timeSpentSeconds: originalEvent.resource.timeSpentSeconds
				})
			}
		}

		return {
			newEntries,
			modifiedEntries,
			deletedEntries,
			totalChanges: newEntries.length + modifiedEntries.length + deletedEntries.length
		}
	}, [localEvents, dateRange, currentUserAccountId])

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
		saveError: mutation.error,
		getWorklogChanges
	}
}

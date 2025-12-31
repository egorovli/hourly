import type { PluginDef } from '@fullcalendar/core'
import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/__._index.ts'
import type { Draggable } from '@fullcalendar/interaction'

import { Suspense, useEffect, useRef, useState, lazy } from 'react'
import { Virtuoso } from 'react-virtuoso'

import { invariant } from '~/lib/util/index.ts'

const FullCalendar = lazy(() => import('@fullcalendar/react'))

export default function IndexPage(): React.ReactNode {
	const [displayCalendar, setDisplayCalendar] = useState(false)
	const pluginsRef = useRef<PluginDef[]>([])
	const draggableConstructorRef = useRef<typeof Draggable>(null)

	useEffect(() => {
		Promise.all([
			import('@fullcalendar/timegrid')
				.then(module => module.default)
				.then(module => {
					pluginsRef.current.push(module)
				}),

			import('@fullcalendar/interaction')
				.then(module => module.default)
				.then(module => {
					pluginsRef.current.push(module)
				}),

			import('@fullcalendar/interaction')
				.then(module => module.Draggable)
				.then(module => {
					draggableConstructorRef.current = module
				})
		])
			.then(() => {
				setDisplayCalendar(true)
				console.log(pluginsRef.current)
				console.log(draggableConstructorRef.current)
			})
			.catch(err => {
				console.error(err)
			})
	}, [])

	if (!displayCalendar) {
		return null
	}

	// invariant(draggableConstructorRef.current, 'Draggable constructor not found')

	return (
		<div className='h-full flex flex-row gap-4 p-4'>
			<div className='flex flex-col gap-4 border'>
				<h2 className='text-2xl font-bold'>Issues</h2>
				<Virtuoso
					// style={{ height: '100%' }}

					totalCount={200}
					itemContent={index => {
						invariant(draggableConstructorRef.current, 'Draggable constructor not found')

						return (
							<IssueItem
								id={index.toString()}
								name={`Issue ${index}`}
								components={{
									Draggable: draggableConstructorRef.current
								}}
							/>
						)
					}}
				/>
			</div>
			<div className='flex flex-col grow gap-4'>
				<h2 className='text-2xl font-bold'>Calendar</h2>
				<Suspense fallback={<div>Loading...</div>}>
					<FullCalendar
						plugins={pluginsRef.current}
						initialView='timeGridWeek'
						height='100%'
						events={[]}
						datesSet={() => {}}
						firstDay={1}
						editable
						droppable
					/>
				</Suspense>
			</div>
		</div>
	)
}

interface IssueItemProps {
	id: string
	name: string
	components: IssueItemComponents
}

interface IssueItemComponents {
	Draggable: typeof Draggable
}

function IssueItem(props: IssueItemProps): React.ReactNode {
	const ref = useRef<HTMLDivElement>(null)
	const Draggable = props.components.Draggable
	const draggableRef = useRef<Draggable>(null)

	useEffect(() => {
		if (!ref.current) {
			return
		}

		const draggable = new Draggable(ref.current, {
			eventData(el) {
				return {
					id: props.id,
					duration: '01:30'
				}
			}
		})

		draggableRef.current = draggable

		return () => {
			draggable.destroy()
		}
	}, [Draggable, props.id])

	return <div ref={ref}>Item {props.name}</div>
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}

export function meta(args: Route.MetaArgs): MetaDescriptor[] {
	const title = 'Calendar • Hourly'

	const description =
		'View and manage your worklog entries on an interactive calendar. Filter by projects, drag and drop to edit time entries, and sync changes back to Jira.'

	const keywords =
		'worklog calendar, time tracking calendar, Jira worklog, time entries, calendar view, worklog management, time allocation calendar'

	return [
		{ title },
		{ name: 'description', content: description },
		{ name: 'keywords', content: keywords },

		// Open Graph tags
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		// { property: 'og:url', content: `${baseUrl}${pathname}` },

		// Twitter Card tags
		{ name: 'twitter:card', content: 'summary' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description }
	]
}

import { useReducer } from 'react'
import { initialState, type State } from './state.ts'
import { reducer } from './reducer.ts'
import type { Action } from './actions.ts'

export function useWorklogState(): [State, React.Dispatch<Action>] {
	return useReducer(reducer, initialState)
}

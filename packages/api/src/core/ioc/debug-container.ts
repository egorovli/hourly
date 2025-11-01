import type { Container } from 'inversify'
import type { TypedContainer } from '@inversifyjs/strongly-typed'

import type { BindingMap } from './binding-map.ts'
import { InjectionKey } from './injection-key.enum.ts'
import { BunUuidV7Generator } from '../../infrastructure/ids/bun-uuid-v7-generator.ts'
import { InMemoryWorklogEntryRepository } from '../../infrastructure/worklogs/poc/in-memory-worklog-entry-repository.ts'
import { FindProjectUseCase } from '../../modules/projects/domain/use-cases/find-project.use-case.ts'
import { GetProjectByIdUseCase } from '../../modules/projects/domain/use-cases/get-project-by-id.use-case.ts'
import { GetResourceByIdUseCase } from '../../modules/projects/domain/use-cases/get-resource-by-id.use-case.ts'
import { ListProjectsUseCase } from '../../modules/projects/domain/use-cases/list-projects.use-case.ts'
import { ListResourcesUseCase } from '../../modules/projects/domain/use-cases/list-resources.use-case.ts'
import { ListWorklogEntriesUseCase } from '../../modules/worklogs/domain/use-cases/list-worklog-entries.use-case.ts'
import { SyncWorklogEntriesUseCase } from '../../modules/worklogs/domain/use-cases/sync-worklog-entries.use-case.ts'
import { WorklogEntryFactory } from '../../modules/worklogs/infrastructure/worklog-entry-factory.ts'
import { ZodWorklogEntryValidator } from '../../modules/worklogs/infrastructure/zod-worklog-entry-validator.ts'

/**
 * Maps InjectionKey to implementation class
 */
const KEY_TO_CLASS_MAP: Record<string, unknown> = {
	[InjectionKey.FindProjectUseCase]: FindProjectUseCase,
	[InjectionKey.GetProjectByIdUseCase]: GetProjectByIdUseCase,
	[InjectionKey.GetResourceByIdUseCase]: GetResourceByIdUseCase,
	[InjectionKey.ListProjectsUseCase]: ListProjectsUseCase,
	[InjectionKey.ListResourcesUseCase]: ListResourcesUseCase,
	[InjectionKey.ListWorklogEntriesUseCase]: ListWorklogEntriesUseCase,
	[InjectionKey.SyncWorklogEntriesUseCase]: SyncWorklogEntriesUseCase,
	[InjectionKey.IdGenerator]: BunUuidV7Generator,
	[InjectionKey.WorklogEntryRepository]: InMemoryWorklogEntryRepository,
	[InjectionKey.WorklogEntryValidator]: ZodWorklogEntryValidator,
	[InjectionKey.WorklogEntryFactory]: WorklogEntryFactory
}

/**
 * Extracts dependency information from a class constructor using Inversify metadata
 */
function getDependenciesFromMetadata(target: unknown): string[] {
	if (typeof target !== 'function') {
		return []
	}

	try {
		// Use Reflect.getMetadata which is available in Bun
		const reflectWithMetadata = Reflect as unknown as {
			getMetadata(key: string, target: unknown): unknown
		}

		// Get Inversify class metadata (Inversify 7 uses @inversifyjs/core/classMetadataReflectKey)
		const classMetadata = reflectWithMetadata.getMetadata(
			'@inversifyjs/core/classMetadataReflectKey',
			target
		) as
			| {
					constructorArguments?: Array<{
						value?: string | symbol
						tags?: Record<string, unknown>
						[key: string]: unknown
					}>
			  }
			| undefined

		if (classMetadata?.constructorArguments) {
			const deps: string[] = []
			for (const arg of classMetadata.constructorArguments) {
				// The value property contains the injection key
				if (arg.value) {
					deps.push(String(arg.value))
				}
			}
			return deps
		}

		return []
	} catch {
		return []
	}
}

/**
 * Gets the implementation class for a binding key using the static map
 */
function getImplementationClass(key: string): unknown {
	const cls = KEY_TO_CLASS_MAP[key]
	return typeof cls === 'function' ? cls : undefined
}

/**
 * Gets the implementation class name for a binding key
 */
function getImplementationClassName(key: string): string | undefined {
	const cls = getImplementationClass(key)
	if (typeof cls === 'function') {
		return cls.name
	}
	return undefined
}

/**
 * Builds dependency map for all bound keys
 */
function buildDependencyMap(container: Container | TypedContainer<BindingMap>): {
	boundKeys: string[]
	dependencyMap: Map<string, string[]>
	implementationMap: Map<string, string>
} {
	const knownKeys = Object.values(InjectionKey)
	const boundKeys: string[] = []
	const dependencyMap = new Map<string, string[]>()
	const implementationMap = new Map<string, string>()

	for (const key of knownKeys) {
		try {
			// Skip keys that aren't in BindingMap (like Logger)
			if (!(key in KEY_TO_CLASS_MAP)) {
				continue
			}

			// Use type assertion to check if bound (TypedContainer.isBound requires BindingMap keys)
			const containerForCheck = container as Container
			if (containerForCheck.isBound(key)) {
				boundKeys.push(key)

				// Get implementation class from static map
				const implClass = getImplementationClass(key)
				if (implClass) {
					const deps = getDependenciesFromMetadata(implClass)
					if (deps.length > 0) {
						dependencyMap.set(key, deps)
					}
				}

				// Store implementation class name
				const implClassName = getImplementationClassName(key)
				if (implClassName) {
					implementationMap.set(key, implClassName)
				}
			}
		} catch {
			// Ignore errors
		}
	}

	return { boundKeys, dependencyMap, implementationMap }
}

/**
 * Prints bindings with their dependencies
 */
function printBindingsWithDependencies(
	boundKeys: string[],
	dependencyMap: Map<string, string[]>,
	implementationMap: Map<string, string>
): void {
	for (const key of boundKeys) {
		const deps = dependencyMap.get(key)
		const implClassName = implementationMap.get(key)
		const implNameDisplay = implClassName ? ` (${implClassName})` : ''

		if (deps && deps.length > 0) {
			// biome-ignore lint/suspicious/noConsole: Debug utility
			console.log(`\n🔑 ${key}${implNameDisplay}`)
			for (const dep of deps) {
				// biome-ignore lint/suspicious/noConsole: Debug utility
				console.log(`   └─ depends on: ${dep}`)
			}
		} else {
			// biome-ignore lint/suspicious/noConsole: Debug utility
			console.log(`\n🔑 ${key}${implNameDisplay} (no dependencies)`)
		}
	}
}

/**
 * Prints dependency tree visualization
 */
function printDependencyTree(boundKeys: string[], dependencyMap: Map<string, string[]>): void {
	const visited = new Set<string>()

	function printTree(key: string, indent: string, isLast: boolean): void {
		if (visited.has(key)) {
			// biome-ignore lint/suspicious/noConsole: Debug utility
			console.log(`${indent}${isLast ? '└─' : '├─'} ${key} (circular reference)`)
			return
		}

		visited.add(key)
		const prefix = indent + (isLast ? '└─' : '├─')
		// biome-ignore lint/suspicious/noConsole: Debug utility
		console.log(`${prefix} ${key}`)

		const deps = dependencyMap.get(key)
		if (deps && deps.length > 0) {
			const newIndent = indent + (isLast ? '   ' : '│  ')
			for (let i = 0; i < deps.length; i++) {
				const isLastDep = i === deps.length - 1
				const dep = deps[i]
				if (dep && boundKeys.includes(dep)) {
					printTree(dep, newIndent, isLastDep)
				} else if (dep) {
					// biome-ignore lint/suspicious/noConsole: Debug utility
					console.log(`${newIndent}${isLastDep ? '└─' : '├─'} ${dep} (not bound)`)
				}
			}
		}

		visited.delete(key)
	}

	for (const key of boundKeys) {
		printTree(key, '', false)
	}
}

/**
 * Fallback method: Check known InjectionKeys using isBound and extract dependencies
 */
function debugViaIsBound(container: Container | TypedContainer<BindingMap>): void {
	const { boundKeys, dependencyMap, implementationMap } = buildDependencyMap(container)

	if (boundKeys.length === 0) {
		// biome-ignore lint/suspicious/noConsole: Debug utility
		console.log('📦 Container is empty (no bindings registered)')
		return
	}

	// biome-ignore lint/suspicious/noConsole: Debug utility
	console.log('\n📦 Inversify Container Bindings & Dependencies:')
	// biome-ignore lint/suspicious/noConsole: Debug utility
	console.log('═'.repeat(80))

	boundKeys.sort()
	printBindingsWithDependencies(boundKeys, dependencyMap, implementationMap)

	if (dependencyMap.size > 0) {
		// biome-ignore lint/suspicious/noConsole: Debug utility
		console.log(`\n${'═'.repeat(80)}`)
		// biome-ignore lint/suspicious/noConsole: Debug utility
		console.log('\n🌳 Dependency Tree:')
		// biome-ignore lint/suspicious/noConsole: Debug utility
		console.log('─'.repeat(80))

		printDependencyTree(boundKeys, dependencyMap)
	}

	// biome-ignore lint/suspicious/noConsole: Debug utility
	console.log(`\n${'═'.repeat(80)}`)
	// biome-ignore lint/suspicious/noConsole: Debug utility
	console.log(`Total bindings: ${boundKeys.length}\n`)
}

// Export the function
export { debugViaIsBound as debugContainer }

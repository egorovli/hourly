#!/usr/bin/env bun
/**
 * Coverage Enhancement Script
 * 
 * This script enhances Bun's coverage report to include untested files.
 * It reads the LCOV file and adds entries for files that weren't tested.
 */

import { readdir, readFile, stat, writeFile } from 'fs/promises'
import { join, relative, resolve } from 'path'

const API_SRC_DIR = 'packages/api/src'
const COVERAGE_FILE = process.argv[2] || 'coverage/lcov.info'
const OUTPUT_FILE = process.argv[3] || 'coverage/enhanced-lcov.info'

async function getAllSourceFiles(dir: string, baseDir: string = dir): Promise<string[]> {
	const files: string[] = []
	
	try {
		const entries = await readdir(dir, { withFileTypes: true })
		
		for (const entry of entries) {
			const fullPath = join(dir, entry.name)
			
			if (entry.isDirectory()) {
				// Skip node_modules, coverage, dist, build directories
				if (['node_modules', 'coverage', 'dist', 'build', 'temp'].includes(entry.name)) {
					continue
				}
				files.push(...await getAllSourceFiles(fullPath, baseDir))
			} else if (entry.isFile()) {
				// Include TypeScript files, exclude test files
				if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
					files.push(fullPath)
				}
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dir}:`, error)
	}
	
	return files
}

async function getFileLines(filePath: string): Promise<number> {
	try {
		const content = await readFile(filePath, 'utf-8')
		return content.split('\n').length
	} catch {
		return 0
	}
}

async function parseLCOV(lcovPath: string): Promise<Set<string>> {
	const testedFiles = new Set<string>()
	
	try {
		const content = await readFile(lcovPath, 'utf-8')
		const lines = content.split('\n')
		
		for (const line of lines) {
			if (line.startsWith('SF:')) {
				// Extract file path from SF: line
				const filePath = line.substring(3).trim()
				testedFiles.add(filePath)
			}
		}
	} catch (error) {
		console.warn(`Could not read LCOV file ${lcovPath}:`, error)
	}
	
	return testedFiles
}

async function generateLCOVEntry(filePath: string, baseDir: string): Promise<string> {
	const relativePath = relative(baseDir, filePath)
	const absolutePath = resolve(filePath)
	const lines = await getFileLines(filePath)
	
	const lcov = [
		`SF:${absolutePath}`,
		`FN:1,untested`,
		`FNF:1`,
		`FNH:0`,
		`BRDA:1,1,1,0`,
		`BRF:1`,
		`BRH:0`,
		`LF:${lines}`,
		`LH:0`,
		`end_of_record`
	]
	
	return lcov.join('\n')
}

async function main() {
	console.log('🔍 Finding all source files...')
	const allFiles = await getAllSourceFiles(API_SRC_DIR)
	console.log(`Found ${allFiles.length} source files`)
	
	console.log('📊 Parsing existing coverage...')
	const testedFiles = await parseLCOV(COVERAGE_FILE)
	console.log(`Found ${testedFiles.size} tested files`)
	
	// Find untested files
	const untestedFiles = allFiles.filter(file => {
		const absolutePath = resolve(file)
		return !Array.from(testedFiles).some(tested => 
			resolve(tested).endsWith(absolutePath) || absolutePath.endsWith(resolve(tested))
		)
	})
	
	console.log(`📝 Found ${untestedFiles.length} untested files`)
	
	if (untestedFiles.length === 0) {
		console.log('✅ All files are covered!')
		return
	}
	
	// Read existing LCOV file
	let enhancedLCOV = ''
	try {
		enhancedLCOV = await readFile(COVERAGE_FILE, 'utf-8')
	} catch {
		enhancedLCOV = ''
	}
	
	// Add untested files
	console.log('📝 Adding untested files to coverage report...')
	for (const file of untestedFiles) {
		const entry = await generateLCOVEntry(file, process.cwd())
		enhancedLCOV += '\n' + entry + '\n'
	}
	
	// Write enhanced LCOV file
	await writeFile(OUTPUT_FILE, enhancedLCOV)
	console.log(`✅ Enhanced coverage report written to ${OUTPUT_FILE}`)
	console.log(`   Total files: ${allFiles.length}`)
	console.log(`   Tested: ${testedFiles.size}`)
	console.log(`   Untested: ${untestedFiles.length}`)
	console.log(`   Coverage: ${((testedFiles.size / allFiles.length) * 100).toFixed(2)}%`)
}

main().catch(console.error)


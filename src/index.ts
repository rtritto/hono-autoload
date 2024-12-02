import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { Hono } from 'hono'

import { importFile, sortRoutesByParams, transformToRoute } from './utils'
import path from 'node:path'

type Method = 'get' | 'post' | 'put' | 'delete' | 'options' | 'patch' | 'all'
type SoftString<T extends string> = T | (string & {})

const DEFAULT_ROUTES_DIR = './routes'
const DEFAULT_PATTERN = '**/*.{ts,tsx,mjs,js,jsx,cjs}'

interface AutoloadRoutesOptions {
  /**
   * Import a specific `export` from a file
   * @example import first export
   * ```ts
   * importKey: 'default' || (file) => Object.keys(file).at(0)
   * ```
   * @default 'default'
   */
  importKey?: SoftString<'default'> | ((file: unknown) => string)
  /**
   * Throws an error if no matches are found
   * @default true
   */
  failGlob?: boolean
  /**
   * Pattern
   * @example pattern only .ts files
   * ```ts
   * pattern: '**\/*.ts'
   * ```
   * @default '**\/*.{ts,tsx,mjs,js,jsx,cjs}'
   */
  pattern?: string
  /**
   * Prefix to add to routes
   * @example prefix for APIs
   * ```ts
   * prefix: '/api'
   * ```
   * @default ''
   */
  prefix?: string
  routesDir?: string
  /**
   * Skip imports where needed `export` not defined
   * @default false
   */
  skipImportErrors?: boolean
}

export const autoloadRoutes = async (app: Hono, {
  importKey = 'default',
  failGlob = true,
  pattern = DEFAULT_PATTERN,
  prefix = '',
  routesDir = DEFAULT_ROUTES_DIR,
  skipImportErrors = false
}: AutoloadRoutesOptions) => {
  if (!fs.existsSync(routesDir)) {
    throw new Error(`Directory ${routesDir} doesn't exist`)
  }

  if (!fs.statSync(routesDir).isDirectory()) {
    throw new Error(`${routesDir} isn't a directory`)
  }

  const files = typeof Bun === 'undefined'
    ? fs.globSync(pattern, { cwd: routesDir })
    : await Array.fromAsync((new Bun.Glob(pattern)).scan({ cwd: routesDir }))

  if (failGlob && files.length === 0) {
    throw new Error(`No matches found in ${routesDir} (you can disable this error with 'failGlob' option to false)`)
  }

  for (const file of sortRoutesByParams(files)) {
    const matchedFile = file.match(/\/?\((.*?)\)/)
    const method = matchedFile ? matchedFile[1] as Method : 'get'

    const filePath = `${routesDir}/${file.replaceAll('\\', '/')}`
    const extension = path.extname(filePath)
    const importedFile = (typeof Bun === 'undefined')
      ? ((extension === '.ts' || extension === '.tsx')
        ? await importFile(filePath)
        : await import(pathToFileURL(filePath).href))
      : await import(filePath)

    const resolvedImportName = typeof importKey === 'string' ? importKey : importKey(importedFile)
    const importedRoute = importedFile[resolvedImportName]

    if (!importedRoute && !skipImportErrors) {
      throw new Error(`${filePath} doesn't export ${resolvedImportName}`)
    }

    const route = `${prefix}/${transformToRoute(file)}`
    if (typeof importedRoute === 'function') {
      app[method](route, importedRoute)
    } else {
      console.warn(`Exported function of ${filePath} is not a function`)
    }
  }

  return app
}

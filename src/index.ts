import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { Hono } from 'hono'

import { sortRoutesByParams, transformToRoute } from './utils'

type Method = 'get' | 'post' | 'put' | 'delete' | 'options' | 'patch' | 'all'

const DEFAULT_ROUTES_DIR = './routes'
const DEFAULT_PATTERN = '**/*.{ts,tsx,mjs,js,jsx,cjs}'

interface AutoloadRoutesOptions {
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
    const universalFile = file.replaceAll('\\', '/')
    const filePath = pathToFileURL(`${routesDir}/${universalFile}`).href
    const { default: importedRoute } = await import(filePath)

    if (!importedRoute && !skipImportErrors) {
      throw new Error(`${filePath} doesn't have default export`)
    }

    if (typeof importedRoute === 'function') {
      const matchedFile = universalFile.match(/\/?\((.*?)\)/)
      const method = matchedFile ? matchedFile[1] as Method : 'get'
      const route = `${prefix}/${transformToRoute(universalFile)}`
      app[method](route, importedRoute)
    } else {
      console.warn(`Exported function of ${filePath} is not a function`)
    }
  }

  return app
}

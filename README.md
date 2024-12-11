# hono-autoloader

Plugin for [Hono](https://hono.dev/) that autoloads all routes in a directory.

Inspired by [elysia-autoload](https://github.com/kravetsone/elysia-autoload).

## Installation

```sh
yarn add hono-autoloader
```

## Usage

### Register the Plugin

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { autoloadRoutes } from 'hono-autoloader'

const port = +(process.env.PORT || 3000)

const app = await autoloadRoutes(new Hono(), {
  // Pattern to scan route files
  pattern: '**/*.ts',
  // Prefix to add to routes
  prefix: '/api',
  // Source directory of route files: use "relative" path
  routesDir: './src/api'
})

serve(
  {
    fetch: app.fetch,
    port
  },
  () => console.log(`Server running at http://localhost:${port}`)
)
```

### Create a Route

```ts
// /routes/index.ts
import type { Context } from 'hono'

export default (c: Context) => {
  return c.text('Hello World!')
}
```

### Directory Structure

Guide on how `hono-autoloader` matches routes:

```
├── app.ts
├── routes
│   ├── index.ts         // index routes
│   ├── posts
│   │   ├── index.ts
│   │   └── [id].ts      // dynamic params
│   ├── likes
│   │   └── [...].ts     // wildcard
│   ├── domains
│   │   ├── @[...]       // wildcard with @ prefix
│   │   │   └── index.ts
│   ├── frontend
│   │   └── index.tsx    // usage of tsx extension
│   ├── events
│   │   ├── (post).ts    // post and get will not be in the link
│   │   └── (get).ts
│   └── users.ts
└── package.json
```

- `/routes/index.ts` → `GET` `/`
- `/routes/posts/index.ts` → `GET` `/posts`
- `/routes/posts/[id].ts` → `GET` `/posts/:id`
- `/routes/users.ts` → `GET` `/users`
- `/routes/likes/[...].ts` → `GET` `/likes/*`
- `/routes/domains/@[...]/index.ts` → `GET` `/domains/@*`
- `/routes/frontend/index.tsx` → `GET` `/frontend`
- `/routes/events/(post).ts` → `POST` `/events`
- `/routes/events/(get).ts` → `GET` `/events`

### Options

| Key               | Type    | Default                        | Description                                                       |
| ----------------- | ------- | ------------------------------ | ----------------------------------------------------------------- |
| failGlob?         | boolean | `true`                         | Throws an error if no matches are found                           |
| pattern?          | string  | `**/*.{ts,tsx,js,jsx,mjs,cjs}` | [Glob patterns](https://en.wikipedia.org/wiki/Glob_(programming)) |
| prefix?           | string  | ` `                            | Prefix to be added to each route                                  |
| routesDir?        | string  | `./routes`                     | The folder where routes are located (use a *relative* path)       |
| skipImportErrors? | boolean | `false`                        | Throws an error if there is an import error of a route file       |

## License

This project is licensed under the [MIT License](LICENSE).

# Plant Care Tracker Backend

This backend now uses a proper Express structure while keeping your current website behavior unchanged.

## What it does now

- Runs Express server from modular files.
- Exposes API endpoints:
  - `GET /api/health` -> working health endpoint
  - `GET /api/plants` -> scaffold placeholder (`501`)
  - `GET /api/tasks` -> scaffold placeholder (`501`)
- Serves the frontend from `../FRONTEND`.
- Uses SPA fallback to `FRONTEND/index.html`.

## Folder structure

```text
BACKEND/
  server.js                  # thin entrypoint
  package.json
  .env.example
  README.md
  src/
    app.js                   # express app wiring
    server.js                # listen/start logic
    config/
      env.js                 # env parsing
      paths.js               # project paths
      cors.js                # CORS options builder
    controllers/
      health.controller.js
      plants.controller.js
      tasks.controller.js
    middleware/
      not-found.js
      error-handler.js
    routes/
      index.js
      health.routes.js
      plants.routes.js
      tasks.routes.js
    services/
      health.service.js
    utils/
      logger.js
  _legacy_unused/
    redirect_pages/          # old backend html redirects (archived)
```

## Run

1. Open terminal in `BACKEND`
2. Install dependencies:
   - `npm install`
3. Start server:
   - `npm start`
4. Open:
   - `http://localhost:5500`

## Environment

Create `.env` in `BACKEND` using `.env.example`.

Variables:

- `NODE_ENV` (example: `development`)
- `PORT` (example: `5500`)
- `JSON_LIMIT` (example: `2mb`)
- `CORS_ORIGIN` (example: `*` or comma-separated origins)

## Next backend steps (optional)

- Implement real `plants` and `tasks` storage in services.
- Add request validation middleware.
- Add authentication middleware for protected APIs.

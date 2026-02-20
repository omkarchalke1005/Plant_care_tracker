# Plant Care Tracker Backend

This folder now contains the backend runtime for the project.

## What this backend does

- Runs an Express server.
- Exposes a backend health endpoint: `GET /api/health`
- Serves the frontend app from `../FRONTEND` without changing UI behavior.

## Run

1. Open terminal in `BACKEND`
2. Install dependencies:
   - `npm install`
3. Start server:
   - `npm start`
4. Open:
   - `http://localhost:5500`

## Environment

Create a `.env` file in `BACKEND` using `.env.example`.

## Folder separation

- `BACKEND/` = server runtime and API entry points
- `FRONTEND/` = all UI pages, CSS, and client-side JS

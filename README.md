# Task Manager

This project fulfills the full stack development internship brief by shipping a responsive Kanban board, a type-safe REST API, and persistent PostgreSQL storage plus several bonus capabilities (authentication, filters, deployment guide, documentation, and enhanced UX cues such as due-date countdowns).

##Live Demo: https://task-manager-4lc2.vercel.app/

## Assignment Coverage

| Requirement (brief) | Implementation in this repo |
| --- | --- |
| Responsive UI with task list + add form | React 19 + Vite SPA with dedicated TaskComposer form, TaskCard list, and CSS responsive layout. |
| Task fields: Title, Description, Status | Core schema includes all three plus optional due dates for richer planning. |
| REST API in Node/Express | Express 5 TypeScript API with modular controllers, Zod validation, and structured responses. |
| CRUD operations | `/tasks` resource supports create, list (with filtering/sorting), update, and delete. |
| Persistent DB (MySQL/Postgres/Mongo) | Neon-hosted PostgreSQL accessed via the `pg` pool; automatic schema bootstrap. |
| Bonus: Authentication | Email/password JWT auth plus Google Identity sign-in, secure token middleware, `/auth/me` endpoint. |
| Bonus: Filters / UX polish | Search, status tabs, sort toggles, due-date countdowns, optimistic UI, and error toasts. |
| Bonus: Deployment + Documentation | This README provides full setup + Vercel deployment steps; client/server builds verified. |

## System Architecture

| Layer | Stack | Highlights |
| --- | --- | --- |
| API | Express 5, TypeScript, `pg` | JWT auth, Google credential verification, Neon Postgres, due-date aware queries. |
| UI | React 19, Vite, TypeScript | Column-based board, global auth context, countdown timers, API abstraction with token injection. |

## Prerequisites

- Node.js 20+
- npm 10+
- Neon Postgres database (or any PostgreSQL 14+ instance)

## Quick Start

1. **Clone & install**
   ```bash
   git clone <repo>
   cd GlobalTrendAssignment
   npm install --prefix server
   npm install --prefix client
   ```
2. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
   | Key | Location | Purpose |
   | --- | --- | --- |
   | `DATABASE_URL` | server | Postgres/Neon connection string. |
   | `JWT_SECRET`, `JWT_EXPIRES_IN` | server | Token signing + lifetime. |
   | `GOOGLE_CLIENT_ID` | server | Verifies Google Identity tokens. |
   | Email reminder SMTP vars | server | `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`, `EMAIL_FROM`, and optional `EMAIL_SMTP_SECURE` enable 12-hour reminder emails. |
   | `CLIENT_ORIGIN` | server | Allowed origin for CORS + cookies. |
   | `VITE_API_URL` | client | Base URL to the API (`http://localhost:4000/api` locally). |
   | `VITE_GOOGLE_CLIENT_ID` | client | Renders Google button in the UI. |
3. **Database bootstrap**
   - Provision a Neon project or point to any Postgres instance.
   - On first server start the schema auto-creates. Manual script:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";

   CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT NOT NULL UNIQUE,
     password_hash TEXT,
     name TEXT,
     provider TEXT NOT NULL DEFAULT 'local',
     provider_id TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS tasks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     description TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'TODO',
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     due_date TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );

   CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
   CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id);
   ```
4. **Run the API**
   ```bash
   npm run dev --prefix server
   ```
5. **Run the client** (defaults to `http://localhost:5173`)
   ```bash
   npm run dev --prefix client
   ```
   When the API origin differs, update `VITE_API_URL` accordingly.

## Available Scripts

### Server (`/server`)
- `npm run dev` – Start Express with tsx + hot reload.
- `npm run build` – Type-check & emit JavaScript into `dist/`.
- `npm start` – Run the compiled server.

### Client (`/client`)
- `npm run dev` – Launch Vite dev server with HMR.
- `npm run build` – Type-check and produce production assets.
- `npm run preview` – Preview the production build locally.

## API Reference

Base URL defaults to `http://localhost:4000/api`. All `/tasks` endpoints require `Authorization: Bearer <jwt>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/register` | `{ email, password, name? }` → `{ token, user }`. |
| POST | `/auth/login` | Credential exchange for `{ token, user }`. |
| POST | `/auth/google` | `{ idToken }` from Google Identity → `{ token, user }`. |
| GET | `/auth/me` | Returns the authenticated profile. |
| GET | `/tasks?status&search&sort` | List tasks with filters (`status`=`TODO\|IN_PROGRESS\|DONE`, `sort`=`newest\|oldest\|title`) and fuzzy `search`. |
| GET | `/tasks/:id` | Retrieve a single task scoped to the current user. |
| POST | `/tasks` | Create `{ title, description, status?, dueDate? }`. |
| PATCH | `/tasks/:id` | Update any subset of task fields, including status transitions and due dates. |
| DELETE | `/tasks/:id` | Permanently remove a task. |

All responses follow `{ data, meta? }` envelopes and return structured error payloads for validation failures or auth issues.

## Background Automation

- An hourly reminder scheduler scans for tasks due in roughly 12 hours and emails the assigned teammate when SMTP credentials are configured. Each task fires once, and reminders are skipped if the assignee, due date, or status changes after completion.

## Frontend Highlights

- Secure login & registration with JWT persistence and optional Google OAuth.
- Task composer with inline validation, status selector, and datetime picker.
- Column board per status with drag-free but instant status toggles and optimistic updates.
- Search bar, filter tabs, and sort selector to fulfill the assignment's “filters” bonus.
- Due-date pill on each card featuring a live countdown interval.
- Responsive layout tested on mobile + desktop breakpoints.

## Deployment (Vercel reference)

1. **API project**
   - Create a Vercel project from the `server` folder.
   - Build command: `npm run build`; Output: `dist`.
   - Set the server env vars (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `GOOGLE_CLIENT_ID`, etc.).
   - Expose the API through a custom domain or the generated `.vercel.app` URL.
2. **Client project**
   - Create a second Vercel project targeting `client`.
   - Build command: `npm run build`; Output: `dist`.
   - Configure `VITE_API_URL` to the deployed API base and `VITE_GOOGLE_CLIENT_ID` to the production OAuth client.
3. **Post-deploy checks**
   - Verify CORS: ensure `CLIENT_ORIGIN` matches the client URL.
   - Run through auth, CRUD, and countdown flows on the production URLs.
   - Monitor Vercel logs (API) + inspector (client) for environment mismatches.
     

## Next Steps

- Expand automated testing (unit for controllers, integration for API, and Cypress for UI flows).
- Introduce collaborative boards with role-based permissions and shared workspaces.
- Consider containerizing for portability (Docker + Compose) and wiring CI (lint/build/test) before deployments.

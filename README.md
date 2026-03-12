# Applications tracker

Applications tracker is a personal job-search companion built to replace the usual spreadsheet workflow with something more structured and more useful day to day. The goal is simple: keep every application in one place, follow each stage of the process, and surface quick insights on how the search is going.

The project combines a landing page, Google sign-in, a dashboard to manage applications, an analysis view for statistics, and a settings area to customize reusable values such as statuses, emails, and resume labels.

## Screenshot

Replace this image with your own dashboard capture when you want an up-to-date README preview.

![Applications tracker screenshot](./public/landing-analysis-preview.png)

## Main pages

### `/`

Landing page presenting the product and linking directly to the dashboard.

### `/login`

Authentication page using Google sign-in through Better Auth.

### `/app`

Main tracking workspace:

- add, edit, and delete applications
- search and sort entries
- customize visible columns and column widths
- import applications from `.xlsx`
- export the current dataset back to `.xlsx`
- store company, role, date, job link, resume used, email used, status, and final status
- automatically enrich an application from the job posting URL with fetched metadata such as source title, salary, locations, and skills

When Deeper Search is enabled in settings, saving a job posting URL automatically queues an analysis of the source page. The extracted metadata is then attached to the application and can be viewed later from the dashboard.

### `/app/analysis`

Analytics page focused on the job search pipeline:

- total applications
- active applications
- interviews
- rejections
- offers
- breakdowns by company and resume version
- applications over time
- frequent words in role titles

### `/app/settings`

Configuration page to manage reusable option lists:

- resume labels
- email aliases
- status labels
- final status labels
- badge colors for each option
- a Deeper Search toggle to automatically analyze saved job posting URLs, including existing applications when the feature is turned on

## Environment variables

Create a `.env.local` file for local development and define the same variables in production.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Drizzle and Better Auth. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL used by the client auth setup. Example: `http://localhost:3000` locally, `https://apply.emilienadam.dev` in production. |
| `BETTER_AUTH_URL` | Yes | Base URL used by Better Auth for callbacks and redirects. Usually the same value as `NEXT_PUBLIC_APP_URL`. |
| `BETTER_AUTH_SECRET` | Yes | Secret used by Better Auth to sign and protect auth data. Use a random value with at least 32 characters. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID for sign-in. |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret for sign-in. |

Example:

```bash
DATABASE_URL="postgres://user:password@host:5432/applications"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
GOOGLE_CLIENT_ID="replace-me"
GOOGLE_CLIENT_SECRET="replace-me"
```

## Database setup

This project uses PostgreSQL.

The application data layer expects these tables from [`lib/db/schema.ts`](./lib/db/schema.ts):

- `job_applications`
- `user_options`
- `job_application_metadata`
- `tracker_user_settings`

Authentication also requires the Better Auth tables for the installed version of the library. Those auth tables are separate from the three application tables above and must exist before Google sign-in works correctly.

At the moment, the repository does not expose a dedicated migration workflow in the scripts, so database provisioning should be handled before first launch or deployment.

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` with the variables listed above.

3. Provision your PostgreSQL database and create both:
   - the application tables defined in [`lib/db/schema.ts`](./lib/db/schema.ts)
   - the Better Auth tables required by your auth setup

4. Configure Google OAuth:
   - add `http://localhost:3000` as an authorized origin for local development
   - add your production domain as an authorized origin for deployment
   - add the Better Auth callback URL for Google, typically:

```text
http://localhost:3000/api/auth/callback/google
https://apply.emilienadam.dev/api/auth/callback/google
```

5. Start the development server:

```bash
pnpm dev
```

## Deployment / hosting

The project is well suited for Vercel hosting.

Before deploying:

1. Add all environment variables to your hosting platform.
2. Set both `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the final public domain.
3. Make sure the PostgreSQL database is reachable from the deployment environment.
4. Create the application tables and Better Auth tables in the production database.
5. Update the Google OAuth app with the production origin and callback URL.

Recommended production value example:

```bash
NEXT_PUBLIC_APP_URL="https://apply.emilienadam.dev"
BETTER_AUTH_URL="https://apply.emilienadam.dev"
```

## Notes

- Vercel Analytics is already integrated in the app layout.
- The dashboard routes are protected through the request proxy and redirect unauthenticated users to `/login`.
- The legacy route `/app/applications` redirects to `/app`.

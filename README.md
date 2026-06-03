# Factory Activity Logger

Mobile-first Next.js PWA for factory machine and operator activity logging. Operators set division, operator, machine, shift, then tap large activity buttons to record timestamped activity intervals.

## Features

- Setup screen for division, operator, machine number, shift, and date
- Phone-first dark UI with large activity buttons
- Division-specific activity catalogs
- Activity CRUD panel for adding, editing, deleting, and resetting activities per division
- Default Warping and Indigo activity sets with independent machine/operator options
- Multiple operators on one machine, with parallel operator activity timers
- Operator selector above activity buttons so each operator can log independently
- URL-addressable logging pages, so multiple machine sessions can stay open in separate browser tabs
- One active activity at a time
- Tapping a new activity closes the previous entry with `endTime` and `durationSeconds`
- Current activity banner, summary cards, editable notes, and activity log
- Current session CSV export from local browser storage
- API routes for PostgreSQL on NAS or DynamoDB persistence and filtered CSV export
- PWA manifest for installable mobile use

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app works without AWS configuration. In that mode, log entries and division activity catalogs are saved to browser `localStorage`, and API routes return `storage: "local"` with HTTP `202` for write attempts.

## Separate Logging Pages

Starting a setup creates a unique logging URL like:

```text
/?session=<sessionId>
```

Each session saves logs under its own local storage key, so two open browser tabs can log different machines without overwriting each other. Use **New page** from a logger to return to setup and create another session. The setup screen also lists saved logging pages for quick access.

## Activity Catalogs

Tap **Activities** in the logger header to manage the selected division's activity buttons.

Each activity has:

- `code`
- `name`
- `description`
- `group`: machine status or operator activity
- `tone`: run, idle, stop, work, or break

Activity codes must be unique inside one division. Editing an activity changes future buttons and future logs; historical log entries keep the activity code/name that was recorded at the time.

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_APP_NAME="Factory Activity Logger"
DATABASE_URL=""
DATABASE_SSL="false"
AWS_REGION="ap-southeast-1"
DYNAMODB_LOGS_TABLE="FactoryActivityLogs"
APP_AUTH_MODE="none"
APP_BASIC_USERNAME=""
APP_BASIC_PASSWORD=""
APP_OPERATOR_PIN=""
APP_ADMIN_PIN=""
```

For NAS deployment, set `DATABASE_URL` and leave `DYNAMODB_LOGS_TABLE` blank. For local-only testing, leave both `DATABASE_URL` and `DYNAMODB_LOGS_TABLE` blank.

## NAS Deployment With Docker

The app can run on a NAS or physical server with Docker Compose and PostgreSQL.

For the full Synology NAS + Cloudflare Tunnel process, see:

```text
NAS_CLOUDFLARE_DEPLOYMENT.md
```

1. Copy the project to the server.
2. Edit `docker-compose.yml` and replace `change-this-password`.
3. Start the stack:

```bash
docker compose up -d --build
```

4. Open:

```text
http://SERVER_IP:3000
```

The included PostgreSQL container automatically creates the database schema from:

```text
database/postgres-schema.sql
```

For an existing PostgreSQL database, create the schema manually:

```bash
psql "$DATABASE_URL" -f database/postgres-schema.sql
```

Then run the app with:

```bash
DATABASE_URL="postgresql://factory_logger:password@localhost:5432/factory_logger" npm run start
```

Recommended production path on the NAS:

- Run the app and PostgreSQL with Docker Compose
- Put Nginx or the NAS reverse proxy in front of port `3000`
- Use HTTPS if phones access it through a hostname
- Back up the PostgreSQL volume regularly

## PostgreSQL Schema

The NAS/PostgreSQL backend uses one table:

```sql
activity_logs (
  log_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  division TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  machine_number TEXT NOT NULL,
  activity_code TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL
)
```

## DynamoDB Schema

Recommended table: `FactoryActivityLogs`

Primary key:

- Partition key: `logId` string

Global secondary index:

- Name: `sessionId-startTime-index`
- Partition key: `sessionId` string
- Sort key: `startTime` string

Stored fields:

| Field | Type | Notes |
| --- | --- | --- |
| `logId` | string | Primary key, UUID |
| `sessionId` | string | Groups logs for one setup/session |
| `division` | string | Example: Warping, Indigo |
| `operatorName` | string | Operator display name |
| `machineNumber` | string | Machine identifier |
| `activityCode` | string | `RUN`, `ID`, `MT`, etc. |
| `activityName` | string | Human readable activity |
| `startTime` | string | ISO timestamp |
| `endTime` | string | ISO timestamp, omitted while active |
| `durationSeconds` | number | Completed interval duration |
| `note` | string | Operator note |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |
| `createdBy` | string | Operator or authenticated user |

Example AWS CLI table creation:

```bash
aws dynamodb create-table \
  --table-name FactoryActivityLogs \
  --attribute-definitions \
    AttributeName=logId,AttributeType=S \
    AttributeName=sessionId,AttributeType=S \
    AttributeName=startTime,AttributeType=S \
  --key-schema AttributeName=logId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "sessionId-startTime-index",
      "KeySchema": [
        {"AttributeName":"sessionId","KeyType":"HASH"},
        {"AttributeName":"startTime","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
    }
  ]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

For production, on-demand billing is usually simpler:

```bash
aws dynamodb update-table \
  --table-name FactoryActivityLogs \
  --billing-mode PAY_PER_REQUEST
```

## API Routes

### `GET /api/logs`

Returns logs from PostgreSQL or DynamoDB when configured.

Query filters:

- `sessionId`
- `date` in `YYYY-MM-DD`
- `division`
- `machineNumber`
- `operatorName`

Response:

```json
{
  "logs": [],
  "storage": "postgres"
}
```

### `POST /api/logs`

Creates a log entry.

Required body fields:

- `sessionId`
- `division`
- `operatorName`
- `machineNumber`
- `activityCode`
- `activityName`
- `startTime`
- `note`
- `createdBy`

### `PATCH /api/logs/:logId`

Updates a log entry.

Accepted body fields:

- `endTime`
- `durationSeconds`
- `note`
- `operatorName`
- `createdBy`

### `DELETE /api/logs/:logId`

Deletes a log entry. The local app also uses this for accidental tap correction.

### `GET /api/sessions/:sessionId/logs`

Returns all logs for a session. PostgreSQL uses the `activity_logs_session_start_idx` index; DynamoDB uses the `sessionId-startTime-index` GSI.

### `GET /api/logs/export`

Exports a PostgreSQL or DynamoDB-backed CSV.

Supported query filters match `GET /api/logs`.

CSV columns:

`Date, Division, Operator, Machine Number, Activity Code, Activity Name, Start Time, End Time, Duration Seconds, Duration Display, Note`

## AWS Deployment With Amplify

1. Push this repo to GitHub, GitLab, Bitbucket, or AWS CodeCommit.
2. In AWS Amplify Hosting, choose **Deploy an app** and connect the repository.
3. Use build command `npm run build`.
4. Use output handled by Amplify's Next.js hosting support.
5. Add environment variables:
   - `AWS_REGION`
   - `DYNAMODB_LOGS_TABLE`
6. Attach an IAM role/policy that allows the hosted app to access DynamoDB:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/FactoryActivityLogs",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/FactoryActivityLogs/index/sessionId-startTime-index"
      ]
    }
  ]
}
```

Replace `REGION` and `ACCOUNT_ID`.

## Auth Notes

Default auth mode is `none`. For small private deployments, use Basic Auth to protect the whole app:

```env
APP_AUTH_MODE="basic"
APP_BASIC_USERNAME="admin"
APP_BASIC_PASSWORD="change-this-long-password"
```

Basic Auth blocks the app UI and API until the browser provides the configured username and password. Use HTTPS before exposing this publicly.

A simple API PIN mode is also included for deployments that call the API directly:

```env
APP_AUTH_MODE="simple"
APP_OPERATOR_PIN="1234"
APP_ADMIN_PIN="9999"
```

When simple auth is enabled:

- `POST /api/logs` and `PATCH /api/logs/:logId` require `x-operator-pin` or `x-admin-pin`
- `GET /api/logs/export` requires `x-admin-pin`

For production, Cognito is still the preferred option:

- For production, prefer Cognito user pools or Amplify Auth so `createdBy` comes from the authenticated identity.
- Restrict CSV export to admin users.

## Production Hardening

- Add Cognito authentication and role checks for admin export
- Add offline sync retry queue for local logs that failed to reach DynamoDB
- Add paginated DynamoDB reads for large exports
- Add date/division/machine/operator filter UI for historical exports
- Add service worker caching if full offline PWA behavior is required

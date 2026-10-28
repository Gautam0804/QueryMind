QueryMind --- AI-Powered Text-to-SQL Analytics Assistant
QueryMind is an AI-powered analytics assistant designed to let users
explore relational data using natural-language questions instead of
writing SQL manually. It combines a Next.js dashboard, a
TypeScript/Node.js API, PostgreSQL, schema-aware context, and an
LLM-powered SQL-generation workflow.
Project status: In development. The core frontend, backend, and
database foundations have been built. Before production use, verify
the complete deployment configuration and all security controls in the
target environment.

Repository: https://github.com/Gautam0804/QueryMind
Table of Contents
- Overview
- Features
- Tech Stack
- Architecture
- Query Lifecycle
- Repository Structure
- Prerequisites
- Local Setup
- Environment Variables
- Database
- Running the Application
- Available Scripts
- API
- Security Considerations
- Troubleshooting
- Roadmap
- Contributing
- License
Overview
Traditional analytics often requires users to understand SQL, know the
database schema, and build reports manually. QueryMind aims to make data
exploration more accessible by allowing users to ask questions in plain
language and view structured results in an analytics dashboard.

Example questions include:
- "How many customers are in the database?"
- "Show the latest orders."
- "Which products have the most order items?"
- "Summarize orders by month."
These are illustrative prompts. Whether a prompt succeeds depends on the
available schema, data, configured LLM provider, and implemented
application behavior.
Features
Natural-language analytics
Submit a question in plain language and use the application's query
workflow to explore relational data.
LLM-assisted SQL generation
The backend includes SQL-generation and schema-context service modules.
The configured LLM provider and its environment settings must be present
for generation to work.
Schema knowledge and retrieval
The project includes schema-related knowledge components intended to
help ground generated queries in the database structure.
SQL safety layer
The backend includes SQL-safety and query-service modules. Always
validate generated SQL and enforce permissions before execution; model
output must be treated as untrusted input.
Interactive dashboard
The frontend is built with Next.js and React. It includes dashboard UI
areas for query workflows, results, charts, history, saved queries,
navigation, and authentication.
Data visualization
Recharts is part of the project's frontend stack for displaying
supported query results as charts.
PostgreSQL database
The development database contains relational analytics tables and
schema-knowledge tables initialized from SQL scripts.
Authentication and API routes
The backend includes authentication, query, analytics, and query-history
route modules. Review the actual route definitions for exact endpoints
and request/response formats.
Tech Stack
  Layer                               Technologies
  Frontend                            Next.js, React, TypeScript

  Styling                             CSS and Tailwind utility classes
                                      where configured

  Charts                              Recharts

  Backend                             Node.js, Express.js, TypeScript

  Database                            PostgreSQL

  Vector extension support            pgvector

  SQL parsing                         node-sql-parser

  Validation                          Zod

  Database client                     pg

  AI integration                      Gemini configuration is present in
                                      the backend; check environment
                                      configuration for the active model

  Local infrastructure                Docker Compose
  Development tools                   npm, Git, Postman
Check frontend/package.json and backend/package.json for the precise
installed versions and scripts.
Architecture
```mermaid
flowchart TD
    U[User] --> F[Next.js Dashboard]
    F --> A[Backend API]
    A --> S[Schema and Knowledge Context]
    S --> L[LLM SQL Generation]
    L --> V[SQL Safety Validation]
    V --> D[(PostgreSQL)]
    D --> R[Structured Query Results]
    R --> F
    A --> H[Query History and Analytics Routes]
```
The diagram describes the intended high-level workflow. Verify the
active implementation and data flow in the source before treating every
stage as production-complete.
Main components
- Frontend: Presents the dashboard and sends requests to the API.
- Backend API: Coordinates authentication, schema lookup, SQL
  generation, validation, and database operations.
- Schema and knowledge services: Provide table and schema context.
- LLM layer: Proposes SQL from a user question and relevant schema
  context.
- SQL safety layer: Evaluates generated SQL against the
  application's execution policy.
- PostgreSQL: Stores the application's relational data and schema
  knowledge.
- Results UI: Displays query output using tables and supported
  charts.
Query Lifecycle
The intended flow for a natural-language query is:
1. The user submits a question through the dashboard.
2. The backend obtains relevant schema or knowledge context.
3. The configured LLM proposes a SQL query.
4. The backend validates the candidate SQL.
5. An approved query executes against PostgreSQL with restricted
   permissions.
6. The API returns structured results.
7. The frontend displays the result in an appropriate table or
   visualization.
8. Where implemented, query history or saved-query functionality makes
   the query available later.
Never execute model-generated SQL without validation and database-level
permission restrictions.
Repository Structure
QueryMind/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── scripts/
│   │   └── services/
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── init/
│   ├── google-auth.sql
│   └── ...
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   └── lib/
│   ├── package.json
│   └── ...
├── .gitignore
├── docker-compose.yml
└── README.md
The tree is a high-level guide; exact files may evolve as the project
develops.
Prerequisites
Install the following:
- Node.js compatible with the installed Next.js
  version
- npm
- Docker Desktop
  and Docker Compose, if using the local containerized database
- Git
- A configured LLM provider and API key if the current environment
  requires one
Verify installations:
node --version
npm --version
git --version
docker --version
docker compose version
If PowerShell reports that docker is not recognized, open Docker
Desktop and verify the Docker CLI installation and PATH.
Local Setup
1. Clone the repository
git clone https://github.com/Gautam0804/QueryMind.git
cd QueryMind
2. Configure environment files
Review the environment variables required by the backend, frontend, and
docker-compose.yml. Create local .env files as required by the
actual code. Do not commit real credentials.
3. Start the database
From the repository root, start the configured Docker services:
docker compose up -d
docker compose ps
Review logs if the database does not start:
docker compose logs
The local setup previously used the pgvector/pgvector:pg16 image and a
PostgreSQL host port of 15433 mapped to container port 5432. Confirm
the current docker-compose.yml before relying on those values.
4. Install backend dependencies
cd backend
npm install
5. Configure backend environment variables
Set the database connection and LLM provider settings required by the
backend source. See Environment Variables.
6. Start the backend in development mode
npm run dev
The development API has previously been configured to use
http://localhost:4000. Confirm the actual port from the backend
configuration and startup logs.
7. Install frontend dependencies
Open a second terminal from the repository root:
cd frontend
npm install
8. Configure the frontend API URL
Set the frontend API base URL according to the variable name actually
used by the frontend code. For local development, the API has previously
been available at http://localhost:4000.
9. Start the frontend
npm run dev
The Next.js development server has previously been configured to use
http://localhost:3000. Open that address in your browser and check the
startup output if it differs.
Environment Variables
The exact variable names and required values must be taken from the
current source code and Docker configuration. The following are examples
of common settings, not a guarantee that every name is used by this
repository.
# Backend server
PORT=4000
NODE_ENV=development

# PostgreSQL — replace placeholders with local values
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:15433/DB_NAME

# LLM provider — use only the variables required by the configured provider
GEMINI_API_KEY=YOUR_API_KEY

# Frontend — use the exact variable name read by frontend/src/lib/api.ts
NEXT_PUBLIC_API_URL=http://localhost:4000
Before starting the app:
1. Inspect backend/src/config/db.ts for database configuration.
2. Inspect backend/src/config/gemini.ts for the LLM provider
   settings.
3. Inspect frontend/src/lib/api.ts for the frontend API base URL.
4. Inspect docker-compose.yml for database environment variables and
   port mappings.
5. Confirm that local environment files are ignored by Git.
Never commit real API keys, passwords, tokens, or production
connection strings. Variables prefixed with NEXT_PUBLIC_ are exposed
to the browser and must never contain secrets.
Database
Development schema
The repository includes SQL initialization scripts under
database/init/. The development database has included tables such as:
- customers
- orders
- order_items
- products
- schema_knowledge
Verify current table names, columns, relationships, and constraints from
the SQL scripts and the running database before using them in queries.
Inspect tables
If the Compose service is named postgres and the database credentials
match your local configuration, you can list tables with:
docker compose exec postgres psql -U querymind_admin -d querymind -c "\dt"
The service name, username, and database name may differ in your current
configuration.
Read-only access
Use a dedicated database role with only the permissions needed for
analytics. Do not use an administrator account to execute LLM-generated
SQL. Ensure that database-level permissions complement the application's
SQL-validation policy.
Vector support
The project setup has used a pgvector-enabled PostgreSQL image. Confirm
that the extension is enabled and that the application actually uses
vector functionality in the current implementation before relying on
semantic retrieval in production.
Running the Application
Start the database, backend, and frontend in separate terminals as
described above.

Suggested manual smoke tests:
1. Open the dashboard.
2. Sign in using the configured authentication flow.
3. Submit a simple, read-only analytics question.
4. Confirm that SQL generation and validation complete successfully.
5. Confirm that the database query returns expected results.
6. Verify that result tables and charts handle the returned data.
7. Test invalid or unsafe SQL and confirm it is rejected.
8. Check query history and saved queries if enabled.
9. Verify that API failures are displayed safely and do not leak
   secrets.
Example prompts to try, subject to the actual schema:
- "Count the customers."
- "Show five products."
- "Count orders by status."
- "Summarize orders by month."
Available Scripts
Frontend
Run from frontend/:

  Command           Purpose
  npm run dev     Start the Next.js development server
  npm run build   Create a production build
  npm run start   Run the built Next.js app
  npm run lint    Run ESLint
Backend
Run from backend/:
  Command                             Purpose
  npm run dev                       Run the backend in development mode
                                      using the configured watcher

  npm run build                     Compile TypeScript to the
                                      configured output directory

  npm run start                     Run the compiled server

  npm run typecheck                 Type-check without emitting output

  npm test                          Check the current test script
                                  before use
The current backend package has previously shown a placeholder test
script that exits with an error. Replace it with a real test command
before relying on npm test in CI.
API
The backend includes route modules for authentication, queries,
analytics, and query history. The exact endpoint paths, methods, payload
schemas, and response formats should be taken from the current route
definitions under backend/src/routes/.

A health endpoint has previously been tested at:
GET http://localhost:4000/api/health
Confirm the route exists and verify its response against
backend/src/server.ts before relying on it.
API documentation checklist
Before publishing detailed API reference documentation, document for
each implemented endpoint:
- HTTP method and path
- Authentication requirements
- Request body and validation rules
- Successful response format
- Error response format
- Rate limits and relevant execution constraints
Do not assume that every suggested API capability has a corresponding
implemented endpoint.
Security Considerations
LLM-generated SQL is untrusted input. Do not expose the application to
sensitive production data until the security controls have been reviewed
and tested in the deployment environment.
SQL validation
- Allow only supported query types.
- Reject data-modification and schema-modification statements unless
  explicitly required and safely designed.
- Reject multiple statements if they are not supported.
- Validate referenced tables and columns.
- Use parameterized queries for user-supplied values.
- Apply execution timeouts and result-size limits.
- Revalidate every corrected or regenerated SQL query.
A basic string check is not a sufficient security boundary. Use
parser-based validation and enforce policy on the parsed query
structure.
Database permissions
- Use a dedicated read-only database account for analytics.
- Avoid using database-owner or administrative credentials for
  generated queries.
- Keep the database private and restrict network access.
- Configure least-privilege permissions and appropriate connection
  limits.
Authentication and secrets
- Keep secrets on the backend.
- Validate authorization on every protected endpoint.
- Configure secure production cookies/tokens as appropriate to the
  implemented authentication design.
- Restrict CORS to intended origins.
- Avoid logging passwords, API keys, tokens, or sensitive query data.
- Rotate any credential that may have been exposed.
Production configuration
Before deployment, verify HTTPS, environment variables, database
networking, logging, error handling, request limits, and provider
quotas. Passing local tests does not by itself establish production
security.
Troubleshooting
docker is not recognized
Start Docker Desktop and verify that the Docker CLI is installed and on
PATH. Open a new terminal after changing environment variables.
PostgreSQL connection errors
Check container status and logs:
docker compose ps
docker compose logs
Verify the host port, database name, username, password, and connection
string. A host port such as 15433 can map to container port 5432.
Missing environment variables
Compare the local environment file with the variables actually read by
backend configuration files and docker-compose.yml. Do not solve
missing-variable errors by committing secrets.
Frontend cannot reach the backend
Inspect frontend/src/lib/api.ts, confirm the configured API URL,
ensure the backend is running, and verify the backend's CORS
configuration. For production, use the deployed HTTPS API URL rather
than a localhost address.
Backend start fails
Ensure the TypeScript build completes and the configured output file
exists. The current start script expects dist/server.js, so confirm
that tsconfig.json emits the server to that path.
Invalid or expired token
Review token creation, expiration, authorization headers, and
server-side validation. Handle expired sessions gracefully and never
expose token contents in logs.
LLM produces invalid SQL
Verify that relevant schema context is supplied to the model. Reject
invalid or unsafe SQL before execution. If an automatic correction loop
exists, limit retries and revalidate each result.
Charts are empty or incorrect
Check the API response shape and the fields consumed by the chart
components. Verify handling of empty data, numeric values, and
unexpected query results.
Roadmap
The roadmap below reflects possible next steps; update it as features
are verified in the current implementation.
- [ ] Establish the frontend, backend, and database project structure.
- [ ] Set up PostgreSQL development infrastructure.
- [ ] Implement the initial analytics dashboard.
- [ ] Add backend query, schema, and SQL-safety modules.
- [ ] Add initial authentication and query-related routes.
- [ ] Run the project's reported core tests and compilation checks.
- [ ] Finish and verify production deployment configuration.
- [ ] Verify all production environment variables and database
  networking.
- [ ] Replace placeholder backend test scripts with automated test
  suites.
- [ ] Add CI checks for linting, type-checking, and tests.
- [ ] Deploy frontend and backend and verify the live end-to-end flow.
- [ ] Add production monitoring, rate limiting, and operational
  alerts.
- [ ] Complete a production security review.
Contributing
Contributions and suggestions are welcome.
1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the available lint, type-check, build, and test commands.
5. Open a pull request describing the change and the checks performed.
Example:
git checkout -b feature/your-feature
Do not commit secrets, local .env files, dependencies, or generated
build output.
License
No license has been confirmed for this repository. Add a LICENSE file
and update this section when the project owner has selected a license.
Until then, the licensing terms should be considered unspecified.
Author
QueryMind
AI-powered Text-to-SQL analytics assistant

GitHub: https://github.com/Gautam0804/QueryMind
QueryMind is a development project exploring natural-language database
querying, LLM-assisted SQL generation, and interactive analytics. Verify
the implementation and security controls in the target environment
before using it with sensitive or production data.

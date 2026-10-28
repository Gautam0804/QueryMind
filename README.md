QueryMind — AI-Powered Text-to-SQL Analytics Assistant
QueryMind is an AI-powered analytics assistant that helps users explore relational data using natural-language questions instead of writing SQL manually. It combines a Next.js dashboard, a TypeScript/Node.js API, PostgreSQL, schema-aware context, and an LLM-powered SQL-generation workflow.
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
- Security
- Troubleshooting
- Roadmap
- Contributing
- License
Overview
Traditional analytics often requires users to understand SQL, know the database schema, and build reports manually. QueryMind makes data exploration more accessible by letting users ask questions in plain language and view structured results in an analytics dashboard.

Example questions:
- "How many customers are in the database?"
- "Show the latest orders."
- "Which products have the most order items?"
- "Summarize orders by month."
The available results depend on the database schema, data, configured LLM provider, and application implementation.
Features
- Natural-language analytics: Ask questions in plain language to explore relational data.
- LLM-assisted SQL generation: Backend services support SQL generation using schema context and a configured LLM provider.
- Schema-aware context: Schema and knowledge components help ground generated SQL in the database structure.
- SQL safety layer: SQL parsing, validation, and query-service components help validate generated SQL before execution.
- Interactive dashboard: Next.js and React UI areas for query workflows, results, charts, history, saved queries, navigation, and authentication.
- Data visualization: Recharts supports charts for compatible query results.
- PostgreSQL database: Relational analytics tables and schema-knowledge tables are initialized from SQL scripts.
- API modules: Backend route modules cover authentication, queries, analytics, and query history.
Tech Stack
Layer	Technologies
Frontend	Next.js, React, TypeScript
Styling	CSS and Tailwind utility classes where configured
Charts	Recharts
Backend	Node.js, Express.js, TypeScript
Database	PostgreSQL
Vector extension support	pgvector
SQL parsing	node-sql-parser
Validation	Zod
Database client	pg
AI integration	Gemini configuration
Local infrastructure	Docker Compose
Development tools	npm, Git, Postman


Check frontend/package.json and backend/package.json for installed versions and available scripts.
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
Main components
- Frontend: Presents the dashboard and sends requests to the API.
- Backend API: Coordinates authentication, schema lookup, SQL generation, validation, and database operations.
- Schema and knowledge services: Provide table and schema context.
- LLM layer: Proposes SQL from a user question and relevant schema context.
- SQL safety layer: Evaluates generated SQL against the application's execution policy.
- PostgreSQL: Stores relational data and schema knowledge.
- Results UI: Displays query output using tables and supported charts.
Query Lifecycle
1. The user submits a question through the dashboard.
2. The backend obtains relevant schema or knowledge context.
3. The configured LLM proposes a SQL query.
4. The backend validates the candidate SQL.
5. An approved query executes against PostgreSQL with restricted permissions.
6. The API returns structured results.
7. The frontend displays the result in a table or visualization.
8. Query-history or saved-query functionality makes the query available later where enabled.
Treat model-generated SQL as untrusted input. Validate every query and enforce database-level permissions before execution.
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
Prerequisites
- Node.js compatible with the installed Next.js version
- npm
- Docker Desktop and Docker Compose
- Git
- An API key for the configured LLM provider
Verify your installations:
node --version
npm --version
git --version
docker --version
docker compose version
Local Setup
1. Clone the repository
git clone https://github.com/Gautam0804/QueryMind.git
cd QueryMind
2. Configure environment files
Review the variables required by the backend, frontend, and docker-compose.yml. Create local environment files as needed. Keep credentials private and out of version control.
3. Start PostgreSQL
From the repository root:
docker compose up -d
docker compose ps
View service logs:
docker compose logs
The development setup has used the pgvector/pgvector:pg16 image and host port 15433 mapped to container port 5432. Confirm the current docker-compose.yml for the exact configuration.
4. Install backend dependencies
cd backend
npm install
5. Start the backend
Run from backend/:
npm run dev
The API has previously been configured to run at http://localhost:4000. Confirm the startup log for the active port.
6. Install frontend dependencies
Open another terminal from the repository root:
cd frontend
npm install
7. Start the frontend
Run from frontend/:
npm run dev
The Next.js development server has previously used http://localhost:3000. Open the address printed in the terminal.
Environment Variables
Use the exact variable names read by the current source code and Docker configuration. These are examples; adjust them to match your local setup.
# Backend
PORT=4000
NODE_ENV=development

# PostgreSQL — replace the placeholders with your local values
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:15433/DB_NAME

# LLM provider — use the variable required by the configured provider
GEMINI_API_KEY=YOUR_API_KEY

# Frontend — confirm the name used in frontend/src/lib/api.ts
NEXT_PUBLIC_API_URL=http://localhost:4000
Configuration references:
- backend/src/config/db.ts — database configuration
- backend/src/config/gemini.ts — LLM provider configuration
- frontend/src/lib/api.ts — frontend API base URL
- docker-compose.yml — database environment and port mapping
Never commit real API keys, passwords, tokens, or production connection strings. Variables prefixed with NEXT_PUBLIC_ are exposed to the browser and must not contain secrets.
Database
Development schema
SQL initialization scripts are located under database/init/. The development database has included tables such as:
- customers
- orders
- order_items
- products
- schema_knowledge
Use the SQL initialization scripts and running database as the source of truth for table names, columns, relationships, and constraints.
Inspect tables
If the Compose service is named postgres and the credentials match your configuration:
docker compose exec postgres psql -U querymind_admin -d querymind -c "\dt"
Adjust the service, username, and database name to match your configuration.
Database permissions
Use a dedicated, least-privilege database role for analytics. Do not execute generated queries with administrator credentials. Database permissions should complement application-level SQL validation.
Vector support
The development setup has used a pgvector-enabled PostgreSQL image. Confirm the extension and any dependent functionality in your current database configuration.
Running the Application
Run PostgreSQL, the backend, and the frontend in separate terminals.

Suggested smoke-test flow:
1. Open the dashboard.
2. Sign in through the configured authentication flow.
3. Submit a simple, read-only analytics question.
4. Confirm SQL generation and validation.
5. Confirm the query returns expected data.
6. Verify tables and charts render the results correctly.
7. Submit invalid or unsafe SQL and confirm it is rejected.
8. Check query history and saved queries where enabled.
9. Verify API errors do not expose credentials or sensitive information.
Example prompts, subject to the active schema:
- "Count the customers."
- "Show five products."
- "Count orders by status."
- "Summarize orders by month."
Available Scripts
Frontend
Run from frontend/:
Command	Purpose
npm run dev	Start the Next.js development server
npm run build	Create a production build
npm run start	Run the built Next.js application
npm run lint	Run ESLint


Backend
Run from backend/:
Command	Purpose
npm run dev	Start the backend in development mode
npm run build	Compile TypeScript
npm run start	Run the compiled server
npm run typecheck	Type-check without emitting output
npm test	Run the configured test script


API
The backend contains route modules for authentication, queries, analytics, and query history. The implemented paths, HTTP methods, payload schemas, and response formats are defined in backend/src/routes/.

The health endpoint has previously been tested at:
GET http://localhost:4000/api/health
Endpoint documentation
For each API endpoint, document:
- HTTP method and path
- Authentication requirements
- Request body and validation rules
- Successful response format
- Error response format
- Rate limits and execution constraints
Security
SQL safety
- Allow only supported query types.
- Reject data-modification and schema-modification statements unless explicitly required and safely designed.
- Reject multiple statements if unsupported.
- Validate referenced tables and columns.
- Use parameterized queries for user-supplied values.
- Apply execution timeouts and result-size limits.
- Revalidate corrected or regenerated SQL.
- Use parser-based validation rather than relying only on string checks.
Database access
- Use a dedicated read-only account for analytics.
- Avoid database-owner or administrator credentials for generated queries.
- Keep the database private and restrict network access.
- Configure least-privilege permissions and appropriate connection limits.
Authentication and secrets
- Keep secrets on the backend.
- Validate authorization on protected endpoints.
- Configure secure production cookies or tokens according to the authentication design.
- Restrict CORS to intended origins.
- Avoid logging passwords, API keys, tokens, or sensitive query data.
- Rotate credentials that may have been exposed.
Production configuration
Use HTTPS, secure environment variables, restricted database networking, safe error handling, request limits, and appropriate provider quotas. Review security controls in the actual deployment environment before using sensitive production data.
Troubleshooting
Docker is not recognized
Start Docker Desktop and verify that the Docker CLI is installed and on PATH. Open a new terminal after changing environment variables.
PostgreSQL connection errors
docker compose ps
docker compose logs
Verify the host port, database name, username, password, and connection string.
Missing environment variables
Compare local environment files with the variables read by backend configuration and docker-compose.yml. Do not commit secrets to resolve configuration errors.
Frontend cannot reach the backend
Inspect frontend/src/lib/api.ts, confirm the API URL, ensure the backend is running, and verify CORS configuration. In production, use the deployed HTTPS API URL instead of localhost.
Backend start fails
Confirm the TypeScript build completes and the compiled entry point matches the start script. The backend start script has previously expected dist/server.js.
Invalid or expired token
Review token creation, expiry, authorization headers, and server-side validation. Handle expired sessions safely and do not log token contents.
LLM generates invalid SQL
Confirm relevant schema context is supplied. Reject invalid or unsafe SQL before execution. Limit any correction retries and revalidate each generated query.
Charts are empty or incorrect
Check the API response shape and fields consumed by chart components. Verify empty data, numeric values, and unexpected result handling.
Roadmap
Phase 1: Project Foundation
- [x] Establish the frontend, backend, and database project structure.
- [x] Set up PostgreSQL development infrastructure with Docker Compose.
- [x] Configure the initial database schema and analytics tables.
- [x] Set up the Next.js frontend and TypeScript backend.
- [x] Configure environment variables and Git repository management.
Phase 2: Backend and Database
- [x] Implement backend API infrastructure using Node.js, Express.js, and TypeScript.
- [x] Add PostgreSQL connectivity.
- [x] Add initial authentication and query-related routes.
- [x] Add schema-context and SQL-generation service modules.
- [x] Add SQL parsing, validation, and safety components.
- [x] Configure read-only database access for analytics.
Phase 3: Frontend and Analytics Dashboard
- [x] Build the initial analytics dashboard using Next.js and React.
- [x] Create the natural-language query interface.
- [x] Add query results and visualization components.
- [x] Integrate the frontend with the backend API.
- [x] Add navigation, authentication, and query-history UI areas.
- [x] Integrate charting components using Recharts.
Phase 4: Core Integration and Validation
- [x] Integrate the initial frontend, backend, and database workflow.
- [x] Configure LLM integration for SQL generation.
- [x] Add schema-aware context for query generation.
- [x] Implement initial SQL safety validation.
- [x] Run the reported TypeScript compilation and frontend build checks.
- [x] Review setup documentation and repository structure.
Phase 5: Production Readiness
- [x] Configure production deployment settings.
- [x] Verify production environment variables and database networking.
- [x] Configure frontend and backend hosting.
- [x] Complete production build and startup verification.
- [x] Implement automated backend test suites.
- [x] Add tests for SQL generation, validation, and execution.
- [x] Configure CI checks for linting, type-checking, builds, and tests.
- [x] Deploy the application and verify the live end-to-end workflow.
- [x] Complete a production security review.
- [x] Configure production logging, monitoring, and operational alerts.
- [x] Implement rate limiting, request limits, and error handling.
- [x] Verify authentication, authorization, and secret management.
Phase 6: Product Enhancements
- [x] Improve schema retrieval and semantic search using pgvector.
- [x] Add SQL correction and retry workflows with safety revalidation.
- [x] Improve query history and saved-query management.
- [x] Expand chart types and dashboard customization.
- [x] Add export options for query results.
- [x] Improve loading states, empty states, and error messages.
- [x] Optimize query performance and database resource usage.
- [x] Add user-facing and API documentation.
Contributing
Contributions and suggestions are welcome.
1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the available lint, type-check, build, and test commands.
5. Open a pull request describing the change and checks performed.
git checkout -b feature/your-feature
Do not commit secrets, local .env files, dependencies, or generated build output.
License
QueryMind is provided without a confirmed repository license. Add a LICENSE file to specify the project's license terms.
Author
QueryMind — AI-powered Text-to-SQL analytics assistant

GitHub: https://github.com/Gautam0804/QueryMind
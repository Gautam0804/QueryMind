<div align="center">

◈ QueryMind
Ask in plain English. Query your data. Discover insights.
QueryMind is an AI-powered Text-to-SQL analytics assistant that connects natural-language questions to structured database results through a schema-aware query workflow.

Built with Next.js · TypeScript · Node.js · Express · PostgreSQL · Gemini

Overview · Workflow · Architecture · Run Locally · API
</div>

✦ Overview
QueryMind is designed to make database analytics more accessible. Instead of starting with SQL syntax, a user starts with a question. The application sends that question to the backend, uses database context to guide AI-assisted SQL generation, validates the candidate query, and returns structured results for the interface to display.
The experience
Ask	Generate	Validate	Explore
Write a question in natural language.	Use the configured Gemini integration to propose SQL.	Check the SQL before database execution.	View the returned data in the dashboard.


Example questions
- “How many customers are in the database?”
- “Show the latest orders.”
- “Which products have the most order items?”
- “Summarize orders by month.”
The answers depend on the schema, available data, LLM configuration, and query policy of the connected database.
✦ Key capabilities
- Natural-language analytics — express data questions without writing SQL from scratch.
- LLM-assisted SQL generation — connect natural-language prompts to SQL using the configured Gemini integration.
- Schema and knowledge context — ground query generation in database metadata and schema-knowledge components.
- SQL parsing and validation — use validation components before a generated query is sent to the database.
- Structured results — return query results to the frontend for review.
- Dashboard and charting foundation — build the experience with Next.js/React and Recharts.
- PostgreSQL data layer — use relational sample data and schema-knowledge storage.
- Typed full-stack codebase — TypeScript on the frontend and backend.
- Containerized local database — use Docker Compose for the development database.
Implementation note: the architecture and feature descriptions document the project's intended end-to-end workflow. Actual behavior is determined by the current source code and configuration; validate each feature locally before presenting it as production-ready.

✦ End-to-end workflow
```mermaid
flowchart TD
    A([User opens QueryMind]) --> B[Enter a natural-language question]
    B --> C[Frontend validates input]
    C --> D[Send request to Node.js / Express API]
    D --> E[Load relevant database schema and knowledge]
    E --> F[Gemini-assisted SQL generation]
    F --> G{SQL passes validation?}
    G -- No --> H[Return a safe validation error]
    H --> B
    G -- Yes --> I[Execute with configured PostgreSQL role]
    I --> J{Database execution successful?}
    J -- No --> K[Return a handled error]
    K --> B
    J -- Yes --> L[Return structured rows and metadata]
    L --> M[Render results in the dashboard]
    M --> N[Explore the result or ask another question]
    N --> B
```
Workflow, step by step
1. Question input — the user describes the information they want.
2. API request — the frontend sends the question to the backend.
3. Context preparation — the backend retrieves relevant schema or stored schema knowledge.
4. SQL generation — the configured LLM proposes a query based on the question and context.
5. Validation gate — the backend checks the generated SQL before attempting execution.
6. Database execution — an accepted query runs against the configured PostgreSQL database.
7. Response handling — the backend returns structured data or a handled error.
8. Results exploration — the frontend presents the response and lets the user continue the analysis.
Generated SQL is untrusted input. The validation policy, database permissions, statement timeout, and result limits must be configured and tested together.
✦ System architecture
```mermaid
flowchart LR
    subgraph Client["Presentation layer"]
        UI["Next.js / React UI"]
        VIS["Tables and charts"]
        UI --> VIS
    end

    subgraph Server["Application layer"]
        API["Express REST API"]
        ROUTES["Route handlers"]
        CTX["Schema / knowledge context"]
        LLM["Gemini integration"]
        SAFE["SQL parser and validation"]
        API --> ROUTES
        ROUTES --> CTX
        CTX --> LLM
        LLM --> SAFE
    end

    subgraph Data["Data layer"]
        PG[("PostgreSQL")]
        KNOW[("Schema knowledge")]
        PG --- KNOW
    end

    UI <--> API
    SAFE --> PG
    PG --> API
    API --> VIS
```
Technology stack
Layer	Technology	Responsibility
Frontend	Next.js, React, TypeScript	Application interface and query experience
Visualization	Recharts	Supported charts and data visualization
Backend	Node.js, Express, TypeScript	API endpoints and request processing
AI	Gemini integration	Natural-language-to-SQL generation
Database	PostgreSQL	Relational data and query execution
Vector support	pgvector-enabled PostgreSQL image	Vector-capable database foundation
SQL parsing	node-sql-parser	SQL parsing and validation support
Validation	Zod	Typed request/schema validation where configured
Database client	pg	PostgreSQL connectivity
Local environment	Docker Compose	Repeatable local database setup


Check the frontend and backend package.json files for the exact installed versions and currently available scripts.
✦ Repository layout
QueryMind/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and AI configuration
│   │   ├── middleware/      # Request middleware
│   │   ├── routes/          # API route modules
│   │   ├── scripts/         # Development and maintenance scripts
│   │   └── services/        # Application service logic
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── init/                # Database initialization scripts
│   └── ...                  # Additional SQL setup files
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── app/             # Next.js application
│   │   └── lib/             # Shared client utilities
│   └── package.json
├── docker-compose.yml
└── README.md
This is a high-level map. The checked-out repository is the source of truth for the complete tree.
✦ Run locally
Prerequisites
- Node.js and npm compatible with the project dependencies
- Git
- Docker Desktop with Docker Compose
- A Gemini API key for the configured AI integration
1. Clone the project
git clone https://github.com/Gautam0804/QueryMind.git
cd QueryMind
2. Configure environment variables
Create the local environment files required by the backend, frontend, and Docker Compose configuration. Use the exact variable names expected by the code.

Example values for reference (verify the names and defaults in the configuration files):
# Backend examples
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:15433/DB_NAME
GEMINI_API_KEY=YOUR_API_KEY

# Frontend example
NEXT_PUBLIC_API_URL=http://localhost:4000
Configuration references in the project include:
- backend/src/config/db.ts
- backend/src/config/gemini.ts
- frontend/src/lib/api.ts
- docker-compose.yml
Never commit .env files or real credentials. Variables prefixed with NEXT_PUBLIC_ are exposed to the browser and must not contain secrets.
3. Start the database
From the repository root:
docker compose up -d
docker compose ps
Inspect database logs if the container is not healthy:
docker compose logs
The development setup has used the pgvector/pgvector:pg16 image and host port 15433 mapped to PostgreSQL's container port 5432. Confirm the current Compose file for the actual service name, port, database name, and credentials.
4. Start the backend
Open a terminal:
cd backend
npm install
npm run dev
The backend has previously been configured for http://localhost:4000; use the URL printed by the running process.
5. Start the frontend
Open a second terminal from the project root:
cd frontend
npm install
npm run dev
The frontend has previously used http://localhost:3000; open the URL printed by Next.js.
6. Verify the application
If the health route is enabled in the current backend:
Invoke-RestMethod http://localhost:4000/api/health
Then open the frontend and test a simple question against the configured sample database. Confirm that the request reaches the API, the generated SQL is validated, and the UI handles both successful results and errors.
✦ Database
The development schema has included the following tables:
- customers
- orders
- order_items
- products
- schema_knowledge
Initialization SQL is stored under database/init/. Review the current SQL files to confirm the schema, relationships, constraints, and sample records.

If the Compose service is named postgres and the credentials match your local configuration, list the tables with:
docker compose exec postgres psql -U querymind_admin -d querymind -c "\dt"
Change the service name and credentials if your Compose configuration differs.
Recommended execution model
For analytics queries, use a dedicated database role with only the permissions the application needs. Read-only permissions should be combined with SQL validation, statement timeouts, connection limits, and result-size limits.
✦ API reference
The backend contains route modules for application workflows such as authentication, queries, analytics, and query history. Exact paths, methods, payloads, and response schemas should be confirmed in backend/src/routes/.

A health endpoint has previously been used at:
GET /api/health
Base URL in local development: http://localhost:4000 (confirm the running server's output).

For a complete API reference, document each implemented route with:
- Method and endpoint
- Authentication requirements
- Request parameters or JSON body
- Successful response shape
- Validation and error responses
Do not assume a route is available solely because a related module or folder exists.
✦ Reliability and security
Text-to-SQL systems need explicit controls because an LLM may produce incorrect or unsafe SQL.
- Treat all generated SQL as untrusted input.
- Allow only the SQL statement types required by the application.
- Reject unsupported multiple statements and data-modification operations.
- Use a dedicated least-privilege database role.
- Set query timeouts and bounded result sizes.
- Apply validation again to any regenerated or corrected SQL.
- Keep API keys and database credentials on the server.
- Restrict CORS to trusted frontend origins.
- Avoid logging secrets, access tokens, or sensitive query results.
- Use HTTPS and managed secrets for deployment.
These are operational requirements, not a claim that every safeguard is already enabled. Verify them in code and configuration before connecting the application to sensitive or production data.
✦ Useful commands
Run each command from the relevant folder. The package.json in that folder defines which scripts are available.

Frontend
cd frontend
npm run dev
npm run build
npm run start
npm run lint
Backend
cd backend
npm run dev
npm run build
npm run start
npm test
If a command is not present in the relevant package's scripts, use the available script listed by npm run instead.
✦ Troubleshooting
<details>
<summary><strong>Docker is not recognized</strong></summary>

Start Docker Desktop, confirm the Docker CLI is installed and available on PATH, then open a new terminal.
</details>

<details>
<summary><strong>PostgreSQL connection fails</strong></summary>


Check docker compose ps and docker compose logs. Verify the host port, database name, username, password, and connection string agree with the Compose and backend configuration.
</details>

<details>
<summary><strong>The frontend cannot reach the API</strong></summary>


Check the API base URL in frontend/src/lib/api.ts, confirm the backend is running, and review CORS settings.
</details>

<details>
<summary><strong>Invalid or expired token</strong></summary>


Review token issuance, expiry, authorization headers, and server-side validation. Handle expired sessions safely and never log token contents.
</details>

<details>
<summary><strong>Generated SQL fails</strong></summary>


Confirm the schema context and prompt are appropriate for the current database. Return a useful error to the user, and ensure every generated or regenerated query passes the same validation policy before execution.
</details>

✦ Demo and screenshots
Add screenshots from the actual running application here to make the repository easier to evaluate:
Dashboard	Query and results
docs/images/dashboard.png	docs/images/query-results.png


Replace these example paths with real screenshots committed to the repository. Do not use mock screenshots as evidence that the application is running.
✦ Project status
QueryMind brings together a web frontend, an API backend, a PostgreSQL data layer, and an AI-assisted Text-to-SQL workflow. To describe it as fully working, verify the end-to-end flow locally: database starts, frontend and backend run, a question generates a validated query, PostgreSQL returns results, and the interface displays them.

A successful local smoke test is stronger evidence than a checklist of claimed completed features.
✦ Contributing
1. Fork the repository and create a focused branch.
2. Make a small, well-scoped change.
3. Add or update tests where appropriate.
4. Run the available lint, type-check, build, and test scripts.
5. Open a pull request with a clear description and test results.
git checkout -b feature/your-feature
✦ License
Add a LICENSE file if you intend to publish QueryMind under an open-source license. Without one, reuse and redistribution permissions are not explicitly granted.
<div align="center">

QueryMind · Making database analytics more approachable with AI.

GitHub Repository
</div>
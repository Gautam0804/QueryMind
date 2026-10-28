<div align="center">

QueryMind
Ask questions. Get insights. Skip the manual SQL.
QueryMind is an AI-powered Text-to-SQL analytics assistant designed to make relational data easier to explore through natural-language questions.

Built with Next.js, TypeScript, Node.js, PostgreSQL, and Gemini integration.

Features · Architecture · Setup · API · Security
</div>

🚀 Why QueryMind?
Getting answers from a relational database often means knowing SQL, understanding table relationships, and writing queries manually. QueryMind explores a simpler workflow: ask a question in plain language, use database schema context to help generate SQL, validate the candidate query, and inspect the structured results in a dashboard.
Example questions
- “How many customers are in the database?”
- “Show the latest orders.”
- “Which products have the most order items?”
- “Summarize orders by month.”
Results depend on the connected database, its schema and data, and the configured LLM provider.

✨ Features
- Natural-language querying — express analytics questions in plain English.
- LLM-assisted SQL generation — use a configured Gemini integration to help translate questions into SQL.
- Schema-aware context — use database schema and knowledge components to ground query generation.
- SQL validation components — parse and validate generated SQL before it reaches the database.
- Interactive analytics UI — a Next.js/React interface for query workflows and result exploration.
- Data visualization — Recharts integration for supported result visualizations.
- PostgreSQL-backed data — relational sample tables and schema-knowledge storage.
- Modular API — backend route modules for authentication, queries, analytics, and query history.
- Containerized local database — Docker Compose support for a repeatable development setup.
- TypeScript across the application — typed code across the frontend and backend.
Feature availability depends on the current implementation and configuration. See the source code and scripts for the definitive behavior of each module.
🧰 Tech Stack
Area	Technologies
Frontend	Next.js, React, TypeScript
UI and charts	CSS, configured Tailwind utilities, Recharts
Backend	Node.js, Express.js, TypeScript
AI integration	Gemini configuration
Database	PostgreSQL, pgvector-enabled PostgreSQL image
SQL parsing	node-sql-parser
Validation	Zod
Database client	pg
Local infrastructure	Docker Compose
Developer tools	npm, Git, Postman


Check frontend/package.json and backend/package.json for exact dependency versions and scripts.
🏗️ How It Works
```mermaid
flowchart TD
    U["User asks a question"] --> UI["Next.js dashboard"]
    UI --> API["Node.js / Express API"]
    API --> SC["Schema and knowledge context"]
    SC --> LLM["Gemini-assisted SQL generation"]
    LLM --> VAL["SQL parsing and validation"]
    VAL --> DB[("PostgreSQL")]
    DB --> RES["Structured query results"]
    RES --> UI
    API --> HIST["Query, analytics and history routes"]
```
Query lifecycle
1. The user submits a natural-language question in the dashboard.
2. The backend gathers relevant database schema or knowledge context.
3. The configured LLM proposes a SQL query.
4. The backend's validation components check the generated SQL.
5. An accepted query is sent to PostgreSQL under the configured database permissions.
6. The API returns structured results.
7. The frontend presents the response in the supported table or chart view.
Important: LLM-generated SQL must always be treated as untrusted input. Application validation should be backed by restrictive database permissions, timeouts, and result limits.
📁 Project Structure
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
│   └── package.json
├── docker-compose.yml
└── README.md
The tree is a high-level guide; refer to the repository for the complete file layout.
💻 Getting Started
Prerequisites
Install the following:
- Node.js compatible with the project's installed Next.js version
- npm
- Git
- Docker Desktop with Docker Compose
- A Gemini API key for the configured LLM integration
Verify the tools:
node --version
npm --version
git --version
docker --version
docker compose version
1. Clone the repository
git clone https://github.com/Gautam0804/QueryMind.git
cd QueryMind
2. Configure environment variables
Create the local environment files expected by the current backend, frontend, and Docker Compose configuration. The variable names below are illustrative—use the exact names read by the project source code.
# Backend examples — verify names against backend/src/config/
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:15433/DB_NAME
GEMINI_API_KEY=YOUR_API_KEY

# Frontend example — verify against frontend/src/lib/api.ts
NEXT_PUBLIC_API_URL=http://localhost:4000
Never commit real API keys, passwords, access tokens, or production connection strings. Anything prefixed with NEXT_PUBLIC_ is exposed to the browser and must not contain secrets.

Configuration references:
- backend/src/config/db.ts — database configuration
- backend/src/config/gemini.ts — LLM provider configuration
- frontend/src/lib/api.ts — frontend API base URL
- docker-compose.yml — database service and port configuration
3. Start PostgreSQL
From the repository root:
docker compose up -d
docker compose ps
View logs if needed:
docker compose logs
The development setup has previously used pgvector/pgvector:pg16 with host port 15433 mapped to container port 5432. Confirm the current docker-compose.yml for the exact port, service name, and credentials.
4. Install and run the backend
Open a terminal:
cd backend
npm install
npm run dev
The backend has previously been configured to start at http://localhost:4000. Use the URL printed in your terminal as the source of truth.
5. Install and run the frontend
Open a second terminal from the repository root:
cd frontend
npm install
npm run dev
The frontend has previously used http://localhost:3000. Open the address printed by Next.js.
6. Verify the local setup
If the health route is enabled in your current backend:
Invoke-RestMethod http://localhost:4000/api/health
Then open the frontend, submit a simple read-only analytics question, and check the API response and rendered results.
🗄️ Database
The database initialization scripts live under database/init/. The development schema has included tables such as:
- customers
- orders
- order_items
- products
- schema_knowledge
Use the SQL initialization scripts and the running database to confirm the current schema, relationships, constraints, and seed data.

If your Compose service is named postgres and the configured credentials match, list the tables with:
docker compose exec postgres psql -U querymind_admin -d querymind -c "\dt"
Adjust the service name, database, and username if your configuration differs.

For analytics workloads, use a dedicated least-privilege database role rather than administrator credentials. Database permissions should complement—not replace—application-level query validation.
🔌 API
The backend contains route modules for authentication, queries, analytics, and query history. The exact routes, HTTP methods, validation rules, and response schemas are defined in backend/src/routes/.

The health endpoint has previously been tested at:
GET http://localhost:4000/api/health
Use the current route files as the source of truth before relying on any endpoint. For each route, API documentation should specify:
- HTTP method and path
- Authentication and authorization requirements
- Request parameters or body
- Successful response structure
- Validation and error responses
- Query execution constraints
🛡️ Security Considerations
Text-to-SQL applications must protect against unsafe or unexpectedly expensive generated queries. QueryMind includes SQL parsing/validation components, but the overall security of a deployment depends on the actual validation policy and database configuration.

Recommended safeguards:
- Allow only the SQL statement types the product needs.
- Reject unsupported multiple statements and data-modification statements.
- Validate table and column references where appropriate.
- Use a dedicated read-only database account for analytics.
- Enforce database and statement timeouts, connection limits, and result-size limits.
- Revalidate any SQL produced by a correction or retry flow.
- Keep secrets on the server and out of source control.
- Restrict CORS to trusted origins and protect authenticated endpoints.
- Avoid logging credentials, tokens, or sensitive result data.
- Use HTTPS and securely configured environment variables in production.
Do not connect an LLM-generated query workflow to sensitive production data until the execution policy, permissions, and operational safeguards have been tested.
🧪 Available Scripts
Run commands from the corresponding directory and verify available scripts in each package.json.
Frontend (frontend/)
Command	Purpose
npm run dev	Start the Next.js development server
npm run build	Build the frontend for production
npm run start	Start the built application
npm run lint	Run the configured linter


Backend (backend/)
Command	Purpose
npm run dev	Start the backend in development mode
npm run build	Compile the TypeScript backend
npm run start	Start the compiled server
npm run typecheck	Run the configured TypeScript check
npm test	Run the configured test script


Scripts can vary as the project evolves; the package manifests define what is currently available.
🔧 Troubleshooting
<details>
<summary><strong>Docker command is not recognized</strong></summary>

Start Docker Desktop, confirm the Docker CLI is installed and on PATH, and open a new terminal after changing environment variables.
</details>

<details>
<summary><strong>PostgreSQL connection fails</strong></summary>


Run docker compose ps and docker compose logs. Confirm the host port, database name, username, password, and connection string match docker-compose.yml and the backend configuration.
</details>

<details>
<summary><strong>Frontend cannot reach the backend</strong></summary>


Check frontend/src/lib/api.ts, confirm the API URL and backend port, and verify CORS configuration. A browser-exposed NEXT_PUBLIC_ variable must never contain a secret.
</details>

<details>
<summary><strong>Invalid or expired token</strong></summary>


Review token creation, expiry, authorization headers, and server-side validation. Expired sessions should be handled safely; never log token contents.
</details>

<details>
<summary><strong>Generated SQL is invalid</strong></summary>


Confirm that the relevant schema context reaches the LLM. Validate every generated query before execution and ensure correction attempts are also revalidated.
</details>

<details>
<summary><strong>Charts are empty or incorrect</strong></summary>


Inspect the API response shape and the fields consumed by chart components. Check empty data, numeric values, and unexpected result formats.
</details>

🗺️ Development Roadmap
Potential next steps for strengthening the project:
- [ ] Add and document automated tests for SQL generation, validation, and execution.
- [ ] Add CI checks for linting, type-checking, builds, and tests.
- [ ] Publish a live demo and add screenshots or a short product walkthrough.
- [ ] Document each API endpoint with concrete request and response examples.
- [ ] Add explicit rate limits, query-cost controls, and result-size limits where missing.
- [ ] Verify production deployment configuration, monitoring, and alerting.
- [ ] Evaluate schema retrieval and semantic search quality with representative questions.
- [ ] Add reliable query-result export and saved-query workflows if not already complete.
Update this checklist as each item is implemented and verified.
🤝 Contributing
Suggestions and contributions are welcome.
1. Fork the repository.
2. Create a focused feature branch.
3. Make the change and add or update tests where appropriate.
4. Run the relevant lint, type-check, build, and test commands.
5. Open a pull request describing the change and the checks you ran.
git checkout -b feature/your-feature
Do not commit secrets, local environment files, dependencies, or generated build output.
📄 License
No repository license has been confirmed in this README. Until a LICENSE file is added, reuse and redistribution permissions are not explicitly granted. Add a license file if you intend to publish the project under open-source terms.
👨‍💻 Author
QueryMind — AI-powered Text-to-SQL analytics assistant

GitHub repository: Gautam0804/QueryMind
<div align="center">

Built to explore a more accessible way to work with data.
</div>
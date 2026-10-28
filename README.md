<div align="center">

QueryMind
Ask in plain English. Query your data. Discover insights.
An AI-powered Text-to-SQL analytics assistant that helps turn natural-language questions into structured database results.

Next.js · TypeScript · Node.js · Express · PostgreSQL · Gemini

Overview · Features · Workflow · Architecture · Setup · Security
</div>

Overview
QueryMind is designed to make relational data easier to explore. Instead of writing SQL from scratch, users ask a question in natural language. The application uses database context to guide AI-assisted SQL generation, validates the generated query, and returns structured results to the frontend.
<div align="center">

Ask	Generate	Validate	Explore
Describe what you need	Generate SQL with AI assistance	Check the query before execution	Review the returned data


</div>

Example questions
- “How many customers are in the database?”
- “Show the latest orders.”
- “Which products have the most order items?”
- “Summarize orders by month.”
The available answers depend on the connected database, schema, data, and configured LLM provider.
Features
Feature	What it does
Natural-language querying	Lets users express analytics questions in plain English.
AI-assisted SQL generation	Uses the configured Gemini integration to propose SQL.
Schema context	Uses database metadata and schema-knowledge components to guide generation.
SQL parsing and validation	Provides a validation stage before generated SQL is sent to the database.
Structured query results	Returns data to the frontend for inspection.
Dashboard and charts	Uses Next.js/React with Recharts for the supported analytics experience.
PostgreSQL data layer	Supports relational data and schema-knowledge storage.
Typed full-stack codebase	Uses TypeScript in the frontend and backend.
Local database with Docker	Provides a repeatable database development environment.


Implementation note: These sections describe the project's architecture and intended workflow. Verify the current source code and run the application before presenting any individual capability as production-ready.

Workflow
```mermaid
flowchart TD
    A(["Open QueryMind"]) --> B["Ask a question in plain English"]
    B --> C["Frontend sends request"]
    C --> D["Express API receives question"]
    D --> E["Load schema and knowledge context"]
    E --> F["Gemini-assisted SQL generation"]
    F --> G{"SQL passes validation?"}
    G -- "No" --> H["Return validation error"]
    H --> B
    G -- "Yes" --> I[("Execute against PostgreSQL")]
    I --> J{"Execution successful?"}
    J -- "No" --> K["Return handled error"]
    K --> B
    J -- "Yes" --> L["Return structured results"]
    L --> M["Display results in dashboard"]
    M --> N(["Explore results or ask again"])
    N --> B
```
How a query moves through the system
1. Ask — the user enters an analytics question.
2. Send — the frontend sends the request to the backend API.
3. Understand context — the backend uses relevant database schema or stored schema knowledge.
4. Generate — the configured LLM proposes a SQL query.
5. Validate — the backend checks the generated SQL before execution.
6. Execute — an accepted query is sent to the configured PostgreSQL database.
7. Return — the API responds with structured data or an error.
8. Explore — the frontend displays the response and supports the next question.
Architecture
```mermaid
flowchart LR
    subgraph UI["Frontend"]
        A["Next.js / React"]
        B["Results and charts"]
        A --> B
    end

    subgraph API["Backend"]
        C["Express REST API"]
        D["Route handlers"]
        E["Schema / knowledge context"]
        F["Gemini integration"]
        G["SQL parser and validation"]
        C --> D --> E --> F --> G
    end

    subgraph DB["Data layer"]
        H[("PostgreSQL")]
        I[("Schema knowledge")]
        H --- I
    end

    A <--> C
    G --> H
    H --> C
    C --> B
```
Tech stack
Layer	Technology
Frontend	Next.js, React, TypeScript
Visualizations	Recharts
Backend	Node.js, Express, TypeScript
AI integration	Gemini
Database	PostgreSQL
Vector database support	pgvector-enabled PostgreSQL image
SQL parsing	node-sql-parser
Validation	Zod, where configured
Database client	pg
Local infrastructure	Docker Compose


See frontend/package.json and backend/package.json for the exact dependency versions and scripts.
Project structure
QueryMind/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and AI configuration
│   │   ├── middleware/      # Request middleware
│   │   ├── routes/          # API route modules
│   │   ├── scripts/         # Development scripts
│   │   └── services/        # Application services
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── init/                # Database initialization SQL
│   └── ...                  # Additional SQL files
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── app/             # Next.js application
│   │   └── lib/             # Shared client utilities
│   └── package.json
├── docker-compose.yml
└── README.md
This is a simplified view; the repository contains the full file layout.
Getting started
Prerequisites
- Node.js and npm compatible with the project dependencies
- Git
- Docker Desktop with Docker Compose
- A Gemini API key for the configured AI integration
1. Clone the repository
git clone https://github.com/Gautam0804/QueryMind.git
cd QueryMind
2. Configure environment variables
Create the environment files expected by the backend, frontend, and Docker Compose configuration. The following values are examples; confirm exact variable names in the referenced configuration files.
# Backend examples
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:15433/DB_NAME
GEMINI_API_KEY=YOUR_API_KEY

# Frontend example
NEXT_PUBLIC_API_URL=http://localhost:4000
Configuration references:
- backend/src/config/db.ts
- backend/src/config/gemini.ts
- frontend/src/lib/api.ts
- docker-compose.yml
Keep credentials out of Git. Variables prefixed with NEXT_PUBLIC_ are exposed to the browser and must never contain secrets.
3. Start PostgreSQL
From the repository root:
docker compose up -d
docker compose ps
For database logs:
docker compose logs
The development environment has previously used the pgvector/pgvector:pg16 image and host port 15433 mapped to container port 5432. Confirm the current Compose file for the service name, port, database name, and credentials.
4. Start the backend
In a terminal:
cd backend
npm install
npm run dev
The backend has previously used http://localhost:4000. Use the URL printed by the server.
5. Start the frontend
In a second terminal, from the repository root:
cd frontend
npm install
npm run dev
The frontend has previously used http://localhost:3000. Open the URL printed by Next.js.
6. Verify the application
If the health endpoint is enabled in the current backend:
Invoke-RestMethod http://localhost:4000/api/health
Then submit a simple question from the UI and verify the full path: API request, SQL validation, database execution, and rendered results.
Database
The development schema has included:
- customers
- orders
- order_items
- products
- schema_knowledge
Database initialization scripts are located under database/init/. Review the current SQL files for table definitions, relationships, constraints, and seed data.

If the Compose service is named postgres and the credentials match your configuration, list tables with:
docker compose exec postgres psql -U querymind_admin -d querymind -c "\dt"
Adjust the service name and credentials if your local configuration differs.
API reference
The backend contains route modules for workflows such as authentication, queries, analytics, and query history. Confirm the exact endpoint paths, methods, request schemas, and response formats in backend/src/routes/.

A health endpoint has previously been used at:
GET /api/health
Local API base URL: http://localhost:4000 (confirm the running server output).

For each implemented endpoint, document its method, path, authentication requirements, request body, success response, and error responses. A route module's existence alone does not guarantee a specific endpoint is active.
Security
AI-generated SQL must be treated as untrusted input. Before connecting QueryMind to sensitive or production data, verify the execution policy and database permissions.
- Allow only the SQL statement types required by the application.
- Reject unsupported multiple statements and data-modification operations.
- Use a dedicated least-privilege database role.
- Configure statement timeouts, connection limits, and result-size limits.
- Revalidate SQL after any generation or correction attempt.
- Keep API keys and database credentials on the server.
- Restrict CORS to trusted frontend origins.
- Avoid logging credentials, tokens, or sensitive result data.
- Use HTTPS and managed secrets in production.
These are recommended safeguards; verify which ones are enabled in the current implementation.
Useful commands
Run commands from the appropriate project directory. Available scripts are defined in each package.json.

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
If a command is not listed in the relevant package's scripts, use npm run to see the available commands.
Troubleshooting
<details>
<summary><strong>Docker command is not recognized</strong></summary>

Start Docker Desktop, confirm the Docker CLI is installed and available on PATH, and open a new terminal.
</details>

<details>
<summary><strong>PostgreSQL connection fails</strong></summary>


Check docker compose ps and docker compose logs. Verify the port, database name, username, password, and backend connection string.
</details>

<details>
<summary><strong>The frontend cannot reach the backend</strong></summary>


Check the API URL in frontend/src/lib/api.ts, confirm the backend is running, and review CORS configuration.
</details>

<details>
<summary><strong>Invalid or expired token</strong></summary>


Review token issuance, expiry, authorization headers, and server-side validation. Never log token contents.
</details>

<details>
<summary><strong>Generated SQL fails</strong></summary>


Confirm that relevant schema context is supplied to the LLM. Return a useful error and ensure generated or regenerated SQL passes validation before execution.
</details>

Screenshots
Add screenshots captured from the actual running application to help reviewers understand the product quickly.
Dashboard	Query results
docs/images/dashboard.png	docs/images/query-results.png


Replace these example paths with real screenshots committed to the repository. Do not present mock screenshots as proof of a working application.
Project status
QueryMind brings together a frontend, backend API, PostgreSQL data layer, and an AI-assisted Text-to-SQL workflow. To confirm that the application works end to end, test that the database starts, both servers run, a question generates a validated query, the database returns results, and the interface displays them.
Contributing
1. Fork the repository.
2. Create a focused feature branch.
3. Make your change and add or update tests where appropriate.
4. Run the available lint, build, and test scripts.
5. Open a pull request with a clear description and test results.
git checkout -b feature/your-feature
License
Add a LICENSE file if you intend to publish QueryMind under an open-source license. Without one, reuse and redistribution permissions are not explicitly granted.
<div align="center">

QueryMind
Making database analytics more approachable with AI.

View the repository on GitHub
</div>
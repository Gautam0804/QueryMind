# QueryMind — AI-Powered Text-to-SQL Analytics Assistant

QueryMind is an AI-powered analytics assistant that enables users to interact with relational databases using natural language. Instead of manually writing SQL queries, users can ask questions in plain English and receive query results, data visualizations, and actionable insights through an interactive dashboard.

The project combines Large Language Models (LLMs), schema-aware SQL generation, PostgreSQL, and interactive visualizations to make database analytics more accessible, intuitive, and efficient.

> **Project status:** In development. Core dashboard and database infrastructure have been started; end-to-end functionality and production readiness still require verification.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Example Use Cases](#example-use-cases)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Traditional business intelligence tools often require SQL knowledge, manual report creation, or complex dashboard configurations.

QueryMind aims to simplify this process by allowing users to ask questions such as:

- What is the total revenue generated?
- Which products are performing best?
- How many orders were placed during a particular period?
- Which customers have the highest purchase value?
- Show monthly sales trends.
- Compare product performance across categories.

QueryMind is designed to translate these questions into SQL, execute approved queries against a relational database, and present the results in a readable format.

### Project Goals

- Enable natural-language access to structured data.
- Generate SQL using database schema context.
- Execute queries with appropriate safety restrictions.
- Display results through tables and interactive charts.
- Maintain query history and reusable saved queries.
- Provide a clean, responsive analytics dashboard.

---

## Key Features

### 1. Natural-Language Database Queries

Allow users to express analytical questions in everyday language rather than writing SQL manually.

**Example:**

User question:

> Show the top five products by sales.

Expected workflow:

1. Understand the question.
2. Retrieve relevant schema information.
3. Generate an appropriate SQL query.
4. Validate the generated query.
5. Execute it against the database.
6. Display the results.

*LLM integration and the complete execution flow must be verified in the running application.*

### 2. AI-Powered SQL Generation

Use an LLM to generate SQL from a natural-language question and relevant database schema information.

The intended design supports schema-aware query generation, helping the model understand table names, columns, and relationships before producing SQL.

Potential providers include a hosted LLM API or a locally running model through Ollama, depending on the implemented configuration.

### 3. PostgreSQL Integration

QueryMind uses PostgreSQL as its relational database.

The development database includes tables such as:

- `customers`
- `orders`
- `order_items`
- `products`
- `schema_knowledge`

These tables support customer, order, product, and schema-related analytics.

### 4. Interactive Analytics Dashboard

The dashboard is built to organize analytics workflows in one place, including:

- Query input and execution.
- Analytics summary cards.
- Data tables.
- Chart visualizations.
- Query history.
- Saved queries.
- Navigation and search.
- Authentication interface.

### 5. Data Visualization

Recharts is used for dashboard visualizations.

The intended experience is to convert suitable query results into charts so users can identify trends and compare values without manually analyzing raw database records.

### 6. Query History and Saved Queries

The application includes UI areas for query history and saved queries.

Persistent storage, retrieval, and synchronization should be verified before considering these features fully complete.

### 7. Responsive Interface

The dashboard is being adapted for desktop, tablet, and mobile screens, including responsive navigation, charts, tables, and dialogs.

### 8. Database Safety

The intended database execution design uses a restricted read-only database role and query validation.

Additional SQL validation and execution safeguards should be tested before exposing the application to untrusted input or production data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | CSS and Tailwind CSS utilities where configured |
| Charts | Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL |
| Vector database support | pgvector |
| SQL parsing | `node-sql-parser` |
| Validation | Zod |
| AI integration | LLM API or Ollama, depending on configuration |
| Database connectivity | `pg` |
| Containerization | Docker and Docker Compose |
| Development tooling | npm, Git, Postman |

The technologies above describe the project setup discussed so far. Check the current `package.json` files and source code for the exact installed versions and enabled integrations.

---

## System Architecture

```mermaid
flowchart TD
    A[User] --> B[Next.js Dashboard]
    B --> C[Backend API]
    C --> D[Schema Context]
    D --> E[LLM SQL Generation]
    E --> F[SQL Validation]
    F --> G[Read-Only PostgreSQL]
    G --> H[Query Results]
    H --> I[Tables and Recharts]
    I --> B
    C --> J[Query History and Saved Queries]
    D --> K[Schema Knowledge]
```

### Architecture Components

**Frontend**

Provides the user interface for submitting natural-language questions, viewing results, inspecting visualizations, and managing analytics workflows.

**Backend API**

Coordinates incoming requests, schema retrieval, LLM interaction, SQL validation, database execution, and response formatting.

**Schema Context**

Provides relevant database tables, columns, and relationships to the SQL-generation process.

**LLM Layer**

Converts the user's question and schema context into a candidate SQL query.

**SQL Validation Layer**

Checks the generated query against the application's query policy before execution.

**PostgreSQL**

Executes approved queries using a restricted database account.

**Visualization Layer**

Presents returned data as tables and, where appropriate, charts.

---

## How It Works

The intended query lifecycle is:

1. **Ask:** The user enters a natural-language analytics question.
2. **Understand:** The backend identifies the relevant database schema.
3. **Generate:** The LLM proposes a SQL query.
4. **Validate:** The backend checks the SQL against the application's safety policy.
5. **Execute:** The database executes the approved query using a restricted account.
6. **Format:** The backend returns structured results.
7. **Visualize:** The dashboard displays the results as tables, summary metrics, or charts.
8. **Save:** Where implemented, the application records query history or saves the query for reuse.

If a query is invalid, the application can eventually support a controlled correction workflow that regenerates or repairs the query and validates it again before execution.

---

## Project Structure

The following is an illustrative structure for the application. Adapt it to match the actual directories in your repository.

```text
QueryMind/
├── client/                    # Frontend application, if using this directory
│   ├── app/                   # Next.js App Router, if configured
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── server/                    # Backend application, if using this directory
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   └── ...
│   ├── package.json
│   └── ...
├── docker-compose.yml         # Local database configuration
├── .env.example               # Safe configuration template
├── .gitignore
└── README.md
```

The actual frontend and backend directory names may differ. Preserve the structure already used by your repository rather than creating duplicate folders.

---

## Prerequisites

Install the following tools before running QueryMind:

- [Node.js](https://nodejs.org/) — compatible with your installed Next.js version.
- npm — included with Node.js.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the local PostgreSQL container.
- Git — for version control.
- An LLM API key or a configured local model, if required by the current implementation.

Optional tools:

- [Postman](https://www.postman.com/) for API testing.
- A PostgreSQL client such as `psql` for database inspection.
- An editor such as Visual Studio Code.

Verify your installations:

```bash
node --version
npm --version
docker --version
docker compose version
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/QueryMind.git
cd QueryMind
```

Replace `YOUR_USERNAME/QueryMind` with the actual repository URL.

### 2. Configure Environment Variables

Create the environment files required by the frontend, backend, and Docker configuration.

Use `.env.example` as the template if the repository includes one.

Never commit API keys, passwords, access tokens, or other secrets.

### 3. Start PostgreSQL with Docker

From the directory containing `docker-compose.yml`, run:

```bash
docker compose up -d
```

Check the running containers:

```bash
docker compose ps
```

View database logs if needed:

```bash
docker compose logs postgres
```

The development setup previously used the `pgvector/pgvector:pg16` image and a PostgreSQL host port of `15433`, mapped to container port `5432`.

Confirm the current port mapping in your Docker Compose file before connecting.

### 4. Install Frontend Dependencies

Navigate to the actual frontend directory:

```bash
cd client
npm install
```

If the frontend directory is different, use its actual path.

### 5. Install Backend Dependencies

In a separate terminal, navigate to the backend directory:

```bash
cd server
npm install
```

Use the directory and scripts defined by the current backend project.

### 6. Start the Backend

If the backend package defines a `dev` script:

```bash
npm run dev
```

The development backend has previously been configured to run at:

```text
http://localhost:4000
```

### 7. Start the Frontend

From the frontend directory, run:

```bash
npm run dev
```

The Next.js development server has previously been configured to run at:

```text
http://localhost:3000
```

Open that URL in your browser to access the dashboard.

---

## Environment Variables

The exact variable names must match the existing application code and Docker Compose configuration.

An example template might look like this:

```dotenv
# Backend
PORT=4000
NODE_ENV=development

# PostgreSQL
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:15433/DB_NAME

# LLM provider — configure only if required
LLM_API_KEY=YOUR_API_KEY
LLM_MODEL=YOUR_CONFIGURED_MODEL

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

These names are illustrative, not a guarantee that the current source code reads every variable.

Before running the application:

1. Inspect the backend database configuration.
2. Inspect the LLM provider configuration.
3. Check the frontend API client.
4. Check the Docker Compose environment section.
5. Replace placeholders with your local configuration.

**Important:** Do not place private API keys or database passwords in variables prefixed with `NEXT_PUBLIC_`. Next.js exposes those variables to browser-side code.

Keep `.env` files out of version control.

---

## Database Setup

### Database Overview

The local development database contains these tables:

| Table | Intended purpose |
|---|---|
| `customers` | Customer records |
| `orders` | Order information |
| `order_items` | Products and quantities associated with orders |
| `products` | Product information |
| `schema_knowledge` | Schema-related knowledge for analytics and query generation |

Verify the actual columns, constraints, and relationships in PostgreSQL before relying on a particular query.

### Inspect Database Tables

If the Docker Compose service is named `postgres`, inspect the available tables with:

```bash
docker compose exec postgres psql \
  -U querymind_admin \
  -d querymind \
  -c "\dt"
```

This command assumes the service, username, and database match your local configuration.

### Inspect a Table

For example:

```sql
SELECT *
FROM products
LIMIT 5;
```

### Read-Only Database Access

The development setup has included a restricted database role named `querymind_reader`.

The intended principle is to separate the account used by the application for analytics from the administrative database account.

Verify that the reader role has only the permissions required for the application's approved queries.

Do not expose administrative credentials to the frontend.

---

## Running the Application

Once the database and both applications are configured:

1. Start Docker Desktop.
2. Start the PostgreSQL container.
3. Start the backend API.
4. Start the Next.js frontend.
5. Open `http://localhost:3000`.
6. Submit a test analytics question.
7. Verify the generated SQL, query execution, and returned results where those interfaces are available.

### Example Questions to Test

- Show five products from the products table.
- Count the total number of customers.
- Show the number of orders by status.
- Display the most frequently ordered products.
- Summarize order totals by month.

These are example test prompts. Their successful execution depends on the actual database schema and the current LLM integration.

---

## API Documentation

The backend has previously been configured to run on port `4000`.

A health-check request has been used during development:

```http
GET http://localhost:4000/api/health
```

You can test it using a browser, Postman, or the following command:

```bash
curl http://localhost:4000/api/health
```

The exact response format should be confirmed from the current route implementation.

### Core API Responsibilities

The intended API design may include the following responsibilities:

| Responsibility | Description |
|---|---|
| Health check | Verify that the API is running |
| Query execution | Accept an analytics question and return validated query results |
| Schema retrieval | Provide database schema context |
| Query history | Retrieve previous queries |
| Saved queries | Store and retrieve reusable queries |

These are functional categories, not a claim that all corresponding routes already exist.

Before publishing detailed API documentation, add the actual endpoint paths, HTTP methods, request bodies, response examples, and authentication requirements from the backend source code.

---

## Security

Database access through an LLM requires careful safeguards. A generated query must never be trusted merely because it was produced by an AI model.

QueryMind's intended security approach includes the following principles.

### 1. Read-Only Database Role

Use a dedicated database account with only the necessary read permissions.

Do not run AI-generated queries through an administrator or database-owner account.

### 2. SQL Validation

Validate generated SQL before execution.

A robust implementation should:

- Allow only the supported query types.
- Reject data modification and schema modification statements.
- Reject multiple statements if they are not explicitly supported.
- Validate referenced tables and columns.
- Restrict access to sensitive tables and fields.
- Use parameterized queries for user-provided values.
- Apply query execution timeouts and result-size limits.

A simple string check is not a complete SQL security boundary. Use a parser and enforce the policy on the parsed query structure.

### 3. Database-Level Restrictions

Application-level validation should be backed by database permissions.

Where appropriate, configure statement timeouts, connection limits, and restricted access to schemas.

### 4. Secrets Management

Store database credentials and API keys in environment variables or an appropriate secrets manager.

Never include secrets in:

- Frontend source code.
- Public repositories.
- Screenshots.
- Logs or error messages.
- Client-visible API responses.

### 5. LLM Output Is Untrusted

Treat model-generated SQL as untrusted input. Validate it before every execution, even when the model appears to have followed instructions.

### 6. Production Deployment

Before exposing QueryMind publicly, add and verify authentication, authorization, rate limiting, safe error handling, request validation, and monitoring.

These recommendations describe the intended security standard; they do not imply that every safeguard has already been implemented or audited.

---

## Example Use Cases

### Business Analytics

Ask natural-language questions about customers, products, and orders.

### Sales Reporting

Generate summaries of order activity and product performance.

### Data Exploration

Explore structured datasets without manually writing every SQL query.

### Interactive Reporting

Display suitable query results in tables and visualizations.

### Developer Productivity

Reduce the time spent writing repetitive analytical SQL queries.

---

## Troubleshooting

### Docker Command Not Found

Verify that Docker Desktop is installed and running.

```bash
docker --version
docker compose version
```

If the commands are unavailable, check the Docker installation and system `PATH`, then reopen the terminal.

### Missing PostgreSQL Password

If Docker Compose reports that a required PostgreSQL password is missing, verify that the correct environment file exists and that the variable referenced by `docker-compose.yml` is defined.

Do not commit the password to Git.

### Cannot Connect to PostgreSQL

Check the container status:

```bash
docker compose ps
```

Review logs:

```bash
docker compose logs postgres
```

Confirm the host port, username, password, database name, and connection URL.

Remember that a host port such as `15433` may map to the container's standard PostgreSQL port `5432`.

### Backend Does Not Start

Check the backend's installed dependencies and available scripts:

```bash
npm install
npm run
```

Run the development script defined in `package.json` and inspect the first reported error.

### TypeScript Compilation Errors

Verify that the installed TypeScript version and `tsconfig.json` options are compatible.

Use module and module-resolution settings supported by the installed TypeScript version.

### Invalid or Expired Token

If an API request fails because of an invalid or expired token:

1. Check the authentication flow.
2. Confirm that the frontend sends the expected authorization header.
3. Verify token expiration and server-side validation.
4. Sign in again if the token has expired.
5. Ensure that API errors are handled without exposing sensitive details.

### LLM Generates Invalid SQL

Check that the model receives the relevant schema and relationships.

Validate the SQL before execution. If automatic correction is implemented, limit the number of retries and revalidate every corrected query.

### Dashboard Charts Do Not Display

Verify that the API returns structured data, that the chart receives the expected keys, and that numeric values are formatted correctly.

Check the browser console and backend logs for errors.

---

## Roadmap

The following roadmap represents planned or verification-needed work, not a claim that each item is already complete.

- [x] Establish the PostgreSQL Docker development environment.
- [x] Create the initial database tables.
- [x] Set up the backend development server.
- [x] Build the initial dashboard interface.
- [x] Add dashboard query, history, and saved-query UI areas.
- [ ] Verify the complete natural-language-to-SQL workflow.
- [ ] Complete and test schema-aware SQL generation.
- [ ] Enforce SQL validation and execution safeguards.
- [ ] Implement or verify automatic SQL correction.
- [ ] Connect query results to dynamic charts and tables.
- [ ] Verify persistent query history and saved queries.
- [ ] Test authentication and authorization end to end.
- [ ] Complete mobile and tablet responsiveness testing.
- [ ] Add comprehensive automated tests.
- [ ] Deploy the application to a production environment.
- [ ] Add monitoring, documentation, and production security checks.

---

## Contributing

Contributions and suggestions are welcome.

To work on the project locally:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the available tests and checks.
5. Submit a pull request describing your changes.

Example:

```bash
git checkout -b feature/your-feature
```

Follow the existing code style and avoid committing credentials, generated files, or local environment configuration.

---

## License

No license has been specified here.

Before distributing the project, add a `LICENSE` file and update this section with the license you choose. If the project is private or the licensing decision has not been made, leave the licensing terms clearly marked as pending.

---

## Author

**QueryMind**

AI-powered Text-to-SQL analytics assistant.

Repository: `https://github.com/YOUR_USERNAME/QueryMind`

Replace the repository URL and add your preferred author or contact details before publishing.

---

*QueryMind is a development project intended to explore natural-language database querying, LLM-assisted SQL generation, and interactive analytics. Do not use it with sensitive production data until its security controls and execution behavior have been independently verified.*

<div align="center">

# 🧠 QueryMind

### Ask your database questions in plain English. Get safe SQL, results, and charts.

An AI-powered Text-to-SQL analytics assistant built with **Next.js, Node.js, PostgreSQL, and Gemini**, with a security-first approach to running LLM-generated SQL.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Status](https://img.shields.io/badge/status-in%20development-orange?style=for-the-badge)

</div>

---

<!--
## 📸 Demo
Add a GIF: save it as docs/demo.gif, then uncomment this section.

![QueryMind demo](docs/demo.gif)
-->

## ✨ Why QueryMind?

Most people who need answers from data can't write SQL, and analysts spend hours writing repetitive queries. QueryMind lets anyone ask:

- *"How many customers are in the database?"*
- *"Show the latest orders."*
- *"Which products have the most order items?"*
- *"Summarize orders by month."*

…and get back validated SQL, a results table, and a chart, **without letting the model touch the database unchecked.**

## 🚀 Features

| | Feature | Description |
|---|---|---|
| 💬 | **Natural-language queries** | Ask questions in plain English through a Next.js dashboard |
| 🤖 | **LLM-assisted SQL generation** | Gemini generates SQL grounded in your schema context |
| 📚 | **Schema-aware context** | A `schema_knowledge` layer (with pgvector support) helps the model target real tables and columns |
| 🛡️ | **SQL safety layer** | Parser-based validation of generated SQL before execution |
| 📊 | **Data visualization** | Results shown as tables and Recharts charts |
| 🔐 | **Authentication** | Auth routes and middleware protecting API access |
| 🕘 | **Query history & saved queries** | Revisit and reuse earlier questions |
| 🐳 | **One-command database** | Docker Compose spins up PostgreSQL + pgvector with seeded sample data |

## 🏗️ Architecture

```mermaid
flowchart TD
    U[User] --> F[Next.js Dashboard]
    F --> A[Express API]
    A --> S[Schema & Knowledge Context]
    S --> L[Gemini SQL Generation]
    L --> V[SQL Safety Validation]
    V --> D[(PostgreSQL)]
    D --> R[Structured Results]
    R --> F
    A --> H[Query History & Analytics Routes]
```

**Query lifecycle**

1. User submits a question from the dashboard.
2. Backend gathers relevant schema / knowledge context.
3. The LLM proposes a SQL query.
4. The query is parsed and validated against the execution policy.
5. Approved SQL runs against PostgreSQL using restricted permissions.
6. Structured results return to the UI as a table or chart.
7. The query is saved to history.

## 🔒 Security by Design

LLM output is treated as **untrusted input**. QueryMind is built around defense in depth:

- ✅ **Parser-based validation** using `node-sql-parser`, not fragile string matching
- ✅ **Read-only intent**: data- and schema-modifying statements are rejected
- ✅ **Single-statement enforcement**
- ✅ **Request validation** with Zod
- ✅ **Least-privilege database role** recommended for executing generated SQL
- ✅ **Backend-only secrets**: the browser never sees API keys
- ✅ **Timeouts and result-size limits** as part of the execution policy

> See [Security Considerations](#️-security-considerations) for the full checklist.

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL 16, pgvector, `pg` |
| **AI** | Google Gemini |
| **Validation & Parsing** | Zod, node-sql-parser |
| **Infrastructure** | Docker, Docker Compose |
| **Tooling** | npm, Git, Postman |

## 📁 Project Structure

```
QueryMind/
├── backend/
│   └── src/
│       ├── config/        # DB and Gemini configuration
│       ├── middleware/    # Auth and request middleware
│       ├── routes/        # Auth, query, analytics, history
│       ├── scripts/       # Utility scripts
│       └── services/      # SQL generation, schema context, safety, query service
├── database/
│   └── init/              # Schema + seed SQL, run on container startup
├── frontend/
│   └── src/
│       ├── app/           # Next.js app router pages
│       └── lib/           # API client
├── docker-compose.yml
└── README.md
```

## ⚡ Quick Start

### Prerequisites

- Node.js and npm
- Docker Desktop with Docker Compose
- Git
- A [Gemini API key](https://aistudio.google.com/)

### 1. Clone

```bash
git clone https://github.com/Gautam0804/QueryMind.git
cd QueryMind
```

### 2. Start the database

```bash
docker compose up -d
docker compose ps
```

> Uses the `pgvector/pgvector:pg16` image, mapped to host port `15433` by default. Confirm in your `docker-compose.yml`.

### 3. Run the backend

```bash
cd backend
npm install
```

Create `backend/.env` (never commit this file):

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:15433/DB_NAME
GEMINI_API_KEY=YOUR_API_KEY
```

```bash
npm run dev
```

Health check: `GET http://localhost:4000/api/health`

### 4. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm run dev
```

Open **http://localhost:3000** 🎉

> ⚠️ Confirm exact variable names in `backend/src/config/db.ts`, `backend/src/config/gemini.ts`, and `frontend/src/lib/api.ts`. Anything prefixed `NEXT_PUBLIC_` is exposed to the browser, so never put secrets there.

## 🗄️ Sample Database

The `database/init/` scripts create an e-commerce style schema for trying out queries:

`customers` · `orders` · `order_items` · `products` · `schema_knowledge`

Try prompts like:

- "Count the customers."
- "Show five products."
- "Count orders by status."
- "Summarize orders by month."

## 📜 Available Scripts

**Frontend** (`frontend/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |

**Backend** (`backend/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Dev mode with watcher |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled server (`dist/server.js`) |
| `npm run typecheck` | Type-check without emitting |

## 🔌 API Overview

The backend exposes route modules for **authentication**, **queries**, **analytics**, and **query history**. See `backend/src/routes/` for exact paths, methods, and payloads.

```http
GET /api/health
```

## 🛡️ Security Considerations

> LLM-generated SQL is untrusted input. Review and test all controls before connecting sensitive or production data.

**SQL validation**
- Allow only supported query types (read-only `SELECT`)
- Reject data-modifying and schema-modifying statements
- Reject multiple statements
- Validate referenced tables and columns
- Apply execution timeouts and result-size limits
- Re-validate every corrected or regenerated query

**Database permissions**
- Use a dedicated **read-only** role for analytics, never an admin account
- Keep the database private and restrict network access

**Auth & secrets**
- Keep secrets server-side and out of Git
- Authorize every protected endpoint
- Restrict CORS to known origins
- Never log passwords, tokens, or API keys

## 🧯 Troubleshooting

| Problem | Fix |
|---|---|
| `docker` not recognized | Start Docker Desktop, then open a new terminal |
| DB connection errors | Run `docker compose logs`; verify port `15433`, credentials, and `DATABASE_URL` |
| Frontend can't reach API | Check `NEXT_PUBLIC_API_URL`, that the backend is running, and CORS settings |
| Backend won't start | Run `npm run build` and confirm `tsconfig.json` emits `dist/server.js` |
| Invalid SQL from the LLM | Verify schema context is passed; keep retries limited and re-validate |
| Empty charts | Check the API response shape and empty/non-numeric data handling |


## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes and run lint, type-check, and build
4. Open a pull request describing the change and checks performed

Please don't commit secrets, `.env` files, `node_modules`, or build output.

## 📄 License

No license has been selected yet. Add a `LICENSE` file (for example MIT) and update this section.

## 👤 Author

**Gautam Kumar Yadav** · Full-Stack & AI Engineer

[![GitHub](https://img.shields.io/badge/GitHub-Gautam0804-181717?style=flat&logo=github&logoColor=white)](https://github.com/Gautam0804)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Gautam_Yadav-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/gautam-yadav-10922726b)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-000000?style=flat&logo=vercel&logoColor=white)](https://gautam-portfolio-self.vercel.app/)
[![Email](https://img.shields.io/badge/Email-gautamcodesin@gmail.com-D14836?style=flat&logo=gmail&logoColor=white)](mailto:gautamcodesin@gmail.com)

---

<div align="center">

⭐ If you find this project interesting, consider giving it a star!

</div>

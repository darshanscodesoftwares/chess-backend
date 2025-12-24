🚀 Production Readiness Audit & Environment Configuration (Frontend + Backend)
📌 Context

This project is now being deployed to Render with:

Backend → Node.js + Puppeteer + MongoDB

Frontend → React (Vite)

Development is complete, but the codebase must now be made production-ready, specifically:

No hardcoded localhost

Correct use of environment variables

Shareable, hosted arbiter links

Safe defaults for production

Clear separation of frontend vs backend config

🎯 Objective

Perform a production readiness audit and apply minimal, safe changes so that:

The app works correctly on Render

Environment variables are used consistently

Arbiter links use hosted frontend URL

Puppeteer works in production

No existing functionality breaks

This is NOT a refactor, only a readiness pass.

🧠 GLOBAL REQUIREMENTS (APPLY TO BOTH REPOS)
1️⃣ Eliminate localhost Usage

Claude must search for and fix any usage of:

http://localhost

127.0.0.1

Rules:

Replace with environment variables

Do NOT hardcode Render URLs

Use fallbacks only for local dev

2️⃣ Correct Environment Variable Usage
Backend must use:
process.env.MONGO_URI
process.env.BASE_URL
process.env.PORT
process.env.NODE_ENV
process.env.PUPPETEER_EXECUTABLE_PATH

Frontend must use:
import.meta.env.VITE_API_BASE_URL


❌ Do NOT access backend envs from frontend
❌ Do NOT mix frontend & backend env logic

3️⃣ Arbiter Link Generation (CRITICAL)

All arbiter links must be generated using:

Backend:

const baseUrl = process.env.BASE_URL;


Final link format:

https://<frontend>.onrender.com/arbiter/:token


❌ Never use window.location.origin
❌ Never use localhost in link generation

🧠 BACKEND-SPECIFIC REQUIREMENTS
4️⃣ Server Startup (Render Safe)

Ensure backend listens like:

const PORT = process.env.PORT || 5000;
app.listen(PORT);


❌ Do NOT hardcode ports

5️⃣ Puppeteer Production Safety

Ensure Puppeteer launch includes:

args: ["--no-sandbox", "--disable-setuid-sandbox"],
executablePath: process.env.PUPPETEER_EXECUTABLE_PATH


Headless mode enabled by default

Debug mode optional via env flag (if present)

6️⃣ CORS Safety

Ensure CORS:

Allows frontend Render URL

Uses BASE_URL where applicable

Does NOT allow * in production unless already required

🧠 FRONTEND-SPECIFIC REQUIREMENTS
7️⃣ API Base URL

All API calls must use:

import.meta.env.VITE_API_BASE_URL


❌ No hardcoded URLs
❌ No fallback to localhost in production

8️⃣ Environment Guards

If useful, Claude may add:

Console log on startup:

“Running in production”

API base URL being used

This is optional but helpful.

📁 Files Claude MUST Inspect
Backend

Server entry file

Puppeteer logic

Arbiter link generation

Any config/constants file

Frontend

API service files

Arbiter link usage

Admin pages that call backend

🚫 STRICT CONSTRAINTS (DO NOT BREAK)

❌ Do NOT remove commented code

❌ Do NOT refactor unrelated logic

❌ Do NOT change API contracts

❌ Do NOT add new dependencies

❌ Do NOT hardcode production URLs

✅ Expected Outcome

After this task:

App runs correctly on Render

Arbiter links are shareable

No localhost remains in production paths

Frontend and backend configs are cleanly separated

Environment variables control behavior

Existing features continue to work

🧪 Validation Checklist (Claude MUST self-verify)

 No localhost in production code paths

 Arbiter links use hosted frontend URL

 Backend reads env vars correctly

 Frontend reads VITE_API_BASE_URL

 Puppeteer works in production

 App starts correctly on Render

 No commented code removed
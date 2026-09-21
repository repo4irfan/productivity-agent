# Deploy checklist

Steps I follow before deploying the productivity agent.

## 1. Run the checks

Run `npm run typecheck` and `npm test`. Do not deploy if either fails.

## 2. Check MongoDB

Make sure the MongoDB container is running with `docker compose ps`.
The database name is productivity_agent and it listens on port 27018.

## 3. Verify Ollama models

Both `qwen2.5:7b` and `nomic-embed-text` must be pulled. Check with `ollama list`.

## 4. Update environment

Copy any new keys from `.env.example` into `.env`. Set `DEBUG=false` for normal use.

## 5. Smoke test

Start with `npm run dev`, create a task, ask for a daily briefing, then exit.

## 6. Commit and tag

Commit with a clear message and tag the release, e.g. `git tag v0.4.0`.
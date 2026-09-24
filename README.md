# Productivity Agent

A TypeScript-based AI productivity agent built from scratch to learn and implement the core concepts behind modern AI agents.

The project intentionally avoids agent frameworks such as Mastra so that the underlying concepts—LLM interaction, tool calling, memory, retrieval, context management, persistence, and agent loops—can be understood and implemented directly.

## 🚀 Current Stack

- **TypeScript** (type-checked build)
- **Node.js**
- **Ollama** — `qwen2.5:7b` for chat, `nomic-embed-text` for embeddings
- **OpenAI** — optional, swappable via `.env`
- **MongoDB** (Docker)
- **Zod**
- **Vitest**

## ✨ Current Features

### AI Agent

- Agent loop with iterative tool execution and a hard step limit
- Structured tool-call handling with provider-neutral message format
- Empty-response retries and graceful failure (the CLI never crashes on an agent error)
- Provider abstraction: the same agent runs on Ollama or OpenAI by changing `LLM_PROVIDER`

### Tasks

- Create, update, complete, delete tasks
- Priority (`low` / `medium` / `high`) and due dates
- Find tasks by title
- List tasks filtered by status, priority, or due date (overdue, today, this week)
- Daily briefing: overdue, due today, due this week, and high-priority tasks in one call

Example:

```text
You: what should I focus on this morning?

Agent: Given your preference for backend work in the morning, start with
"Write report" (high priority, overdue), then "Friday Test" (due tomorrow)...
```

### Memory

- Automatic extraction of stable facts from user messages
- Embeddings stored alongside each memory
- Semantic (vector) search with cosine similarity
- Near-duplicate detection before saving
- Relevant memories retrieved automatically every turn and injected into the model context

Example:

```text
You: I prefer working on backend tasks in the morning.
Agent: [memory saved]

...later, in a new conversation...

You: when am I most productive?
Agent: You prefer deep work before noon, especially on backend tasks.
```

### Documents (RAG)

- Ingest markdown or text files
- Heading-aware chunking
- Vector search over chunks
- Parent-document expansion: when several hits come from one small document, the whole document is returned in order
- The agent answers only from retrieved passages and cites the document

### Conversation Persistence

- Conversations are stored in MongoDB and can be resumed by ID
- Messages, structured tool calls, tool results, and summaries are all persisted
- Older messages are summarized automatically once the conversation grows; the cut always lands on a user turn so tool-call/result pairs are never split

### Reliability

- Every tool returns a predictable `{ success, data }` or `{ success, error }` shape
- Zod validation errors are fed back to the model so it can self-correct
- Internal errors (database, network) are converted into safe messages before reaching the model
- Malformed tool arguments, unknown tools, and missing resources are all handled
- Requests to the LLM time out instead of hanging indefinitely

### Guardrails

Rules enforced by code, not by the prompt, at the three points where model output passes through the application:

| Point | Guard | Examples |
|---|---|---|
| Before the model | input guard | over-long messages answered without an LLM call; messages containing credentials are never written to memory |
| Before a tool runs | tool policy | at most 3 changes per message; absurd arguments rejected; destructive actions require confirmation |
| Before the user sees a reply | output guard | a reply claiming "I've completed it" is blocked unless the trace shows a successful mutation |

### Human-in-the-loop

Destructive actions pause for approval. The agent receives an `approve` function from its caller, so the CLI asks the user while evals pass a function that auto-approves or auto-denies:

```text
⚠️  delete task → "Weekly Review"
Proceed? (y/N):
```

Declining returns a tool error; nothing is deleted, and the decision is recorded in the trace.

### Observability

Every turn produces one trace — each LLM call with its duration and token counts, each embedding, each tool call and its result, retrieval scores, and the outcome. Traces are stored in MongoDB and summarized on one line:

```text
[trace 77953b4] 22.5s · llm ×3 (memory-extraction 3.0s · agent 6.7s · agent 6.5s) · prompt 4894 tok, 98% cached · embed ×1 · tools: delete_task ✗ · memories 3 (top 0.583) · reply
```

Spans are collected with `AsyncLocalStorage`, so any layer can record one without having a trace threaded through its parameters. `npm run traces` aggregates the last 50 turns.

### Evaluation

18 cases covering tool selection, argument correctness, grounded answers, guardrails, and confirmation flows. Each case runs against the real agent and is checked against the trace, so an assertion can require that a specific tool was called with specific arguments — not merely that the reply sounded right.

```text
✓ complete-by-title                      15.2s  tools: complete_task
✗ create-task                            24.9s  tools: create_task
     create_task.priority: expected undefined, got "medium"
```

```bash
npm run eval                 # all cases
npm run eval -- rag          # cases whose id contains "rag"
```

Results are written to `evals/results/` (gitignored); milestone runs are kept in `evals/baselines/`.

## 🏗️ Architecture

```text
src/
├── agents/
│   ├── agent.ts                 # the agent loop
│   ├── agent-state.ts           # provider-neutral message format
│   ├── context-manager.ts       # summarization trigger
│   ├── conversation-manager.ts
│   ├── tool-definitions.ts      # registry → neutral tool schemas
│   ├── tool-registry.ts         # every tool: name, description, Zod schema, execute
│   ├── tool-router.ts           # lookup → parse → validate → execute → normalize
│   ├── tool-types.ts
│   └── tool-error.ts
│
├── guardrails/
│   ├── approval.ts               # ApprovalHandler contract
│   ├── input-guard.ts            # length, credential detection
│   ├── tool-policy.ts            # allow / deny / confirm
│   └── output-guard.ts           # false-claim detection against the trace
│
├── observability/
│   ├── tracer.ts                 # AsyncLocalStorage spans
│   ├── trace-repository.ts
│   ├── trace-summary.ts
│   └── logger.ts
│
├── llm/
│   ├── llm-client.ts            # LLMClient + EmbeddingClient interfaces
│   ├── ollama-client.ts         # Ollama adapter
│   ├── openai-client.ts         # OpenAI adapter
│   └── index.ts                 # provider factory (reads .env)
│
├── memory/
│   ├── memory-extractor.ts
│   ├── memory-repository.ts     # save, vector search, dedupe
│   ├── memory-retriever.ts      # per-turn context injection
│   ├── vector-math.ts           # cosine similarity
│   └── conversation-summarizer.ts
│
├── rag/
│   ├── chunker.ts
│   └── document-repository.ts   # ingest, search, read, parent-document expansion
│
├── repositories/
│   ├── task-repository.ts
│   └── conversation-repository.ts
│
├── tools/
│   ├── task-tools.ts
│   ├── memory-tools.ts
│   └── document-tools.ts
│
└── index.ts                     # CLI

scripts/
├── ingest.ts                    # ingest a document
├── search-documents.ts          # inspect retrieval scores
├── search-memories.ts
├── backfill-embeddings.ts
├── dedupe-memories.ts
├── eval.ts                      # run the evaluation suite
└── traces.ts                    # summarize recent turns

evals/
├── cases.ts                     # the test set
├── runner.ts                    # runs one case, checks it against the trace
└── fixtures.ts                  # eval data setup and reset
```

The layers:

```text
LLM provider (Ollama / OpenAI)
 ↓
LLMClient interface
 ↓
Agent loop
 ↓
Tool Registry → Tool Router (Zod)
 ↓
Application tools
 ↓
Repositories
 ↓
MongoDB
```

Only `src/llm/*-client.ts` knows which provider is in use. Everything else works with the neutral message and tool formats.

## 🧠 Learning Goals

This project is part of my transition from web development to AI engineering. The goal is not simply to build a chatbot, but to understand how AI agents work internally. Each step introduces one concept.

Covered so far:

- LLM integration and structured outputs
- Tool calling, validation, and the agent loop
- Agent state and conversation persistence
- Context management and summarization
- Tool error handling and agent reliability
- Provider abstraction (Ollama, OpenAI) and prompt-cache-aware prompt layout
- Embeddings, cosine similarity, vector search
- Semantic long-term memory with automatic retrieval
- RAG: chunking, retrieval, parent-document expansion, grounded answers
- Tracing and observability for agent turns
- Evaluation: asserting tool choice and grounded answers, not just output text
- Guardrails: input, tool-policy, and output checks enforced in code
- Human-in-the-loop approval for irreversible actions
- Why LLM output is non-deterministic, and what temperature does about it

### The pattern that kept showing up

**The model decides *what*; code decides *how*.** Every time the agent was asked to do something precise—find a task ID in a long list, convert "next Monday" to a date, gather a daily briefing, decide whether to return a passage or a whole document—a 7B model got it wrong often enough to matter. Each time, the fix was the same: give the model a tool that expresses the *intent* and let deterministic code do the work (`find_tasks`, `get_daily_briefing`, parent-document expansion). Prompt rules alone were never enough.

### Three lessons that cost the most time

**A stale tool description is indistinguishable from a bad model.** Each tool is declared three times — Zod schema, JSON schema, and description — and all three must agree. When `complete_task` started accepting titles, `find_tasks` still said "use this to look up a task's ID", so the model kept calling it first. Two tests now catch that drift.

**Default temperature is wrong for agents.** Ollama defaults to `temperature: 0.8`. The same eval case passed and failed on alternating runs until it was set to 0 — the model was sampling, not choosing.

**A bad eval sends you debugging the wrong layer.** Three consecutive "agent bugs" turned out to be leftover test data, an assertion that guessed at the cause instead of reporting the actual count, and copy-pasted task titles. Evals need isolated fixtures and assertions that print real values.

## 🛠️ Getting Started

### Prerequisites

- Node.js
- Docker
- Ollama

Pull the models:

```bash
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

Start MongoDB:

```bash
docker compose up -d
```

Install dependencies and configure:

```bash
npm install
cp .env.example .env
```

`.env`:

```text
LLM_PROVIDER=ollama          # ollama | openai
LLM_MODEL=qwen2.5:7b
LLM_TEMPERATURE=0            # 0 for reliable tool selection
EMBEDDING_MODEL=nomic-embed-text
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_NUM_CTX=8192
OLLAMA_TIMEOUT_MS=180000
DEBUG=false                  # true → print raw model responses
LOG_LEVEL=info               # silent | info | debug
OPENAI_API_KEY=              # only for LLM_PROVIDER=openai
```

Run:

```bash
npm run dev
```

```text
Conversation ID (press Enter for new):
```

Press Enter for a new conversation, or paste an ID to resume one.

### Ingest documents

```bash
npm run ingest -- docs/notes/my-note.md "My note"
```

Then ask the agent about it: `what do my notes say about ...?`

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | start the CLI |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run ingest -- <file> ["Title"]` | chunk, embed, and store a document |
| `npm run search:documents -- "query"` | show retrieval scores for a query |
| `npm run search:memories -- "query"` | same, for memories |
| `npm run backfill:embeddings` | re-embed all memories (after changing embedding model) |
| `npm run dedupe:memories` | remove near-duplicate memories |
| `npm run eval [-- filter]` | run the evaluation suite |
| `npm run traces` | summarize the last 50 turns (latency, cache hits, time by kind) |

## 💬 Example

```text
You: create a task called Write report due 2026-09-25, high priority
Agent: Created "Write report" (high priority, due 2026-09-25).

You: what's overdue?
Agent: One task is overdue: "Fix login bug", due 2026-09-18.

You: what are my deployment steps?
Agent: From your "Deploy checklist": 1. Run the checks ... 6. Commit and tag.
```

## 🗺️ Roadmap

### Completed

- [x] Basic LLM interaction and structured outputs
- [x] Tool calling, agent loop, Zod validation
- [x] MongoDB persistence, conversation resume
- [x] Context summarization and structured tool-call history
- [x] Tool error handling and graceful failure
- [x] Task model with priority and due dates; filters; daily briefing
- [x] LLM provider abstraction (Ollama, OpenAI)
- [x] Type-checked build
- [x] Embeddings and vector search
- [x] Semantic memory with automatic retrieval
- [x] RAG over documents (chunking, parent-document expansion)
- [x] **Observability and tracing** — per-turn trace of LLM calls, latency, cache hits, tool calls, retrieval scores
- [x] **Agent evaluation** — a repeatable test set for tool selection, date handling, grounded answers
- [x] **Guardrails** — input/output checks, confirmation before destructive actions
- [x] **Human-in-the-loop** — approve or edit tool calls before execution

### Planned

In the order I intend to tackle them:

- [ ] **Workflow orchestration** — multi-step plans (e.g. weekly review) as code, not prompts
- [ ] **Eval pass rates** — run each case N times and report a rate, not pass/fail
- [ ] **MCP integration** — expose tools over MCP and consume external MCP servers
- [ ] **Anthropic adapter** — third provider through the same interface
- [ ] **Vector database** — replace brute-force cosine when the collection outgrows it
- [ ] **Authentication and authorization** — multi-user
- [ ] **Production deployment** — HTTP API, Docker image, hosted MongoDB

## 🎯 Why No Agent Framework?

Frameworks are useful for production, but implementing the fundamentals manually builds a deeper understanding of:

- How tool calling and the agent loop actually work
- How state is maintained and persisted
- How tool results get back to the LLM, and what happens when they're wrong
- How memory differs from conversation history
- How context windows and prompt caches are managed
- What an embedding is, and what a vector database is actually solving
- Why "just add a rule to the prompt" so often isn't enough
- How to tell "the model got it wrong" from "my code got it wrong"
- What it takes to make a non-deterministic system testable

Once these are understood, frameworks can be evaluated from a much stronger technical foundation.

## 📌 Project Status

Actively developed as a hands-on AI engineering learning project. The architecture will keep evolving as new concepts are introduced.

## 👨‍💻 Author

**Muhammad Irfan**

Full Stack Developer → AI Engineer

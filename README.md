# Productivity Agent

A TypeScript-based AI productivity agent built from scratch to learn and implement the core concepts behind modern AI agents.

The project intentionally avoids agent frameworks such as Mastra so that the underlying concepts—LLM interaction, tool calling, memory, context management, persistence, and agent loops—can be understood and implemented directly.

## 🚀 Current Stack

- **TypeScript**
- **Node.js**
- **Ollama**
- **Qwen 2.5 7B**
- **MongoDB**
- **Docker**
- **Zod**

## ✨ Current Features

### AI Agent

- Local LLM integration using Ollama
- Agent loop with iterative tool execution
- Structured tool-call handling
- Provider-neutral agent state
- Empty-response handling and retries

### Tool Calling

The agent can currently:

- Create tasks
- List tasks
- Complete tasks
- Delete tasks
- Store memories
- Retrieve memories
- Search memories

Tools are validated using Zod before execution.

### Memory

The agent supports long-term memory:

- Automatic memory extraction
- Persistent memory storage in MongoDB
- Keyword-based memory search
- Memory retrieval through tools

Example:

```text
User:
I prefer working on backend tasks in the morning.

Agent:
[Extracts and stores the preference]
```

Later:

```text
User:
When should I work on backend tasks?

Agent:
You prefer working on backend tasks in the morning.
```

### Conversation Persistence

Conversations are persisted in MongoDB.

The agent supports:

- Creating conversations
- Resuming conversations using a conversation ID
- Persisting messages
- Persisting structured tool calls
- Persisting tool results
- Persisting conversation summaries

Example conversation history:

```text
User
  ↓
Assistant → tool call
  ↓
Tool result
  ↓
Assistant → final response
```

### Context Management

The agent manages growing conversations by separating context into:

```text
Recent conversation
        +
Conversation summary
        +
Long-term memory
```

Older conversation messages can be summarized while recent messages are retained.

## 🏗️ Architecture

The project is intentionally organized into separate layers:

```text
src/
├── agents/
│   ├── agent-state.ts
│   ├── context-manager.ts
│   ├── conversation-manager.ts
│   ├── tool-registry.ts
│   ├── tool-router.ts
│   └── tool-types.ts
│
├── llm/
│   ├── ollama-agent.ts
│   ├── ollama-client.ts
│   └── ollama-tools.ts
│
├── memory/
│   ├── memory-extractor.ts
│   ├── memory-repository.ts
│   └── conversation-summarizer.ts
│
├── repositories/
│   ├── task-repository.ts
│   └── conversation-repository.ts
│
├── tools/
│   ├── task-tools.ts
│   └── memory-tools.ts
│
└── index.ts
```

The architecture separates:

```text
LLM
 ↓
Agent
 ↓
Tool Registry
 ↓
Tool Router
 ↓
Application Tools
 ↓
Repositories
 ↓
MongoDB
```

This separation makes it easier to replace the LLM provider, add new tools, and evolve the agent without coupling everything together.

## 🧠 Learning Goals

This project is part of my transition from web development to AI engineering.

The goal is not simply to build a chatbot, but to understand how AI agents work internally.

The project is being developed incrementally, with each step introducing a new AI-engineering concept.

Current learning areas include:

- LLM integration
- Structured outputs
- Tool calling
- Agent loops
- Tool validation
- Agent state
- Conversation persistence
- Long-term memory
- Context management
- Conversation summarization
- Local LLM inference

## 🛠️ Getting Started

### Prerequisites

Make sure you have:

- Node.js
- Docker
- Ollama

Pull the Qwen model:

```bash
ollama pull qwen2.5:7b
```

Start MongoDB:

```bash
docker compose up -d
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application will ask for a conversation ID:

```text
Conversation ID (press Enter for new):
```

Press Enter to create a new conversation, or provide an existing conversation ID to resume one.

## 💬 Example

```text
You: create a task to learn RAG

Agent: Task "learn RAG" has been created successfully.
```

The agent decides whether a tool is required, executes the appropriate tool, and then generates a natural-language response.

## 🗺️ Roadmap

The project will continue evolving toward a production-oriented AI agent.

### Completed

- [x] Basic LLM interaction
- [x] Structured outputs
- [x] Tool calling
- [x] Agent tool loop
- [x] Tool validation
- [x] MongoDB persistence
- [x] Long-term memory
- [x] Automatic memory extraction
- [x] Conversation persistence
- [x] Conversation resume
- [x] Context summarization
- [x] Structured tool-call history
- [x] Empty-response handling

### Planned

- [ ] Clean and normalize tool results
- [ ] Semantic memory search
- [ ] Embeddings
- [ ] Vector search
- [ ] RAG
- [ ] Better memory retrieval
- [ ] Workflow orchestration
- [ ] Human-in-the-loop
- [ ] MCP integration
- [ ] Authentication and authorization
- [ ] Guardrails
- [ ] Agent evaluation
- [ ] Observability and tracing
- [ ] Production deployment

## 🎯 Why No Agent Framework?

This project intentionally starts without an agent framework.

Frameworks are useful for production, but implementing the fundamentals manually helps build a deeper understanding of:

- How tool calling works
- How an agent loop works
- How state is maintained
- How tool results are returned to an LLM
- How memory differs from conversation history
- How context windows are managed
- How persistence fits into an agent architecture

Once these fundamentals are understood, frameworks can be evaluated from a much stronger technical foundation.

## 📌 Project Status

This project is actively being developed as a hands-on AI engineering learning project.

The architecture and implementation will evolve as new concepts are introduced.

## 👨‍💻 Author

**Muhammad Irfan**

Full Stack Developer → AI Engineer
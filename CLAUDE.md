# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack AI chat application called "pentabot" with the following architecture:

- **client/**: React + TypeScript + Vite frontend application
- **server/agent/**: Express.js server with LangChain agent using Claude 3.5 Sonnet
- **server/executor/**: Standalone Express.js code execution service

### Key Components

- **Agent Service** (`server/agent/`): Main AI chat server that processes user messages through a LangChain ReAct agent with tools for weather and JavaScript code execution
- **Executor Service** (`server/executor/`): Sandboxed JavaScript code execution service that safely runs user-provided code
- **Client** (`client/`): React chat interface that connects to the agent service

## Development Commands

### Client (React Frontend)
```bash
cd client
npm install
npm run dev          # Development server on default port
npm run start        # Production-like server on 0.0.0.0:3000
npm run build        # TypeScript compilation + Vite build
npm run lint         # ESLint with TypeScript rules
npm run preview      # Preview production build
npm run build:prod   # Production build with explicit mode
```

### Server Services
```bash
# Agent service (port 3001)
cd server/agent
npm install
npm run start:agent

# Executor service (port 3000)
cd server/executor
npm install
npm run start:executor

# Run both services concurrently
cd server/agent
npm run start:all
```

## Environment Configuration

Both server services require `.env` files:

- **server/agent/.env**: Needs `ANTHROPIC_API_KEY` for Claude access and `EXECUTOR_URL` pointing to executor service
- **client/.env**: Needs `VITE_API_URL` pointing to agent service

## Architecture Notes

### Agent System
- Uses LangChain's `createReactAgent` with Claude 3.5 Sonnet
- Implements memory persistence with `MemorySaver`
- Two main tools:
  - Weather tool (mocked implementation)
  - JavaScript executor tool (connects to executor service)

### Code Execution Flow
1. User sends message to client
2. Client forwards to agent service (`/generate` endpoint)
3. Agent can use JavaScript executor tool when needed
4. Executor service safely runs code using `eval` with output capture
5. Results flow back through agent to client

### Security Considerations
- Executor service uses basic `eval` sandboxing by capturing console output
- CORS configured with wildcard origin (development setup)
- No authentication implemented

## TypeScript Configuration

Client uses modern TypeScript setup with:
- Strict type checking enabled
- React 19 with latest type definitions
- ESLint with TypeScript rules and React hooks plugin
- Vite for fast development and building
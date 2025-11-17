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

### Using Genezio (Recommended for Development)
```bash
# Install dependencies for all services
npm install  # Root level install
cd client && npm install
cd ../server/agent && npm install
cd ../executor && npm install

# Start development environment with Genezio
genezio local --env .env  # Starts both agent and executor services locally

# In a separate terminal, start the client
cd client
npm run dev          # Vite development server (usually port 5173 or 5174)
```

### Manual Server Setup (Alternative)
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

### Client Commands
```bash
cd client
npm run dev          # Development server on default port
npm run build        # TypeScript compilation + Vite build
npm run lint         # ESLint with TypeScript rules
npm run preview      # Preview production build
npm run build:prod   # Production build with explicit mode
```

## Environment Configuration

### Genezio Development
- **Root `.env`**: Used by `genezio local --env .env` command, contains all environment variables for both services:
  - `ANTHROPIC_API_KEY`: For Claude 3.5 Sonnet access
  - `EXECUTOR_URL`: Points to executor service (http://localhost:3000)
  - `SUPABASE_URL`: Supabase project URL
  - `SUPABASE_ANON_KEY`: Supabase public API key
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for server operations
  - `OPENAI_API_KEY`: Optional OpenAI API key
  - `WEATHER_API_KEY`: Weather service API key

- **client/.env**: Frontend environment variables:
  - `VITE_API_URL`: Points to agent service (http://localhost:3001)

### Manual Setup (Alternative)
- **server/.env**: Shared environment file for both agent and executor services
- **client/.env**: Same as above

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
- Authentication implemented using Supabase Auth with JWT tokens
- Row Level Security (RLS) enabled for all database tables

### Database Schema
- **Users**: Basic user profile with company info (company_name, position_title, nickname)
- **Organizations**: Available organization/team data
- **User Organizations**: Many-to-many relationship for multi-organization membership
- **Threads**: Chat conversation threads
- **Messages**: Individual chat messages
- **Usage History**: Tool usage tracking and metrics

### User Profile Management
- Individual profile editing through settings modal in user menu
- Multi-select organization membership
- Fallback support for databases without extended schema
- Real-time profile updates with optimistic UI


### Development Workflow

1. **Start Backend Services**: `genezio local --env .env`
2. **Start Frontend**: `cd client && npm run dev`
3. **Test Profile Features**: User menu > 개인정보 설정
4. **Run Tests**: `npm run lint && npm run build` (in client directory)

## TypeScript Configuration

Client uses modern TypeScript setup with:
- Strict type checking enabled
- React 19 with latest type definitions
- ESLint with TypeScript rules and React hooks plugin
- Vite for fast development and building

## API Endpoints

### Profile Management
- `GET /profile` - Get user profile with organizations
- `PUT /profile` - Update user profile and organizations
- `GET /profile/organizations` - Get available organizations list

### Chat & Threads
- `GET /threads` - List user's chat threads
- `POST /threads` - Create new thread
- `GET /messages/:threadId` - Get thread messages
- `POST /generate` - Send message to AI agent
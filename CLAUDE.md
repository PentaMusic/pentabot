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

## Database Setup

### Initial Schema Setup (Required)
If the database doesn't have the extended user profile schema, run this SQL in Supabase Dashboard > SQL Editor:

```sql
-- Add new columns to existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS position_title TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_organizations junction table
CREATE TABLE IF NOT EXISTS public.user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Enable RLS and create policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view organizations" ON public.organizations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own organization associations" ON public.user_organizations
    FOR ALL USING (auth.uid() = user_id);

-- Insert sample organizations
INSERT INTO public.organizations (name, description) VALUES
    ('개발팀', '소프트웨어 개발 및 엔지니어링'),
    ('디자인팀', 'UI/UX 디자인 및 브랜딩'),
    ('마케팅팀', '마케팅 및 고객 관리'),
    ('영업팀', '영업 및 비즈니스 개발'),
    ('인사팀', '인사 관리 및 조직 운영'),
    ('기획팀', '사업 기획 및 전략'),
    ('재무팀', '재무 관리 및 회계'),
    ('운영팀', '서비스 운영 및 유지보수')
ON CONFLICT (name) DO NOTHING;
```

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
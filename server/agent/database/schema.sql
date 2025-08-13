-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create threads table
CREATE TABLE public.threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tool usage types enum
CREATE TYPE tool_type AS ENUM (
    'claude_chat',          -- 일반 채팅
    'javascript_executor',  -- JavaScript 코드 실행
    'weather_tool',         -- 날씨 조회
    'web_search',          -- 웹 검색 (향후 추가될 수 있는 도구)
    'image_generation',    -- 이미지 생성 (향후 추가될 수 있는 도구)
    'code_analysis'        -- 코드 분석 (향후 추가될 수 있는 도구)
);

-- Create usage_history table with tool type tracking
CREATE TABLE public.usage_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,    -- !! 사용자 삭제 시에 이력은 살려두는 방법도 고려해야함
    thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    tool_type tool_type NOT NULL DEFAULT 'claude_chat',
    tool_name TEXT, -- 구체적인 도구 이름 (예: 'weather_api', 'openweathermap')
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cost_usd DECIMAL(10, 6) DEFAULT 0, -- 비용 계산을 위한 필드
    request_data JSONB DEFAULT '{}', -- 요청 데이터 (tool 파라미터 등)
    response_data JSONB DEFAULT '{}', -- 응답 데이터 (실행 결과 등)
    execution_time_ms INTEGER, -- 실행 시간 (밀리초)
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_threads_user_id ON public.threads(user_id);
CREATE INDEX idx_threads_updated_at ON public.threads(updated_at DESC);
CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_usage_history_user_id ON public.usage_history(user_id);
CREATE INDEX idx_usage_history_tool_type ON public.usage_history(tool_type);
CREATE INDEX idx_usage_history_created_at ON public.usage_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view own threads" ON public.threads
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.messages
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage history" ON public.usage_history
    FOR ALL USING (auth.uid() = user_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threads_updated_at
    BEFORE UPDATE ON public.threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create view for usage statistics by tool type
CREATE VIEW public.usage_stats_by_tool AS
SELECT 
    user_id,
    tool_type,
    tool_name,
    COUNT(*) as usage_count,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(cost_usd) as total_cost_usd,
    AVG(execution_time_ms) as avg_execution_time_ms,
    DATE_TRUNC('day', created_at) as usage_date
FROM public.usage_history
GROUP BY user_id, tool_type, tool_name, DATE_TRUNC('day', created_at)
ORDER BY usage_date DESC, total_tokens DESC;

-- Create view for daily usage summary
CREATE VIEW public.daily_usage_summary AS
SELECT 
    user_id,
    DATE_TRUNC('day', created_at) as usage_date,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(cost_usd) as total_cost_usd,
    COUNT(DISTINCT tool_type) as unique_tools_used
FROM public.usage_history
GROUP BY user_id, DATE_TRUNC('day', created_at)
ORDER BY usage_date DESC;

-- !! 사용량이 많으면 usage_date를 기준으로 인덱스 생성 필요

-- Create checkpoints table for LangGraph memory persistence
CREATE TABLE public.checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    checkpoint_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_id)
);

-- Create checkpoint writes table for pending writes
CREATE TABLE public.checkpoint_writes (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_id, task_id, channel),
    FOREIGN KEY (thread_id, checkpoint_id) REFERENCES public.checkpoints(thread_id, checkpoint_id) ON DELETE CASCADE
);

-- Create indexes for checkpoint tables
CREATE INDEX idx_checkpoints_thread_id ON public.checkpoints(thread_id);
CREATE INDEX idx_checkpoints_created_at ON public.checkpoints(created_at DESC);
CREATE INDEX idx_checkpoint_writes_thread_checkpoint ON public.checkpoint_writes(thread_id, checkpoint_id);
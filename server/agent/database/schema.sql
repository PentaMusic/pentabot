-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    position_title TEXT,
    nickname TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_organizations junction table for many-to-many relationship
CREATE TABLE public.user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
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
CREATE INDEX idx_organizations_name ON public.organizations(name);
CREATE INDEX idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX idx_user_organizations_organization_id ON public.user_organizations(organization_id);
CREATE INDEX idx_threads_user_id ON public.threads(user_id);
CREATE INDEX idx_threads_updated_at ON public.threads(updated_at DESC);
CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_usage_history_user_id ON public.usage_history(user_id);
CREATE INDEX idx_usage_history_tool_type ON public.usage_history(tool_type);
CREATE INDEX idx_usage_history_created_at ON public.usage_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
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

-- Organizations are viewable by all authenticated users
CREATE POLICY "All users can view organizations" ON public.organizations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only super admin can manage organizations (for now, allowing all authenticated users to manage for demo)
CREATE POLICY "Authenticated users can manage organizations" ON public.organizations
    FOR ALL USING (auth.role() = 'authenticated');

-- Users can manage their own organization associations
CREATE POLICY "Users can manage own organization associations" ON public.user_organizations
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

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
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

-- Create access level enum for knowledge base
CREATE TYPE access_level AS ENUM (
    'personal',    -- 개인 전용
    'department',  -- 부서(조직) 공유
    'company'      -- 전사 공유
);

-- Create knowledge_folders table
CREATE TABLE public.knowledge_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_folder_id UUID REFERENCES public.knowledge_folders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    access_level access_level NOT NULL DEFAULT 'personal',
    organization_id UUID REFERENCES public.organizations(id), -- NULL for personal/company folders
    path TEXT NOT NULL, -- Full path for efficient queries (e.g., '/personal/documents/projects')
    depth INTEGER NOT NULL DEFAULT 0, -- 0 = root level, 1 = first sublevel, etc.
    is_system_folder BOOLEAN DEFAULT FALSE, -- For auto-created folders like 전사문서함, 부서문서함, 개인문서함
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_depth CHECK (depth >= 0 AND depth <= 10), -- Max 10 levels deep
    CONSTRAINT system_folder_constraints CHECK (
        (is_system_folder = TRUE AND parent_folder_id IS NULL) OR 
        (is_system_folder = FALSE)
    ), -- System folders must be root level
    CONSTRAINT consistent_access_level CHECK (
        -- Child folders must have same or more restrictive access level as parent
        parent_folder_id IS NULL OR access_level IN ('personal', 'department', 'company')
    )
);

-- Create knowledge_files table
CREATE TABLE public.knowledge_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE, -- UUID-based filename in storage
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    folder_id UUID NOT NULL REFERENCES public.knowledge_folders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    access_level access_level NOT NULL DEFAULT 'personal',
    organization_id UUID REFERENCES public.organizations(id), -- NULL for personal/company files
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    download_count INTEGER DEFAULT 0,
    tags TEXT[], -- Array of tags for categorization
    metadata JSONB DEFAULT '{}', -- Additional file metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for knowledge base tables
CREATE INDEX idx_knowledge_folders_owner_id ON public.knowledge_folders(owner_id);
CREATE INDEX idx_knowledge_folders_parent_folder_id ON public.knowledge_folders(parent_folder_id);
CREATE INDEX idx_knowledge_folders_access_level ON public.knowledge_folders(access_level);
CREATE INDEX idx_knowledge_folders_organization_id ON public.knowledge_folders(organization_id);
CREATE INDEX idx_knowledge_folders_path ON public.knowledge_folders(path);
CREATE INDEX idx_knowledge_folders_depth ON public.knowledge_folders(depth);
CREATE INDEX idx_knowledge_folders_system ON public.knowledge_folders(is_system_folder);
CREATE INDEX idx_knowledge_files_folder_id ON public.knowledge_files(folder_id);
CREATE INDEX idx_knowledge_files_owner_id ON public.knowledge_files(owner_id);
CREATE INDEX idx_knowledge_files_access_level ON public.knowledge_files(access_level);
CREATE INDEX idx_knowledge_files_organization_id ON public.knowledge_files(organization_id);
CREATE INDEX idx_knowledge_files_tags ON public.knowledge_files USING GIN(tags);

-- Enable RLS for knowledge base tables
ALTER TABLE public.knowledge_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_folders
CREATE POLICY "Users can view accessible folders" ON public.knowledge_folders
    FOR SELECT USING (
        -- Personal folders: owner only
        (access_level = 'personal' AND owner_id = auth.uid()) OR
        -- Department folders: members of the organization
        (access_level = 'department' AND organization_id IN (
            SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
        )) OR
        -- Company folders: all authenticated users
        (access_level = 'company' AND auth.role() = 'authenticated')
    );

CREATE POLICY "Users can manage own folders" ON public.knowledge_folders
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can create folders" ON public.knowledge_folders
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- RLS policies for knowledge_files
CREATE POLICY "Users can view accessible files" ON public.knowledge_files
    FOR SELECT USING (
        -- Personal files: owner only
        (access_level = 'personal' AND owner_id = auth.uid()) OR
        -- Department files: members of the organization
        (access_level = 'department' AND organization_id IN (
            SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
        )) OR
        -- Company files: all authenticated users
        (access_level = 'company' AND auth.role() = 'authenticated')
    );

CREATE POLICY "Users can manage own files" ON public.knowledge_files
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can create files" ON public.knowledge_files
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_knowledge_folders_updated_at
    BEFORE UPDATE ON public.knowledge_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_files_updated_at
    BEFORE UPDATE ON public.knowledge_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate folder path and depth before insert/update
CREATE OR REPLACE FUNCTION public.calculate_folder_path_and_depth()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    parent_depth INTEGER;
    parent_access access_level;
    parent_org_id UUID;
BEGIN
    IF NEW.parent_folder_id IS NULL THEN
        -- Root level folder
        NEW.depth := 0;
        IF NEW.is_system_folder THEN
            CASE NEW.access_level
                WHEN 'personal' THEN NEW.path := '/personal';
                WHEN 'company' THEN NEW.path := '/company';
                WHEN 'department' THEN NEW.path := '/department/' || COALESCE(NEW.organization_id::text, 'unknown');
            END CASE;
        ELSE
            -- User-created root folder
            CASE NEW.access_level
                WHEN 'personal' THEN NEW.path := '/personal/' || NEW.name;
                WHEN 'company' THEN NEW.path := '/company/' || NEW.name;
                WHEN 'department' THEN NEW.path := '/department/' || COALESCE(NEW.organization_id::text, 'unknown') || '/' || NEW.name;
            END CASE;
        END IF;
    ELSE
        -- Child folder - get parent info
        SELECT path, depth, access_level, organization_id 
        INTO parent_path, parent_depth, parent_access, parent_org_id
        FROM public.knowledge_folders 
        WHERE id = NEW.parent_folder_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent folder not found';
        END IF;
        
        -- Inherit access control properties from parent
        NEW.access_level := parent_access;
        NEW.organization_id := parent_org_id;
        NEW.depth := parent_depth + 1;
        NEW.path := parent_path || '/' || NEW.name;
        
        -- Check depth limit
        IF NEW.depth > 10 THEN
            RAISE EXCEPTION 'Maximum folder depth (10) exceeded';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate path and depth
CREATE TRIGGER calculate_folder_hierarchy
    BEFORE INSERT OR UPDATE ON public.knowledge_folders
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_folder_path_and_depth();

-- Function to get folder hierarchy (breadcrumbs)
CREATE OR REPLACE FUNCTION public.get_folder_breadcrumbs(folder_id UUID)
RETURNS TABLE(id UUID, name TEXT, depth INTEGER) AS $$
WITH RECURSIVE folder_hierarchy AS (
    -- Base case: the requested folder
    SELECT f.id, f.name, f.parent_folder_id, f.depth
    FROM public.knowledge_folders f
    WHERE f.id = folder_id
    
    UNION ALL
    
    -- Recursive case: parent folders
    SELECT f.id, f.name, f.parent_folder_id, f.depth
    FROM public.knowledge_folders f
    INNER JOIN folder_hierarchy fh ON f.id = fh.parent_folder_id
)
SELECT fh.id, fh.name, fh.depth
FROM folder_hierarchy fh
ORDER BY fh.depth ASC;
$$ LANGUAGE SQL STABLE;

-- Function to get all subfolders of a folder
CREATE OR REPLACE FUNCTION public.get_folder_children(p_folder_id UUID, include_files BOOLEAN DEFAULT FALSE)
RETURNS TABLE(
    id UUID, 
    name TEXT, 
    type TEXT, -- 'folder' or 'file'
    size BIGINT, -- NULL for folders, file_size for files
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Return subfolders
    RETURN QUERY
    SELECT f.id, f.name, 'folder'::TEXT as type, NULL::BIGINT as size, f.created_at, f.updated_at
    FROM public.knowledge_folders f
    WHERE f.parent_folder_id = p_folder_id
    ORDER BY f.name;
    
    -- Return files if requested
    IF include_files THEN
        RETURN QUERY
        SELECT kf.id, kf.original_name as name, 'file'::TEXT as type, kf.file_size as size, kf.created_at, kf.updated_at
        FROM public.knowledge_files kf
        WHERE kf.folder_id = p_folder_id
        ORDER BY kf.original_name;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to auto-create system folders for new users
CREATE OR REPLACE FUNCTION public.create_system_folders_for_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Create personal folder (개인문서함) - each user gets their own
    -- The trigger will automatically set path and depth
    INSERT INTO public.knowledge_folders (name, description, owner_id, access_level, is_system_folder)
    VALUES ('개인문서함', '개인 전용 문서함', user_id, 'personal', TRUE);
END;
$$ LANGUAGE plpgsql;

-- Create function to initialize global system folders (run once)
CREATE OR REPLACE FUNCTION public.create_global_system_folders()
RETURNS VOID AS $$
DECLARE
    org_rec RECORD;
    company_folder_exists BOOLEAN;
    dept_folder_exists BOOLEAN;
    first_user_id UUID;
BEGIN
    -- Get first user ID as nominal owner for system folders
    SELECT id INTO first_user_id FROM public.users LIMIT 1;
    
    IF first_user_id IS NULL THEN
        -- No users exist yet, skip creating global folders
        RETURN;
    END IF;
    
    -- Check if company folder already exists
    SELECT EXISTS(
        SELECT 1 FROM public.knowledge_folders 
        WHERE name = '전사문서함' AND access_level = 'company' AND is_system_folder = TRUE
    ) INTO company_folder_exists;
    
    -- Create company folder if it doesn't exist (only one for entire company)
    IF NOT company_folder_exists THEN
        -- The trigger will automatically set path and depth
        INSERT INTO public.knowledge_folders (name, description, owner_id, access_level, is_system_folder)
        VALUES ('전사문서함', '전사 공유 문서함', first_user_id, 'company', TRUE);
    END IF;
    
    -- Create department folders for each organization (one per department)
    FOR org_rec IN SELECT id, name FROM public.organizations
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.knowledge_folders 
            WHERE name = org_rec.name || '문서함' 
            AND access_level = 'department' 
            AND organization_id = org_rec.id 
            AND is_system_folder = TRUE
        ) INTO dept_folder_exists;
        
        IF NOT dept_folder_exists THEN
            -- The trigger will automatically set path and depth
            INSERT INTO public.knowledge_folders (name, description, owner_id, access_level, organization_id, is_system_folder)
            VALUES (
                org_rec.name || '문서함', 
                org_rec.name || ' 부서 공유 문서함', 
                first_user_id,
                'department', 
                org_rec.id,
                TRUE
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the user creation function to include system folder creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    
    -- Create system folders for the new user
    PERFORM public.create_system_folders_for_user(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample organizations (for demo purposes)
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

-- Initialize global system folders
SELECT public.create_global_system_folders();

-- Create personal folders for existing users who don't have them
DO $$
DECLARE
    user_rec RECORD;
BEGIN
    FOR user_rec IN 
        SELECT u.id 
        FROM public.users u 
        WHERE NOT EXISTS (
            SELECT 1 FROM public.knowledge_folders kf 
            WHERE kf.owner_id = u.id 
            AND kf.name = '개인문서함' 
            AND kf.access_level = 'personal' 
            AND kf.is_system_folder = TRUE
        )
    LOOP
        PERFORM public.create_system_folders_for_user(user_rec.id);
    END LOOP;
END $$;
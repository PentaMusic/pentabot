-- Migration: Add user_type column to users table
-- Created: 2025-01-13
-- Description: Adds user_type enum and column to support admin roles

-- Step 1: Create user_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_type_enum AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add user_type column to users table (if not exists)
DO $$ BEGIN
    ALTER TABLE public.users
    ADD COLUMN user_type user_type_enum NOT NULL DEFAULT 'user';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Step 3: Set specific user as admin
UPDATE public.users
SET user_type = 'admin'
WHERE id = '1d934008-8fb3-4713-b72b-8c2b0a3eaeb9';

-- Step 4: Create index for performance (if not exists)
DO $$ BEGIN
    CREATE INDEX idx_users_user_type ON public.users(user_type);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Verify the migration
SELECT
    email,
    user_type,
    created_at
FROM public.users
WHERE id = '1d934008-8fb3-4713-b72b-8c2b0a3eaeb9';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment variables check:', {
    SUPABASE_URL: supabaseUrl ? 'Present' : 'Missing',
    SUPABASE_ANON_KEY: supabaseAnonKey ? `Present (${supabaseAnonKey.length} chars)` : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? `Present (${supabaseServiceKey.length} chars)` : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY_PREVIEW: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'Missing'
});

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

// Regular client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client for bypassing RLS
const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default supabase;
export { supabaseService };
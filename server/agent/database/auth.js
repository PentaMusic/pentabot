import supabase from './supabase.js';

// 회원가입
export const signUp = async (email, password, displayName = null) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName || email.split('@')[0]
                }
            }
        });

        if (error) throw error;

        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 로그인
export const signIn = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 로그아웃
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 현재 사용자 정보 조회
export const getCurrentUser = async (accessToken) => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (error) throw error;

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 사용자 프로필 업데이트
export const updateUserProfile = async (userId, updates) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, user: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// JWT 토큰 검증
export const verifyToken = async (token) => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
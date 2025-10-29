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

// 토큰 새로고침
export const refreshAccessToken = async (refreshToken) => {
    try {
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
        });
        if (error) throw error;
        return { success: true, session: data.session };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
// 패스워드 변경요청
export const requestPasswordReset = async (email, redirectTo) => {
    try {
        console.log('Requesting password reset for email:', email);
        console.log('Redirect URL:', `${redirectTo}/reset-password`);
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${redirectTo}/reset-password`
        });
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
// 패스워드 변경
export const updatePassword = async (accessToken, newPassword, refreshToken) => {
    try {
        // Set the session with the provided tokens to authenticate the user
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });
        
        if (sessionError) throw sessionError;

        // Update the user's password
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        return { success: true, user: data.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
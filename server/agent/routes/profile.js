import express from 'express';
import supabase from '../database/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user profile with organizations
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user profile (try with new columns first, fallback to basic columns)
        let { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, display_name, avatar_url, company_name, position_title, nickname, created_at, updated_at')
            .eq('id', userId)
            .single();

        // If new columns don't exist, fallback to basic columns
        if (userError && userError.code === '42703') {
            console.log('New columns not available, using basic profile');
            const fallbackResult = await supabase
                .from('users')
                .select('id, email, display_name, avatar_url, created_at, updated_at')
                .eq('id', userId)
                .single();
            
            user = {
                ...fallbackResult.data,
                company_name: null,
                position_title: null,
                nickname: null
            };
            userError = fallbackResult.error;
        }
            
        if (userError) {
            console.error('Error fetching user profile:', userError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }
        
        // Get user organizations (only if tables exist)
        let organizations = [];
        try {
            const { data: userOrganizations, error: orgError } = await supabase
                .from('user_organizations')
                .select(`
                    organization_id,
                    organizations (
                        id,
                        name,
                        description
                    )
                `)
                .eq('user_id', userId);
                
            if (!orgError && userOrganizations) {
                organizations = userOrganizations.map(uo => uo.organizations);
            } else if (orgError) {
                console.warn('Organizations tables not available:', orgError.message);
            }
        } catch (orgError) {
            console.warn('Organizations feature not available:', orgError);
        }
        
        res.json({
            user: {
                ...user,
                organizations
            }
        });
    } catch (error) {
        console.error('Error in profile GET:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
router.put('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            display_name, 
            company_name, 
            position_title, 
            nickname, 
            organization_ids = [] 
        } = req.body;
        
        // Update user basic info (try with new columns first, fallback to basic columns)
        let updateData = {
            display_name,
            updated_at: new Date().toISOString()
        };

        // Try to update with new columns
        try {
            updateData.company_name = company_name;
            updateData.position_title = position_title;
            updateData.nickname = nickname;
        } catch (err) {
            console.warn('New columns not available for update');
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();
            
        if (updateError) {
            console.error('Error updating user profile:', updateError);
            return res.status(500).json({ error: 'Failed to update user profile' });
        }
        
        // Update user organizations (only if tables exist)
        let organizations = [];
        
        try {
            // First, remove existing associations
            await supabase
                .from('user_organizations')
                .delete()
                .eq('user_id', userId);
            
            // Add new associations
            if (organization_ids.length > 0) {
                const organizationAssociations = organization_ids.map(orgId => ({
                    user_id: userId,
                    organization_id: orgId
                }));
                
                await supabase
                    .from('user_organizations')
                    .insert(organizationAssociations);
            }
            
            // Get updated user with organizations
            const { data: userOrganizations } = await supabase
                .from('user_organizations')
                .select(`
                    organization_id,
                    organizations (
                        id,
                        name,
                        description
                    )
                `)
                .eq('user_id', userId);
                
            organizations = userOrganizations ? userOrganizations.map(uo => uo.organizations) : [];
            
        } catch (orgError) {
            console.warn('Organizations update not available:', orgError);
        }
        
        res.json({
            user: {
                ...updatedUser,
                organizations
            }
        });
    } catch (error) {
        console.error('Error in profile PUT:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all available organizations
router.get('/organizations', requireAuth, async (req, res) => {
    try {
        const { data: organizations, error } = await supabase
            .from('organizations')
            .select('*')
            .order('name');
            
        if (error) {
            console.error('Error fetching organizations:', error);
            return res.status(500).json({ error: 'Failed to fetch organizations' });
        }
        
        res.json({ organizations });
    } catch (error) {
        console.error('Error in organizations GET:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
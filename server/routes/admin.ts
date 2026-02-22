import { Router } from 'express';
import { supabase } from '../supabase.js';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/users', requireAdmin, async (req, res, next) => {
    try {
        const { email, password, name, role, permissions, active, accounts } = req.body;

        if (!email || !name || !role) {
            throw new ApiError('Email, name, and role are required.', 400, ErrorCode.ERR_FRONT_VALIDATION);
        }

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: password || 'Success123!',
            email_confirm: true,
        });

        if (authError) throw authError;

        const user = authData.user;

        if (!user) {
            throw new ApiError('User could not be created.', 500, ErrorCode.ERR_BACK_INTERNAL);
        }

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                name,
                email,
                role,
                permissions,
                active,
                assigned_account_ids: accounts || [], // Ensure this matches the DB column name
            })
            .select()
            .single();

        if (profileError) {
            // If profile creation fails, we should delete the user from auth
            await supabase.auth.admin.deleteUser(user.id);
            throw profileError;
        }

        res.status(201).json(profileData);
    } catch (error) {
        next(error);
    }
});

router.post('/seed', requireAdmin, async (req, res, next) => {
    try {
        // Implement seed logic here or return success for now
        // This requires the service role key which 'supabase' from '../supabase.js' has.
        // Since this is an admin-only route, using service role key is acceptable.
        
        // Placeholder for seed logic
        res.json({ message: 'Seed completed successfully (Placeholder)', accounts: 0, meetings: 0 });
    } catch (error) {
        next(error);
    }
});

export default router;

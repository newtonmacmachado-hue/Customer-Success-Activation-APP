import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';
import { UserRole } from '../../types.js';

const router = Router();

router.post('/change-password', requireAuth, async (req: any, res: any, next: any) => {
    try {
        const { userId, newPassword } = req.body;

        if (!userId || !newPassword) {
            throw new ApiError('User ID and new password are required.', 400, ErrorCode.ERR_FRONT_VALIDATION);
        }

        // Authorization Check
        // Allow if user is changing their own password OR if user is Admin
        if (req.user.id !== userId) {
             const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', req.user.id)
                .single();
            
            if (!profile || profile.role !== UserRole.ADMIN_GERAL) {
                throw new ApiError('Access denied. You can only change your own password.', 403, ErrorCode.ERR_BACK_AUTH);
            }
        }

        const { data, error } = await supabase.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) {
            throw new ApiError(error.message, 500, ErrorCode.ERR_BACK_INTERNAL);
        }

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        next(error);
    }
});

export default router;

import express from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 모든 admin 라우트는 requireAdmin 미들웨어 사용
router.use(requireAdmin);

// 관리자 권한 확인 (로그인 후 admin 여부 검증)
router.get('/verify', (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            display_name: req.user.display_name,
            user_type: req.user.user_type
        }
    });
});

// TODO: Phase 2에서 구현할 엔드포인트들

// 조직 관리
// router.get('/organizations', getOrganizations);
// router.post('/organizations', createOrganization);
// router.put('/organizations/:id', updateOrganization);
// router.delete('/organizations/:id', deleteOrganization);

// 사용량 관리 (전체 사용자)
// router.get('/usage/all', getAllUsageStats);
// router.get('/usage/user/:userId', getUserUsageStats);
// router.get('/usage/summary', getUsageSummary);

// 관리자 관리
// router.get('/admins', getAdminList);
// router.put('/users/:userId/role', updateUserRole);
// router.get('/users', getAllUsers);
// router.delete('/users/:userId', deleteUser);

export default router;

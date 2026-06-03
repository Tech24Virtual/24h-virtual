-- Fix: WL partner login redirect
-- Code fix applied in src/components/auth/LoginForm.tsx line 29
-- Changed: '/white-label' -> '/white-label-dashboard'
-- Also fixed: src/components/admin/roleConfig.ts portalUrl
-- This is a frontend-only fix, no DB changes needed
SELECT 1; -- placeholder
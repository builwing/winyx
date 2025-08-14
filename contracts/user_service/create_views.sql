-- UserService ビューの作成

-- ユーザー権限確認用ビュー
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    COALESCE(r.name, 'no_role') as role_name,
    COALESCE(p.name, 'no_permission') as permission_name,
    COALESCE(p.resource, '') as resource,
    COALESCE(p.action, '') as action
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.status = 1;

-- アクティブセッション確認用ビュー
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT 
    ush.id as session_id,
    u.id as user_id,
    u.name as user_name,
    u.email,
    ush.ip_address,
    ush.login_at,
    ush.expires_at,
    CASE 
        WHEN ush.expires_at > NOW() THEN 'valid'
        ELSE 'expired'
    END as session_status
FROM user_session_history ush
JOIN users u ON ush.user_id = u.id
WHERE ush.status = 'active'
  AND ush.logout_at IS NULL
ORDER BY ush.login_at DESC;

-- 役割別権限確認用ビュー
CREATE OR REPLACE VIEW role_permissions_view AS
SELECT 
    r.id as role_id,
    r.name as role_name,
    r.description as role_description,
    COUNT(p.id) as permission_count,
    GROUP_CONCAT(CONCAT(p.resource, ':', p.action) SEPARATOR ', ') as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name, r.description
ORDER BY r.name;
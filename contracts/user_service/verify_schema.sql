-- UserService スキーマ検証用SQL
-- マイグレーション実行後の確認に使用

-- ======== テーブル存在確認 ========
SELECT 
    TABLE_NAME,
    TABLE_TYPE,
    ENGINE,
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'winyx_core' 
    AND TABLE_NAME IN (
        'users', 'sessions', 'user_profiles',
        'roles', 'permissions', 'user_roles', 'role_permissions',
        'user_session_history', 'password_resets'
    )
ORDER BY TABLE_NAME;

-- ======== 外部キー制約確認 ========
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'winyx_core' 
    AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- ======== インデックス確認 ========
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'winyx_core'
    AND TABLE_NAME IN ('roles', 'permissions', 'user_roles', 'role_permissions')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ======== ビュー確認 ========
SELECT 
    TABLE_NAME as VIEW_NAME,
    VIEW_DEFINITION
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'winyx_core'
    AND TABLE_NAME IN ('user_permissions_view', 'active_sessions_view');

-- ======== 基本データ確認 ========
-- 役割データ
SELECT 'roles' as table_name, id, name, description, created_at 
FROM roles 
ORDER BY id;

-- 権限データ（最初の10件）
SELECT 'permissions' as table_name, id, name, resource, action, description 
FROM permissions 
ORDER BY id 
LIMIT 10;

-- 役割権限関連データ
SELECT 
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY permission_count DESC;

-- ユーザー役割データ
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    r.name as role_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY u.id;

-- ======== データ整合性チェック ========
-- 孤立した user_roles レコード確認
SELECT 'orphaned_user_roles' as check_name, COUNT(*) as count
FROM user_roles ur
LEFT JOIN users u ON ur.user_id = u.id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.id IS NULL OR r.id IS NULL;

-- 孤立した role_permissions レコード確認
SELECT 'orphaned_role_permissions' as check_name, COUNT(*) as count
FROM role_permissions rp
LEFT JOIN roles r ON rp.role_id = r.id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.id IS NULL OR p.id IS NULL;

-- 権限のない役割確認
SELECT 'roles_without_permissions' as check_name, COUNT(*) as count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE rp.role_id IS NULL;

-- 役割のないユーザー確認
SELECT 'users_without_roles' as check_name, COUNT(*) as count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL;

-- ======== ビューのテスト ========
-- ユーザー権限ビューのサンプル
SELECT 
    user_name,
    email,
    role_name,
    COUNT(permission_name) as permission_count
FROM user_permissions_view
GROUP BY user_name, email, role_name
ORDER BY user_name;

-- アクティブセッションビューのサンプル
SELECT 
    session_id,
    user_name,
    email,
    ip_address,
    login_at,
    session_status,
    COUNT(*) OVER() as total_active_sessions
FROM active_sessions_view
ORDER BY login_at DESC
LIMIT 5;
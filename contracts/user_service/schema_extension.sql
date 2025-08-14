-- UserService用拡張テーブル（winyx_coreに追加）
-- 既存テーブルと共存する権限管理システム

-- 役割管理テーブル
CREATE TABLE IF NOT EXISTS roles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 権限管理テーブル
CREATE TABLE IF NOT EXISTS permissions (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    resource    VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY idx_permission (resource, action),
    INDEX idx_name (name),
    INDEX idx_resource (resource)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザー役割関連テーブル
CREATE TABLE IF NOT EXISTS user_roles (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    role_id    BIGINT NOT NULL,
    assigned_by BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY idx_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id),
    INDEX idx_assigned_by (assigned_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 役割権限関連テーブル  
CREATE TABLE IF NOT EXISTS role_permissions (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY idx_role_permission (role_id, permission_id),
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザーセッション履歴テーブル（既存sessionsテーブルの拡張）
CREATE TABLE IF NOT EXISTS user_session_history (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_at  TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    status     ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_status (status),
    INDEX idx_login_at (login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- パスワードリセット管理テーブル
CREATE TABLE IF NOT EXISTS password_resets (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== 基本データの挿入 ========

-- 基本的な役割データの追加
INSERT INTO roles (name, description) VALUES 
('admin', 'システム管理者 - 全ての機能にアクセス可能'),
('user', '一般ユーザー - 基本機能のみ利用可能'),
('moderator', 'モデレーター - 限定的な管理機能を利用可能'),
('guest', 'ゲストユーザー - 読み取り専用アクセス')
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- 基本的な権限データの追加
INSERT INTO permissions (name, resource, action, description) VALUES 
-- ユーザー管理権限
('ユーザー一覧表示', 'users', 'list', 'ユーザー一覧を表示する権限'),
('ユーザー詳細表示', 'users', 'view', 'ユーザー詳細を表示する権限'),
('ユーザー作成', 'users', 'create', 'ユーザーを作成する権限'),
('ユーザー更新', 'users', 'update', 'ユーザー情報を更新する権限'),
('ユーザー削除', 'users', 'delete', 'ユーザーを削除する権限'),
('ユーザーステータス変更', 'users', 'status', 'ユーザーのステータスを変更する権限'),

-- プロフィール管理権限
('プロフィール表示', 'profiles', 'view', '自分のプロフィールを表示する権限'),
('プロフィール更新', 'profiles', 'update', '自分のプロフィールを更新する権限'),

-- 役割・権限管理
('役割一覧表示', 'roles', 'list', '役割一覧を表示する権限'),
('役割割り当て', 'roles', 'assign', 'ユーザーに役割を割り当てる権限'),
('役割削除', 'roles', 'remove', 'ユーザーから役割を削除する権限'),

-- システム管理権限
('システム管理', 'system', 'admin', 'システム全体の管理権限'),
('ログ参照', 'system', 'logs', 'システムログを参照する権限'),
('設定変更', 'system', 'config', 'システム設定を変更する権限')

ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- 管理者権限の設定（すべての権限を付与）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE created_at = created_at;

-- モデレーター権限の設定（限定的な管理権限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'moderator' 
  AND p.action IN ('list', 'view', 'status')
ON DUPLICATE KEY UPDATE created_at = created_at;

-- 一般ユーザー権限の設定（基本権限のみ）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'user' 
  AND p.resource IN ('profiles') 
  AND p.action IN ('view', 'update')
ON DUPLICATE KEY UPDATE created_at = created_at;

-- ゲストユーザー権限の設定（読み取り専用）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'guest' 
  AND p.action = 'view'
  AND p.resource = 'profiles'
ON DUPLICATE KEY UPDATE created_at = created_at;

-- ======== デフォルトユーザーへの役割割り当て ========

-- 既存のusersテーブルに管理者ユーザーが存在する場合、admin役割を割り当て
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id 
FROM users u 
CROSS JOIN roles r 
WHERE u.email = 'admin@winyx.jp' 
  AND r.name = 'admin'
ON DUPLICATE KEY UPDATE created_at = created_at;

-- 既存の一般ユーザーには'user'役割を割り当て（adminユーザー以外）
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id 
FROM users u 
CROSS JOIN roles r 
WHERE u.email != 'admin@winyx.jp' 
  AND r.name = 'user'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
  )
ON DUPLICATE KEY UPDATE created_at = created_at;

-- ======== インデックスの最適化 ========

-- 複合インデックスの追加（パフォーマンス向上）
ALTER TABLE user_session_history 
ADD INDEX idx_user_status_login (user_id, status, login_at);

ALTER TABLE password_resets 
ADD INDEX idx_email_expires (email, expires_at);

-- ======== 権限確認用ビューの作成 ========

-- ユーザー権限確認用ビュー
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    r.name as role_name,
    p.name as permission_name,
    p.resource,
    p.action
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.status = 'active';

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
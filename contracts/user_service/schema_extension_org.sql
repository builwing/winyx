-- UserService用拡張テーブル（winyx_coreに追加）

-- 組織テーブル
CREATE TABLE IF NOT EXISTS orgs (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL COMMENT '組織名',
    owner_id   BIGINT UNSIGNED NOT NULL COMMENT '組織の所有者 (users.id)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='組織情報を格納するテーブル';

-- 組織メンバーシップテーブル
CREATE TABLE IF NOT EXISTS org_members (
    org_id         BIGINT UNSIGNED NOT NULL COMMENT '組織ID',
    user_id        BIGINT UNSIGNED NOT NULL COMMENT 'ユーザーID',
    role_id        BIGINT NOT NULL COMMENT '組織内での役割を示すロールID',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (org_id, user_id),
    FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザーと組織の関連付けおよび役割を管理するテーブル';

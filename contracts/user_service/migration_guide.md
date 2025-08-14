# UserService データベースマイグレーションガイド

## 📋 マイグレーション手順

### 1. 事前確認
```bash
# 現在のデータベース状況を確認
mysql -u root -p -e "USE winyx_core; SHOW TABLES;"

# 既存のusers, sessions, user_profilesテーブルの構造確認
mysql -u root -p -e "USE winyx_core; DESCRIBE users;"
mysql -u root -p -e "USE winyx_core; DESCRIBE sessions;" 
mysql -u root -p -e "USE winyx_core; DESCRIBE user_profiles;"
```

### 2. バックアップ作成
```bash
# 既存のwinyx_coreをバックアップ
mysqldump -u root -p winyx_core > /var/backups/winyx_core_backup_$(date +%Y%m%d_%H%M%S).sql

# バックアップ確認
ls -la /var/backups/winyx_core_backup_*.sql
```

### 3. スキーマ拡張の実行
```bash
# 権限管理テーブルの追加
mysql -u root -p winyx_core < /var/www/winyx/contracts/user_service/schema_extension.sql

# 実行結果の確認
mysql -u root -p -e "USE winyx_core; SHOW TABLES;"
```

### 4. データ検証
```bash
# 新しいテーブルの確認
mysql -u root -p -e "USE winyx_core; 
SELECT 'roles' as table_name, COUNT(*) as count FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions  
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions;"

# 権限ビューの確認
mysql -u root -p -e "USE winyx_core; 
SELECT user_name, role_name, COUNT(permission_name) as permission_count 
FROM user_permissions_view 
GROUP BY user_name, role_name;"
```

### 5. UserService用DBユーザーの作成（オプション）
```sql
-- 専用DBユーザーの作成
CREATE USER 'winyx_user_service'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 必要な権限のみ付与
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.users TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.sessions TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.user_profiles TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.roles TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.permissions TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.user_roles TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.role_permissions TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.user_session_history TO 'winyx_user_service'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON winyx_core.password_resets TO 'winyx_user_service'@'localhost';

-- ビューへのアクセス権限
GRANT SELECT ON winyx_core.user_permissions_view TO 'winyx_user_service'@'localhost';
GRANT SELECT ON winyx_core.active_sessions_view TO 'winyx_user_service'@'localhost';

FLUSH PRIVILEGES;
```

## 🔍 マイグレーション後の確認項目

### テーブル構造の確認
```sql
-- 新しく追加されたテーブル
SHOW CREATE TABLE roles;
SHOW CREATE TABLE permissions;
SHOW CREATE TABLE user_roles;
SHOW CREATE TABLE role_permissions;
SHOW CREATE TABLE user_session_history;
SHOW CREATE TABLE password_resets;

-- ビューの確認
SHOW CREATE VIEW user_permissions_view;
SHOW CREATE VIEW active_sessions_view;
```

### データ整合性の確認
```sql
-- 既存ユーザーに役割が正しく割り当てられているか
SELECT 
    u.name, 
    u.email, 
    r.name as role_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY u.id;

-- 管理者権限が正しく設定されているか
SELECT 
    r.name as role_name,
    COUNT(p.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name
ORDER BY permission_count DESC;
```

## ⚠️ トラブルシューティング

### よくあるエラーと対処法

1. **外部キー制約エラー**
```sql
-- 制約を一時的に無効化
SET FOREIGN_KEY_CHECKS = 0;
-- マイグレーション実行
SET FOREIGN_KEY_CHECKS = 1;
```

2. **重複エラー**
```sql
-- 既存データの確認
SELECT name FROM roles WHERE name IN ('admin', 'user', 'moderator', 'guest');
```

3. **権限不足エラー**
```bash
# mysql権限で実行
sudo mysql winyx_core < /var/www/winyx/contracts/user_service/schema_extension.sql
```

## 📝 ロールバック手順

万が一問題が発生した場合：

```bash
# バックアップからの復元
mysql -u root -p winyx_core < /var/backups/winyx_core_backup_YYYYMMDD_HHMMSS.sql

# 新しく追加したテーブルの削除（必要に応じて）
mysql -u root -p -e "USE winyx_core; 
DROP VIEW IF EXISTS user_permissions_view;
DROP VIEW IF EXISTS active_sessions_view;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS user_session_history;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;"
```

## ✅ マイグレーション完了後のNext Steps

1. **UserServiceの設定ファイル更新**
   - データベース接続情報の更新
   - 新しいテーブルアクセス権限の確認

2. **Go-Zeroモデルの生成**
   - 新しいテーブル用のモデル生成
   - 既存テーブルモデルの更新

3. **APIテスト**
   - 権限管理機能のテスト
   - 既存機能への影響確認
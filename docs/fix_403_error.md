# 403 Forbidden エラーの修正手順

## 問題
`/etc/nginx/sites-available/winyx` の36行目で `include /etc/nginx/conf.d/allowed_ips.conf;` が有効になっているため、
allowed_ips.conf の内容がコメントアウトされていても、デフォルトで全てのアクセスが拒否されています。

## 解決方法

### 手順1: Nginx設定を編集
```bash
sudo nano /etc/nginx/sites-available/winyx
```

### 手順2: 36行目を以下のように変更

**変更前（36行目）:**
```nginx
    include /etc/nginx/conf.d/allowed_ips.conf;
```

**変更後（36行目）:**
```nginx
    # include /etc/nginx/conf.d/allowed_ips.conf;
```

### 手順3: 設定の検証と適用
```bash
# 設定のシンタックスチェック
sudo nginx -t

# Nginxをリロード
sudo systemctl reload nginx
```

## 別の解決方法（IP制限を維持したい場合）

`/etc/nginx/conf.d/allowed_ips.conf` を以下のように編集：

```nginx
# Winyx IPアドレス制限設定
allow 202.79.96.61;     # 会社のIPアドレス
allow 101.111.202.127;  # 自宅のIPアドレス
allow all;              # 一時的に全て許可（テスト用）
# deny all;             # 本番環境では allow all を削除してこれを有効化
```

## 確認方法

修正後、以下のURLでアクセス可能になります：
- Swagger UI: https://winyx.jp/swagger/
- OpenAPI仕様: https://winyx.jp/api/docs/user_service.json
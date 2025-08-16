# 第11章 Swagger/OpenAPI実装仕様書

## 11.1 概要と目的

### 11.1.1 Swagger/OpenAPIの役割
WinyxプロジェクトではGo-Zeroの契約駆動開発（Contract-First）と連携し、API仕様を自動生成・公開します。

### 11.1.2 実装方針
- **選択肢A（推奨）**: goctl plugin経由で.apiファイルからOpenAPI仕様を自動生成
- **選択肢B**: 手動でOpenAPI仕様を作成（非推奨、保守性低下）
- **選択肢C**: サードパーティツール使用（go-swagger等、Go-Zeroとの整合性に課題）

**採用理由**：
1. Go-Zero契約ファイル（.api）を単一情報源として維持
2. 自動生成により仕様と実装の乖離を防止
3. CI/CDパイプラインでの自動化が容易

---

## 11.2 アーキテクチャ設計

### 11.2.1 システム構成
```
契約ファイル(.api)
    ↓
goctl plugin -plugin goctl-swagger
    ↓
OpenAPI 3.0仕様 (swagger.json/yaml)
    ↓
├── Swagger UI (開発環境)
├── Redoc (本番環境ドキュメント)
└── APIクライアント自動生成
```

### 11.2.2 ディレクトリ構造
```
/var/www/winyx/
├── contracts/              # 契約ファイル管理
│   ├── user_service/
│   │   └── user.api       # UserService契約定義
│   └── openapi/           # 生成されたOpenAPI仕様
│       ├── user_service.yaml
│       └── user_service.json
├── backend/
│   └── swagger/           # Swagger UI配信用
│       ├── index.html
│       └── dist/
└── scripts/
    └── generate_swagger.sh  # 自動生成スクリプト
```

---

## 11.3 実装手順

### 11.3.1 goctl-swaggerプラグインのインストール

```bash
# goctl-swaggerプラグインをインストール
go install github.com/zeromicro/goctl-swagger@latest

# インストール確認
which goctl-swagger
# 期待結果: /home/hide/go/bin/goctl-swagger
```

### 11.3.2 契約ファイルからOpenAPI仕様の生成

```bash
# 単一サービスの生成
cd /var/www/winyx/backend/user_service
goctl api plugin -plugin goctl-swagger="swagger -filename user_service.json" -api /var/www/winyx/contracts/user_service/user.api -dir ./docs

# 全サービス一括生成スクリプト
cat > /var/www/winyx/scripts/generate_swagger.sh <<'SCRIPT'
#!/bin/bash
set -e

CONTRACTS_DIR="/var/www/winyx/contracts"
OUTPUT_DIR="/var/www/winyx/contracts/openapi"

# 出力ディレクトリ作成
mkdir -p "$OUTPUT_DIR"

# 各サービスの契約ファイルを処理
for api_file in "$CONTRACTS_DIR"/*/*.api; do
    if [ -f "$api_file" ]; then
        service_name=$(basename $(dirname "$api_file"))
        echo "Generating OpenAPI for $service_name..."
        
        goctl api plugin \
            -plugin goctl-swagger="swagger -filename ${service_name}.json" \
            -api "$api_file" \
            -dir "$OUTPUT_DIR"
    fi
done

echo "OpenAPI generation completed!"
SCRIPT

chmod +x /var/www/winyx/scripts/generate_swagger.sh
```

### 11.3.3 Swagger UIの設定

```yaml
# /var/www/winyx/backend/swagger/docker-compose.yml
version: '3.8'
services:
  swagger-ui:
    image: swaggerapi/swagger-ui:latest
    ports:
      - "8080:8080"
    environment:
      - SWAGGER_JSON=/specs/user_service.json
      - BASE_URL=/swagger
    volumes:
      - /var/www/winyx/contracts/openapi:/specs:ro
```

### 11.3.4 Nginxプロキシ設定

```nginx
# /etc/nginx/sites-available/winyx
location /swagger/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # 開発環境のみアクセス許可
    allow 192.168.0.0/16;
    allow 127.0.0.1;
    deny all;
}

location /api/docs/ {
    alias /var/www/winyx/contracts/openapi/;
    try_files $uri $uri/ =404;
    
    # CORS設定
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
}
```

---

## 11.4 契約ファイルの拡張

### 11.4.1 OpenAPI用メタデータ追加

```api
// /var/www/winyx/contracts/user_service/user.api
syntax = "v1"

info(
    title: "User Service API"
    desc: "ユーザー管理・認証・組織管理API"
    author: "Winyx Team"
    email: "api@winyx.jp"
    version: "1.0.0"
)

// OpenAPI追加情報
@server(
    jwt: Auth
    group: user
    prefix: /api/v1
    middleware: Cors,RateLimit
    timeout: 30s
)

type (
    // @doc: "ユーザー登録リクエスト"
    RegisterReq {
        // @doc: "メールアドレス（一意制約）"
        Email string `json:"email" validate:"required,email"`
        // @doc: "パスワード（8文字以上）"
        Password string `json:"password" validate:"required,min=8"`
        // @doc: "表示名"
        Name string `json:"name,optional"`
    }

    // @doc: "API共通レスポンス"
    CommonRes {
        // @doc: "処理結果コード（0:成功）"
        Code int `json:"code"`
        // @doc: "メッセージ"
        Message string `json:"message"`
        // @doc: "詳細データ"
        Data interface{} `json:"data,omitempty"`
    }
)

service user-api {
    // @doc: "新規ユーザー登録"
    // @handler: register
    // @tag: Authentication
    post /register (RegisterReq) returns (CommonRes)
    
    // @doc: "ユーザーログイン"
    // @handler: login
    // @tag: Authentication
    post /login (LoginReq) returns (LoginRes)
}
```

### 11.4.2 レスポンス例の定義

```go
// /var/www/winyx/backend/user_service/internal/logic/registerlogic.go
func (l *RegisterLogic) Register(req *types.RegisterReq) (resp *types.CommonRes, err error) {
    // ビジネスロジック実装
    
    // Swagger用のレスポンス例
    return &types.CommonRes{
        Code:    0,
        Message: "ユーザー登録成功",
        Data: map[string]interface{}{
            "user_id": 12345,
            "email":   req.Email,
            "token":   "eyJhbGciOiJIUzI1NiIs...",
        },
    }, nil
}
```

---

## 11.5 自動生成とCI/CD統合

### 11.5.1 Git Hooksによる自動生成

```bash
# .git/hooks/pre-commit
#!/bin/bash
# 契約ファイル変更時にOpenAPI仕様を自動生成

if git diff --cached --name-only | grep -q "\.api$"; then
    echo "契約ファイルが変更されました。OpenAPI仕様を生成中..."
    /var/www/winyx/scripts/generate_swagger.sh
    
    # 生成されたファイルをステージング
    git add /var/www/winyx/contracts/openapi/*.json
    git add /var/www/winyx/contracts/openapi/*.yaml
fi
```

### 11.5.2 GitHub Actions統合

```yaml
# .github/workflows/swagger.yml
name: Generate OpenAPI Documentation

on:
  push:
    paths:
      - 'contracts/**/*.api'
      - 'contracts/**/*.proto'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.24'
      
      - name: Install goctl
        run: go install github.com/zeromicro/go-zero/tools/goctl@latest
      
      - name: Install goctl-swagger
        run: go install github.com/zeromicro/goctl-swagger@latest
      
      - name: Generate OpenAPI specs
        run: ./scripts/generate_swagger.sh
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: openapi-specs
          path: contracts/openapi/
      
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./contracts/openapi
```

---

## 11.6 Swagger UIカスタマイズ

### 11.6.1 カスタムテーマ設定

```html
<!-- /var/www/winyx/backend/swagger/index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Winyx API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
    <style>
        /* Winyxブランドカラー */
        .swagger-ui .topbar {
            background-color: #7c3aed;
        }
        .swagger-ui .topbar .download-url-wrapper {
            display: flex;
            align-items: center;
        }
        .swagger-ui .btn.authorize {
            background-color: #7c3aed;
            border-color: #7c3aed;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                urls: [
                    {url: "/api/docs/user_service.json", name: "User Service"},
                    {url: "/api/docs/task_service.json", name: "Task Service"},
                    {url: "/api/docs/message_service.json", name: "Message Service"}
                ],
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                persistAuthorization: true,
                tryItOutEnabled: true,
                filter: true,
                validatorUrl: null
            });
            window.ui = ui;
        };
    </script>
</body>
</html>
```

### 11.6.2 認証設定

```javascript
// JWT認証の自動設定
const ui = SwaggerUIBundle({
    // ... 他の設定
    requestInterceptor: (request) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            request.headers['Authorization'] = `Bearer ${token}`;
        }
        return request;
    },
    onComplete: () => {
        // 自動的にJWTトークンを設定
        const token = localStorage.getItem('access_token');
        if (token) {
            ui.preauthorizeApiKey('bearerAuth', token);
        }
    }
});
```

---

## 11.7 Redocによる静的ドキュメント

### 11.7.1 Redoc設定

```html
<!-- /var/www/winyx/backend/docs/redoc.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Winyx API Reference</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { margin: 0; padding: 0; }
        .menu-content { background: #7c3aed; }
    </style>
</head>
<body>
    <redoc spec-url='/api/docs/user_service.json'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
</body>
</html>
```

### 11.7.2 マルチサービス対応

```html
<!-- サービス選択UI -->
<div class="service-selector">
    <select id="service-select" onchange="loadService(this.value)">
        <option value="user_service">User Service</option>
        <option value="task_service">Task Service</option>
        <option value="message_service">Message Service</option>
    </select>
</div>

<script>
function loadService(service) {
    Redoc.init(`/api/docs/${service}.json`, {
        scrollYOffset: 50,
        theme: {
            colors: {
                primary: { main: '#7c3aed' }
            },
            typography: {
                fontSize: '14px',
                code: { fontSize: '13px' }
            }
        }
    }, document.getElementById('redoc-container'));
}
</script>
```

---

## 11.8 APIクライアント自動生成

### 11.8.1 TypeScriptクライアント生成

```bash
# OpenAPI GeneratorによるTypeScriptクライアント生成
npm install @openapitools/openapi-generator-cli -g

# クライアント生成スクリプト
cat > /var/www/winyx/scripts/generate_api_client.sh <<'SCRIPT'
#!/bin/bash
set -e

OPENAPI_DIR="/var/www/winyx/contracts/openapi"
OUTPUT_DIR="/var/www/winyx/frontend/src/lib/generated"

# TypeScriptクライアント生成
for spec in "$OPENAPI_DIR"/*.json; do
    service_name=$(basename "$spec" .json)
    
    openapi-generator-cli generate \
        -i "$spec" \
        -g typescript-fetch \
        -o "$OUTPUT_DIR/$service_name" \
        --additional-properties=supportsES6=true,npmVersion=10.0.0,typescriptThreePlus=true
done

# 型定義の統合
cat > "$OUTPUT_DIR/index.ts" <<EOF
export * from './user_service';
export * from './task_service';
export * from './message_service';
EOF

echo "API clients generated successfully!"
SCRIPT

chmod +x /var/www/winyx/scripts/generate_api_client.sh
```

### 11.8.2 生成されたクライアントの利用

```typescript
// /var/www/winyx/frontend/src/hooks/useGeneratedApi.ts
import { 
    UserServiceApi,
    Configuration 
} from '@/lib/generated/user_service';

export function useUserServiceApi() {
    const config = new Configuration({
        basePath: process.env.NEXT_PUBLIC_API_URL,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    
    return new UserServiceApi(config);
}

// 使用例
const userApi = useUserServiceApi();
const users = await userApi.listUsers({ page: 1, limit: 10 });
```

---

## 11.9 テストとバリデーション

### 11.9.1 OpenAPI仕様の検証

```bash
# spectralによる仕様検証
npm install -g @stoplight/spectral-cli

# 検証ルール設定
cat > /var/www/winyx/.spectral.yml <<'YAML'
extends: ["spectral:oas"]
rules:
  operation-description: error
  operation-tags: error
  info-contact: error
  oas3-api-servers: off
YAML

# 検証実行
spectral lint /var/www/winyx/contracts/openapi/*.json
```

### 11.9.2 契約テスト

```go
// /var/www/winyx/backend/user_service/internal/handler/register_handler_test.go
func TestRegisterHandler_OpenAPICompliance(t *testing.T) {
    // OpenAPI仕様の読み込み
    spec, err := os.ReadFile("/var/www/winyx/contracts/openapi/user_service.json")
    require.NoError(t, err)
    
    // リクエスト/レスポンスの検証
    validator := openapi3filter.NewValidator()
    err = validator.ValidateRequest(req)
    assert.NoError(t, err, "リクエストがOpenAPI仕様に準拠していません")
    
    err = validator.ValidateResponse(resp)
    assert.NoError(t, err, "レスポンスがOpenAPI仕様に準拠していません")
}
```

---

## 11.10 監視とメトリクス

### 11.10.1 API利用状況の可視化

```go
// Prometheusメトリクス
var (
    swaggerUIAccess = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "swagger_ui_access_total",
            Help: "Total number of Swagger UI accesses",
        },
        []string{"service", "method"},
    )
)

// Swagger UIアクセスログ
func SwaggerMetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        service := r.URL.Query().Get("service")
        swaggerUIAccess.WithLabelValues(service, r.Method).Inc()
        next.ServeHTTP(w, r)
    })
}
```

### 11.10.2 ドキュメント更新通知

```bash
# Slackへの更新通知
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"API仕様が更新されました\",
    \"attachments\": [{
      \"color\": \"good\",
      \"title\": \"$service_name API v$version\",
      \"text\": \"更新内容: $changes\",
      \"fields\": [{
        \"title\": \"Swagger UI\",
        \"value\": \"https://winyx.jp/swagger/\"
      }]
    }]
  }"
```

---

## 11.11 トラブルシューティング

### 11.11.1 よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| goctl-swaggerが見つからない | PATHが通っていない | `export PATH=$PATH:~/go/bin` |
| OpenAPI生成エラー | .apiファイルの構文エラー | `goctl api validate -api user.api` |
| Swagger UIが表示されない | CORS設定不備 | Nginx設定でCORSヘッダー追加 |
| 認証が機能しない | JWTトークン形式不正 | Bearer接頭辞を確認 |

### 11.11.2 デバッグ方法

```bash
# goctl-swaggerのデバッグモード
goctl api plugin -plugin goctl-swagger="swagger -filename test.json -verbose" -api user.api

# OpenAPI仕様の検証
curl -X POST https://validator.swagger.io/validator/debug \
  -H "Content-Type: application/json" \
  -d @user_service.json

# Swagger UIコンソールログ確認
# ブラウザのDevToolsでネットワークタブとコンソールを確認
```

---

## 11.12 セキュリティ考慮事項

### 11.12.1 本番環境での制限

```nginx
# 本番環境ではSwagger UIへのアクセスを制限
location /swagger/ {
    # 開発者のIPアドレスのみ許可
    allow 203.0.113.0/24;  # 開発チームのIP範囲
    deny all;
    
    # Basic認証を追加
    auth_basic "API Documentation";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

### 11.12.2 機密情報の除外

```api
// 本番環境では除外するフィールド
type User {
    ID int64 `json:"id"`
    Email string `json:"email"`
    // @internal: true  // Swagger UIには表示しない
    PasswordHash string `json:"-"`
    // @internal: true
    Salt string `json:"-"`
}
```

---

## 11.13 次のステップ

Swagger/OpenAPI実装完了後の展開：
1. **GraphQL統合**: REST APIと並行してGraphQLエンドポイント提供
2. **APIゲートウェイ**: Kong/Traefikによる高度なAPI管理
3. **開発者ポータル**: 外部開発者向けAPIポータルサイト構築

---

## 付録A：goctl-swagger設定リファレンス

```bash
# 利用可能なオプション
goctl api plugin -plugin goctl-swagger="swagger \
  -filename output.json \      # 出力ファイル名
  -host api.winyx.jp \         # APIホスト
  -basepath /api/v1 \          # ベースパス
  -schemes https \             # プロトコル
  -verbose"                    # 詳細ログ
```

## 付録B：OpenAPI 3.0仕様例

```yaml
openapi: 3.0.0
info:
  title: Winyx User Service API
  version: 1.0.0
  description: ユーザー管理・認証・組織管理API
servers:
  - url: https://winyx.jp/api/v1
    description: Production server
  - url: http://localhost:8888/api/v1
    description: Development server
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
security:
  - bearerAuth: []
paths:
  /register:
    post:
      summary: 新規ユーザー登録
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterReq'
      responses:
        '200':
          description: 登録成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CommonRes'
```
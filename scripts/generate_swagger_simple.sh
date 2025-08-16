#!/bin/bash
set -e

# 設定
OUTPUT_DIR="/var/www/winyx/contracts/openapi"
API_FILE="/var/www/winyx/contracts/user_service/user.api"

# 色付き出力関数
print_info() {
    echo -e "\033[0;36m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# 出力ディレクトリ作成
print_info "Creating output directory: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# API仕様からOpenAPI JSONを手動生成
print_info "Generating OpenAPI specification manually..."

cat > "$OUTPUT_DIR/user_service.json" <<'EOF'
{
  "swagger": "2.0",
  "info": {
    "title": "Winyx User Service API",
    "description": "ユーザー管理マイクロサービス - 認証・ユーザーCRUD・プロフィール・ロール管理・組織管理",
    "version": "1.0.0",
    "contact": {
      "name": "Winyx Team"
    }
  },
  "host": "winyx.jp",
  "basePath": "/api/v1",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "securityDefinitions": {
    "Bearer": {
      "type": "apiKey",
      "name": "Authorization",
      "in": "header",
      "description": "JWT認証トークン。形式: Bearer {token}"
    }
  },
  "paths": {
    "/login": {
      "post": {
        "tags": ["認証"],
        "summary": "ユーザーログイン",
        "description": "メールアドレスとパスワードでログイン",
        "operationId": "login",
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/LoginReq"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "ログイン成功",
            "schema": {
              "$ref": "#/definitions/LoginRes"
            }
          },
          "401": {
            "description": "認証失敗"
          }
        }
      }
    },
    "/register": {
      "post": {
        "tags": ["認証"],
        "summary": "新規ユーザー登録",
        "description": "新しいユーザーアカウントを作成",
        "operationId": "register",
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/RegisterReq"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "登録成功",
            "schema": {
              "$ref": "#/definitions/RegisterRes"
            }
          },
          "400": {
            "description": "不正なリクエスト"
          }
        }
      }
    },
    "/users": {
      "get": {
        "tags": ["ユーザー管理"],
        "summary": "ユーザー一覧取得",
        "description": "システム内の全ユーザーを取得（管理者権限必要）",
        "operationId": "userList",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "type": "integer",
            "default": 1,
            "description": "ページ番号"
          },
          {
            "name": "limit",
            "in": "query",
            "type": "integer",
            "default": 10,
            "description": "1ページあたりの件数"
          }
        ],
        "responses": {
          "200": {
            "description": "ユーザー一覧",
            "schema": {
              "$ref": "#/definitions/UserListRes"
            }
          },
          "401": {
            "description": "認証エラー"
          }
        }
      },
      "post": {
        "tags": ["ユーザー管理"],
        "summary": "ユーザー作成",
        "description": "新規ユーザーを作成（管理者権限必要）",
        "operationId": "userCreate",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/UserCreateReq"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "作成成功",
            "schema": {
              "$ref": "#/definitions/UserCreateRes"
            }
          }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "tags": ["ユーザー管理"],
        "summary": "ユーザー詳細取得",
        "description": "特定ユーザーの詳細情報を取得",
        "operationId": "userDetail",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "integer",
            "description": "ユーザーID"
          }
        ],
        "responses": {
          "200": {
            "description": "ユーザー詳細",
            "schema": {
              "$ref": "#/definitions/UserDetailRes"
            }
          },
          "404": {
            "description": "ユーザーが見つからない"
          }
        }
      },
      "put": {
        "tags": ["ユーザー管理"],
        "summary": "ユーザー更新",
        "description": "ユーザー情報を更新",
        "operationId": "userUpdate",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "integer",
            "description": "ユーザーID"
          },
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/UserUpdateReq"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "更新成功",
            "schema": {
              "$ref": "#/definitions/UserUpdateRes"
            }
          }
        }
      },
      "delete": {
        "tags": ["ユーザー管理"],
        "summary": "ユーザー削除",
        "description": "ユーザーを削除",
        "operationId": "userDelete",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "integer",
            "description": "ユーザーID"
          }
        ],
        "responses": {
          "200": {
            "description": "削除成功",
            "schema": {
              "$ref": "#/definitions/UserDeleteRes"
            }
          }
        }
      }
    },
    "/user/info": {
      "get": {
        "tags": ["プロフィール"],
        "summary": "現在のユーザー情報取得",
        "description": "ログイン中のユーザー情報を取得",
        "operationId": "userInfo",
        "security": [{"Bearer": []}],
        "responses": {
          "200": {
            "description": "ユーザー情報",
            "schema": {
              "$ref": "#/definitions/UserInfoRes"
            }
          }
        }
      }
    },
    "/user/profile": {
      "put": {
        "tags": ["プロフィール"],
        "summary": "プロフィール更新",
        "description": "ログイン中のユーザーのプロフィールを更新",
        "operationId": "updateProfile",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/UpdateProfileReq"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "更新成功",
            "schema": {
              "$ref": "#/definitions/UpdateProfileRes"
            }
          }
        }
      }
    },
    "/orgs": {
      "get": {
        "tags": ["組織管理"],
        "summary": "所属組織一覧",
        "description": "ログインユーザーが所属する組織の一覧を取得",
        "operationId": "listMyOrgs",
        "security": [{"Bearer": []}],
        "responses": {
          "200": {
            "description": "組織一覧",
            "schema": {
              "$ref": "#/definitions/ListMyOrgsRes"
            }
          }
        }
      },
      "post": {
        "tags": ["組織管理"],
        "summary": "組織作成",
        "description": "新しい組織を作成",
        "operationId": "createOrg",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/CreateOrgReq"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "作成成功",
            "schema": {
              "$ref": "#/definitions/CreateOrgRes"
            }
          }
        }
      }
    },
    "/orgs/{id}": {
      "get": {
        "tags": ["組織管理"],
        "summary": "組織詳細取得",
        "description": "特定組織の詳細情報を取得",
        "operationId": "getOrg",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "integer",
            "description": "組織ID"
          }
        ],
        "responses": {
          "200": {
            "description": "組織詳細",
            "schema": {
              "$ref": "#/definitions/GetOrgRes"
            }
          }
        }
      },
      "put": {
        "tags": ["組織管理"],
        "summary": "組織更新",
        "description": "組織情報を更新",
        "operationId": "updateOrg",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "integer",
            "description": "組織ID"
          },
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/UpdateOrgReq"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "更新成功",
            "schema": {
              "$ref": "#/definitions/UpdateOrgRes"
            }
          }
        }
      },
      "delete": {
        "tags": ["組織管理"],
        "summary": "組織削除",
        "description": "組織を削除",
        "operationId": "deleteOrg",
        "security": [{"Bearer": []}],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "integer",
            "description": "組織ID"
          }
        ],
        "responses": {
          "200": {
            "description": "削除成功",
            "schema": {
              "$ref": "#/definitions/DeleteOrgRes"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "LoginReq": {
      "type": "object",
      "required": ["email", "password"],
      "properties": {
        "email": {
          "type": "string",
          "format": "email",
          "description": "メールアドレス"
        },
        "password": {
          "type": "string",
          "description": "パスワード"
        }
      }
    },
    "LoginRes": {
      "type": "object",
      "properties": {
        "access_token": {
          "type": "string",
          "description": "JWTアクセストークン"
        },
        "expire_time": {
          "type": "integer",
          "format": "int64",
          "description": "有効期限（Unix時間）"
        }
      }
    },
    "RegisterReq": {
      "type": "object",
      "required": ["name", "email", "password"],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 2,
          "maxLength": 50,
          "description": "ユーザー名"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "メールアドレス"
        },
        "password": {
          "type": "string",
          "minLength": 6,
          "description": "パスワード"
        }
      }
    },
    "RegisterRes": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer",
          "format": "int64",
          "description": "ユーザーID"
        },
        "name": {
          "type": "string",
          "description": "ユーザー名"
        },
        "email": {
          "type": "string",
          "description": "メールアドレス"
        }
      }
    },
    "UserInfo": {
      "type": "object",
      "properties": {
        "user_id": {
          "type": "integer",
          "format": "int64",
          "description": "ユーザーID"
        },
        "name": {
          "type": "string",
          "description": "ユーザー名"
        },
        "email": {
          "type": "string",
          "description": "メールアドレス"
        },
        "status": {
          "type": "string",
          "description": "ステータス"
        },
        "roles": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "ロール一覧"
        },
        "created_at": {
          "type": "string",
          "format": "date-time",
          "description": "作成日時"
        },
        "updated_at": {
          "type": "string",
          "format": "date-time",
          "description": "更新日時"
        }
      }
    },
    "UserListRes": {
      "type": "object",
      "properties": {
        "users": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/UserInfo"
          }
        },
        "total": {
          "type": "integer",
          "description": "総件数"
        }
      }
    },
    "UserCreateReq": {
      "type": "object",
      "required": ["name", "email", "password"],
      "properties": {
        "name": {
          "type": "string",
          "description": "ユーザー名"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "メールアドレス"
        },
        "password": {
          "type": "string",
          "description": "パスワード"
        }
      }
    },
    "UserCreateRes": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer",
          "format": "int64",
          "description": "作成されたユーザーID"
        }
      }
    },
    "UserDetailRes": {
      "type": "object",
      "properties": {
        "user": {
          "$ref": "#/definitions/UserInfo"
        }
      }
    },
    "UserUpdateReq": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "ユーザー名"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "メールアドレス"
        }
      }
    },
    "UserUpdateRes": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "更新結果メッセージ"
        }
      }
    },
    "UserDeleteRes": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "削除結果メッセージ"
        }
      }
    },
    "UserInfoRes": {
      "type": "object",
      "properties": {
        "user": {
          "$ref": "#/definitions/UserInfo"
        }
      }
    },
    "UpdateProfileReq": {
      "type": "object",
      "properties": {
        "bio": {
          "type": "string",
          "description": "自己紹介"
        },
        "phone": {
          "type": "string",
          "description": "電話番号"
        },
        "address": {
          "type": "string",
          "description": "住所"
        },
        "birth_date": {
          "type": "string",
          "format": "date",
          "description": "生年月日"
        },
        "gender": {
          "type": "string",
          "description": "性別"
        }
      }
    },
    "UpdateProfileRes": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "更新結果メッセージ"
        }
      }
    },
    "CreateOrgReq": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": {
          "type": "string",
          "description": "組織名"
        },
        "description": {
          "type": "string",
          "description": "組織の説明"
        }
      }
    },
    "CreateOrgRes": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer",
          "format": "int64",
          "description": "組織ID"
        },
        "name": {
          "type": "string",
          "description": "組織名"
        }
      }
    },
    "ListMyOrgsRes": {
      "type": "object",
      "properties": {
        "orgs": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "integer",
                "format": "int64",
                "description": "組織ID"
              },
              "name": {
                "type": "string",
                "description": "組織名"
              },
              "role": {
                "type": "string",
                "description": "組織内での役割"
              }
            }
          }
        }
      }
    },
    "GetOrgRes": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer",
          "format": "int64",
          "description": "組織ID"
        },
        "name": {
          "type": "string",
          "description": "組織名"
        },
        "description": {
          "type": "string",
          "description": "組織の説明"
        },
        "created_at": {
          "type": "string",
          "format": "date-time",
          "description": "作成日時"
        }
      }
    },
    "UpdateOrgReq": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "組織名"
        },
        "description": {
          "type": "string",
          "description": "組織の説明"
        }
      }
    },
    "UpdateOrgRes": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "更新結果メッセージ"
        }
      }
    },
    "DeleteOrgRes": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "削除結果メッセージ"
        }
      }
    }
  },
  "tags": [
    {
      "name": "認証",
      "description": "ユーザー認証関連のAPI"
    },
    {
      "name": "ユーザー管理",
      "description": "ユーザーCRUD操作（管理者権限必要）"
    },
    {
      "name": "プロフィール",
      "description": "ユーザープロフィール管理"
    },
    {
      "name": "組織管理",
      "description": "組織の作成・管理・メンバー管理"
    }
  ]
}
EOF

print_success "Generated: $OUTPUT_DIR/user_service.json"

# JSON形式を整形
if command -v python3 &> /dev/null; then
    python3 -m json.tool "$OUTPUT_DIR/user_service.json" > "$OUTPUT_DIR/user_service_formatted.json"
    mv "$OUTPUT_DIR/user_service_formatted.json" "$OUTPUT_DIR/user_service.json"
    print_success "Formatted JSON file"
fi

print_success "OpenAPI specification generated successfully!"
print_info "Location: $OUTPUT_DIR/user_service.json"
package middleware

import (
    "fmt"
    "net/http"

    "github.com/golang-jwt/jwt/v4"
    "github.com/zeromicro/go-zero/core/logx"
)

type AdminAuthMiddleware struct {
    AccessSecret string
}

func NewAdminAuthMiddleware(accessSecret string) *AdminAuthMiddleware {
    return &AdminAuthMiddleware{
        AccessSecret: accessSecret,
    }
}

func (m *AdminAuthMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Authorization ヘッダーを取得
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            logx.Error("認証ヘッダーが存在しません")
            http.Error(w, "認証が必要です", http.StatusUnauthorized)
            return
        }

        // Bearer token の形式を確認
        if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
            logx.Error("無効な認証ヘッダー形式")
            http.Error(w, "無効な認証形式です", http.StatusUnauthorized)
            return
        }

        tokenString := authHeader[7:]

        // JWT トークンを解析
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("予期しない署名方法: %v", token.Header["alg"])
            }
            return []byte(m.AccessSecret), nil
        })

        if err != nil {
            logx.Errorf("JWT解析エラー: %v", err)
            http.Error(w, "無効なトークンです", http.StatusUnauthorized)
            return
        }

        if !token.Valid {
            logx.Error("無効なJWTトークン")
            http.Error(w, "無効なトークンです", http.StatusUnauthorized)
            return
        }

        // クレームを取得
        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            logx.Error("クレーム取得エラー")
            http.Error(w, "無効なトークンです", http.StatusUnauthorized)
            return
        }

        // 管理者権限をチェック（実際のプロジェクトでは詳細な権限チェックを実装）
        userID, exists := claims["user_id"]
        if !exists {
            logx.Error("ユーザーID不在")
            http.Error(w, "無効なトークンです", http.StatusUnauthorized)
            return
        }

        // 管理者権限の確認（rolesにadminが含まれているかチェック）
        roles, rolesExists := claims["roles"]
        if !rolesExists {
            logx.Errorf("ロール情報不在 user_id: %v", userID)
            http.Error(w, "管理者権限が必要です", http.StatusForbidden)
            return
        }

        // rolesをスライスとして解析
        roleSlice, ok := roles.([]interface{})
        if !ok {
            logx.Errorf("ロール形式エラー user_id: %v", userID)
            http.Error(w, "管理者権限が必要です", http.StatusForbidden)
            return
        }

        // adminロールが含まれているかチェック
        hasAdminRole := false
        for _, role := range roleSlice {
            if roleStr, ok := role.(string); ok && roleStr == "admin" {
                hasAdminRole = true
                break
            }
        }

        if !hasAdminRole {
            logx.Errorf("管理者権限不足 user_id: %v, roles: %v", userID, roles)
            http.Error(w, "管理者権限が必要です", http.StatusForbidden)
            return
        }

        // ユーザー情報をcontextに設定
        r = r.WithContext(r.Context())
        r.Header.Set("X-User-Id", fmt.Sprintf("%.0f", claims["user_id"]))
        r.Header.Set("X-User-Name", claims["name"].(string))
        r.Header.Set("X-User-Email", claims["email"].(string))

        next(w, r)
    }
}

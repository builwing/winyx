package rpc

import (
    "bytes"
    "context"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
    
    "github.com/zeromicro/go-zero/core/breaker"
    "github.com/zeromicro/go-zero/core/logx"
    "github.com/zeromicro/go-zero/core/retry"
)

// ServiceClient マイクロサービス間通信用クライアント
type ServiceClient struct {
    serviceName string
    baseURL     string
    secret      string
    client      *http.Client
    breaker     breaker.Breaker
}

// NewServiceClient 新しいサービスクライアントを作成
func NewServiceClient(serviceName, baseURL, secret string) *ServiceClient {
    return &ServiceClient{
        serviceName: serviceName,
        baseURL:     baseURL,
        secret:      secret,
        client: &http.Client{
            Timeout: 30 * time.Second,
            Transport: &http.Transport{
                MaxIdleConns:        100,
                MaxIdleConnsPerHost: 10,
                IdleConnTimeout:     90 * time.Second,
            },
        },
        breaker: breaker.NewBreaker(),
    }
}

// CallService サービスを呼び出し
func (c *ServiceClient) CallService(ctx context.Context, method, path string, request, response interface{}) error {
    // リトライポリシー
    return retry.Do(ctx, retry.WithMax(3), func(ctx context.Context, attempt int) error {
        return c.doCall(ctx, method, path, request, response)
    })
}

// doCall 実際のサービス呼び出し
func (c *ServiceClient) doCall(ctx context.Context, method, path string, request, response interface{}) error {
    url := c.baseURL + path
    
    // リクエストボディの準備
    var body io.Reader
    if request != nil {
        jsonData, err := json.Marshal(request)
        if err != nil {
            return fmt.Errorf("failed to marshal request: %w", err)
        }
        body = bytes.NewReader(jsonData)
    }
    
    // サーキットブレーカーでラップ
    var respData []byte
    err := c.breaker.Do(url, func() error {
        req, err := http.NewRequestWithContext(ctx, method, url, body)
        if err != nil {
            return err
        }
        
        // 共通ヘッダー設定
        c.setHeaders(req)
        
        // リクエスト実行
        resp, err := c.client.Do(req)
        if err != nil {
            return err
        }
        defer resp.Body.Close()
        
        // レスポンス読み取り
        respData, err = io.ReadAll(resp.Body)
        if err != nil {
            return err
        }
        
        // ステータスコードチェック
        if resp.StatusCode >= 400 {
            return &ServiceError{
                Code:    resp.StatusCode,
                Message: string(respData),
            }
        }
        
        return nil
    })
    
    if err != nil {
        logx.Errorf("Service call failed: %v", err)
        return err
    }
    
    // レスポンスをアンマーシャル
    if response != nil && len(respData) > 0 {
        if err := json.Unmarshal(respData, response); err != nil {
            return fmt.Errorf("failed to unmarshal response: %w", err)
        }
    }
    
    return nil
}

// setHeaders 共通ヘッダーを設定
func (c *ServiceClient) setHeaders(req *http.Request) {
    timestamp := time.Now().Format(time.RFC3339)
    signature := c.generateSignature(timestamp)
    
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-Service-Name", c.serviceName)
    req.Header.Set("X-Timestamp", timestamp)
    req.Header.Set("X-Service-Auth", signature)
    req.Header.Set("X-Request-ID", generateRequestID())
}

// generateSignature HMAC署名を生成
func (c *ServiceClient) generateSignature(timestamp string) string {
    h := hmac.New(sha256.New, []byte(c.secret))
    h.Write([]byte(c.serviceName + ":" + timestamp))
    return hex.EncodeToString(h.Sum(nil))
}

// ServiceError サービスエラー
type ServiceError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

func (e *ServiceError) Error() string {
    return fmt.Sprintf("service error %d: %s", e.Code, e.Message)
}

// generateRequestID リクエストIDを生成
func generateRequestID() string {
    return fmt.Sprintf("%d-%s", time.Now().UnixNano(), randomString(8))
}

// randomString ランダム文字列を生成
func randomString(n int) string {
    const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    b := make([]byte, n)
    for i := range b {
        b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
    }
    return string(b)
}

// UserServiceClient UserService専用クライアント
type UserServiceClient struct {
    *ServiceClient
}

// NewUserServiceClient UserServiceクライアントを作成
func NewUserServiceClient(baseURL, secret string) *UserServiceClient {
    return &UserServiceClient{
        ServiceClient: NewServiceClient("user_service", baseURL, secret),
    }
}

// ValidateUser ユーザーを検証
func (c *UserServiceClient) ValidateUser(ctx context.Context, userID int64, token string) (*ValidateUserResponse, error) {
    req := &ValidateUserRequest{
        UserID: userID,
        Token:  token,
    }
    
    var resp ValidateUserResponse
    err := c.CallService(ctx, http.MethodPost, "/internal/v1/users/validate", req, &resp)
    if err != nil {
        return nil, err
    }
    
    return &resp, nil
}

// CheckPermission 権限をチェック
func (c *UserServiceClient) CheckPermission(ctx context.Context, userID int64, resource, action string) (*CheckPermissionResponse, error) {
    req := &CheckPermissionRequest{
        UserID:   userID,
        Resource: resource,
        Action:   action,
    }
    
    var resp CheckPermissionResponse
    err := c.CallService(ctx, http.MethodPost, "/internal/v1/users/permission", req, &resp)
    if err != nil {
        return nil, err
    }
    
    return &resp, nil
}

// リクエスト/レスポンス型定義

type ValidateUserRequest struct {
    UserID int64  `json:"user_id"`
    Token  string `json:"token,omitempty"`
}

type ValidateUserResponse struct {
    Valid   bool         `json:"valid"`
    User    *UserBasicInfo `json:"user,omitempty"`
    Message string       `json:"message"`
}

type UserBasicInfo struct {
    UserID int64    `json:"user_id"`
    Name   string   `json:"name"`
    Email  string   `json:"email"`
    Status string   `json:"status"`
    Roles  []string `json:"roles"`
}

type CheckPermissionRequest struct {
    UserID   int64  `json:"user_id"`
    Resource string `json:"resource"`
    Action   string `json:"action"`
}

type CheckPermissionResponse struct {
    Allowed bool   `json:"allowed"`
    Reason  string `json:"reason,omitempty"`
}
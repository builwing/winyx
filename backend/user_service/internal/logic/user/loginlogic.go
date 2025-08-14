package user

import (
    "context"
    "fmt"
    "time"

    "user_service/internal/model"
    "user_service/internal/svc"
    "user_service/internal/types"

    "github.com/golang-jwt/jwt/v4"
    "github.com/zeromicro/go-zero/core/logx"
    "golang.org/x/crypto/bcrypt"
)

type LoginLogic struct {
    logx.Logger
    ctx    context.Context
    svcCtx *svc.ServiceContext
}

func NewLoginLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LoginLogic {
    return &LoginLogic{
        Logger: logx.WithContext(ctx),
        ctx:    ctx,
        svcCtx: svcCtx,
    }
}

func (l *LoginLogic) Login(req *types.LoginReq) (resp *types.LoginRes, err error) {
    // ユーザー存在確認
    user, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
    if err != nil {
        if err == model.ErrNotFound {
            return nil, fmt.Errorf("メールアドレスまたはパスワードが正しくありません")
        }
        logx.Errorf("データベースエラー: %v", err)
        return nil, fmt.Errorf("データベースエラーが発生しました")
    }

    // アカウント有効性チェック
    if user.Status == 0 {
        return nil, fmt.Errorf("アカウントが無効化されています")
    }

    // パスワード検証
    err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
    if err != nil {
        return nil, fmt.Errorf("メールアドレスまたはパスワードが正しくありません")
    }

    // JWT生成
    now := time.Now()
    accessExpire := now.Add(time.Hour * 24) // 24時間
    
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "aud": "user_service",
        "exp": accessExpire.Unix(),
        "iat": now.Unix(),
        "user_id": user.Id,
        "name": user.Name,
        "email": user.Email,
    })

    accessTokenString, err := accessToken.SignedString([]byte(l.svcCtx.Config.Auth.AccessSecret))
    if err != nil {
        logx.Errorf("JWT生成エラー: %v", err)
        return nil, fmt.Errorf("認証トークン生成に失敗しました")
    }

    return &types.LoginRes{
        UserId:    int64(user.Id),
        Name:      user.Name,
        Email:     user.Email,
        Token:     accessTokenString,
        ExpiresAt: accessExpire.Unix(),
        Message:   "ログインが正常に完了しました",
    }, nil
}

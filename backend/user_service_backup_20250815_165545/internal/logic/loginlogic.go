package logic

import (
	"context"
	"fmt"
	"time"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v4"
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
	// ユーザーを検索
	user, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("ユーザーが見つかりません")
	}

	// パスワード検証
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, fmt.Errorf("パスワードが正しくありません")
	}

	// JWTトークン生成
	now := time.Now().Unix()
	expireTime := now + l.svcCtx.Config.Auth.AccessExpire
	
	claims := jwt.MapClaims{
		"user_id": user.Id,
		"email":   user.Email,
		"exp":     expireTime,
		"iat":     now,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(l.svcCtx.Config.Auth.AccessSecret))
	if err != nil {
		return nil, fmt.Errorf("トークン生成に失敗しました")
	}

	return &types.LoginRes{
		AccessToken: tokenString,
		ExpireTime:  expireTime,
	}, nil
}
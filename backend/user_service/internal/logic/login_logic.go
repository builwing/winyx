package logic

import (
	"context"
	"errors"
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
	// メールアドレスでユーザーを検索
	user, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err != nil {
		if errors.Is(err, model.ErrNotFound) {
			logx.Errorf("ユーザーが見つかりません: %s", req.Email)
			return nil, errors.New("メールアドレスまたはパスワードが間違っています")
		}
		logx.Errorf("ユーザー検索エラー: %v", err)
		return nil, errors.New("ログイン処理中にエラーが発生しました")
	}

	// ユーザーのステータスチェック
	if user.Status != 1 {
		logx.Errorf("無効なユーザー: %s (status: %d)", req.Email, user.Status)
		return nil, errors.New("このアカウントは無効になっています")
	}

	// パスワード検証
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		logx.Errorf("パスワード検証失敗: %s", req.Email)
		return nil, errors.New("メールアドレスまたはパスワードが間違っています")
	}

	// JWT トークン生成
	now := time.Now().Unix()
	accessExpire := l.svcCtx.Config.Auth.AccessExpire
	
	claims := make(jwt.MapClaims)
	claims["exp"] = now + accessExpire
	claims["iat"] = now
	claims["user_id"] = user.Id
	claims["email"] = user.Email
	claims["name"] = user.Name

	token := jwt.New(jwt.SigningMethodHS256)
	token.Claims = claims
	
	accessToken, err := token.SignedString([]byte(l.svcCtx.Config.Auth.AccessSecret))
	if err != nil {
		logx.Errorf("JWT トークン生成エラー: %v", err)
		return nil, errors.New("ログイン処理中にエラーが発生しました")
	}

	logx.Infof("ユーザーログイン成功: %s (ID: %d)", user.Email, user.Id)

	return &types.LoginRes{
		AccessToken: accessToken,
		ExpireTime:  now + accessExpire,
	}, nil
}

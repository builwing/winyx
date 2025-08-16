package logic

import (
	"context"
	"errors"
	"time"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
)

type RegisterLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewRegisterLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RegisterLogic {
	return &RegisterLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *RegisterLogic) Register(req *types.RegisterReq) (resp *types.RegisterRes, err error) {
	// 既存ユーザーの重複チェック
	_, err = l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err == nil {
		// ユーザーが既に存在する
		logx.Errorf("ユーザー登録失敗: メールアドレスが既に使用されています: %s", req.Email)
		return nil, errors.New("このメールアドレスは既に使用されています")
	}
	if !errors.Is(err, model.ErrNotFound) {
		// データベースエラー
		logx.Errorf("ユーザー検索エラー: %v", err)
		return nil, errors.New("ユーザー登録処理中にエラーが発生しました")
	}

	// パスワードをハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logx.Errorf("パスワードハッシュ化エラー: %v", err)
		return nil, errors.New("ユーザー登録処理中にエラーが発生しました")
	}

	// 新しいユーザーを作成
	now := time.Now()
	user := &model.Users{
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hashedPassword),
		Status:    1, // 有効
		CreatedAt: now,
		UpdatedAt: now,
	}

	result, err := l.svcCtx.UsersModel.Insert(l.ctx, user)
	if err != nil {
		logx.Errorf("ユーザー作成エラー: %v", err)
		return nil, errors.New("ユーザー登録処理中にエラーが発生しました")
	}

	// 作成されたユーザーIDを取得
	userId, err := result.LastInsertId()
	if err != nil {
		logx.Errorf("ユーザーID取得エラー: %v", err)
		return nil, errors.New("ユーザー登録処理中にエラーが発生しました")
	}

	logx.Infof("ユーザー登録成功: %s (ID: %d)", req.Email, userId)

	return &types.RegisterRes{
		Id:    userId,
		Name:  req.Name,
		Email: req.Email,
	}, nil
}

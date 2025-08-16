package logic

import (
	"context"
	"fmt"

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
	// パスワードをハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// ユーザーを作成
	newUser := &model.Users{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Status:   1, // アクティブ
	}

	result, err := l.svcCtx.UsersModel.Insert(l.ctx, newUser)
	if err != nil {
		return nil, fmt.Errorf("ユーザー作成に失敗しました: %w", err)
	}

	userId, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &types.RegisterRes{
		Id:    userId,
		Name:  req.Name,
		Email: req.Email,
	}, nil
}
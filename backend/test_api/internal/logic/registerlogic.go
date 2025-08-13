package logic

import (
	"context"
	"database/sql"
	"time"

	"github.com/winyx/backend/test_api/internal/model"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"

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
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Check if user exists
	_, err = l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err != sql.ErrNoRows {
		if err == nil {
			return nil, errors.New("user already exists")
		}
		return nil, err
	}

	// Create user
	user := &model.Users{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Status:   1,
	}

	result, err := l.svcCtx.UsersModel.Insert(l.ctx, user)
	if err != nil {
		return nil, err
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

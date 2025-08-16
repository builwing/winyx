package admin

import (
	"context"
	"fmt"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type GetUserDetailLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetUserDetailLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetUserDetailLogic {
	return &GetUserDetailLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *GetUserDetailLogic) GetUserDetail(req *types.UserDetailReq) (resp *types.UserDetailRes, err error) {
	// ユーザー情報の取得
	user, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(req.UserId))
	if err != nil {
		l.Errorf("Failed to find user with ID %d: %v", req.UserId, err)
		return nil, fmt.Errorf("ユーザーが見つかりません")
	}

	// ステータスを文字列に変換
	var statusStr string
	switch user.Status {
	case 0:
		statusStr = "inactive"
	case 1:
		statusStr = "active"
	default:
		statusStr = "unknown"
	}

	// レスポンス用に変換
	userInfo := types.UserInfo{
		UserId:    int64(user.Id),
		Name:      user.Name,
		Email:     user.Email,
		Status:    statusStr,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// ロールやプロフィール情報は必要に応じて後から実装
	// TODO: ユーザーのロール情報を取得
	// TODO: ユーザーのプロフィール情報を取得

	resp = &types.UserDetailRes{
		User: userInfo,
	}

	l.Infof("Successfully retrieved user detail for ID %d", req.UserId)
	return resp, nil
}
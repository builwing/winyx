package protected

import (
	"context"
	"fmt"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UserListLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserListLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserListLogic {
	return &UserListLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UserListLogic) UserList(req *types.UserListReq) (resp *types.UserListRes, err error) {
	// Calculate offset
	offset := (req.Page - 1) * req.Limit
	
	// Get users from database with pagination
	users, err := l.svcCtx.UsersModel.FindAll(l.ctx, int(req.Limit), int(offset))
	if err != nil {
		return nil, err
	}
	
	// Get total count
	total, err := l.svcCtx.UsersModel.Count(l.ctx)
	if err != nil {
		return nil, err
	}
	
	// Convert to response format
	userList := make([]types.UserInfo, len(users))
	for i, user := range users {
		userList[i] = types.UserInfo{
			UserId:    int64(user.Id),
			Name:      user.Name,
			Email:     user.Email,
			Status:    fmt.Sprintf("%d", user.Status),
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		}
	}
	
	return &types.UserListRes{
		Users: userList,
		Total: total,
		Page:  req.Page,
		Limit: req.Limit,
	}, nil
}
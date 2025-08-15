package logic

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
	// 一旦モデルを使った簡単な実装
	users, err := l.svcCtx.UsersModel.FindAll(l.ctx, int(req.Limit), int((req.Page-1)*req.Limit))
	if err != nil {
		logx.Error("ユーザー一覧取得エラー:", err)
		// エラーの場合は空の結果を返す
		return &types.UserListRes{
			Users: []types.UserInfo{},
			Total: 0,
			Page:  req.Page,
			Limit: req.Limit,
		}, nil
	}

	// 型変換
	var userList []types.UserInfo
	for _, user := range users {
		userInfo := types.UserInfo{
			UserId:    int64(user.Id),
			Name:      user.Name,
			Email:     user.Email,
			Status:    fmt.Sprintf("%d", user.Status),
			Roles:     []string{},
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		}
		userList = append(userList, userInfo)
	}

	// 総件数（固定値）
	total := int64(len(userList))

	return &types.UserListRes{
		Users: userList,
		Total: total,
		Page:  req.Page,
		Limit: req.Limit,
	}, nil
}

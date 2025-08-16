package admin

import (
	"context"
	"fmt"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UpdateUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateUserLogic {
	return &UpdateUserLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UpdateUserLogic) UpdateUser(req *types.UpdateUserReq) (resp *types.UpdateUserRes, err error) {
	// URLパスからユーザーIDを取得
	userId := l.ctx.Value("user_id")
	if userId == nil {
		return nil, fmt.Errorf("ユーザーIDが指定されていません")
	}
	
	userIdInt, ok := userId.(int64)
	if !ok {
		return nil, fmt.Errorf("無効なユーザーIDです")
	}
	
	// ユーザー存在確認
	user, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(userIdInt))
	if err != nil {
		logx.Errorf("Failed to find user by id: %v", err)
		return nil, fmt.Errorf("ユーザーが見つかりません")
	}
	
	// 更新フィールドを準備
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Status != "" {
		switch req.Status {
		case "active":
			user.Status = 1
		case "inactive":
			user.Status = 0
		default:
			return nil, fmt.Errorf("無効なステータスです")
		}
	}
	
	// ユーザー情報を更新
	err = l.svcCtx.UsersModel.Update(l.ctx, user)
	if err != nil {
		logx.Errorf("Failed to update user: %v", err)
		return nil, fmt.Errorf("ユーザー情報の更新に失敗しました")
	}
	
	// ユーザーのロール情報を取得
	userRoles, err := l.svcCtx.UserRolesModel.FindByUserIdWithRole(l.ctx, userIdInt)
	if err != nil {
		logx.Errorf("Failed to find user roles: %v", err)
		// ロール取得に失敗してもユーザー情報は返す
		userRoles = []*model.UserRoleInfo{}
	}
	
	// ロール名のスライスを作成
	var roles []string
	for _, roleInfo := range userRoles {
		roles = append(roles, roleInfo.RoleName)
	}
	
	// ステータスの変換
	var status string
	switch user.Status {
	case 1:
		status = "active"
	case 0:
		status = "inactive"
	default:
		status = "unknown"
	}
	
	// レスポンスを構築
	userInfo := types.UserInfo{
		UserId:    int64(user.Id),
		Name:      user.Name,
		Email:     user.Email,
		Status:    status,
		Roles:     roles,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
	
	return &types.UpdateUserRes{
		User:    userInfo,
		Message: "ユーザー情報を更新しました",
	}, nil
}

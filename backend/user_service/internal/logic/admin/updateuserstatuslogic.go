package admin

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UpdateUserStatusLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateUserStatusLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateUserStatusLogic {
	return &UpdateUserStatusLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UpdateUserStatusLogic) UpdateUserStatus(req *types.UpdateUserReq) (resp *types.UpdateUserRes, err error) {
	// パスパラメータからユーザーIDを取得
	userIdStr := l.ctx.Value("user_id")
	if userIdStr == nil {
		return nil, fmt.Errorf("ユーザーIDが指定されていません")
	}

	userId, err := strconv.ParseUint(fmt.Sprintf("%v", userIdStr), 10, 64)
	if err != nil {
		return nil, fmt.Errorf("無効なユーザーIDです")
	}

	// 既存ユーザーを取得
	user, err := l.svcCtx.UsersModel.FindOne(l.ctx, userId)
	if err != nil {
		if err == model.ErrNotFound {
			return nil, fmt.Errorf("ユーザーが見つかりません")
		}
		logx.Errorf("ユーザー取得エラー: %v", err)
		return nil, fmt.Errorf("データベースエラーが発生しました")
	}

	// 更新用のユーザーデータを作成
	updatedUser := &model.Users{
		Id:        user.Id,
		Name:      user.Name,
		Email:     user.Email,
		Password:  user.Password,
		Status:    user.Status,
		CreatedAt: user.CreatedAt,
		UpdatedAt: time.Now(),
	}

	// 指定されたフィールドのみ更新
	if req.Name != "" {
		updatedUser.Name = req.Name
	}

	if req.Email != "" {
		// メールアドレスの重複チェック（自分以外）
		existingUser, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
		if err != nil && err != model.ErrNotFound {
			logx.Errorf("メール重複チェックエラー: %v", err)
			return nil, fmt.Errorf("データベースエラーが発生しました")
		}
		
		if existingUser != nil && existingUser.Id != user.Id {
			return nil, fmt.Errorf("このメールアドレスは既に使用されています")
		}
		
		updatedUser.Email = req.Email
	}

	if req.Status != "" {
		switch req.Status {
		case "有効", "active", "1":
			updatedUser.Status = 1
		case "無効", "inactive", "0":
			updatedUser.Status = 0
		default:
			return nil, fmt.Errorf("無効なステータスです（有効/無効のいずれかを指定してください）")
		}
	}

	// ユーザー情報を更新
	err = l.svcCtx.UsersModel.Update(l.ctx, updatedUser)
	if err != nil {
		logx.Errorf("ユーザー更新エラー: %v", err)
		return nil, fmt.Errorf("ユーザー情報の更新に失敗しました")
	}

	// ユーザーのロール情報を取得
	userRoles, err := l.svcCtx.UserRolesModel.FindByUserIdWithRole(l.ctx, int64(updatedUser.Id))
	if err != nil {
		logx.Errorf("ユーザーロール取得エラー: %v", err)
		userRoles = []*model.UserRoleInfo{}
	}

	// ロール名のスライスを作成
	var roles []string
	for _, roleInfo := range userRoles {
		roles = append(roles, roleInfo.RoleName)
	}

	// ステータスを文字列に変換
	status := "無効"
	if updatedUser.Status == 1 {
		status = "有効"
	}

	// レスポンスを構築
	userInfo := types.UserInfo{
		UserId:    int64(updatedUser.Id),
		Name:      updatedUser.Name,
		Email:     updatedUser.Email,
		Status:    status,
		Roles:     roles,
		Profile:   types.UserProfile{},
		CreatedAt: updatedUser.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: updatedUser.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	return &types.UpdateUserRes{
		User:    userInfo,
		Message: "ユーザー情報の更新が完了しました",
	}, nil
}

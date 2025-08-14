package admin

import (
	"context"
	"fmt"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ListUsersLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListUsersLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListUsersLogic {
	return &ListUsersLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListUsersLogic) ListUsers(req *types.ListUsersReq) (resp *types.ListUsersRes, err error) {
	// ページネーションパラメータ検証・設定
	page := req.Page
	if page < 1 {
		page = 1
	}
	
	limit := req.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	
	offset := (page - 1) * limit

	// ユーザー一覧を取得
	var users []*model.Users
	var totalCount int64
	
	if req.Status != "" {
		// ステータス指定がある場合
		var status int8
		switch req.Status {
		case "有効", "active", "1":
			status = 1
		case "無効", "inactive", "0":
			status = 0
		default:
			return nil, fmt.Errorf("無効なステータスです（有効/無効のいずれかを指定してください）")
		}
		
		users, err = l.svcCtx.UsersModel.FindByStatus(l.ctx, status, limit, offset)
		if err != nil {
			logx.Errorf("ユーザー取得エラー（ステータス指定）: %v", err)
			return nil, fmt.Errorf("ユーザー一覧の取得に失敗しました")
		}
	} else {
		// 全ユーザー取得
		users, err = l.svcCtx.UsersModel.FindAll(l.ctx, limit, offset)
		if err != nil {
			logx.Errorf("ユーザー取得エラー: %v", err)
			return nil, fmt.Errorf("ユーザー一覧の取得に失敗しました")
		}
	}

	// 総件数を取得
	totalCount, err = l.svcCtx.UsersModel.Count(l.ctx)
	if err != nil {
		logx.Errorf("ユーザー総数取得エラー: %v", err)
		return nil, fmt.Errorf("ユーザー総数の取得に失敗しました")
	}

	// ユーザー情報を変換
	var userInfos []types.UserInfo
	for _, user := range users {
		// 各ユーザーのロール情報を取得
		userRoles, err := l.svcCtx.UserRolesModel.FindByUserIdWithRole(l.ctx, int64(user.Id))
		if err != nil {
			logx.Errorf("ユーザー[%d]のロール取得エラー: %v", user.Id, err)
			userRoles = []*model.UserRoleInfo{} // エラー時は空配列
		}

		// ロール名のスライスを作成
		var roles []string
		for _, roleInfo := range userRoles {
			roles = append(roles, roleInfo.RoleName)
		}

		// ステータスを文字列に変換
		status := "無効"
		if user.Status == 1 {
			status = "有効"
		}

		userInfo := types.UserInfo{
			UserId:    int64(user.Id),
			Name:      user.Name,
			Email:     user.Email,
			Status:    status,
			Roles:     roles,
			Profile:   types.UserProfile{}, // 基本プロフィール
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		userInfos = append(userInfos, userInfo)
	}

	return &types.ListUsersRes{
		Users:   userInfos,
		Total:   totalCount,
		Page:    page,
		Limit:   limit,
		Message: fmt.Sprintf("ユーザー一覧の取得が完了しました（%d件中%d件表示）", totalCount, len(userInfos)),
	}, nil
}

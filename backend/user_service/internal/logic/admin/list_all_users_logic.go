package admin

import (
	"context"
	"fmt"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ListAllUsersLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListAllUsersLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListAllUsersLogic {
	return &ListAllUsersLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListAllUsersLogic) ListAllUsers(req *types.UserListReq) (resp *types.UserListRes, err error) {
	// ページング設定のデフォルト値
	page := req.Page
	if page <= 0 {
		page = 1
	}
	
	limit := req.Limit
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	
	offset := (page - 1) * limit

	// 全ユーザー数の取得
	totalCount, err := l.svcCtx.UsersModel.Count(l.ctx)
	if err != nil {
		l.Errorf("Failed to count users: %v", err)
		return nil, fmt.Errorf("ユーザー数の取得に失敗しました")
	}

	// ユーザー一覧の取得（ページング付き）
	users, err := l.svcCtx.UsersModel.FindAll(l.ctx, int(limit), int(offset))
	if err != nil {
		l.Errorf("Failed to fetch users list: %v", err)
		return nil, fmt.Errorf("ユーザー一覧の取得に失敗しました")
	}

	// レスポンス用に変換
	userInfos := make([]types.UserInfo, 0, len(users))
	for _, user := range users {
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
		
		userInfos = append(userInfos, userInfo)
	}

	resp = &types.UserListRes{
		Users: userInfos,
		Total: totalCount,
		Page:  page,
		Limit: limit,
	}

	l.Infof("Successfully retrieved %d users (page: %d, limit: %d, total: %d)", len(userInfos), page, limit, totalCount)
	return resp, nil
}
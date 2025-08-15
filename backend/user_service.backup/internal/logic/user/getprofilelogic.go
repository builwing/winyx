package user

import (
	"context"
	"fmt"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type GetProfileLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetProfileLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetProfileLogic {
	return &GetProfileLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *GetProfileLogic) GetProfile() (resp *types.GetUserRes, err error) {
	// JWTからユーザーIDを取得（コンテキストまたはヘッダーから）
	// 注意: 実際の実装ではミドルウェアでJWTを検証し、コンテキストにユーザー情報を設定します
	// ここでは簡単な実装として、認証済みユーザーIDを想定します
	
	// 実際の実装では、JWTミドルウェアでユーザーIDをコンテキストに設定
	userIdValue := l.ctx.Value("user_id")
	if userIdValue == nil {
		return nil, fmt.Errorf("認証が必要です")
	}
	
	userId, ok := userIdValue.(uint64)
	if !ok {
		return nil, fmt.Errorf("無効なユーザーIDです")
	}

	// ユーザー情報を取得
	user, err := l.svcCtx.UsersModel.FindOne(l.ctx, userId)
	if err != nil {
		if err == model.ErrNotFound {
			return nil, fmt.Errorf("ユーザーが見つかりません")
		}
		logx.Errorf("ユーザー取得エラー: %v", err)
		return nil, fmt.Errorf("データベースエラーが発生しました")
	}

	// ユーザーのロール情報を取得
	userRoles, err := l.svcCtx.UserRolesModel.FindByUserIdWithRole(l.ctx, int64(user.Id))
	if err != nil {
		logx.Errorf("ユーザーロール取得エラー: %v", err)
		// ロール情報の取得に失敗しても続行
		userRoles = []*model.UserRoleInfo{}
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

	// レスポンスを構築
	userInfo := types.UserInfo{
		UserId:    int64(user.Id),
		Name:      user.Name,
		Email:     user.Email,
		Status:    status,
		Roles:     roles,
		Profile:   types.UserProfile{}, // 基本プロフィール（拡張予定）
		CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	return &types.GetUserRes{
		User:    userInfo,
		Message: "ユーザープロフィールの取得が完了しました",
	}, nil
}

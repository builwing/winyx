package admin

import (
	"context"
	"errors"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type GetUserByIdLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetUserByIdLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetUserByIdLogic {
	return &GetUserByIdLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *GetUserByIdLogic) GetUserById() (resp *types.GetUserRes, err error) {
	// URLパスからユーザーIDを取得
	userId := l.ctx.Value("user_id")
	if userId == nil {
		return nil, errors.New("ユーザーIDが指定されていません")
	}
	
	userIdInt, ok := userId.(int64)
	if !ok {
		return nil, errors.New("無効なユーザーIDです")
	}
	
	// ユーザー情報を取得 (uint64に変換)
	user, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(userIdInt))
	if err != nil {
		logx.Errorf("Failed to find user by id: %v", err)
		return nil, errors.New("ユーザーが見つかりません")
	}
	
	// ユーザーのロール情報を取得
	userRoles, err := l.svcCtx.UserRolesModel.FindByUserIdWithRole(l.ctx, userIdInt)
	if err != nil {
		logx.Errorf("Failed to find user roles: %v", err)
		// ロール取得に失敗してもユーザー情報は返す
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
	
	// プロフィール情報を取得
	var profileInfo types.UserProfile
	profile, err := l.svcCtx.UserProfilesModel.FindOneByUserId(l.ctx, uint64(userIdInt))
	if err == nil {
		profileInfo = types.UserProfile{
			Bio:         profile.Bio,
			Phone:       profile.Phone,
			Address:     profile.Address,
			BirthDate:   profile.BirthDate.Format("2006-01-02"),
			Gender:      profile.Gender,
			Occupation:  profile.Occupation,
			Website:     profile.Website,
			SocialLinks: profile.SocialLinks,
		}
	}

	// レスポンスを構築
	userInfo := types.UserInfo{
		UserId:    int64(user.Id),
		Name:      user.Name,
		Email:     user.Email,
		Status:    status,
		Roles:     roles,
		Profile:   profileInfo,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
	
	return &types.GetUserRes{
		User:    userInfo,
		Message: "ユーザー情報を取得しました",
	}, nil
}

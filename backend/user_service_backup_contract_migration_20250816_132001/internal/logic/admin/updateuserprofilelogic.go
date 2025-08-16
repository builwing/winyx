package admin

import (
	"context"
	"fmt"
	"time"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UpdateUserProfileLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateUserProfileLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateUserProfileLogic {
	return &UpdateUserProfileLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UpdateUserProfileLogic) UpdateUserProfile(req *types.UpdateProfileReq) (resp *types.UpdateUserRes, err error) {
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
	
	// 既存のプロフィールを取得（存在しない場合は新規作成）
	profile, err := l.svcCtx.UserProfilesModel.FindOneByUserId(l.ctx, uint64(userIdInt))
	if err != nil && err != model.ErrNotFound {
		logx.Errorf("Failed to find user profile: %v", err)
		return nil, fmt.Errorf("プロフィール情報の取得に失敗しました")
	}
	
	if err == model.ErrNotFound {
		// プロフィールが存在しない場合は新規作成
		profile = &model.UserProfiles{
			UserId: uint64(userIdInt),
		}
	}
	
	// プロフィール情報を更新
	if req.AvatarUrl != "" {
		profile.AvatarUrl = req.AvatarUrl
	}
	if req.Bio != "" {
		profile.Bio = req.Bio
	}
	if req.Phone != "" {
		profile.Phone = req.Phone
	}
	if req.Address != "" {
		profile.Address = req.Address
	}
	if req.BirthDate != "" {
		if birthDate, parseErr := time.Parse("2006-01-02", req.BirthDate); parseErr == nil {
			profile.BirthDate = birthDate
		}
	}
	if req.Gender != "" {
		profile.Gender = req.Gender
	}
	if req.Occupation != "" {
		profile.Occupation = req.Occupation
	}
	if req.Website != "" {
		profile.Website = req.Website
	}
	if req.SocialLinks != "" {
		profile.SocialLinks = req.SocialLinks
	}
	if req.Preferences != "" {
		profile.Preferences = req.Preferences
	}
	
	// プロフィールを保存（新規作成または更新）
	if profile.Id == 0 {
		// 新規作成
		_, err = l.svcCtx.UserProfilesModel.Insert(l.ctx, profile)
	} else {
		// 更新
		err = l.svcCtx.UserProfilesModel.Update(l.ctx, profile)
	}
	
	if err != nil {
		logx.Errorf("Failed to save user profile: %v", err)
		return nil, fmt.Errorf("プロフィール情報の保存に失敗しました")
	}
	
	// ユーザーのロール情報を取得
	userRoles, err := l.svcCtx.UserRolesModel.FindByUserIdWithRole(l.ctx, userIdInt)
	if err != nil {
		logx.Errorf("Failed to find user roles: %v", err)
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
	
	// プロフィール情報の構築
	userProfile := types.UserProfile{
		AvatarUrl:   profile.AvatarUrl,
		Bio:         profile.Bio,
		Phone:       profile.Phone,
		Address:     profile.Address,
		BirthDate:   profile.BirthDate.Format("2006-01-02"),
		Gender:      profile.Gender,
		Occupation:  profile.Occupation,
		Website:     profile.Website,
		SocialLinks: profile.SocialLinks,
		Preferences: profile.Preferences,
	}
	
	// レスポンスを構築
	userInfo := types.UserInfo{
		UserId:    int64(user.Id),
		Name:      user.Name,
		Email:     user.Email,
		Status:    status,
		Roles:     roles,
		Profile:   userProfile,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
	
	return &types.UpdateUserRes{
		User:    userInfo,
		Message: "プロフィール情報を更新しました",
	}, nil
}

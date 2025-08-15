package admin

import (
	"context"
	"fmt"
	"time"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
)

type CreateUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCreateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateUserLogic {
	return &CreateUserLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *CreateUserLogic) CreateUser(req *types.AdminCreateUserReq) (resp *types.AdminCreateUserRes, err error) {
	// メールアドレスの重複チェック
	_, err = l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err == nil {
		return nil, fmt.Errorf("このメールアドレスは既に使用されています")
	}
	if err != model.ErrNotFound {
		logx.Errorf("Failed to check email existence: %v", err)
		return nil, fmt.Errorf("データベースエラーが発生しました")
	}

	// パスワードをハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logx.Errorf("Failed to hash password: %v", err)
		return nil, fmt.Errorf("パスワードの処理に失敗しました")
	}

	// ステータスの変換
	var status int8
	switch req.Status {
	case "active":
		status = 1
	case "inactive":
		status = 0
	default:
		return nil, fmt.Errorf("無効なステータスです")
	}

	// ユーザーを作成
	now := time.Now()
	user := &model.Users{
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hashedPassword),
		Status:    status,
		CreatedAt: now,
		UpdatedAt: now,
	}

	result, err := l.svcCtx.UsersModel.Insert(l.ctx, user)
	if err != nil {
		logx.Errorf("Failed to create user: %v", err)
		return nil, fmt.Errorf("ユーザーの作成に失敗しました")
	}

	// 作成されたユーザーIDを取得
	userId, err := result.LastInsertId()
	if err != nil {
		logx.Errorf("Failed to get created user ID: %v", err)
		return nil, fmt.Errorf("ユーザーIDの取得に失敗しました")
	}

	// ロール名とIDのマップ
	roleMap := map[string]int64{
		"admin":     1,
		"user":      2,
		"moderator": 3,
		"guest":     4,
	}

	// ロールを付与
	for _, roleName := range req.Roles {
		roleId, exists := roleMap[roleName]
		if !exists {
			logx.Errorf("Unknown role: %s", roleName)
			continue
		}

		// ユーザーロールを作成
		userRole := &model.UserRoles{
			UserId:     userId,
			RoleId:     roleId,
			AssignedBy: 1, // 管理者が作成
			CreatedAt:  now,
		}

		_, err = l.svcCtx.UserRolesModel.Insert(l.ctx, userRole)
		if err != nil {
			logx.Errorf("Failed to assign role %s to user %d: %v", roleName, userId, err)
		}
	}

	// プロフィール情報を作成（提供されている場合）
	if req.Profile.Bio != "" || req.Profile.Phone != "" || req.Profile.Address != "" ||
		req.Profile.BirthDate != "" || req.Profile.Gender != "" || req.Profile.Occupation != "" ||
		req.Profile.Website != "" || req.Profile.SocialLinks != "" {

		profile := &model.UserProfiles{
			UserId:      uint64(userId),
			Bio:         req.Profile.Bio,
			Phone:       req.Profile.Phone,
			Address:     req.Profile.Address,
			Gender:      req.Profile.Gender,
			Occupation:  req.Profile.Occupation,
			Website:     req.Profile.Website,
			SocialLinks: req.Profile.SocialLinks,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		// 生年月日の処理
		if req.Profile.BirthDate != "" {
			if birthDate, parseErr := time.Parse("2006-01-02", req.Profile.BirthDate); parseErr == nil {
				profile.BirthDate = birthDate
			}
		}

		_, err = l.svcCtx.UserProfilesModel.Insert(l.ctx, profile)
		if err != nil {
			logx.Errorf("Failed to create user profile: %v", err)
		}
	}

	// 作成されたユーザー情報を取得してレスポンスを構築
	createdUser, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(userId))
	if err != nil {
		logx.Errorf("Failed to get created user: %v", err)
		return nil, fmt.Errorf("作成されたユーザー情報の取得に失敗しました")
	}

	// ユーザーのロール情報を取得
	userRoles, err := l.svcCtx.UserRolesModel.FindByUserIdWithRole(l.ctx, userId)
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
	var statusStr string
	switch createdUser.Status {
	case 1:
		statusStr = "active"
	case 0:
		statusStr = "inactive"
	default:
		statusStr = "unknown"
	}

	// プロフィール情報を取得
	var profileInfo types.UserProfile
	profile, err := l.svcCtx.UserProfilesModel.FindOneByUserId(l.ctx, uint64(userId))
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
		UserId:    userId,
		Name:      createdUser.Name,
		Email:     createdUser.Email,
		Status:    statusStr,
		Roles:     roles,
		Profile:   profileInfo,
		CreatedAt: createdUser.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: createdUser.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	return &types.AdminCreateUserRes{
		User:    userInfo,
		Message: "ユーザーを正常に作成しました",
	}, nil
}

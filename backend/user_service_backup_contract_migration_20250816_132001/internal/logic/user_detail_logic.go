package logic

import (
	"context"
	"fmt"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UserDetailLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserDetailLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserDetailLogic {
	return &UserDetailLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UserDetailLogic) UserDetail(req *types.UserDetailReq) (resp *types.UserDetailRes, err error) {
	// Get user from database
	user, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(req.UserId))
	if err != nil {
		return nil, err
	}
	
	// Get user roles using raw SQL
	var roles []string
	query := `SELECT r.name FROM roles r 
	          INNER JOIN user_roles ur ON r.id = ur.role_id 
	          WHERE ur.user_id = ?`
	
	err = l.svcCtx.DB.QueryRowsPartial(&roles, query, req.UserId)
	if err != nil {
		logx.Errorf("Failed to get user roles: %v", err)
	}
	
	// If no roles found, assign default role
	if len(roles) == 0 {
		roles = []string{"user"}
	}
	
	// Get user profile using model
	var profile *types.UserProfileData
	userProfile, err := l.svcCtx.UserProfilesModel.FindOneByUserId(l.ctx, uint64(req.UserId))
	if err == nil && userProfile != nil {
		profile = &types.UserProfileData{
			Bio:         userProfile.Bio,
			Phone:       userProfile.Phone,
			Address:     userProfile.Address,
			BirthDate:   userProfile.BirthDate.Format("2006-01-02"),
			Gender:      userProfile.Gender,
			Occupation:  userProfile.Occupation,
			Website:     userProfile.Website,
			SocialLinks: userProfile.SocialLinks,
		}
	} else {
		// プロフィールが存在しない場合はログ出力
		logx.Infof("No profile found for user %d: %v", req.UserId, err)
	}
	
	// Convert to response format
	userInfo := types.UserInfo{
		UserId:    int64(user.Id),
		Name:      user.Name,
		Email:     user.Email,
		Status:    fmt.Sprintf("%d", user.Status),
		Roles:     roles,
		Profile:   profile,
		CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
	
	return &types.UserDetailRes{
		User: userInfo,
	}, nil
}

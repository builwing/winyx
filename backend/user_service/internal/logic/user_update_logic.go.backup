package protected

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UserUpdateLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserUpdateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserUpdateLogic {
	return &UserUpdateLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UserUpdateLogic) UserUpdate(req *types.UserUpdateReq) (resp *types.UserUpdateRes, err error) {
	// Get existing user
	existingUser, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(req.UserId))
	if err != nil {
		return nil, err
	}
	
	// Update user fields
	existingUser.Name = req.Name
	existingUser.Email = req.Email
	
	// Parse status if provided
	if req.Status != "" {
		if status, err := strconv.Atoi(req.Status); err == nil {
			existingUser.Status = int8(status)
		}
	}
	
	// Update in database
	err = l.svcCtx.UsersModel.Update(l.ctx, existingUser)
	if err != nil {
		return nil, err
	}
	
	// Update user roles if provided
	if len(req.Roles) > 0 {
		// Delete existing roles
		deleteRolesQuery := `DELETE FROM user_roles WHERE user_id = ?`
		_, err = l.svcCtx.DB.Exec(deleteRolesQuery, req.UserId)
		if err != nil {
			logx.Errorf("Failed to delete existing roles: %v", err)
		} else {
			// Insert new roles
			for _, roleName := range req.Roles {
				// Get role ID
				var roleId int64
				getRoleIdQuery := `SELECT id FROM roles WHERE name = ?`
				err = l.svcCtx.DB.QueryRowPartial(&roleId, getRoleIdQuery, roleName)
				if err == nil {
					// Insert user role
					insertRoleQuery := `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`
					_, err = l.svcCtx.DB.Exec(insertRoleQuery, req.UserId, roleId)
					if err != nil {
						logx.Errorf("Failed to insert role %s: %v", roleName, err)
					}
				}
			}
		}
	}
	
	// Update user profile if provided
	if req.Profile != nil {
		logx.Infof("Updating profile for user %d: %+v", req.UserId, req.Profile)
		
		// Prepare social_links as valid JSON
		socialLinksJSON := req.Profile.SocialLinks
		if socialLinksJSON != "" && socialLinksJSON != "null" {
			// If it's not already JSON, wrap it as a simple string value
			if !isValidJSON(socialLinksJSON) {
				socialLinksJSON = fmt.Sprintf(`"%s"`, socialLinksJSON)
			}
		} else {
			socialLinksJSON = "null"
		}
		
		// Check if profile exists
		var profileExists bool
		checkProfileQuery := `SELECT COUNT(*) > 0 FROM user_profiles WHERE user_id = ?`
		err = l.svcCtx.DB.QueryRowPartial(&profileExists, checkProfileQuery, req.UserId)
		if err != nil {
			logx.Errorf("Failed to check profile existence: %v", err)
		}
		
		logx.Infof("Profile exists for user %d: %v", req.UserId, profileExists)
		
		if profileExists {
			// Update existing profile
			updateProfileQuery := `UPDATE user_profiles SET 
				bio = ?, phone = ?, address = ?, birth_date = ?, gender = ?, 
				occupation = ?, website = ?, social_links = ?, updated_at = NOW()
				WHERE user_id = ?`
			result, err := l.svcCtx.DB.Exec(updateProfileQuery,
				req.Profile.Bio, req.Profile.Phone, req.Profile.Address, req.Profile.BirthDate,
				req.Profile.Gender, req.Profile.Occupation, req.Profile.Website, socialLinksJSON,
				req.UserId)
			if err != nil {
				logx.Errorf("Failed to update profile: %v", err)
			} else {
				logx.Infof("Profile updated successfully: %+v", result)
			}
		} else {
			// Insert new profile
			insertProfileQuery := `INSERT INTO user_profiles 
				(user_id, bio, phone, address, birth_date, gender, occupation, website, social_links) 
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			result, err := l.svcCtx.DB.Exec(insertProfileQuery,
				req.UserId, req.Profile.Bio, req.Profile.Phone, req.Profile.Address, req.Profile.BirthDate,
				req.Profile.Gender, req.Profile.Occupation, req.Profile.Website, socialLinksJSON)
			if err != nil {
				logx.Errorf("Failed to insert profile: %v", err)
			} else {
				logx.Infof("Profile inserted successfully: %+v", result)
			}
		}
	} else {
		logx.Infof("No profile data provided for user %d", req.UserId)
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
	
	// Get updated user
	updatedUser, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(req.UserId))
	if err != nil {
		return nil, err
	}
	
	// Get updated user profile
	var profile *types.UserProfileData
	profileQuery := `SELECT bio, phone, address, birth_date, gender, occupation, website, social_links 
	                 FROM user_profiles WHERE user_id = ?`
	
	var profileData struct {
		Bio         string `db:"bio"`
		Phone       string `db:"phone"`
		Address     string `db:"address"`
		BirthDate   string `db:"birth_date"`
		Gender      string `db:"gender"`
		Occupation  string `db:"occupation"`
		Website     string `db:"website"`
		SocialLinks string `db:"social_links"`
	}
	
	err = l.svcCtx.DB.QueryRowPartial(&profileData, profileQuery, req.UserId)
	if err == nil {
		profile = &types.UserProfileData{
			Bio:         profileData.Bio,
			Phone:       profileData.Phone,
			Address:     profileData.Address,
			BirthDate:   profileData.BirthDate,
			Gender:      profileData.Gender,
			Occupation:  profileData.Occupation,
			Website:     profileData.Website,
			SocialLinks: profileData.SocialLinks,
		}
	}
	
	// Convert to response format
	userInfo := types.UserInfo{
		UserId:    int64(updatedUser.Id),
		Name:      updatedUser.Name,
		Email:     updatedUser.Email,
		Status:    fmt.Sprintf("%d", updatedUser.Status),
		Roles:     roles,
		Profile:   profile,
		CreatedAt: updatedUser.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: updatedUser.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
	
	return &types.UserUpdateRes{
		User: userInfo,
	}, nil
}

func isValidJSON(s string) bool {
	var js json.RawMessage
	return json.Unmarshal([]byte(s), &js) == nil
}
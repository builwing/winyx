package logic

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
	
	// Update user roles if provided (including empty array to remove all roles)
	if req.Roles != nil {
		logx.Infof("Updating roles for user %d: %v", req.UserId, req.Roles)
		
		// Delete existing roles
		deleteRolesQuery := `DELETE FROM user_roles WHERE user_id = ?`
		_, err = l.svcCtx.DB.Exec(deleteRolesQuery, req.UserId)
		if err != nil {
			logx.Errorf("Failed to delete existing roles: %v", err)
		} else {
			logx.Infof("Successfully deleted existing roles for user %d", req.UserId)
			// Insert new roles (if any)
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
					} else {
						logx.Infof("Successfully assigned role %s to user %d", roleName, req.UserId)
					}
				} else {
					logx.Errorf("Role %s not found: %v", roleName, err)
				}
			}
		}
	} else {
		logx.Infof("No roles provided for user %d, keeping existing roles", req.UserId)
	}
	
	// Update user profile if provided
	if req.Profile != nil {
		logx.Infof("Updating profile for user %d", req.UserId)
		
		// Check if profile exists
		existingProfile, err := l.svcCtx.UserProfilesModel.FindOneByUserId(l.ctx, uint64(req.UserId))
		profileExists := err == nil && existingProfile != nil
		
		logx.Infof("Profile existence check for user %d: exists=%v, error=%v", req.UserId, profileExists, err)
		
		if profileExists {
			// Update existing profile
			logx.Infof("Updating existing profile for user %d", req.UserId)
			existingProfile.Bio = req.Profile.Bio
			existingProfile.Phone = req.Profile.Phone
			existingProfile.Address = req.Profile.Address
			existingProfile.Gender = req.Profile.Gender
			existingProfile.Occupation = req.Profile.Occupation
			existingProfile.Website = req.Profile.Website
			// Handle social_links JSON constraint
			if req.Profile.SocialLinks == "" {
				existingProfile.SocialLinks = "null"
			} else {
				existingProfile.SocialLinks = req.Profile.SocialLinks
			}
			
			// Parse birth date
			if req.Profile.BirthDate != "" {
				if parsedDate, err := time.Parse("2006-01-02", req.Profile.BirthDate); err == nil {
					existingProfile.BirthDate = parsedDate
				}
			}
			
			// Update profile in database
			err = l.svcCtx.UserProfilesModel.Update(l.ctx, existingProfile)
			if err != nil {
				logx.Errorf("Failed to update profile: %v", err)
			} else {
				logx.Infof("Profile updated successfully for user %d", req.UserId)
			}
		} else {
			// Create new profile using direct model creation
			logx.Infof("Creating new profile for user %d", req.UserId)
			
			// Parse birth date for new profile
			var birthDate time.Time
			if req.Profile.BirthDate != "" {
				if parsedDate, err := time.Parse("2006-01-02", req.Profile.BirthDate); err == nil {
					birthDate = parsedDate
				} else {
					birthDate = time.Now() // fallback
				}
			} else {
				birthDate = time.Now() // fallback
			}
			
			// Create new profile model
			newProfileModel := &model.UserProfiles{
				UserId:      uint64(req.UserId),
				Bio:         req.Profile.Bio,
				Phone:       req.Profile.Phone,
				Address:     req.Profile.Address,
				BirthDate:   birthDate,
				Gender:      req.Profile.Gender,
				Occupation:  req.Profile.Occupation,
				Website:     req.Profile.Website,
				SocialLinks: func() string {
					if req.Profile.SocialLinks == "" {
						return "null"
					}
					return req.Profile.SocialLinks
				}(),
				Preferences: "null", // PreferencesフィールドもJSON制約があるためnullを設定
			}
			
			// Insert profile in database
			_, err = l.svcCtx.UserProfilesModel.Insert(l.ctx, newProfileModel)
			if err != nil {
				logx.Errorf("Failed to create profile: %v", err)
			} else {
				logx.Infof("Profile created successfully for user %d", req.UserId)
			}
		}
	}
	
	// Get updated user info
	updatedUser, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(req.UserId))
	if err != nil {
		return nil, err
	}
	
	// Get profile
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
	}
	
	// Get user roles for response using raw SQL
	var roles []string
	query := `SELECT r.name FROM roles r 
	          INNER JOIN user_roles ur ON r.id = ur.role_id 
	          WHERE ur.user_id = ?`
	
	err = l.svcCtx.DB.QueryRowsPartial(&roles, query, req.UserId)
	if err != nil {
		logx.Errorf("Failed to get user roles for response: %v", err)
	}
	
	// If no roles found, assign default role
	if len(roles) == 0 {
		roles = []string{"user"}
	}
	
	// Build response
	userInfo := types.UserInfo{
		UserId:    int64(updatedUser.Id),
		Name:      updatedUser.Name,
		Email:     updatedUser.Email,
		Status:    fmt.Sprintf("%d", updatedUser.Status),
		Roles:     roles,
		Profile:   profile,
		CreatedAt: updatedUser.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: time.Now().Format("2006-01-02 15:04:05"),
	}
	
	return &types.UserUpdateRes{
		User: userInfo,
	}, nil
}

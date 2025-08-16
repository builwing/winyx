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
	"golang.org/x/crypto/bcrypt"
)

type UserCreateLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserCreateLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserCreateLogic {
	return &UserCreateLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UserCreateLogic) UserCreate(req *types.UserCreateReq) (resp *types.UserCreateRes, err error) {
	logx.Infof("Creating new user: %s (%s)", req.Name, req.Email)

	// Check if email already exists
	existingUser, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
	if err == nil && existingUser != nil {
		return nil, fmt.Errorf("email already exists: %s", req.Email)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Parse status (default to active if not provided)
	status := int8(1) // active by default
	if req.Status != "" {
		if parsedStatus, err := strconv.Atoi(req.Status); err == nil {
			status = int8(parsedStatus)
		}
	}

	// Create user model
	newUser := &model.Users{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Status:   status,
	}

	// Insert user into database
	result, err := l.svcCtx.UsersModel.Insert(l.ctx, newUser)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Get the created user ID
	userId, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get user ID: %w", err)
	}

	logx.Infof("User created successfully with ID: %d", userId)

	// Assign default role if no roles provided
	roles := req.Roles
	if len(roles) == 0 {
		roles = []string{"user"}
	}

	// Assign roles to user
	for _, roleName := range roles {
		// Get role ID
		var roleId int64
		getRoleIdQuery := `SELECT id FROM roles WHERE name = ?`
		err = l.svcCtx.DB.QueryRowPartial(&roleId, getRoleIdQuery, roleName)
		if err == nil {
			// Insert user role
			insertRoleQuery := `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`
			_, err = l.svcCtx.DB.Exec(insertRoleQuery, userId, roleId)
			if err != nil {
				logx.Errorf("Failed to assign role %s to user %d: %v", roleName, userId, err)
			} else {
				logx.Infof("Successfully assigned role %s to user %d", roleName, userId)
			}
		} else {
			logx.Errorf("Role %s not found: %v", roleName, err)
		}
	}

	// Create user profile if provided
	if req.Profile != nil {
		logx.Infof("Creating profile for user %d", userId)
		
		// Parse birth date
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

		// Create profile model
		profileModel := &model.UserProfiles{
			UserId:      uint64(userId),
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
			Preferences: "null", // Default JSON null
		}

		// Insert profile
		_, err = l.svcCtx.UserProfilesModel.Insert(l.ctx, profileModel)
		if err != nil {
			logx.Errorf("Failed to create profile for user %d: %v", userId, err)
		} else {
			logx.Infof("Profile created successfully for user %d", userId)
		}
	}

	// Get the created user with all details for response
	createdUser, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(userId))
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve created user: %w", err)
	}

	// Get user roles for response
	var userRoles []string
	query := `SELECT r.name FROM roles r 
	          INNER JOIN user_roles ur ON r.id = ur.role_id 
	          WHERE ur.user_id = ?`
	
	err = l.svcCtx.DB.QueryRowsPartial(&userRoles, query, userId)
	if err != nil {
		logx.Errorf("Failed to get user roles for response: %v", err)
	}
	
	// If no roles found, assign default role
	if len(userRoles) == 0 {
		userRoles = []string{"user"}
	}

	// Get user profile for response
	var profile *types.UserProfileData
	userProfile, err := l.svcCtx.UserProfilesModel.FindOneByUserId(l.ctx, uint64(userId))
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

	// Build response
	userInfo := types.UserInfo{
		UserId:    int64(createdUser.Id),
		Name:      createdUser.Name,
		Email:     createdUser.Email,
		Status:    fmt.Sprintf("%d", createdUser.Status),
		Roles:     userRoles,
		Profile:   profile,
		CreatedAt: createdUser.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: createdUser.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	return &types.UserCreateRes{
		User: userInfo,
	}, nil
}

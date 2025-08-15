package protected

import (
	"context"
	"fmt"
	"strconv"

	"github.com/winyx/backend/test_api/internal/model"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"

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
	// パスワードをハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// ステータスの処理
	status := int64(1) // デフォルトはアクティブ
	if req.Status != "" {
		if req.Status == "active" {
			status = 1
		} else if req.Status == "inactive" {
			status = 0
		} else if req.Status == "suspended" {
			status = 2
		} else if statusNum, err := strconv.Atoi(req.Status); err == nil {
			status = int64(statusNum)
		}
	}

	// ユーザーを作成
	newUser := &model.Users{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Status:   status,
	}

	result, err := l.svcCtx.UsersModel.Insert(l.ctx, newUser)
	if err != nil {
		return nil, err
	}

	// 作成されたユーザーIDを取得
	userId, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	// ロールを設定
	if len(req.Roles) > 0 {
		for _, roleName := range req.Roles {
			// ロールIDを取得
			var roleId int64
			getRoleIdQuery := `SELECT id FROM roles WHERE name = ?`
			err = l.svcCtx.DB.QueryRowPartial(&roleId, getRoleIdQuery, roleName)
			if err == nil {
				// ユーザーロールを挿入
				insertRoleQuery := `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`
				_, err = l.svcCtx.DB.Exec(insertRoleQuery, userId, roleId)
				if err != nil {
					logx.Errorf("Failed to insert role %s for user %d: %v", roleName, userId, err)
				}
			}
		}
	} else {
		// デフォルトロール（user）を設定
		var roleId int64
		getRoleIdQuery := `SELECT id FROM roles WHERE name = 'user'`
		err = l.svcCtx.DB.QueryRowPartial(&roleId, getRoleIdQuery)
		if err == nil {
			insertRoleQuery := `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`
			_, err = l.svcCtx.DB.Exec(insertRoleQuery, userId, roleId)
			if err != nil {
				logx.Errorf("Failed to insert default role for user %d: %v", userId, err)
			}
		}
	}

	// プロフィールを作成
	if req.Profile != nil {
		// social_linksをJSONとして処理
		socialLinksJSON := req.Profile.SocialLinks
		if socialLinksJSON != "" && socialLinksJSON != "null" {
			// 簡易的なJSON検証（userupdatelogicと同じロジックを使用）
			socialLinksJSON = fmt.Sprintf(`"%s"`, socialLinksJSON)
		} else {
			socialLinksJSON = "null"
		}

		// birth_dateの処理（空文字の場合はNULLに）
		var birthDate interface{}
		if req.Profile.BirthDate != "" {
			birthDate = req.Profile.BirthDate
		} else {
			birthDate = nil
		}

		insertProfileQuery := `INSERT INTO user_profiles 
			(user_id, bio, phone, address, birth_date, gender, occupation, website, social_links) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		_, err = l.svcCtx.DB.Exec(insertProfileQuery,
			userId, req.Profile.Bio, req.Profile.Phone, req.Profile.Address, birthDate,
			req.Profile.Gender, req.Profile.Occupation, req.Profile.Website, socialLinksJSON)
		if err != nil {
			logx.Errorf("Failed to create profile for user %d: %v", userId, err)
		}
	}

	// 作成されたユーザー情報を取得
	createdUser, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(userId))
	if err != nil {
		return nil, err
	}

	// ユーザーロールを取得
	var roles []string
	query := `SELECT r.name FROM roles r 
	          INNER JOIN user_roles ur ON r.id = ur.role_id 
	          WHERE ur.user_id = ?`
	err = l.svcCtx.DB.QueryRowsPartial(&roles, query, userId)
	if err != nil {
		logx.Errorf("Failed to get user roles: %v", err)
	}
	if len(roles) == 0 {
		roles = []string{"user"}
	}

	// プロフィール情報を取得
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
	
	err = l.svcCtx.DB.QueryRowPartial(&profileData, profileQuery, userId)
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

	// レスポンスを作成
	userInfo := types.UserInfo{
		UserId:    int64(createdUser.Id),
		Name:      createdUser.Name,
		Email:     createdUser.Email,
		Status:    fmt.Sprintf("%d", createdUser.Status),
		Roles:     roles,
		Profile:   profile,
		CreatedAt: createdUser.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: createdUser.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	return &types.UserCreateRes{
		User: userInfo,
	}, nil
}
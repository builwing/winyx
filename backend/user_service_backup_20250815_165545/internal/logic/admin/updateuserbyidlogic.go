package admin

import (
	"context"
	"errors"
	"strconv"
	"time"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

type UpdateUserByIdLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateUserByIdLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateUserByIdLogic {
	return &UpdateUserByIdLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UpdateUserByIdLogic) UpdateUserById(req *types.UpdateUserByAdminReq) (resp *types.UpdateUserRes, err error) {
	// URLからidを取得
	id, ok := l.ctx.Value("id").(string)
	if !ok {
		return nil, errors.New("invalid user id")
	}
	userId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, errors.New("invalid user id format")
	}

	// トランザクション内で更新処理を実行
	if err := l.svcCtx.Conn.TransactCtx(l.ctx, func(ctx context.Context, session sqlx.Session) error {
		// 1. ユーザー基本情報の更新
		user, err := l.svcCtx.UsersModel.FindOne(ctx, uint64(userId))
		if err != nil {
			return errors.New("user not found")
		}

		if req.Name != "" {
			user.Name = req.Name
		}
		if req.Email != "" {
			user.Email = req.Email
		}
		if req.Status != "" {
			// ステータス文字列を数値に変換
			switch req.Status {
			case "active":
				user.Status = 1
			case "inactive":
				user.Status = 0
			case "suspended":
				user.Status = 2 // 例: 2を停止中とする
			}
		}
		if err := l.svcCtx.UsersModel.Update(ctx, user); err != nil {
			logx.Errorf("failed to update user basic info: %v", err)
			return err
		}

		// 2. プロフィール情報の更新 (存在しない場合は作成)
		profile, err := l.svcCtx.UserProfilesModel.FindOneByUserId(ctx, uint64(userId))
		if err != nil {
			if err == model.ErrNotFound {
				// 新規作成
				var birthDate time.Time
				if req.Profile.BirthDate != "" {
					birthDate, _ = time.Parse("2006-01-02", req.Profile.BirthDate)
				}

				_, err = l.svcCtx.UserProfilesModel.Insert(ctx, &model.UserProfiles{
					UserId:      uint64(userId),
					Bio:         req.Profile.Bio,
					Phone:       req.Profile.Phone,
					Address:     req.Profile.Address,
					BirthDate:   birthDate,
					Gender:      req.Profile.Gender,
					Occupation:  req.Profile.Occupation,
					Website:     req.Profile.Website,
					SocialLinks: req.Profile.SocialLinks,
				})
				if err != nil {
					logx.Errorf("failed to insert user profile: %v", err)
					return err
				}
			} else {
				return err
			}
		} else {
			// 更新
			profile.Bio = req.Profile.Bio
			profile.Phone = req.Profile.Phone
			profile.Address = req.Profile.Address
			
			if req.Profile.BirthDate != "" {
				birthDate, err := time.Parse("2006-01-02", req.Profile.BirthDate)
				if err == nil {
					profile.BirthDate = birthDate
				}
			}

			profile.Gender = req.Profile.Gender
			profile.Occupation = req.Profile.Occupation
			profile.Website = req.Profile.Website
			profile.SocialLinks = req.Profile.SocialLinks
			if err := l.svcCtx.UserProfilesModel.Update(ctx, profile); err != nil {
				logx.Errorf("failed to update user profile: %v", err)
				return err
			}
		}

		// 3. 権限(Roles)の更新
		// 3a. 既存のロールを全て削除
		if err := l.svcCtx.UserRolesModel.DeleteByUserId(ctx, userId); err != nil {
			logx.Errorf("failed to delete existing user roles: %v", err)
			return err
		}
		// 3b. 新しいロールを追加
		if len(req.Roles) > 0 {
			roles, err := l.svcCtx.RolesModel.FindAllByNames(ctx, req.Roles)
			if err != nil {
				logx.Errorf("failed to find roles by names: %v", err)
				return err
			}
			for _, role := range roles {
				_, err := l.svcCtx.UserRolesModel.Insert(ctx, &model.UserRoles{
					UserId: userId,
					RoleId: int64(role.Id),
				})
				if err != nil {
					logx.Errorf("failed to insert new user role: %v", err)
					return err
				}
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	// 更新後のユーザー情報を取得して返す (GetUserByIdLogicを再利用)
	// 注意: GetUserByIdLogicはctxから直接IDを取得するため、ここではlogicをインスタンス化して呼び出す
	getUserLogic := NewGetUserByIdLogic(context.WithValue(l.ctx, "id", id), l.svcCtx)
	updatedUserRes, err := getUserLogic.GetUserById()
	if err != nil {
		return nil, err
	}

	return &types.UpdateUserRes{
		User:    updatedUserRes.User,
		Message: "User updated successfully",
	}, nil
}

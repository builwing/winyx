package protected

import (
	"context"
	"fmt"
	"strconv"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"

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
			existingUser.Status = int64(status)
		}
	}
	
	// Update in database
	err = l.svcCtx.UsersModel.Update(l.ctx, existingUser)
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
	
	// Get updated user
	updatedUser, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(req.UserId))
	if err != nil {
		return nil, err
	}
	
	// Convert to response format
	userInfo := types.UserInfo{
		UserId:    int64(updatedUser.Id),
		Name:      updatedUser.Name,
		Email:     updatedUser.Email,
		Status:    fmt.Sprintf("%d", updatedUser.Status),
		Roles:     roles,
		CreatedAt: updatedUser.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: updatedUser.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
	
	return &types.UserUpdateRes{
		User: userInfo,
	}, nil
}
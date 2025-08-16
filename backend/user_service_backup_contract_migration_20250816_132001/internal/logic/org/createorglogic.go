package org

import (
	"context"
	"user_service/internal/model"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type CreateOrgLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCreateOrgLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateOrgLogic {
	return &CreateOrgLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *CreateOrgLogic) CreateOrg(req *types.CreateOrgReq) (resp *types.Org, err error) {
	// Get user ID from JWT token
	// Note: The actual extraction of userId from the context should be handled by the JWT middleware.
	// Here we assume it's been placed in the context correctly.
	// For now, let's use a placeholder or ensure your middleware is setting this value.
	// Example: userId := l.ctx.Value("userId").(int64)
	// As the middleware setup is not shown, I'll use a placeholder value for now.
	// In a real scenario, this must be replaced with actual user ID from the token.
	var userId int64 = 1 // Placeholder, replace with actual user ID from context

	// Create organization model
	newOrg := &model.Orgs{
		Name:    req.Name,
		OwnerId: uint64(userId), // Cast to uint64 to match the model
	}

	// Insert organization into database
	result, err := l.svcCtx.OrgsModel.Insert(l.ctx, newOrg)
	if err != nil {
		return nil, err
	}

	// Get the created organization ID
	orgId, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	// Get the created organization with all details for response
	createdOrg, err := l.svcCtx.OrgsModel.FindOne(l.ctx, uint64(orgId))
	if err != nil {
		return nil, err
	}

	return &types.Org{
		Id:        int64(createdOrg.Id),
		Name:      createdOrg.Name,
		OwnerId:   int64(createdOrg.OwnerId), // Cast back to int64 for the response
		CreatedAt: createdOrg.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: createdOrg.UpdatedAt.Format("2006-01-02 15:04:05"),
	}, nil
}

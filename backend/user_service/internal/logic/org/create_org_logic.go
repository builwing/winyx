package org

import (
	"context"

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
	// todo: add your logic here and delete this line

	return
}

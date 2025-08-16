package org

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UpdateOrgLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateOrgLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateOrgLogic {
	return &UpdateOrgLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UpdateOrgLogic) UpdateOrg(req *types.UpdateOrgReq) (resp *types.Org, err error) {
	// todo: add your logic here and delete this line

	return
}

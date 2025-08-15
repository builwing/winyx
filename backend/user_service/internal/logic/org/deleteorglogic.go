package org

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type DeleteOrgLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewDeleteOrgLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DeleteOrgLogic {
	return &DeleteOrgLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *DeleteOrgLogic) DeleteOrg(req *types.GetOrgReq) (resp *types.CommonRes, err error) {
	// todo: add your logic here and delete this line

	return
}

package org

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type GetOrgLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetOrgLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetOrgLogic {
	return &GetOrgLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *GetOrgLogic) GetOrg(req *types.GetOrgReq) (resp *types.Org, err error) {
	// todo: add your logic here and delete this line

	return
}

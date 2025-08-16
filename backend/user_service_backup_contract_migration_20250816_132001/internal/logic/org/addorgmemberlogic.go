package org

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type AddOrgMemberLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewAddOrgMemberLogic(ctx context.Context, svcCtx *svc.ServiceContext) *AddOrgMemberLogic {
	return &AddOrgMemberLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *AddOrgMemberLogic) AddOrgMember(req *types.AddOrgMemberReq) (resp *types.CommonRes, err error) {
	// todo: add your logic here and delete this line

	return
}

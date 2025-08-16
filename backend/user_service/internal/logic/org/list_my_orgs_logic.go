package org

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ListMyOrgsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListMyOrgsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListMyOrgsLogic {
	return &ListMyOrgsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListMyOrgsLogic) ListMyOrgs() (resp []types.Org, err error) {
	// todo: add your logic here and delete this line

	return
}

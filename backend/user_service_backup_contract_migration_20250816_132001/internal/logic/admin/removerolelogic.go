package admin

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type RemoveRoleLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewRemoveRoleLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RemoveRoleLogic {
	return &RemoveRoleLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *RemoveRoleLogic) RemoveRole(req *types.AssignRoleReq) (resp *types.CommonRes, err error) {
	// todo: add your logic here and delete this line

	return
}

package admin

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ListAllOrgsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListAllOrgsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListAllOrgsLogic {
	return &ListAllOrgsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListAllOrgsLogic) ListAllOrgs() (resp []types.Org, err error) {
	// todo: add your logic here and delete this line

	return
}

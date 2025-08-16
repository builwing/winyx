package health

import (
	"context"

	"github.com/winyx/backend/dashboard_service/internal/svc"
	"github.com/winyx/backend/dashboard_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type SystemHealthLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

// システム全体のヘルスチェック
func NewSystemHealthLogic(ctx context.Context, svcCtx *svc.ServiceContext) *SystemHealthLogic {
	return &SystemHealthLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *SystemHealthLogic) SystemHealth() (resp *types.SystemHealthRes, err error) {
	// todo: add your logic here and delete this line

	return
}

package stats

import (
	"context"

	"github.com/winyx/backend/dashboard_service/internal/svc"
	"github.com/winyx/backend/dashboard_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ApiStatsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

// API使用統計の取得
func NewApiStatsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ApiStatsLogic {
	return &ApiStatsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ApiStatsLogic) ApiStats(req *types.ApiStatsReq) (resp *types.ApiStatsRes, err error) {
	// todo: add your logic here and delete this line

	return
}

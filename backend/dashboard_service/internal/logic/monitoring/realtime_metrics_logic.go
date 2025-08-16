package monitoring

import (
	"context"

	"github.com/winyx/backend/dashboard_service/internal/svc"
	"github.com/winyx/backend/dashboard_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type RealtimeMetricsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

// リアルタイムメトリクスの取得
func NewRealtimeMetricsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RealtimeMetricsLogic {
	return &RealtimeMetricsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *RealtimeMetricsLogic) RealtimeMetrics() (resp *types.RealtimeMetricsRes, err error) {
	// todo: add your logic here and delete this line

	return
}

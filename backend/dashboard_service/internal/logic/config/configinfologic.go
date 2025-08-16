package config

import (
	"context"
	"runtime"
	"time"

	"github.com/winyx/backend/dashboard_service/internal/svc"
	"github.com/winyx/backend/dashboard_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ConfigInfoLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

// システム設定情報の取得
func NewConfigInfoLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ConfigInfoLogic {
	return &ConfigInfoLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ConfigInfoLogic) ConfigInfo() (resp *types.ConfigRes, err error) {
	return &types.ConfigRes{
		Environment: l.svcCtx.Config.System.Environment,
		Version:     l.svcCtx.Config.System.Version,
		GoVersion:   runtime.Version(),
		BuildTime:   time.Now().Format("2006-01-02 15:04:05"), // TODO: ビルド時の実際の時刻
		Features: map[string]bool{
			"monitoring":    true,
			"metrics":       true,
			"health_check":  true,
			"api_stats":     true,
		},
		Maintenance: types.MaintenanceInfo{
			Enabled: false,
			Message: "",
		},
	}, nil
}

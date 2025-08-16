package config

import (
	"context"

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
	// todo: add your logic here and delete this line

	return
}

package health

import (
	"context"
	"net/http"
	"runtime"
	"time"

	"github.com/winyx/backend/dashboard_gateway/internal/config"
	"github.com/winyx/backend/dashboard_gateway/internal/svc"
	"github.com/winyx/backend/dashboard_gateway/internal/types"

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
	startTime := time.Now()
	
	// サービス状態をチェック
	services := l.checkServices()
	
	// データベース状態をチェック
	database := l.checkDatabase()
	
	// メモリ状態をチェック
	memory := l.checkMemory()
	
	// 全体的なステータスを判定
	status := "healthy"
	for _, service := range services {
		if service.Status == "down" {
			status = "unhealthy"
			break
		} else if service.Status == "degraded" && status != "unhealthy" {
			status = "degraded"
		}
	}
	
	if !database.Connected {
		status = "unhealthy"
	}
	
	responseTime := time.Since(startTime).Milliseconds()
	
	return &types.SystemHealthRes{
		Status:       status,
		Timestamp:    time.Now().Unix(),
		Services:     services,
		Database:     database,
		Memory:       memory,
		ResponseTime: responseTime,
	}, nil
}

func (l *SystemHealthLogic) checkServices() []types.ServiceStatus {
	var services []types.ServiceStatus
	
	for _, target := range l.svcCtx.Config.MonitoringTargets {
		status := l.checkSingleService(target)
		services = append(services, status)
	}
	
	return services
}

func (l *SystemHealthLogic) checkSingleService(target config.MonitoringTarget) types.ServiceStatus {
	startTime := time.Now()
	status := "up"
	
	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	
	healthUrl := target.Url
	if target.Type == "rest" {
		healthUrl += "/health"
	}
	
	resp, err := client.Get(healthUrl)
	responseTime := time.Since(startTime).Milliseconds()
	
	if err != nil {
		status = "down"
	} else if resp.StatusCode >= 400 {
		status = "degraded"
	}
	
	if resp != nil {
		resp.Body.Close()
	}
	
	return types.ServiceStatus{
		Name:         target.Name,
		Status:       status,
		LastCheck:    time.Now().Unix(),
		ResponseTime: responseTime,
		ErrorCount:   0, // TODO: Redisから取得
		Version:      "1.0.0", // TODO: 実際のバージョンを取得
	}
}

func (l *SystemHealthLogic) checkDatabase() types.DatabaseStatus {
	// TODO: 実際のデータベース接続チェックを実装
	return types.DatabaseStatus{
		Connected:    true,
		ActiveConn:   5,
		MaxConn:      100,
		SlowQueries:  2,
		ResponseTime: 12,
		Version:      "8.0.33",
	}
}

func (l *SystemHealthLogic) checkMemory() types.MemoryStatus {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	usedMB := int64(m.Alloc / 1024 / 1024)
	totalMB := int64(m.Sys / 1024 / 1024)
	
	usagePercent := int(float64(usedMB) / float64(totalMB) * 100)
	if usagePercent > 100 {
		usagePercent = 100
	}
	
	return types.MemoryStatus{
		UsedMB:       usedMB,
		TotalMB:      totalMB,
		UsagePercent: usagePercent,
		Available:    totalMB - usedMB,
	}
}

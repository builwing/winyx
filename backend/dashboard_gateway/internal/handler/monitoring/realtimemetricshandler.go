package monitoring

import (
	"net/http"

	"github.com/winyx/backend/dashboard_gateway/internal/logic/monitoring"
	"github.com/winyx/backend/dashboard_gateway/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

// リアルタイムメトリクスの取得
func RealtimeMetricsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := monitoring.NewRealtimeMetricsLogic(r.Context(), svcCtx)
		resp, err := l.RealtimeMetrics()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

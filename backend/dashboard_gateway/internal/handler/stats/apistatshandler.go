package stats

import (
	"net/http"

	"github.com/winyx/backend/dashboard_gateway/internal/logic/stats"
	"github.com/winyx/backend/dashboard_gateway/internal/svc"
	"github.com/winyx/backend/dashboard_gateway/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

// API使用統計の取得
func ApiStatsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ApiStatsReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := stats.NewApiStatsLogic(r.Context(), svcCtx)
		resp, err := l.ApiStats(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

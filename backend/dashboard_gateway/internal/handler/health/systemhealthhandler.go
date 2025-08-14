package health

import (
	"net/http"

	"github.com/winyx/backend/dashboard_gateway/internal/logic/health"
	"github.com/winyx/backend/dashboard_gateway/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

// システム全体のヘルスチェック
func SystemHealthHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := health.NewSystemHealthLogic(r.Context(), svcCtx)
		resp, err := l.SystemHealth()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

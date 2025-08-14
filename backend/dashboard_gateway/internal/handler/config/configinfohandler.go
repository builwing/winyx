package config

import (
	"net/http"

	"github.com/winyx/backend/dashboard_gateway/internal/logic/config"
	"github.com/winyx/backend/dashboard_gateway/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

// システム設定情報の取得
func ConfigInfoHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := config.NewConfigInfoLogic(r.Context(), svcCtx)
		resp, err := l.ConfigInfo()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

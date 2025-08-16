package admin

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"user_service/internal/types"
)

func GetOrgDetailHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.GetOrgReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := admin.NewGetOrgDetailLogic(r.Context(), svcCtx)
		resp, err := l.GetOrgDetail(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

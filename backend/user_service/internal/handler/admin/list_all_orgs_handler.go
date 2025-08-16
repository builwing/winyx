package admin

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
	"user_service/internal/logic/admin"
	"user_service/internal/svc"
)

func ListAllOrgsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := admin.NewListAllOrgsLogic(r.Context(), svcCtx)
		resp, err := l.ListAllOrgs()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

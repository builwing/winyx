package admin

import (
	"net/http"

	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func ListRolesHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := admin.NewListRolesLogic(r.Context(), svcCtx)
		resp, err := l.ListRoles()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

package admin

import (
	"net/http"

	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"user_service/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func ListAllUsersHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.UserListReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := admin.NewListAllUsersLogic(r.Context(), svcCtx)
		resp, err := l.ListAllUsers(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
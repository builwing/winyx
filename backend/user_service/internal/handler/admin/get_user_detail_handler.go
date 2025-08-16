package admin

import (
	"net/http"

	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"user_service/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func GetUserDetailHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.UserDetailReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := admin.NewGetUserDetailLogic(r.Context(), svcCtx)
		resp, err := l.GetUserDetail(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
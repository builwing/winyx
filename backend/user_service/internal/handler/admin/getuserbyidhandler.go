package admin

import (
	"net/http"

	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func GetUserByIdHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := admin.NewGetUserByIdLogic(r.Context(), svcCtx)
		resp, err := l.GetUserById()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

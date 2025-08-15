package user

import (
	"net/http"

	"user_service/internal/logic/user"
	"user_service/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func DeleteAccountHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := user.NewDeleteAccountLogic(r.Context(), svcCtx)
		resp, err := l.DeleteAccount()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

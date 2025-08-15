package protected

import (
	"net/http"

	"github.com/winyx/backend/test_api/internal/logic/protected"
	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func UserCreateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.UserCreateReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := protected.NewUserCreateLogic(r.Context(), svcCtx)
		resp, err := l.UserCreate(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
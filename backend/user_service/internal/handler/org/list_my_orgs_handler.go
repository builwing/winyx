package org

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
	"user_service/internal/logic/org"
	"user_service/internal/svc"
)

func ListMyOrgsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := org.NewListMyOrgsLogic(r.Context(), svcCtx)
		resp, err := l.ListMyOrgs()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

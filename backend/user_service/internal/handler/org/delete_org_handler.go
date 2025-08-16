package org

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
	"user_service/internal/logic/org"
	"user_service/internal/svc"
	"user_service/internal/types"
)

func DeleteOrgHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.GetOrgReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := org.NewDeleteOrgLogic(r.Context(), svcCtx)
		resp, err := l.DeleteOrg(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

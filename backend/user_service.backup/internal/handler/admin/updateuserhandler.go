package admin

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/zeromicro/go-zero/rest/httpx"
	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"user_service/internal/types"
)

func UpdateUserHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// URLパスからユーザーIDを取得
		userIdStr := r.URL.Path[len("/api/v1/admin/users/"):]
		if len(userIdStr) == 0 {
			httpx.ErrorCtx(r.Context(), w, errors.New("ユーザーIDが指定されていません"))
			return
		}
		
		userId, err := strconv.ParseInt(userIdStr, 10, 64)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, errors.New("無効なユーザーIDです"))
			return
		}

		var req types.UpdateUserReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		// コンテキストにユーザーIDを設定
		ctx := context.WithValue(r.Context(), "user_id", userId)
		l := admin.NewUpdateUserLogic(ctx, svcCtx)
		resp, err := l.UpdateUser(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

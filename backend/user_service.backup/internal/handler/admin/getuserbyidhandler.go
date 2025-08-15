package admin

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func GetUserByIdHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
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
		
		// コンテキストにユーザーIDを設定
		ctx := context.WithValue(r.Context(), "user_id", userId)
		l := admin.NewGetUserByIdLogic(ctx, svcCtx)
		resp, err := l.GetUserById()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

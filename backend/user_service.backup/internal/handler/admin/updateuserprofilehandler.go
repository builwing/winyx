package admin

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/zeromicro/go-zero/rest/httpx"
	"user_service/internal/logic/admin"
	"user_service/internal/svc"
	"user_service/internal/types"
)

func UpdateUserProfileHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// URLパスからユーザーIDを取得 (/api/v1/admin/users/:id/profile)
		path := r.URL.Path
		parts := strings.Split(path, "/")
		if len(parts) < 6 {
			httpx.ErrorCtx(r.Context(), w, errors.New("ユーザーIDが指定されていません"))
			return
		}
		
		userIdStr := parts[5] // /api/v1/admin/users/:id/profile の :id 部分
		userId, err := strconv.ParseInt(userIdStr, 10, 64)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, errors.New("無効なユーザーIDです"))
			return
		}

		var req types.UpdateProfileReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		// コンテキストにユーザーIDを設定
		ctx := context.WithValue(r.Context(), "user_id", userId)
		l := admin.NewUpdateUserProfileLogic(ctx, svcCtx)
		resp, err := l.UpdateUserProfile(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}

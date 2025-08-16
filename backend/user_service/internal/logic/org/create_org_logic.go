package org

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"user_service/internal/model"
	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type CreateOrgLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCreateOrgLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateOrgLogic {
	return &CreateOrgLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *CreateOrgLogic) CreateOrg(req *types.CreateOrgReq) (resp *types.Org, err error) {
	// JWTから現在のユーザーIDを取得 (user_id キーから数値として取得)
	userIdValue := l.ctx.Value("user_id")
	if userIdValue == nil {
		l.Errorf("user_id not found in JWT context")
		return nil, fmt.Errorf("認証エラー: ユーザーIDが取得できません")
	}

	var userIdInt int64
	switch v := userIdValue.(type) {
	case int:
		userIdInt = int64(v)
	case int64:
		userIdInt = v
	case float64:
		userIdInt = int64(v)
	case json.Number:
		var err error
		userIdInt, err = v.Int64()
		if err != nil {
			l.Errorf("Failed to convert json.Number to int64: %v", err)
			return nil, fmt.Errorf("認証エラー: 無効なユーザーID")
		}
	case string:
		var err error
		userIdInt, err = strconv.ParseInt(v, 10, 64)
		if err != nil {
			l.Errorf("Failed to convert user_id string to int64: %v", err)
			return nil, fmt.Errorf("認証エラー: 無効なユーザーID")
		}
	default:
		l.Errorf("Unexpected user_id type: %T, value: %v", v, v)
		return nil, fmt.Errorf("認証エラー: ユーザーIDの型が不正です")
	}

	if userIdInt <= 0 {
		l.Errorf("Invalid user ID: %d", userIdInt)
		return nil, fmt.Errorf("認証エラー: 無効なユーザーID")
	}

	// 入力値バリデーション
	if strings.TrimSpace(req.Name) == "" {
		return nil, fmt.Errorf("組織名は必須です")
	}

	if len(req.Name) < 2 || len(req.Name) > 100 {
		return nil, fmt.Errorf("組織名は2〜100文字で入力してください")
	}

	// 組織名の重複チェック
	existingOrg, err := l.svcCtx.OrgsModel.FindOneByName(l.ctx, req.Name)
	if err != nil {
		// "no rows in result set" エラーは組織名が存在しないことを意味するので正常
		if err.Error() != "sql: no rows in result set" {
			l.Errorf("Failed to check organization name duplication: %v", err)
			return nil, fmt.Errorf("システムエラーが発生しました")
		}
		// 組織名が存在しない場合は続行
	} else if existingOrg != nil {
		// 組織名が既に存在する場合はエラー
		return nil, fmt.Errorf("この組織名は既に使用されています")
	}

	// 新しい組織をデータベースに挿入
	newOrg := &model.Orgs{
		Name:    strings.TrimSpace(req.Name),
		OwnerId: uint64(userIdInt),
	}

	result, err := l.svcCtx.OrgsModel.Insert(l.ctx, newOrg)
	if err != nil {
		l.Errorf("Failed to create organization: %v", err)
		return nil, fmt.Errorf("組織の作成に失敗しました")
	}

	// 挿入されたレコードのIDを取得
	orgId, err := result.LastInsertId()
	if err != nil {
		l.Errorf("Failed to get last insert ID: %v", err)
		return nil, fmt.Errorf("組織の作成に失敗しました")
	}

	// 作成されたデータを再取得してレスポンスを構築
	createdOrg, err := l.svcCtx.OrgsModel.FindOne(l.ctx, uint64(orgId))
	if err != nil {
		l.Errorf("Failed to retrieve created organization: %v", err)
		return nil, fmt.Errorf("組織の作成に失敗しました")
	}

	// レスポンス型に変換
	resp = &types.Org{
		Id:        int64(createdOrg.Id),
		Name:      createdOrg.Name,
		OwnerId:   int64(createdOrg.OwnerId),
		CreatedAt: createdOrg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: createdOrg.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	l.Infof("Successfully created organization: %s (ID: %d) by user %d", req.Name, orgId, userIdInt)
	return resp, nil
}

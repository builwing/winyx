package admin

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ListAllOrgsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListAllOrgsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListAllOrgsLogic {
	return &ListAllOrgsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListAllOrgsLogic) ListAllOrgs() (resp []types.Org, err error) {
	// Admin権限チェックは必要に応じてhandlerまたはmiddlewareで実装

	// 全組織をデータベースから取得
	orgs, err := l.svcCtx.OrgsModel.FindAll(l.ctx)
	if err != nil {
		l.Errorf("Failed to fetch all organizations: %v", err)
		return nil, err
	}

	// DB model から types.Org に変換
	resp = make([]types.Org, 0, len(orgs))
	for _, org := range orgs {
		resp = append(resp, types.Org{
			Id:        int64(org.Id),
			Name:      org.Name,
			OwnerId:   int64(org.OwnerId),
			CreatedAt: org.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: org.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	l.Infof("Successfully retrieved %d organizations for admin", len(resp))
	return resp, nil
}

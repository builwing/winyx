package admin

import (
	"context"

	"user_service/internal/svc"
	"user_service/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type GetOrgDetailLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetOrgDetailLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetOrgDetailLogic {
	return &GetOrgDetailLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *GetOrgDetailLogic) GetOrgDetail(req *types.GetOrgReq) (resp *types.Org, err error) {
	// Admin権限で任意の組織詳細を取得
	orgModel, err := l.svcCtx.OrgsModel.FindOne(l.ctx, uint64(req.Id))
	if err != nil {
		logx.Errorf("組織取得エラー (ID: %d): %v", req.Id, err)
		return nil, err
	}

	// レスポンス構築
	return &types.Org{
		Id:        int64(orgModel.Id),
		Name:      orgModel.Name,
		OwnerId:   int64(orgModel.OwnerId),
		CreatedAt: orgModel.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: orgModel.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

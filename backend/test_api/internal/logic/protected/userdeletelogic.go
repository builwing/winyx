package protected

import (
	"context"
	"fmt"

	"github.com/winyx/backend/test_api/internal/svc"
	"github.com/winyx/backend/test_api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type UserDeleteLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUserDeleteLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UserDeleteLogic {
	return &UserDeleteLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UserDeleteLogic) UserDelete(req *types.UserDeleteReq) (resp *types.UserDeleteRes, err error) {
	// ユーザーの存在確認
	user, err := l.svcCtx.UsersModel.FindOne(l.ctx, uint64(req.UserId))
	if err != nil {
		return nil, fmt.Errorf("ユーザーが見つかりません: %w", err)
	}

	// トランザクション開始
	if _, err := l.svcCtx.DB.Exec("START TRANSACTION"); err != nil {
		return nil, fmt.Errorf("トランザクション開始エラー: %w", err)
	}

	// user_rolesから削除
	deleteRolesQuery := `DELETE FROM user_roles WHERE user_id = ?`
	if _, err := l.svcCtx.DB.Exec(deleteRolesQuery, req.UserId); err != nil {
		l.svcCtx.DB.Exec("ROLLBACK")
		return nil, fmt.Errorf("ロール削除エラー: %w", err)
	}

	// user_profilesから削除
	deleteProfileQuery := `DELETE FROM user_profiles WHERE user_id = ?`
	if _, err := l.svcCtx.DB.Exec(deleteProfileQuery, req.UserId); err != nil {
		l.svcCtx.DB.Exec("ROLLBACK")
		return nil, fmt.Errorf("プロフィール削除エラー: %w", err)
	}

	// usersテーブルから削除
	err = l.svcCtx.UsersModel.Delete(l.ctx, uint64(req.UserId))
	if err != nil {
		l.svcCtx.DB.Exec("ROLLBACK")
		return nil, fmt.Errorf("ユーザー削除エラー: %w", err)
	}

	// トランザクションコミット
	if _, err := l.svcCtx.DB.Exec("COMMIT"); err != nil {
		return nil, fmt.Errorf("コミットエラー: %w", err)
	}

	logx.Infof("ユーザー削除成功: ID=%d, Name=%s", user.Id, user.Name)

	return &types.UserDeleteRes{
		Message: fmt.Sprintf("ユーザー「%s」を削除しました", user.Name),
	}, nil
}
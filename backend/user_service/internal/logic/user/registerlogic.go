package user

import (
    "context"
    "fmt"
    "time"

    "user_service/internal/model"
    "user_service/internal/svc"
    "user_service/internal/types"

    "github.com/zeromicro/go-zero/core/logx"
    "golang.org/x/crypto/bcrypt"
)

type RegisterLogic struct {
    logx.Logger
    ctx    context.Context
    svcCtx *svc.ServiceContext
}

func NewRegisterLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RegisterLogic {
    return &RegisterLogic{
        Logger: logx.WithContext(ctx),
        ctx:    ctx,
        svcCtx: svcCtx,
    }
}

func (l *RegisterLogic) Register(req *types.RegisterReq) (resp *types.RegisterRes, err error) {
    // メールアドレスの重複チェック
    existingUser, err := l.svcCtx.UsersModel.FindOneByEmail(l.ctx, req.Email)
    if err != nil && err != model.ErrNotFound {
        logx.Errorf("データベースエラー: %v", err)
        return nil, fmt.Errorf("データベースエラーが発生しました")
    }
    
    if existingUser != nil {
        return nil, fmt.Errorf("このメールアドレスは既に使用されています")
    }

    // パスワードをハッシュ化
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        logx.Errorf("パスワードハッシュ化エラー: %v", err)
        return nil, fmt.Errorf("パスワード処理エラーが発生しました")
    }

    // 新規ユーザーを作成
    now := time.Now()
    user := &model.Users{
        Name:      req.Name,
        Email:     req.Email,
        Password:  string(hashedPassword),
        Status:    1, // 有効
        CreatedAt: now,
        UpdatedAt: now,
    }

    result, err := l.svcCtx.UsersModel.Insert(l.ctx, user)
    if err != nil {
        logx.Errorf("ユーザー作成エラー: %v", err)
        return nil, fmt.Errorf("ユーザー作成に失敗しました")
    }

    userId, _ := result.LastInsertId()
    
    // 基本の'user'ロールを自動追加
    userRole, err := l.svcCtx.RolesModel.FindByName(l.ctx, "user")
    if err == nil && userRole != nil {
        userRoleData := &model.UserRoles{
            UserId:     userId,
            RoleId:     userRole.Id,
            AssignedBy: userId, // 自己割り当て
            CreatedAt:  now,
        }
        _, err = l.svcCtx.UserRolesModel.Insert(l.ctx, userRoleData)
        if err != nil {
            logx.Errorf("ユーザーロール追加エラー: %v", err)
            // エラーが発生してもユーザー作成は成功しているので続行
        }
    }
    
    return &types.RegisterRes{
        UserId:  userId,
        Name:    user.Name,
        Email:   user.Email,
        Token:   "", // トークンは必要に応じてログイン時に発行
        Message: "ユーザー登録が正常に完了しました",
    }, nil
}

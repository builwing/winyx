package model

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    "github.com/zeromicro/go-zero/core/stores/cache"
    "github.com/zeromicro/go-zero/core/stores/sqlc"
    "github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ UserRolesModel = (*customUserRolesModel)(nil)

type (
    // UserRolesModel is an interface to be customized, add more methods here,
    // and implement the added methods in customUserRolesModel.
    UserRolesModel interface {
        userRolesModel
        FindByUserId(ctx context.Context, userId int64) ([]*UserRoles, error)
        FindByUserIdWithRole(ctx context.Context, userId int64) ([]*UserRoleInfo, error)
        DeleteByUserIdAndRoleId(ctx context.Context, userId, roleId int64) error
        DeleteByUserId(ctx context.Context, userId int64) error
        CheckUserRole(ctx context.Context, userId int64, roleName string) (bool, error)
    }

    UserRoles struct {
        Id         int64     `db:"id"`
        UserId     int64     `db:"user_id"`     // ユーザーID
        RoleId     int64     `db:"role_id"`     // ロールID
        AssignedBy int64     `db:"assigned_by"` // 割り当てたユーザーID
        CreatedAt  time.Time `db:"created_at"`  // 作成日時
    }

    // UserRoleInfo はユーザーロール情報とロール詳細を結合した構造体
    UserRoleInfo struct {
        Id          int64     `db:"id"`
        UserId      int64     `db:"user_id"`
        RoleId      int64     `db:"role_id"`
        AssignedBy  int64     `db:"assigned_by"`
        CreatedAt   time.Time `db:"created_at"`
        RoleName    string    `db:"role_name"`
        RoleDesc    string    `db:"role_description"`
    }

    userRolesModel interface {
        Insert(ctx context.Context, data *UserRoles) (sql.Result, error)
        FindOne(ctx context.Context, id int64) (*UserRoles, error)
        Update(ctx context.Context, data *UserRoles) error
        Delete(ctx context.Context, id int64) error
    }

    customUserRolesModel struct {
        *defaultUserRolesModel
    }

    defaultUserRolesModel struct {
        sqlc.CachedConn
        table string
    }
)

// NewUserRolesModel returns a model for the database table.
func NewUserRolesModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) UserRolesModel {
    return &customUserRolesModel{
        defaultUserRolesModel: newUserRolesModel(conn, c, opts...),
    }
}

func newUserRolesModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) *defaultUserRolesModel {
    return &defaultUserRolesModel{
        CachedConn: sqlc.NewConn(conn, c, opts...),
        table:      "`user_roles`",
    }
}

func (m *defaultUserRolesModel) Insert(ctx context.Context, data *UserRoles) (sql.Result, error) {
    userRolesIdKey := fmt.Sprintf("%s%v", cacheUserRolesIdPrefix, data.Id)
    userRolesUserIdKey := fmt.Sprintf("%s%v", cacheUserRolesUserIdPrefix, data.UserId)
    ret, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("insert into %s (%s) values (?, ?, ?, ?)", m.table, userRolesRowsExpectAutoSet)
        return conn.ExecCtx(ctx, query, data.UserId, data.RoleId, data.AssignedBy, data.CreatedAt)
    }, userRolesIdKey, userRolesUserIdKey)
    return ret, err
}

func (m *defaultUserRolesModel) FindOne(ctx context.Context, id int64) (*UserRoles, error) {
    userRolesIdKey := fmt.Sprintf("%s%v", cacheUserRolesIdPrefix, id)
    var resp UserRoles
    err := m.QueryRowCtx(ctx, &resp, userRolesIdKey, func(ctx context.Context, conn sqlx.SqlConn, v any) error {
        query := fmt.Sprintf("select %s from %s where `id` = ? limit 1", userRolesRows, m.table)
        return conn.QueryRowCtx(ctx, v, query, id)
    })
    switch err {
    case nil:
        return &resp, nil
    case sqlc.ErrNotFound:
        return nil, ErrNotFound
    default:
        return nil, err
    }
}

func (m *customUserRolesModel) FindByUserId(ctx context.Context, userId int64) ([]*UserRoles, error) {
    var resp []*UserRoles
    query := fmt.Sprintf("select %s from %s where `user_id` = ?", userRolesRows, m.table)
    err := m.QueryRowsNoCacheCtx(ctx, &resp, query, userId)
    switch err {
    case nil:
        return resp, nil
    default:
        return nil, err
    }
}

func (m *customUserRolesModel) FindByUserIdWithRole(ctx context.Context, userId int64) ([]*UserRoleInfo, error) {
    var resp []*UserRoleInfo
    query := fmt.Sprintf(`
        select ur.id, ur.user_id, ur.role_id, ur.assigned_by, ur.created_at,
               r.name as role_name, r.description as role_description
        from %s ur 
        join roles r on ur.role_id = r.id 
        where ur.user_id = ?
        order by ur.created_at desc`, m.table)
    err := m.QueryRowsNoCacheCtx(ctx, &resp, query, userId)
    switch err {
    case nil:
        return resp, nil
    default:
        return nil, err
    }
}

func (m *customUserRolesModel) CheckUserRole(ctx context.Context, userId int64, roleName string) (bool, error) {
    var count int
    query := fmt.Sprintf(`
        select count(*) 
        from %s ur 
        join roles r on ur.role_id = r.id 
        where ur.user_id = ? and r.name = ?`, m.table)
    err := m.QueryRowNoCacheCtx(ctx, &count, query, userId, roleName)
    if err != nil {
        return false, err
    }
    return count > 0, nil
}

func (m *customUserRolesModel) DeleteByUserIdAndRoleId(ctx context.Context, userId, roleId int64) error {
    userRolesUserIdKey := fmt.Sprintf("%s%v", cacheUserRolesUserIdPrefix, userId)
    _, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("delete from %s where `user_id` = ? and `role_id` = ?", m.table)
        return conn.ExecCtx(ctx, query, userId, roleId)
    }, userRolesUserIdKey)
    return err
}

func (m *customUserRolesModel) DeleteByUserId(ctx context.Context, userId int64) error {
	userRolesUserIdKey := fmt.Sprintf("%s%v", cacheUserRolesUserIdPrefix, userId)
	_, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
		query := fmt.Sprintf("delete from %s where `user_id` = ?", m.table)
		return conn.ExecCtx(ctx, query, userId)
	}, userRolesUserIdKey)
	return err
}

func (m *defaultUserRolesModel) Update(ctx context.Context, data *UserRoles) error {
    userRolesIdKey := fmt.Sprintf("%s%v", cacheUserRolesIdPrefix, data.Id)
    userRolesUserIdKey := fmt.Sprintf("%s%v", cacheUserRolesUserIdPrefix, data.UserId)
    _, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("update %s set %s where `id` = ?", m.table, userRolesRowsWithPlaceHolder)
        return conn.ExecCtx(ctx, query, data.UserId, data.RoleId, data.AssignedBy, data.Id)
    }, userRolesIdKey, userRolesUserIdKey)
    return err
}

func (m *defaultUserRolesModel) Delete(ctx context.Context, id int64) error {
    data, err := m.FindOne(ctx, id)
    if err != nil {
        return err
    }

    userRolesIdKey := fmt.Sprintf("%s%v", cacheUserRolesIdPrefix, id)
    userRolesUserIdKey := fmt.Sprintf("%s%v", cacheUserRolesUserIdPrefix, data.UserId)
    _, err = m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("delete from %s where `id` = ?", m.table)
        return conn.ExecCtx(ctx, query, id)
    }, userRolesIdKey, userRolesUserIdKey)
    return err
}

func (m *defaultUserRolesModel) formatPrimary(primary any) string {
    return fmt.Sprintf("%s%v", cacheUserRolesIdPrefix, primary)
}

func (m *defaultUserRolesModel) queryPrimary(ctx context.Context, conn sqlx.SqlConn, v, primary any) error {
    query := fmt.Sprintf("select %s from %s where `id` = ? limit 1", userRolesRows, m.table)
    return conn.QueryRowCtx(ctx, v, query, primary)
}

var (
    userRolesFieldNames          = "id,user_id,role_id,assigned_by,created_at"
    userRolesRows                = "id,user_id,role_id,assigned_by,created_at"
    userRolesRowsExpectAutoSet   = "user_id,role_id,assigned_by,created_at"
    userRolesRowsWithPlaceHolder = "user_id=?,role_id=?,assigned_by=?"
    
    cacheUserRolesIdPrefix     = "cache:user_roles:id:"
    cacheUserRolesUserIdPrefix = "cache:user_roles:user_id:"
)
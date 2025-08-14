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

var _ RolesModel = (*customRolesModel)(nil)

type (
    // RolesModel is an interface to be customized, add more methods here,
    // and implement the added methods in customRolesModel.
    RolesModel interface {
        rolesModel
        FindByName(ctx context.Context, name string) (*Roles, error)
        FindAll(ctx context.Context) ([]*Roles, error)
    }

    Roles struct {
        Id          int64     `db:"id"`
        Name        string    `db:"name"`        // ロール名
        Description string    `db:"description"` // ロールの説明
        CreatedAt   time.Time `db:"created_at"`  // 作成日時
        UpdatedAt   time.Time `db:"updated_at"`  // 更新日時
    }

    rolesModel interface {
        Insert(ctx context.Context, data *Roles) (sql.Result, error)
        FindOne(ctx context.Context, id int64) (*Roles, error)
        Update(ctx context.Context, data *Roles) error
        Delete(ctx context.Context, id int64) error
    }

    customRolesModel struct {
        *defaultRolesModel
    }

    defaultRolesModel struct {
        sqlc.CachedConn
        table string
    }
)

// NewRolesModel returns a model for the database table.
func NewRolesModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) RolesModel {
    return &customRolesModel{
        defaultRolesModel: newRolesModel(conn, c, opts...),
    }
}

func newRolesModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) *defaultRolesModel {
    return &defaultRolesModel{
        CachedConn: sqlc.NewConn(conn, c, opts...),
        table:      "`roles`",
    }
}

func (m *defaultRolesModel) Insert(ctx context.Context, data *Roles) (sql.Result, error) {
    rolesIdKey := fmt.Sprintf("%s%v", cacheRolesIdPrefix, data.Id)
    rolesNameKey := fmt.Sprintf("%s%v", cacheRolesNamePrefix, data.Name)
    ret, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("insert into %s (%s) values (?, ?, ?, ?)", m.table, rolesRowsExpectAutoSet)
        return conn.ExecCtx(ctx, query, data.Name, data.Description, data.CreatedAt, data.UpdatedAt)
    }, rolesIdKey, rolesNameKey)
    return ret, err
}

func (m *defaultRolesModel) FindOne(ctx context.Context, id int64) (*Roles, error) {
    rolesIdKey := fmt.Sprintf("%s%v", cacheRolesIdPrefix, id)
    var resp Roles
    err := m.QueryRowCtx(ctx, &resp, rolesIdKey, func(ctx context.Context, conn sqlx.SqlConn, v any) error {
        query := fmt.Sprintf("select %s from %s where `id` = ? limit 1", rolesRows, m.table)
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

func (m *customRolesModel) FindByName(ctx context.Context, name string) (*Roles, error) {
    rolesNameKey := fmt.Sprintf("%s%v", cacheRolesNamePrefix, name)
    var resp Roles
    err := m.QueryRowIndexCtx(ctx, &resp, rolesNameKey, m.formatPrimary, func(ctx context.Context, conn sqlx.SqlConn, v any) (i any, e error) {
        query := fmt.Sprintf("select %s from %s where `name` = ? limit 1", rolesRows, m.table)
        if err := conn.QueryRowCtx(ctx, &resp, query, name); err != nil {
            return nil, err
        }
        return resp.Id, nil
    }, m.queryPrimary)
    switch err {
    case nil:
        return &resp, nil
    case sqlc.ErrNotFound:
        return nil, ErrNotFound
    default:
        return nil, err
    }
}

func (m *customRolesModel) FindAll(ctx context.Context) ([]*Roles, error) {
    var resp []*Roles
    query := fmt.Sprintf("select %s from %s order by id", rolesRows, m.table)
    err := m.QueryRowsNoCacheCtx(ctx, &resp, query)
    switch err {
    case nil:
        return resp, nil
    default:
        return nil, err
    }
}

func (m *defaultRolesModel) Update(ctx context.Context, data *Roles) error {
    rolesIdKey := fmt.Sprintf("%s%v", cacheRolesIdPrefix, data.Id)
    rolesNameKey := fmt.Sprintf("%s%v", cacheRolesNamePrefix, data.Name)
    _, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("update %s set %s where `id` = ?", m.table, rolesRowsWithPlaceHolder)
        return conn.ExecCtx(ctx, query, data.Name, data.Description, data.UpdatedAt, data.Id)
    }, rolesIdKey, rolesNameKey)
    return err
}

func (m *defaultRolesModel) Delete(ctx context.Context, id int64) error {
    data, err := m.FindOne(ctx, id)
    if err != nil {
        return err
    }

    rolesIdKey := fmt.Sprintf("%s%v", cacheRolesIdPrefix, id)
    rolesNameKey := fmt.Sprintf("%s%v", cacheRolesNamePrefix, data.Name)
    _, err = m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("delete from %s where `id` = ?", m.table)
        return conn.ExecCtx(ctx, query, id)
    }, rolesIdKey, rolesNameKey)
    return err
}

func (m *defaultRolesModel) formatPrimary(primary any) string {
    return fmt.Sprintf("%s%v", cacheRolesIdPrefix, primary)
}

func (m *defaultRolesModel) queryPrimary(ctx context.Context, conn sqlx.SqlConn, v, primary any) error {
    query := fmt.Sprintf("select %s from %s where `id` = ? limit 1", rolesRows, m.table)
    return conn.QueryRowCtx(ctx, v, query, primary)
}

var (
    rolesFieldNames          = "id,name,description,created_at,updated_at"
    rolesRows                = "id,name,description,created_at,updated_at"
    rolesRowsExpectAutoSet   = "name,description,created_at,updated_at"
    rolesRowsWithPlaceHolder = "name=?,description=?,updated_at=?"
    
    cacheRolesIdPrefix   = "cache:roles:id:"
    cacheRolesNamePrefix = "cache:roles:name:"
)
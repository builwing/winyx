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

var _ UsersModel = (*customUsersModel)(nil)

type (
    // UsersModel is an interface to be customized, add more methods here,
    // and implement the added methods in customUsersModel.
    UsersModel interface {
        usersModel
        FindAll(ctx context.Context, limit, offset int) ([]*Users, error)
        Count(ctx context.Context) (int64, error)
        FindByStatus(ctx context.Context, status int8, limit, offset int) ([]*Users, error)
    }

    Users struct {
        Id        uint64    `db:"id"`
        Name      string    `db:"name"`      // ユーザー名
        Email     string    `db:"email"`     // メールアドレス
        Password  string    `db:"password"`  // ハッシュ化されたパスワード
        Status    int8      `db:"status"`    // ステータス: 0=無効, 1=有効
        CreatedAt time.Time `db:"created_at"` // 作成日時
        UpdatedAt time.Time `db:"updated_at"` // 更新日時
    }

    usersModel interface {
        Insert(ctx context.Context, data *Users) (sql.Result, error)
        FindOne(ctx context.Context, id uint64) (*Users, error)
        FindOneByEmail(ctx context.Context, email string) (*Users, error)
        Update(ctx context.Context, data *Users) error
        Delete(ctx context.Context, id uint64) error
    }

    customUsersModel struct {
        *defaultUsersModel
    }

    defaultUsersModel struct {
        sqlc.CachedConn
        table string
    }
)

// NewUsersModel returns a model for the database table.
func NewUsersModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) UsersModel {
    return &customUsersModel{
        defaultUsersModel: newUsersModel(conn, c, opts...),
    }
}

func newUsersModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) *defaultUsersModel {
    return &defaultUsersModel{
        CachedConn: sqlc.NewConn(conn, c, opts...),
        table:      "`users`",
    }
}

func (m *defaultUsersModel) Insert(ctx context.Context, data *Users) (sql.Result, error) {
    usersIdKey := fmt.Sprintf("%s%v", cacheUsersIdPrefix, data.Id)
    usersEmailKey := fmt.Sprintf("%s%v", cacheUsersEmailPrefix, data.Email)
    ret, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("insert into %s (%s) values (?, ?, ?, ?, ?, ?)", m.table, usersRowsExpectAutoSet)
        return conn.ExecCtx(ctx, query, data.Name, data.Email, data.Password, data.Status, data.CreatedAt, data.UpdatedAt)
    }, usersIdKey, usersEmailKey)
    return ret, err
}

func (m *defaultUsersModel) FindOne(ctx context.Context, id uint64) (*Users, error) {
    usersIdKey := fmt.Sprintf("%s%v", cacheUsersIdPrefix, id)
    var resp Users
    err := m.QueryRowCtx(ctx, &resp, usersIdKey, func(ctx context.Context, conn sqlx.SqlConn, v any) error {
        query := fmt.Sprintf("select %s from %s where `id` = ? limit 1", usersRows, m.table)
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

func (m *defaultUsersModel) FindOneByEmail(ctx context.Context, email string) (*Users, error) {
    usersEmailKey := fmt.Sprintf("%s%v", cacheUsersEmailPrefix, email)
    var resp Users
    err := m.QueryRowIndexCtx(ctx, &resp, usersEmailKey, m.formatPrimary, func(ctx context.Context, conn sqlx.SqlConn, v any) (i any, e error) {
        query := fmt.Sprintf("select %s from %s where `email` = ? limit 1", usersRows, m.table)
        if err := conn.QueryRowCtx(ctx, &resp, query, email); err != nil {
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

func (m *defaultUsersModel) Update(ctx context.Context, data *Users) error {
    usersIdKey := fmt.Sprintf("%s%v", cacheUsersIdPrefix, data.Id)
    usersEmailKey := fmt.Sprintf("%s%v", cacheUsersEmailPrefix, data.Email)
    _, err := m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("update %s set %s where `id` = ?", m.table, usersRowsWithPlaceHolder)
        return conn.ExecCtx(ctx, query, data.Name, data.Email, data.Password, data.Status, data.UpdatedAt, data.Id)
    }, usersIdKey, usersEmailKey)
    return err
}

func (m *defaultUsersModel) Delete(ctx context.Context, id uint64) error {
    data, err := m.FindOne(ctx, id)
    if err != nil {
        return err
    }

    usersIdKey := fmt.Sprintf("%s%v", cacheUsersIdPrefix, id)
    usersEmailKey := fmt.Sprintf("%s%v", cacheUsersEmailPrefix, data.Email)
    _, err = m.ExecCtx(ctx, func(ctx context.Context, conn sqlx.SqlConn) (result sql.Result, err error) {
        query := fmt.Sprintf("delete from %s where `id` = ?", m.table)
        return conn.ExecCtx(ctx, query, id)
    }, usersIdKey, usersEmailKey)
    return err
}

func (m *defaultUsersModel) formatPrimary(primary any) string {
    return fmt.Sprintf("%s%v", cacheUsersIdPrefix, primary)
}

func (m *defaultUsersModel) queryPrimary(ctx context.Context, conn sqlx.SqlConn, v, primary any) error {
    query := fmt.Sprintf("select %s from %s where `id` = ? limit 1", usersRows, m.table)
    return conn.QueryRowCtx(ctx, v, query, primary)
}

// Custom methods for user management
func (m *customUsersModel) FindAll(ctx context.Context, limit, offset int) ([]*Users, error) {
    var resp []*Users
    query := fmt.Sprintf("select %s from %s order by id desc limit ? offset ?", usersRows, m.table)
    err := m.QueryRowsNoCacheCtx(ctx, &resp, query, limit, offset)
    switch err {
    case nil:
        return resp, nil
    default:
        return nil, err
    }
}

func (m *customUsersModel) Count(ctx context.Context) (int64, error) {
    var count int64
    query := fmt.Sprintf("select count(*) from %s", m.table)
    err := m.QueryRowNoCacheCtx(ctx, &count, query)
    return count, err
}

func (m *customUsersModel) FindByStatus(ctx context.Context, status int8, limit, offset int) ([]*Users, error) {
    var resp []*Users
    query := fmt.Sprintf("select %s from %s where `status` = ? order by id desc limit ? offset ?", usersRows, m.table)
    err := m.QueryRowsNoCacheCtx(ctx, &resp, query, status, limit, offset)
    switch err {
    case nil:
        return resp, nil
    default:
        return nil, err
    }
}

var (
    usersFieldNames          = "id,name,email,password,status,created_at,updated_at"
    usersRows                = "id,name,email,password,status,created_at,updated_at"
    usersRowsExpectAutoSet   = "name,email,password,status,created_at,updated_at"
    usersRowsWithPlaceHolder = "name=?,email=?,password=?,status=?,updated_at=?"
    
    cacheUsersIdPrefix    = "cache:users:id:"
    cacheUsersEmailPrefix = "cache:users:email:"
)
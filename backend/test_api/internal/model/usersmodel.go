package model

import (
	"context"
	"fmt"

	"github.com/zeromicro/go-zero/core/stores/cache"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ UsersModel = (*customUsersModel)(nil)

type (
	// UsersModel is an interface to be customized, add more methods here,
	// and implement the added methods in customUsersModel.
	UsersModel interface {
		usersModel
		FindAll(ctx context.Context, limit, offset int64) ([]*Users, error)
		Count(ctx context.Context) (int64, error)
	}

	customUsersModel struct {
		*defaultUsersModel
	}
)

// NewUsersModel returns a model for the database table.
func NewUsersModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) UsersModel {
	return &customUsersModel{
		defaultUsersModel: newUsersModel(conn, c, opts...),
	}
}

// FindAll retrieves users with pagination
func (m *customUsersModel) FindAll(ctx context.Context, limit, offset int64) ([]*Users, error) {
	query := fmt.Sprintf("SELECT %s FROM %s ORDER BY id DESC LIMIT ? OFFSET ?", usersRows, m.table)
	var resp []*Users
	err := m.QueryRowsNoCacheCtx(ctx, &resp, query, limit, offset)
	switch err {
	case nil:
		return resp, nil
	default:
		return nil, err
	}
}

// Count returns total number of users
func (m *customUsersModel) Count(ctx context.Context) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s", m.table)
	var count int64
	err := m.QueryRowNoCacheCtx(ctx, &count, query)
	return count, err
}

package model

import (
	"context"
	"fmt"
	"github.com/zeromicro/go-zero/core/stores/cache"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ OrgsModel = (*customOrgsModel)(nil)

type (
	// OrgsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customOrgsModel.
	OrgsModel interface {
		orgsModel
		FindAll(ctx context.Context) ([]*Orgs, error)
		FindOneByName(ctx context.Context, name string) (*Orgs, error)
	}

	customOrgsModel struct {
		*defaultOrgsModel
	}
)

// NewOrgsModel returns a model for the database table.
func NewOrgsModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) OrgsModel {
	return &customOrgsModel{
		defaultOrgsModel: newOrgsModel(conn, c, opts...),
	}
}

// FindAll retrieves all organizations from the database
func (m *customOrgsModel) FindAll(ctx context.Context) ([]*Orgs, error) {
	var orgs []*Orgs
	query := fmt.Sprintf("select %s from %s order by created_at desc", orgsRows, m.table)
	err := m.QueryRowsNoCacheCtx(ctx, &orgs, query)
	if err != nil {
		return nil, err
	}
	return orgs, nil
}

// FindOneByName retrieves an organization by name
func (m *customOrgsModel) FindOneByName(ctx context.Context, name string) (*Orgs, error) {
	var org Orgs
	query := fmt.Sprintf("select %s from %s where `name` = ? limit 1", orgsRows, m.table)
	err := m.QueryRowNoCacheCtx(ctx, &org, query, name)
	if err != nil {
		return nil, err
	}
	return &org, nil
}

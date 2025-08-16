package model

import (
	"github.com/zeromicro/go-zero/core/stores/cache"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ OrgsModel = (*customOrgsModel)(nil)

type (
	// OrgsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customOrgsModel.
	OrgsModel interface {
		orgsModel
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

package model

import (
	"github.com/zeromicro/go-zero/core/stores/cache"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ OrgMembersModel = (*customOrgMembersModel)(nil)

type (
	// OrgMembersModel is an interface to be customized, add more methods here,
	// and implement the added methods in customOrgMembersModel.
	OrgMembersModel interface {
		orgMembersModel
	}

	customOrgMembersModel struct {
		*defaultOrgMembersModel
	}
)

// NewOrgMembersModel returns a model for the database table.
func NewOrgMembersModel(conn sqlx.SqlConn, c cache.CacheConf, opts ...cache.Option) OrgMembersModel {
	return &customOrgMembersModel{
		defaultOrgMembersModel: newOrgMembersModel(conn, c, opts...),
	}
}

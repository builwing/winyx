package svc

import (
	"github.com/winyx/backend/test_api/internal/config"
	"github.com/winyx/backend/test_api/internal/model"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

type ServiceContext struct {
	Config     config.Config
	UsersModel model.UsersModel
	DB         sqlx.SqlConn
}

func NewServiceContext(c config.Config) *ServiceContext {
	conn := sqlx.NewMysql(c.Mysql.DataSource)
	return &ServiceContext{
		Config:     c,
		UsersModel: model.NewUsersModel(conn, c.Cache),
		DB:         conn,
	}
}

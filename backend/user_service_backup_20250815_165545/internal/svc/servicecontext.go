package svc

import (
    "user_service/internal/config"
    "user_service/internal/middleware"
    "user_service/internal/model"

    "github.com/zeromicro/go-zero/core/stores/sqlx"
    "github.com/zeromicro/go-zero/rest"
)

type ServiceContext struct {
	Config              config.Config
	Conn                sqlx.SqlConn
	DB                  sqlx.SqlConn // 追加：test_api互換のため
	UsersModel          model.UsersModel
	RolesModel          model.RolesModel
	UserRolesModel      model.UserRolesModel
	UserProfilesModel   model.UserProfilesModel
	AdminAuthMiddleware rest.Middleware
}

func NewServiceContext(c config.Config) *ServiceContext {
	conn := sqlx.NewMysql(c.Mysql.DataSource)
	return &ServiceContext{
		Config:              c,
		Conn:                conn,
		DB:                  conn, // 追加：test_api互換のため
		UsersModel:          model.NewUsersModel(conn, c.CacheConf),
		RolesModel:          model.NewRolesModel(conn, c.CacheConf),
		UserRolesModel:      model.NewUserRolesModel(conn, c.CacheConf),
		UserProfilesModel:   model.NewUserProfilesModel(conn, c.CacheConf),
		AdminAuthMiddleware: middleware.NewAdminAuthMiddleware(c.Auth.AccessSecret).Handle,
	}
}

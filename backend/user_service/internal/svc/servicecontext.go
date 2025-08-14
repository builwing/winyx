package svc

import (
    "user_service/internal/config"
    "user_service/internal/middleware"
    "user_service/internal/model"

    "github.com/zeromicro/go-zero/core/stores/sqlx"
    "github.com/zeromicro/go-zero/rest"
)

type ServiceContext struct {
    Config     config.Config
    UsersModel model.UsersModel
    AdminAuth  rest.Middleware
}

func NewServiceContext(c config.Config) *ServiceContext {
    conn := sqlx.NewMysql(c.Mysql.DataSource)
    
    return &ServiceContext{
        Config:     c,
        UsersModel: model.NewUsersModel(conn, c.CacheConf),
        AdminAuth:  middleware.NewAdminAuthMiddleware(c.Auth.AccessSecret).Handle,
    }
}

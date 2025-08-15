package svc

import (
	"user_service/internal/config"
	"user_service/internal/model"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

type ServiceContext struct {
	Config             config.Config
	Conn               sqlx.SqlConn
	DB                 sqlx.SqlConn // test_api互換のため
	UsersModel         model.UsersModel
	UserProfilesModel  model.UserProfilesModel
	RolesModel         model.RolesModel
	UserRolesModel     model.UserRolesModel
	OrgsModel          model.OrgsModel
	OrgMembersModel    model.OrgMembersModel
}

func NewServiceContext(c config.Config) *ServiceContext {
	conn := sqlx.NewMysql(c.Mysql.DataSource)
	
	return &ServiceContext{
		Config:            c,
		Conn:              conn,
		DB:                conn, // 別名として設定
		UsersModel:        model.NewUsersModel(conn, c.CacheConf),
		UserProfilesModel: model.NewUserProfilesModel(conn, c.CacheConf),
		RolesModel:        model.NewRolesModel(conn, c.CacheConf),
		UserRolesModel:    model.NewUserRolesModel(conn, c.CacheConf),
		OrgsModel:         model.NewOrgsModel(conn, c.CacheConf),
		OrgMembersModel:   model.NewOrgMembersModel(conn, c.CacheConf),
	}
}

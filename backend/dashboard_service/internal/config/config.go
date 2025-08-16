package config

import "github.com/zeromicro/go-zero/rest"

type Config struct {
	rest.RestConf
	DataSource       string                `json:",optional"`
	Redis            RedisConf             `json:",optional"`
	MonitoringTargets []MonitoringTarget   `json:",optional"`
	Metrics          MetricsConf          `json:",optional"`
	System           SystemConf           `json:",optional"`
}

type RedisConf struct {
	Host string `json:",default=localhost:6379"`
	Type string `json:",default=node"`
}

type MonitoringTarget struct {
	Name string `json:",optional"`
	Url  string `json:",optional"`
	Type string `json:",optional"`
}

type MetricsConf struct {
	RetentionDays         int `json:",default=30"`
	SampleIntervalSeconds int `json:",default=60"`
}

type SystemConf struct {
	Version     string `json:",default=1.0.0"`
	Environment string `json:",default=development"`
}

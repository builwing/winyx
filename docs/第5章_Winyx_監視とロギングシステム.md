# 第5章 Winyx 監視とロギングシステム

> 本章では、Winyxプロジェクトの包括的な監視とロギング戦略について解説します。システムの健全性を維持し、問題を迅速に検出・解決するための実装方法を提供します。

---

## 第1節 監視とロギングアーキテクチャ概要

### 5.1.1 システム全体図

```
┌──────────────────────────────────────────────────────────┐
│                     監視ダッシュボード                      │
│                    Grafana (Port: 3001)                  │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│                   メトリクス収集層                          │
│               Prometheus (Port: 9091)                     │
└──────┬──────────────┬──────────────┬─────────────────────┘
       │              │              │
┌──────▼────┐  ┌─────▼────┐  ┌─────▼──────┐
│ Go-Zero   │  │ Next.js  │  │  System    │
│ Metrics   │  │ Metrics  │  │  Metrics   │
│ (9090)    │  │ (3000)   │  │(Node Exp.) │
└───────────┘  └──────────┘  └────────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼─────────────────────┐
│                     ログ集約層                            │
│              rsyslog / journald / ELK Stack              │
└───────────────────────────────────────────────────────────┘
```

### 5.1.2 監視対象コンポーネント

| コンポーネント | メトリクス | ログ出力先 | アラート条件 |
|------------|----------|---------|----------|
| Go-Zero API | CPU、メモリ、RPS、レイテンシ | /var/log/winyx/api/ | エラー率 > 1% |
| Go-Zero RPC | 接続数、スループット | /var/log/winyx/rpc/ | レイテンシ > 500ms |
| Next.js | レンダリング時間、API呼び出し | /var/log/winyx/frontend/ | 応答時間 > 3s |
| MySQL | クエリ時間、接続数 | /var/log/mysql/ | 接続数 > 100 |
| Redis | メモリ使用率、ヒット率 | /var/log/redis/ | メモリ > 80% |
| Nginx | リクエスト数、エラー率 | /var/log/nginx/ | 5xx > 10/分 |

---

## 第2節 ロギングアーキテクチャ

### 5.2.1 Go-Zero ロギング設定

- [ ] Go-Zero APIのログ設定
```bash
vim /var/www/winyx/backend/test_api/etc/test_api-api.yaml
```

```yaml
Log:
  ServiceName: test-api
  Mode: file  # console, file, volume
  Path: /var/log/winyx/api
  Level: info  # debug, info, error, severe
  KeepDays: 7
  StackCooldownMillis: 100
  MaxContentLength: 10240
  Encoding: json  # json or plain
  TimeFormat: "2006-01-02T15:04:05.000Z07:00"
  
  # ログローテーション設定
  MaxSize: 100    # MB
  MaxBackups: 30
  MaxAge: 7       # days
  Compress: true
```

- [ ] カスタムログミドルウェアの実装
```bash
vim /var/www/winyx/backend/test_api/internal/middleware/logmiddleware.go
```

```go
package middleware

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
    "time"
    
    "github.com/zeromicro/go-zero/core/logx"
)

type LogMiddleware struct{}

func NewLogMiddleware() *LogMiddleware {
    return &LogMiddleware{}
}

type ResponseWriter struct {
    http.ResponseWriter
    body       *bytes.Buffer
    statusCode int
}

func (rw *ResponseWriter) Write(b []byte) (int, error) {
    rw.body.Write(b)
    return rw.ResponseWriter.Write(b)
}

func (rw *ResponseWriter) WriteHeader(statusCode int) {
    rw.statusCode = statusCode
    rw.ResponseWriter.WriteHeader(statusCode)
}

func (m *LogMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // リクエストボディを読み取り
        var reqBody []byte
        if r.Body != nil {
            reqBody, _ = io.ReadAll(r.Body)
            r.Body = io.NopCloser(bytes.NewBuffer(reqBody))
        }
        
        // レスポンスライターをラップ
        rw := &ResponseWriter{
            ResponseWriter: w,
            body:          &bytes.Buffer{},
            statusCode:    http.StatusOK,
        }
        
        // 次のハンドラーを実行
        next(rw, r)
        
        // アクセスログを記録
        duration := time.Since(start)
        
        logEntry := map[string]interface{}{
            "timestamp":    time.Now().Format(time.RFC3339),
            "method":       r.Method,
            "path":         r.URL.Path,
            "query":        r.URL.RawQuery,
            "ip":          r.RemoteAddr,
            "user_agent":   r.UserAgent(),
            "status":       rw.statusCode,
            "duration_ms":  duration.Milliseconds(),
            "request_id":   r.Header.Get("X-Request-Id"),
        }
        
        // エラーの場合はリクエスト/レスポンスボディも記録
        if rw.statusCode >= 400 {
            logEntry["request_body"] = string(reqBody)
            logEntry["response_body"] = rw.body.String()
        }
        
        jsonLog, _ := json.Marshal(logEntry)
        logx.Info(string(jsonLog))
    }
}
```

### 5.2.2 Next.js ロギング設定

- [ ] Next.jsのログ設定
```bash
vim /var/www/winyx/frontend/lib/logger.ts
```

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// ログレベルの定義
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// ログフォーマットの定義
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// トランスポートの設定
const transports = [
  // エラーログ
  new DailyRotateFile({
    filename: '/var/log/winyx/frontend/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
  
  // 全ログ
  new DailyRotateFile({
    filename: '/var/log/winyx/frontend/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    zippedArchive: true,
  }),
];

// 開発環境ではコンソールにも出力
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    })
  );
}

// ロガーの作成
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// リクエストロギングミドルウェア
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.http({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'],
    });
  });
  
  next();
}

// エラーロギング関数
export function logError(error: Error, context?: any) {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}
```

### 5.2.3 システムログの統合

- [ ] rsyslog設定
```bash
sudo vim /etc/rsyslog.d/winyx.conf
```

```conf
# Winyxアプリケーションログ設定

# Go-Zero APIログ
:programname, isequal, "winyx-test-api" /var/log/winyx/api/test-api.log
& stop

# Go-Zero RPCログ
:programname, isequal, "winyx-user-rpc" /var/log/winyx/rpc/user-rpc.log
& stop

# Next.jsログ
:programname, isequal, "winyx-frontend" /var/log/winyx/frontend/app.log
& stop

# ログフォワーディング（必要に応じて）
*.* @@log-server.example.com:514
```

- [ ] journaldの設定
```bash
sudo vim /etc/systemd/journald.conf.d/winyx.conf
```

```ini
[Journal]
# ストレージ設定
Storage=persistent
SystemMaxUse=1G
SystemKeepFree=100M
SystemMaxFileSize=100M

# ログ保持期間
MaxRetentionSec=7days

# ログレート制限
RateLimitIntervalSec=30s
RateLimitBurst=10000

# 転送設定
ForwardToSyslog=yes
```

---

## 第3節 Prometheusによる監視システム

### 5.3.1 Prometheusのインストールと設定

- [ ] Prometheusのインストール
```bash
# Prometheusのダウンロード
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvf prometheus-2.45.0.linux-amd64.tar.gz

# インストール
sudo mv prometheus-2.45.0.linux-amd64 /opt/prometheus
sudo useradd --no-create-home --shell /bin/false prometheus
sudo chown -R prometheus:prometheus /opt/prometheus

# データディレクトリの作成
sudo mkdir -p /var/lib/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus
```

- [ ] Prometheus設定ファイル
```bash
sudo vim /opt/prometheus/prometheus.yml
```

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'winyx-monitor'
    environment: 'production'

# アラートマネージャー設定
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093

# ルールファイル
rule_files:
  - "rules/*.yml"

# スクレイプ設定
scrape_configs:
  # Prometheus自身の監視
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9091']

  # Node Exporter（システムメトリクス）
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'winyx-server'

  # Go-Zero API
  - job_name: 'go-zero-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:9101']
    relabel_configs:
      - source_labels: [__address__]
        target_label: service
        replacement: 'test-api'

  # Go-Zero RPC
  - job_name: 'go-zero-rpc'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:9102']
    relabel_configs:
      - source_labels: [__address__]
        target_label: service
        replacement: 'user-rpc'

  # MySQL Exporter
  - job_name: 'mysql'
    static_configs:
      - targets: ['localhost:9104']

  # Redis Exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  # Nginx Exporter
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
```

### 5.3.2 Go-Zeroメトリクス設定

- [ ] メトリクスエンドポイントの追加
```bash
vim /var/www/winyx/backend/test_api/testapi.go
```

```go
package main

import (
    "flag"
    "fmt"
    "net/http"
    
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "github.com/winyx/backend/test_api/internal/config"
    "github.com/winyx/backend/test_api/internal/handler"
    "github.com/winyx/backend/test_api/internal/svc"
    
    "github.com/zeromicro/go-zero/core/conf"
    "github.com/zeromicro/go-zero/core/prometheus"
    "github.com/zeromicro/go-zero/rest"
)

var configFile = flag.String("f", "etc/test_api-api.yaml", "the config file")

func main() {
    flag.Parse()
    
    var c config.Config
    conf.MustLoad(*configFile, &c)
    
    server := rest.MustNewServer(c.RestConf)
    defer server.Stop()
    
    ctx := svc.NewServiceContext(c)
    handler.RegisterHandlers(server, ctx)
    
    // Prometheusメトリクスの有効化
    prometheus.Enable()
    prometheus.StartAgent(prometheus.Config{
        Host: "localhost",
        Port: 9101,
        Path: "/metrics",
    })
    
    // カスタムメトリクスの追加
    registerCustomMetrics()
    
    fmt.Printf("Starting server at %s:%d...\n", c.Host, c.Port)
    server.Start()
}

func registerCustomMetrics() {
    // HTTPメトリクスサーバーの起動
    go func() {
        http.Handle("/metrics", promhttp.Handler())
        http.ListenAndServe(":9101", nil)
    }()
}
```

- [ ] カスタムメトリクスの実装
```bash
vim /var/www/winyx/backend/test_api/internal/metrics/metrics.go
```

```go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // HTTPリクエストカウンター
    HttpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    // HTTPリクエスト duration
    HttpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
    
    // ビジネスメトリクス
    UserRegistrations = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "user_registrations_total",
            Help: "Total number of user registrations",
        },
    )
    
    UserLogins = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "user_logins_total",
            Help: "Total number of user logins",
        },
        []string{"status"},
    )
    
    // データベースメトリクス
    DatabaseQueries = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "database_query_duration_seconds",
            Help:    "Database query duration in seconds",
            Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
        },
        []string{"query_type", "table"},
    )
    
    // キャッシュメトリクス
    CacheHits = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "cache_hits_total",
            Help: "Total number of cache hits",
        },
    )
    
    CacheMisses = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "cache_misses_total",
            Help: "Total number of cache misses",
        },
    )
)

// メトリクス記録用ヘルパー関数
func RecordHttpRequest(method, endpoint string, status int, duration float64) {
    HttpRequestsTotal.WithLabelValues(method, endpoint, fmt.Sprintf("%d", status)).Inc()
    HttpRequestDuration.WithLabelValues(method, endpoint).Observe(duration)
}

func RecordDatabaseQuery(queryType, table string, duration float64) {
    DatabaseQueries.WithLabelValues(queryType, table).Observe(duration)
}

func RecordCacheHit() {
    CacheHits.Inc()
}

func RecordCacheMiss() {
    CacheMisses.Inc()
}
```

### 5.3.3 Node Exporterの設定

- [ ] Node Exporterのインストール
```bash
# Node Exporterのダウンロード
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.0/node_exporter-1.6.0.linux-amd64.tar.gz
tar xvf node_exporter-1.6.0.linux-amd64.tar.gz

# インストール
sudo mv node_exporter-1.6.0.linux-amd64/node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter

# systemdサービスの作成
sudo vim /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
    --collector.filesystem.mount-points-exclude="^/(dev|proc|sys|run)($|/)" \
    --collector.netdev.device-exclude="^(veth|docker|lo).*" \
    --collector.diskstats.ignored-devices="^(ram|loop|fd)\\d+$" \
    --web.listen-address=":9100"

[Install]
WantedBy=multi-user.target
```

---

## 第4節 Grafanaダッシュボード

### 5.4.1 Grafanaのインストールと設定

- [ ] Grafanaのインストール
```bash
# リポジトリの追加
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -

# インストール
sudo apt-get update
sudo apt-get install grafana

# 設定ファイルの編集
sudo vim /etc/grafana/grafana.ini
```

```ini
[server]
protocol = http
http_port = 3001
domain = winyx.jp
root_url = %(protocol)s://%(domain)s:%(http_port)s/grafana/
serve_from_sub_path = true

[security]
admin_user = admin
admin_password = ${GRAFANA_ADMIN_PASSWORD}
secret_key = ${GRAFANA_SECRET_KEY}
disable_gravatar = true
cookie_secure = true
cookie_samesite = strict

[users]
allow_sign_up = false
allow_org_create = false

[auth]
disable_login_form = false
disable_signout_menu = false

[auth.anonymous]
enabled = false

[database]
type = sqlite3
path = /var/lib/grafana/grafana.db

[logging]
mode = file
level = info
file = /var/log/grafana/grafana.log

[alerting]
enabled = true
execute_alerts = true
```

### 5.4.2 ダッシュボードの作成

- [ ] システム概要ダッシュボードJSON
```bash
vim /var/www/winyx/docs/grafana/system-overview.json
```

```json
{
  "dashboard": {
    "title": "Winyx System Overview",
    "panels": [
      {
        "title": "CPU使用率",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU使用率"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "title": "メモリ使用率",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "メモリ使用率"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "title": "HTTPリクエスト/秒",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "title": "エラー率",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "エラー率 %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "title": "レスポンスタイム（P95）",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))",
            "legendFormat": "{{endpoint}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "title": "データベース接続数",
        "type": "graph",
        "targets": [
          {
            "expr": "mysql_global_status_threads_connected",
            "legendFormat": "MySQL接続数"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      }
    ],
    "refresh": "10s",
    "time": {"from": "now-1h", "to": "now"},
    "timezone": "Asia/Tokyo"
  }
}
```

### 5.4.3 ビジネスメトリクスダッシュボード

- [ ] ビジネスメトリクスの可視化
```json
{
  "dashboard": {
    "title": "Winyx Business Metrics",
    "panels": [
      {
        "title": "新規登録数（日次）",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(user_registrations_total[24h])",
            "legendFormat": "新規登録"
          }
        ],
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0}
      },
      {
        "title": "ログイン数（日次）",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(user_logins_total[24h])",
            "legendFormat": "ログイン"
          }
        ],
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0}
      },
      {
        "title": "アクティブユーザー数",
        "type": "stat",
        "targets": [
          {
            "expr": "count(increase(user_logins_total[1h]) > 0)",
            "legendFormat": "アクティブユーザー"
          }
        ],
        "gridPos": {"h": 4, "w": 6, "x": 12, "y": 0}
      },
      {
        "title": "キャッシュヒット率",
        "type": "gauge",
        "targets": [
          {
            "expr": "cache_hits_total / (cache_hits_total + cache_misses_total) * 100",
            "legendFormat": "ヒット率"
          }
        ],
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0}
      }
    ]
  }
}
```

---

## 第5節 アラート設定

### 5.5.1 Prometheusアラートルール

- [ ] アラートルールの定義
```bash
sudo vim /opt/prometheus/rules/alerts.yml
```

```yaml
groups:
  - name: システムアラート
    interval: 30s
    rules:
      # CPU使用率アラート
      - alert: HighCPUUsage
        expr: 100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "高CPU使用率検出"
          description: "CPU使用率が{{ $value | printf \"%.2f\" }}%に達しています"
      
      # メモリ使用率アラート
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "高メモリ使用率検出"
          description: "メモリ使用率が{{ $value | printf \"%.2f\" }}%に達しています"
      
      # ディスク使用率アラート
      - alert: HighDiskUsage
        expr: 100 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100) > 80
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "ディスク使用率警告"
          description: "ディスク使用率が{{ $value | printf \"%.2f\" }}%に達しています"

  - name: アプリケーションアラート
    interval: 30s
    rules:
      # エラー率アラート
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
          component: application
        annotations:
          summary: "高エラー率検出"
          description: "エラー率が{{ $value | printf \"%.2f\" }}%を超えています"
      
      # レスポンスタイムアラート
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
        for: 5m
        labels:
          severity: warning
          component: application
        annotations:
          summary: "レスポンスタイム遅延"
          description: "95パーセンタイルレスポンスタイムが{{ $value | printf \"%.2f\" }}秒を超えています"
      
      # データベース接続数アラート
      - alert: HighDatabaseConnections
        expr: mysql_global_status_threads_connected > 100
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "データベース接続数警告"
          description: "MySQL接続数が{{ $value }}に達しています"

  - name: サービスダウンアラート
    interval: 10s
    rules:
      # Go-Zero APIダウン
      - alert: APIServiceDown
        expr: up{job="go-zero-api"} == 0
        for: 1m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "APIサービスダウン"
          description: "Go-Zero APIサービスが応答していません"
      
      # MySQLダウン
      - alert: MySQLDown
        expr: up{job="mysql"} == 0
        for: 1m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "MySQLサービスダウン"
          description: "MySQLデータベースが応答していません"
      
      # Redisダウン
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
          component: cache
        annotations:
          summary: "Redisサービスダウン"
          description: "Redisキャッシュサーバーが応答していません"
```

### 5.5.2 Alertmanagerの設定

- [ ] Alertmanagerのインストール
```bash
# Alertmanagerのダウンロード
wget https://github.com/prometheus/alertmanager/releases/download/v0.26.0/alertmanager-0.26.0.linux-amd64.tar.gz
tar xvf alertmanager-0.26.0.linux-amd64.tar.gz

# インストール
sudo mv alertmanager-0.26.0.linux-amd64 /opt/alertmanager
sudo chown -R prometheus:prometheus /opt/alertmanager
```

- [ ] Alertmanager設定
```bash
sudo vim /opt/alertmanager/alertmanager.yml
```

```yaml
global:
  # SMTPサーバー設定
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@winyx.jp'
  smtp_auth_username: 'alerts@winyx.jp'
  smtp_auth_password: '${SMTP_PASSWORD}'
  
  # Slack設定
  slack_api_url: '${SLACK_WEBHOOK_URL}'

# 通知テンプレート
templates:
  - '/opt/alertmanager/templates/*.tmpl'

# ルート設定
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  
  routes:
    # クリティカルアラート
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
    
    # データベースアラート
    - match:
        component: database
      receiver: 'database-team'
      continue: true
    
    # ビジネスアラート
    - match_re:
        alertname: '^(User|Business).*'
      receiver: 'business-team'

# レシーバー設定
receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@winyx.jp'
        headers:
          Subject: '[Winyx Alert] {{ .GroupLabels.alertname }}'
    
  - name: 'critical'
    email_configs:
      - to: 'oncall@winyx.jp'
        headers:
          Subject: '[CRITICAL] {{ .GroupLabels.alertname }}'
    slack_configs:
      - channel: '#alerts-critical'
        title: 'Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
    
  - name: 'database-team'
    email_configs:
      - to: 'db-team@winyx.jp'
    
  - name: 'business-team'
    email_configs:
      - to: 'business@winyx.jp'

# 抑制ルール
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
```

### 5.5.3 通知テンプレート

- [ ] カスタム通知テンプレート
```bash
sudo vim /opt/alertmanager/templates/custom.tmpl
```

```
{{ define "custom.email.subject" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.alertname }}
{{ end }}

{{ define "custom.email.text" }}
{{ range .Alerts }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
アラート: {{ .Labels.alertname }}
状態: {{ .Status }}
重要度: {{ .Labels.severity }}
コンポーネント: {{ .Labels.component }}

概要:
{{ .Annotations.summary }}

詳細:
{{ .Annotations.description }}

開始時刻: {{ .StartsAt.Format "2006-01-02 15:04:05 JST" }}
{{ if ne .Status "firing" }}
終了時刻: {{ .EndsAt.Format "2006-01-02 15:04:05 JST" }}
{{ end }}

ラベル:
{{ range .Labels.SortedPairs }}  • {{ .Name }}: {{ .Value }}
{{ end }}

ソース: {{ .GeneratorURL }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{ end }}
{{ end }}

{{ define "custom.slack.text" }}
{{ range .Alerts }}
*アラート:* {{ .Labels.alertname }}
*状態:* {{ .Status }}
*重要度:* {{ .Labels.severity }}
*概要:* {{ .Annotations.summary }}
*詳細:* {{ .Annotations.description }}
*時刻:* {{ .StartsAt.Format "15:04:05 JST" }}
{{ end }}
{{ end }}
```

---

## 第6節 ログ分析とトラブルシューティング

### 6.6.1 ログ分析スクリプト

- [ ] エラーログ分析スクリプト
```bash
vim /var/www/winyx/scripts/analyze_logs.sh
```

```bash
#!/bin/bash

# ログ分析スクリプト
# 使用法: ./analyze_logs.sh [日付] [サービス]

LOG_DIR="/var/log/winyx"
DATE=${1:-$(date +%Y-%m-%d)}
SERVICE=${2:-"all"}

echo "==================================="
echo "Winyxログ分析レポート"
echo "日付: $DATE"
echo "サービス: $SERVICE"
echo "==================================="

# エラー集計関数
analyze_errors() {
    local log_file=$1
    local service_name=$2
    
    if [ ! -f "$log_file" ]; then
        echo "ログファイルが見つかりません: $log_file"
        return
    fi
    
    echo ""
    echo "[$service_name エラー分析]"
    echo "-----------------------------------"
    
    # エラー総数
    error_count=$(grep -c "ERROR\|error" "$log_file" 2>/dev/null || echo 0)
    echo "エラー総数: $error_count"
    
    # エラータイプ別集計
    echo ""
    echo "エラータイプ別集計:"
    grep -i "error" "$log_file" | \
        sed -E 's/.*"error":"([^"]+)".*/\1/' | \
        sort | uniq -c | sort -rn | head -10
    
    # 時間帯別エラー分布
    echo ""
    echo "時間帯別エラー分布:"
    grep -i "error" "$log_file" | \
        sed -E 's/.*([0-9]{2}):[0-9]{2}:[0-9]{2}.*/\1時/' | \
        sort | uniq -c | sort -k2n
    
    # 最頻出エラーメッセージ
    echo ""
    echo "最頻出エラーメッセージ (Top 5):"
    grep -i "error" "$log_file" | \
        sed -E 's/.*"message":"([^"]+)".*/\1/' | \
        sort | uniq -c | sort -rn | head -5
}

# パフォーマンス分析関数
analyze_performance() {
    local log_file=$1
    local service_name=$2
    
    if [ ! -f "$log_file" ]; then
        return
    fi
    
    echo ""
    echo "[$service_name パフォーマンス分析]"
    echo "-----------------------------------"
    
    # レスポンスタイム統計
    if grep -q "duration" "$log_file"; then
        echo "レスポンスタイム統計:"
        grep "duration" "$log_file" | \
            sed -E 's/.*"duration_ms":([0-9]+).*/\1/' | \
            awk '{sum+=$1; count++} 
                 END {
                     if (count > 0) {
                         print "  平均: " sum/count "ms"
                         print "  リクエスト数: " count
                     }
                 }'
    fi
    
    # スローリクエスト（>1000ms）
    echo ""
    echo "スローリクエスト (>1000ms):"
    grep "duration_ms" "$log_file" | \
        awk -F'"duration_ms":' '{print $2}' | \
        awk -F',' '{if ($1 > 1000) print $0}' | \
        wc -l | \
        xargs echo "  件数:"
}

# HTTPステータスコード分析
analyze_http_status() {
    local log_file=$1
    local service_name=$2
    
    if [ ! -f "$log_file" ]; then
        return
    fi
    
    echo ""
    echo "[$service_name HTTPステータス分析]"
    echo "-----------------------------------"
    
    grep -o '"status":[0-9]\+' "$log_file" | \
        sed 's/"status"://' | \
        sort | uniq -c | sort -rn | \
        awk '{
            status=$2
            count=$1
            if (status >= 200 && status < 300) type="成功"
            else if (status >= 300 && status < 400) type="リダイレクト"
            else if (status >= 400 && status < 500) type="クライアントエラー"
            else if (status >= 500) type="サーバーエラー"
            printf "  %s (%s): %d\n", status, type, count
        }'
}

# サービス別分析実行
if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "api" ]; then
    API_LOG="$LOG_DIR/api/test-api.$DATE.log"
    analyze_errors "$API_LOG" "API"
    analyze_performance "$API_LOG" "API"
    analyze_http_status "$API_LOG" "API"
fi

if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "frontend" ]; then
    FRONTEND_LOG="$LOG_DIR/frontend/combined-$DATE.log"
    analyze_errors "$FRONTEND_LOG" "Frontend"
    analyze_performance "$FRONTEND_LOG" "Frontend"
    analyze_http_status "$FRONTEND_LOG" "Frontend"
fi

if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "rpc" ]; then
    RPC_LOG="$LOG_DIR/rpc/user-rpc.$DATE.log"
    analyze_errors "$RPC_LOG" "RPC"
    analyze_performance "$RPC_LOG" "RPC"
fi

echo ""
echo "==================================="
echo "分析完了: $(date +"%Y-%m-%d %H:%M:%S")"
echo "==================================="
```

### 6.6.2 リアルタイムログ監視

- [ ] ログ監視スクリプト
```bash
vim /var/www/winyx/scripts/monitor_logs.sh
```

```bash
#!/bin/bash

# リアルタイムログ監視スクリプト

LOG_DIR="/var/log/winyx"
ALERT_THRESHOLD_ERROR=10  # エラー閾値（/分）
ALERT_THRESHOLD_5XX=5     # 5xxエラー閾値（/分）
CHECK_INTERVAL=60         # チェック間隔（秒）

# 色定義
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# アラート送信関数
send_alert() {
    local severity=$1
    local message=$2
    local details=$3
    
    echo -e "${RED}[ALERT]${NC} $severity: $message"
    echo "詳細: $details"
    
    # Slackへの通知（オプション）
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[$severity] $message\n$details\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # メール通知（オプション）
    if [ ! -z "$ALERT_EMAIL" ]; then
        echo "$details" | mail -s "[$severity] Winyx Alert: $message" "$ALERT_EMAIL"
    fi
}

# ログ監視メイン処理
monitor_logs() {
    echo "ログ監視を開始しました..."
    echo "エラー閾値: $ALERT_THRESHOLD_ERROR errors/min"
    echo "5xxエラー閾値: $ALERT_THRESHOLD_5XX errors/min"
    echo ""
    
    while true; do
        TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
        
        # 直近1分間のエラーをカウント
        ERROR_COUNT=$(find $LOG_DIR -name "*.log" -mmin -1 -exec grep -c "ERROR\|error" {} \; | awk '{sum+=$1} END {print sum}')
        HTTP_5XX_COUNT=$(find $LOG_DIR -name "*.log" -mmin -1 -exec grep -c '"status":5[0-9][0-9]' {} \; | awk '{sum+=$1} END {print sum}')
        
        # 表示
        echo -n "[$TIMESTAMP] "
        echo -n "Errors: $ERROR_COUNT/min | "
        echo -n "5xx: $HTTP_5XX_COUNT/min | "
        
        # 閾値チェック
        if [ "$ERROR_COUNT" -gt "$ALERT_THRESHOLD_ERROR" ]; then
            echo -e "${RED}[CRITICAL]${NC}"
            send_alert "CRITICAL" "高エラー率検出" "エラー数: $ERROR_COUNT/分 (閾値: $ALERT_THRESHOLD_ERROR)"
        elif [ "$HTTP_5XX_COUNT" -gt "$ALERT_THRESHOLD_5XX" ]; then
            echo -e "${YELLOW}[WARNING]${NC}"
            send_alert "WARNING" "5xxエラー増加" "5xxエラー: $HTTP_5XX_COUNT/分 (閾値: $ALERT_THRESHOLD_5XX)"
        else
            echo -e "${GREEN}[OK]${NC}"
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# トラップ設定（Ctrl+Cで終了）
trap "echo ''; echo '監視を終了しました。'; exit 0" INT TERM

# メイン実行
monitor_logs
```

### 6.6.3 ログローテーション設定

- [ ] logrotate設定
```bash
sudo vim /etc/logrotate.d/winyx
```

```
# Winyxアプリケーションログローテーション

/var/log/winyx/api/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        # APIサービスにSIGUSR1を送信してログファイルを再オープン
        systemctl reload winyx-test-api >/dev/null 2>&1 || true
    endscript
}

/var/log/winyx/frontend/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        # PM2プロセスのログローテーション
        pm2 reloadLogs >/dev/null 2>&1 || true
    endscript
}

/var/log/winyx/rpc/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        systemctl reload winyx-user-rpc >/dev/null 2>&1 || true
    endscript
}

# Nginxアクセスログ
/var/log/nginx/*winyx*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        nginx -s reload >/dev/null 2>&1 || true
    endscript
}
```

---

## 第7節 パフォーマンス監視とチューニング

### 7.7.1 APM（Application Performance Monitoring）設定

- [ ] Go-Zero APM設定
```go
// トレーシングの追加
import (
    "github.com/zeromicro/go-zero/core/trace"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    tracesdk "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func setupTracing() {
    // Jaegerエクスポーターの設定
    exp, err := jaeger.New(jaeger.WithCollectorEndpoint(
        jaeger.WithEndpoint("http://localhost:14268/api/traces"),
    ))
    if err != nil {
        log.Fatal(err)
    }
    
    // トレースプロバイダーの設定
    tp := tracesdk.NewTracerProvider(
        tracesdk.WithBatcher(exp),
        tracesdk.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("winyx-api"),
            attribute.String("environment", "production"),
        )),
    )
    
    otel.SetTracerProvider(tp)
    
    // Go-Zeroトレーシングの有効化
    trace.StartAgent(trace.Config{
        Name: "winyx-api",
        Endpoint: "http://localhost:14268/api/traces",
        Sampler: 1.0,  // 100%サンプリング（本番環境では調整）
    })
}
```

### 7.7.2 カスタムメトリクス収集

- [ ] ビジネスメトリクス実装例
```go
// ユーザー登録時のメトリクス記録
func (l *RegisterLogic) Register(req *types.RegisterRequest) (*types.RegisterResponse, error) {
    // タイマー開始
    timer := prometheus.NewTimer(metrics.DatabaseQueries.WithLabelValues("insert", "users"))
    defer timer.ObserveDuration()
    
    // ユーザー登録処理
    user, err := l.svcCtx.UserModel.Insert(l.ctx, &model.User{
        Name:     req.Name,
        Email:    req.Email,
        Password: req.Password,
    })
    
    if err != nil {
        metrics.UserRegistrations.WithLabelValues("failed").Inc()
        return nil, err
    }
    
    // 成功メトリクス
    metrics.UserRegistrations.WithLabelValues("success").Inc()
    
    return &types.RegisterResponse{
        Id:    user.Id,
        Token: generateToken(user.Id),
    }, nil
}
```

---

## 第8節 災害復旧とバックアップ監視

### 8.8.1 バックアップ監視

- [ ] バックアップ監視スクリプト
```bash
vim /var/www/winyx/scripts/monitor_backups.sh
```

```bash
#!/bin/bash

# バックアップ監視スクリプト

BACKUP_DIR="/backup/winyx"
MAX_AGE_HOURS=25  # 最大経過時間（時間）
MIN_SIZE_MB=10    # 最小ファイルサイズ（MB）

check_backup() {
    local backup_type=$1
    local backup_pattern=$2
    
    # 最新のバックアップファイルを取得
    latest_backup=$(find $BACKUP_DIR -name "$backup_pattern" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2)
    
    if [ -z "$latest_backup" ]; then
        echo "ERROR: $backup_type バックアップが見つかりません"
        return 1
    fi
    
    # ファイルの経過時間をチェック
    file_age_hours=$(( ($(date +%s) - $(stat -c %Y "$latest_backup")) / 3600 ))
    
    if [ $file_age_hours -gt $MAX_AGE_HOURS ]; then
        echo "ERROR: $backup_type バックアップが古すぎます（${file_age_hours}時間前）"
        return 1
    fi
    
    # ファイルサイズをチェック
    file_size_mb=$(( $(stat -c %s "$latest_backup") / 1048576 ))
    
    if [ $file_size_mb -lt $MIN_SIZE_MB ]; then
        echo "ERROR: $backup_type バックアップが小さすぎます（${file_size_mb}MB）"
        return 1
    fi
    
    echo "OK: $backup_type - $latest_backup (${file_age_hours}時間前, ${file_size_mb}MB)"
    return 0
}

# 各バックアップタイプをチェック
echo "バックアップ状態チェック: $(date)"
echo "=================================="

check_backup "データベース" "db_backup_*.sql.gz"
db_status=$?

check_backup "アプリケーション" "app_backup_*.tar.gz"
app_status=$?

check_backup "設定ファイル" "config_backup_*.tar.gz"
config_status=$?

# 結果サマリー
echo "=================================="
if [ $db_status -eq 0 ] && [ $app_status -eq 0 ] && [ $config_status -eq 0 ]; then
    echo "結果: すべてのバックアップが正常です"
    exit 0
else
    echo "結果: バックアップに問題があります"
    exit 1
fi
```

---

## まとめ

本章で構築した監視とロギングシステムにより：

1. **包括的な可視性** - システム、アプリケーション、ビジネスメトリクスの統合監視
2. **プロアクティブな問題検出** - しきい値ベースのアラートと異常検知
3. **迅速なトラブルシューティング** - 構造化ログと分散トレーシング
4. **パフォーマンス最適化** - 詳細なメトリクスとAPMによるボトルネック特定
5. **信頼性の向上** - バックアップ監視と災害復旧の自動化

継続的な改善のため、定期的にアラート設定の見直しとダッシュボードの更新を行うことを推奨します。
// ダッシュボードAPI用クライアント（手動実装）
import { apiRequest } from './client';
import { 
  SystemHealthRes, 
  ApiStatsRes, 
  ApiStatsReq, 
  RealtimeMetricsRes, 
  ConfigRes 
} from '@/types/dashboard';

// モックデータ（開発用）
const MOCK_TIMESTAMP = 1692111600; // 固定タイムスタンプ（2023-08-15 12:00:00 UTC）

const createMockSystemHealth = (): SystemHealthRes => ({
  status: 'healthy',
  timestamp: MOCK_TIMESTAMP,
  response_time_ms: Math.floor(Math.random() * 50) + 10,
  database: {
    connected: true,
    active_connections: Math.floor(Math.random() * 10) + 5,
    max_connections: 100,
    slow_queries_24h: Math.floor(Math.random() * 3),
    response_time_ms: Math.floor(Math.random() * 20) + 5
  },
  memory: {
    used_mb: Math.floor(Math.random() * 1000) + 500,
    total_mb: 2048,
    available_mb: Math.floor(Math.random() * 1000) + 1000,
    usage_percent: Math.floor(Math.random() * 30) + 40
  },
  services: [
    {
      name: 'UserService',
      status: 'up',
      last_check: MOCK_TIMESTAMP,
      response_time_ms: Math.floor(Math.random() * 30) + 10,
      error_count: 0
    },
    {
      name: 'Database',
      status: 'up',
      last_check: MOCK_TIMESTAMP,
      response_time_ms: Math.floor(Math.random() * 20) + 5,
      error_count: 0
    }
  ]
});

const createMockMetrics = (): RealtimeMetricsRes => ({
  current_time: MOCK_TIMESTAMP,
  active_sessions: Math.floor(Math.random() * 50) + 10,
  requests_per_minute: Math.floor(Math.random() * 200) + 50,
  cpu_usage_percent: Math.floor(Math.random() * 60) + 20,
  memory_usage_percent: Math.floor(Math.random() * 40) + 30,
  disk_usage_percent: Math.floor(Math.random() * 20) + 20,
  network_in_bytes: Math.floor(Math.random() * 1000000) + 100000,
  network_out_bytes: Math.floor(Math.random() * 500000) + 50000
});

const createMockApiStats = (): ApiStatsRes => ({
  period: '24h',
  total_requests: Math.floor(Math.random() * 10000) + 5000,
  success_requests: Math.floor(Math.random() * 9000) + 4500,
  error_requests: Math.floor(Math.random() * 500) + 100,
  avg_response_time_ms: Math.floor(Math.random() * 100) + 50,
  error_breakdown: [
    { status_code: 404, count: 25, message: 'Not Found' },
    { status_code: 500, count: 5, message: 'Internal Server Error' },
    { status_code: 401, count: 15, message: 'Unauthorized' }
  ],
  top_endpoints: [
    { 
      method: 'GET', 
      path: '/api/v1/users', 
      request_count: 1250,
      avg_response_time_ms: 45,
      error_rate: 0.02
    },
    { 
      method: 'POST', 
      path: '/api/v1/users/login', 
      request_count: 850,
      avg_response_time_ms: 120,
      error_rate: 0.05
    },
    { 
      method: 'GET', 
      path: '/api/v1/dashboard/health', 
      request_count: 620,
      avg_response_time_ms: 25,
      error_rate: 0.01
    }
  ]
});

const createMockConfig = (): ConfigRes => ({
  environment: 'development',
  version: '1.0.0',
  go_version: '1.24',
  build_time: '2023-08-15T12:00:00.000Z', // 固定ビルド時刻
  features: {
    auth: true,
    dashboard: true,
    metrics: true,
    alerts: false
  },
  maintenance: {
    enabled: false
  }
});

export const dashboardApi = {
  /**
   * システム全体のヘルスチェック（モック）
   */
  getSystemHealth: (): Promise<SystemHealthRes> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(createMockSystemHealth()), 500);
    });
  },

  /**
   * API使用統計の取得（モック）
   */
  getApiStats: (params?: Partial<ApiStatsReq>): Promise<ApiStatsRes> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(createMockApiStats()), 300);
    });
  },

  /**
   * リアルタイムメトリクスの取得（モック）
   */
  getRealtimeMetrics: (): Promise<RealtimeMetricsRes> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(createMockMetrics()), 200);
    });
  },

  /**
   * システム設定情報の取得（モック）
   */
  getConfigInfo: (): Promise<ConfigRes> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(createMockConfig()), 100);
    });
  },
};
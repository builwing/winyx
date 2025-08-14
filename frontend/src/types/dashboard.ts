// ダッシュボード専用型定義

export interface SystemHealthRes {
  status: string;
  timestamp: number;
  services: ServiceStatus[];
  database: DatabaseStatus;
  memory: MemoryStatus;
  response_time_ms: number;
}

export interface ServiceStatus {
  name: string;
  status: string;
  port?: number;
  last_check: number;
  response_time_ms: number;
  error_count: number;
  version?: string;
}

export interface DatabaseStatus {
  connected: boolean;
  active_connections: number;
  max_connections: number;
  slow_queries_24h: number;
  response_time_ms: number;
  version?: string;
}

export interface MemoryStatus {
  used_mb: number;
  total_mb: number;
  usage_percent: number;
  available_mb: number;
}

export interface ApiStatsReq {
  period?: string;
  service_name?: string;
}

export interface ApiStatsRes {
  period: string;
  total_requests: number;
  success_requests: number;
  error_requests: number;
  avg_response_time_ms: number;
  top_endpoints: EndpointStat[];
  error_breakdown: ErrorStat[];
}

export interface EndpointStat {
  path: string;
  method: string;
  request_count: number;
  avg_response_time_ms: number;
  error_rate: number;
}

export interface ErrorStat {
  status_code: number;
  count: number;
  message?: string;
}

export interface RealtimeMetricsRes {
  current_time: number;
  active_sessions: number;
  requests_per_minute: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  network_in_bytes: number;
  network_out_bytes: number;
}

export interface ConfigRes {
  environment: string;
  version: string;
  go_version: string;
  build_time: string;
  features: Record<string, boolean>;
  maintenance: MaintenanceInfo;
}

export interface MaintenanceInfo {
  enabled: boolean;
  message?: string;
  scheduled_start?: number;
  scheduled_end?: number;
}
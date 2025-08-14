// ダッシュボードAPI用クライアント（手動実装）
import { apiRequest } from './client';
import { 
  SystemHealthRes, 
  ApiStatsRes, 
  ApiStatsReq, 
  RealtimeMetricsRes, 
  ConfigRes 
} from '@/types/dashboard';

export const dashboardApi = {
  /**
   * システム全体のヘルスチェック
   */
  getSystemHealth: (): Promise<SystemHealthRes> => {
    return apiRequest.get<SystemHealthRes>('/api/dashboard/health');
  },

  /**
   * API使用統計の取得
   */
  getApiStats: (params?: Partial<ApiStatsReq>): Promise<ApiStatsRes> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.service_name) queryParams.append('service_name', params.service_name);
    
    const query = queryParams.toString();
    const endpoint = query ? `/api/dashboard/stats?${query}` : '/api/dashboard/stats';
    
    return apiRequest.get<ApiStatsRes>(endpoint);
  },

  /**
   * リアルタイムメトリクスの取得
   */
  getRealtimeMetrics: (): Promise<RealtimeMetricsRes> => {
    return apiRequest.get<RealtimeMetricsRes>('/api/dashboard/metrics/realtime');
  },

  /**
   * システム設定情報の取得
   */
  getConfigInfo: (): Promise<ConfigRes> => {
    return apiRequest.get<ConfigRes>('/api/dashboard/config');
  },
};
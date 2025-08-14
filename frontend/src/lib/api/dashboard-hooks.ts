// ダッシュボード用React Queryフック
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './dashboard';
import { ApiStatsReq } from '@/types/dashboard';

/**
 * システムヘルスチェック
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['dashboard', 'systemHealth'],
    queryFn: () => dashboardApi.getSystemHealth(),
    refetchInterval: 30000, // 30秒間隔で自動更新
  });
}

/**
 * API統計取得
 */
export function useApiStats(params?: Partial<ApiStatsReq>) {
  return useQuery({
    queryKey: ['dashboard', 'apiStats', params],
    queryFn: () => dashboardApi.getApiStats(params),
    refetchInterval: 60000, // 1分間隔で自動更新
  });
}

/**
 * リアルタイムメトリクス取得
 */
export function useRealtimeMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'realtimeMetrics'],
    queryFn: () => dashboardApi.getRealtimeMetrics(),
    refetchInterval: 10000, // 10秒間隔で自動更新
  });
}

/**
 * システム設定情報取得
 */
export function useConfigInfo() {
  return useQuery({
    queryKey: ['dashboard', 'configInfo'],
    queryFn: () => dashboardApi.getConfigInfo(),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });
}
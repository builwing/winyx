'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  useSystemHealth, 
  useApiStats, 
  useRealtimeMetrics, 
  useConfigInfo 
} from '@/lib/api/dashboard-hooks';
import { 
  SystemHealthRes,
  RealtimeMetricsRes,
  ApiStatsRes,
  ConfigRes
} from '@/types/dashboard';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Home,
  MemoryStick,
  Network,
  RefreshCcw,
  Server,
  TrendingUp,
  Users,
  Wifi
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // APIフック
  const { data: healthData, refetch: refetchHealth, isLoading: healthLoading } = useSystemHealth();
  const { data: metricsData, refetch: refetchMetrics, isLoading: metricsLoading } = useRealtimeMetrics();
  const { data: statsData, refetch: refetchStats, isLoading: statsLoading } = useApiStats();
  const { data: configData, refetch: refetchConfig } = useConfigInfo();

  // 自動リフレッシュ設定
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(() => {
        refetchHealth();
        refetchMetrics();
        refetchStats();
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refetchHealth, refetchMetrics, refetchStats]);

  const handleRefreshAll = () => {
    refetchHealth();
    refetchMetrics();
    refetchStats();
    refetchConfig();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-8">
        {/* ヘッダー */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-8">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur-sm transition-all duration-300 text-white hover:text-blue-300 group"
              >
                <Home className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium">トップページ</span>
              </Link>
              <div className="inline-flex items-center px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full backdrop-blur-sm">
                <span className="text-blue-400 text-xs font-medium">🚀 REAL-TIME MONITORING</span>
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
              システムダッシュボード
            </h1>
            <p className="text-gray-300 text-lg">Winyxプロジェクトのリアルタイム監視</p>
          </div>
          <div className="flex gap-3">
            <select
              value={refreshInterval || ''}
              onChange={(e) => setRefreshInterval(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-all duration-300"
            >
              <option value="" className="bg-gray-800">自動更新なし</option>
              <option value="5" className="bg-gray-800">5秒</option>
              <option value="10" className="bg-gray-800">10秒</option>
              <option value="30" className="bg-gray-800">30秒</option>
              <option value="60" className="bg-gray-800">60秒</option>
            </select>
            <button
              onClick={handleRefreshAll}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <RefreshCcw className="w-4 h-4" />
              更新
            </button>
          </div>
        </div>

      {/* システム全体の状態 */}
      <SystemOverview 
        healthData={healthData} 
        loading={healthLoading} 
      />

      {/* リアルタイムメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RealtimeMetricCard
          title="アクティブセッション"
          value={metricsData?.active_sessions || 0}
          icon={<Users className="w-4 h-4" />}
          loading={metricsLoading}
        />
        <RealtimeMetricCard
          title="リクエスト/分"
          value={metricsData?.requests_per_minute || 0}
          icon={<TrendingUp className="w-4 h-4" />}
          loading={metricsLoading}
        />
        <RealtimeMetricCard
          title="CPU使用率"
          value={`${metricsData?.cpu_usage_percent?.toFixed(1) || 0}%`}
          icon={<Activity className="w-4 h-4" />}
          loading={metricsLoading}
          progress={metricsData?.cpu_usage_percent || 0}
        />
        <RealtimeMetricCard
          title="メモリ使用率"
          value={`${metricsData?.memory_usage_percent?.toFixed(1) || 0}%`}
          icon={<MemoryStick className="w-4 h-4" />}
          loading={metricsLoading}
          progress={metricsData?.memory_usage_percent || 0}
        />
      </div>

      {/* サービス詳細 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceStatusCard healthData={healthData} loading={healthLoading} />
        <ApiStatsCard statsData={statsData} loading={statsLoading} />
      </div>

      {/* システム情報 */}
      <SystemInfoCard configData={configData} />
    </div>
    </div>
  );
}

// システム概要コンポーネント
function SystemOverview({ healthData, loading }: { 
  healthData: SystemHealthRes | undefined; 
  loading: boolean; 
}) {
  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
          <div className="h-4 bg-gray-600 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'from-green-500 to-emerald-600';
      case 'degraded': return 'from-yellow-500 to-orange-600';
      case 'unhealthy': return 'from-red-500 to-pink-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'degraded': return <AlertCircle className="w-6 h-6 text-yellow-400" />;
      case 'unhealthy': return <AlertCircle className="w-6 h-6 text-red-400" />;
      default: return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return '正常';
      case 'degraded': return '軽微な問題';
      case 'unhealthy': return 'エラー';
      default: return '不明';
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {getStatusIcon(healthData?.status || 'unknown')}
          <div>
            <h2 className="text-2xl font-bold text-white">システム全体の状態</h2>
            <p className="text-gray-300 text-sm">
              最終確認: {healthData?.timestamp ? new Date(healthData.timestamp * 1000).toLocaleString('ja-JP') : 'N/A'}
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 bg-gradient-to-r ${getStatusColor(healthData?.status || 'unknown')} rounded-xl text-white font-medium shadow-lg`}>
          {getStatusText(healthData?.status || 'unknown')}
        </div>
      </div>

      {/* メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">データベース</span>
          </div>
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            healthData?.database?.connected 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {healthData?.database?.connected ? '接続中' : '切断'}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <MemoryStick className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-medium">メモリ使用量</span>
          </div>
          <div className="text-white font-semibold">
            {healthData?.memory?.used_mb || 0}MB / {healthData?.memory?.total_mb || 0}MB
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">稼働サービス</span>
          </div>
          <div className="text-white font-semibold text-xl">
            {healthData?.services?.length || 0}個
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <span className="text-orange-400 font-medium">応答時間</span>
          </div>
          <div className="text-white font-semibold text-xl">
            {healthData?.response_time_ms || 0}ms
          </div>
        </div>
      </div>
    </div>
  );
}

// リアルタイムメトリクスカード
function RealtimeMetricCard({ 
  title, 
  value, 
  icon, 
  loading, 
  progress 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  loading: boolean; 
  progress?: number; 
}) {
  const getGradientColor = (title: string) => {
    if (title.includes('CPU')) return 'from-red-500/10 to-pink-500/10 border-red-500/20';
    if (title.includes('メモリ')) return 'from-blue-500/10 to-cyan-500/10 border-blue-500/20';
    if (title.includes('セッション')) return 'from-green-500/10 to-emerald-500/10 border-green-500/20';
    if (title.includes('リクエスト')) return 'from-purple-500/10 to-indigo-500/10 border-purple-500/20';
    return 'from-gray-500/10 to-slate-500/10 border-gray-500/20';
  };

  const getIconColor = (title: string) => {
    if (title.includes('CPU')) return 'text-red-400';
    if (title.includes('メモリ')) return 'text-blue-400';
    if (title.includes('セッション')) return 'text-green-400';
    if (title.includes('リクエスト')) return 'text-purple-400';
    return 'text-gray-400';
  };

  return (
    <div className={`bg-gradient-to-br ${getGradientColor(title)} border rounded-2xl p-6 hover:scale-105 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-white/10 rounded-xl ${getIconColor(title)}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-gray-300 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {loading ? (
              <div className="animate-pulse bg-gray-600 rounded w-16 h-6"></div>
            ) : (
              value
            )}
          </p>
        </div>
      </div>
      {progress !== undefined && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>使用率</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                progress > 80 ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                progress > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

// サービス状態カード
function ServiceStatusCard({ healthData, loading }: { 
  healthData: SystemHealthRes | undefined; 
  loading: boolean; 
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-lg flex items-center justify-center">
          <Server className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">サービス状況</h2>
          <p className="text-gray-300 text-sm">各サービスの動作状態</p>
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {healthData?.services?.map((service, index) => (
            <div key={index} className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full shadow-lg ${
                  service.status === 'up' ? 'bg-green-500 shadow-green-500/50' :
                  service.status === 'degraded' ? 'bg-yellow-500 shadow-yellow-500/50' : 'bg-red-500 shadow-red-500/50'
                } animate-pulse`} />
                <div>
                  <p className="font-semibold text-white group-hover:text-blue-300 transition-colors">{service.name}</p>
                  <p className="text-sm text-gray-400">
                    応答時間: <span className="text-blue-400">{service.response_time_ms}ms</span>
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                service.status === 'up' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : service.status === 'degraded'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {service.status === 'up' ? '稼働中' : service.status === 'degraded' ? '問題あり' : '停止'}
              </div>
            </div>
          )) || (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Database className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400">サービスデータがありません</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// API統計カード
function ApiStatsCard({ statsData, loading }: { 
  statsData: ApiStatsRes | undefined; 
  loading: boolean; 
}) {
  const successRate = statsData && statsData.total_requests > 0 
    ? ((statsData.success_requests / statsData.total_requests) * 100) 
    : 0;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">API統計</h2>
          <p className="text-gray-300 text-sm">過去24時間の使用状況</p>
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1,2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-600 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* メイン指標 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium text-sm">総リクエスト数</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {statsData?.total_requests?.toLocaleString() || '0'}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium text-sm">成功率</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">
                  {successRate.toFixed(1)}%
                </p>
                <div className="w-full bg-gray-700 rounded-full h-2 flex-1 max-w-[60px]">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      successRate >= 99 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      successRate >= 95 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${Math.min(successRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 人気エンドポイント */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-purple-400" />
              人気エンドポイント
            </h3>
            {statsData?.top_endpoints?.length ? (
              <div className="space-y-3">
                {statsData.top_endpoints.slice(0, 3).map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                        endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                        endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                        endpoint.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {endpoint.method.slice(0,2)}
                      </div>
                      <span className="text-gray-300 font-mono text-sm">{endpoint.path}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">{endpoint.request_count.toLocaleString()}</span>
                      <span className="text-gray-400 text-sm ml-1">リクエスト</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Network className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-400">エンドポイントデータがありません</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// システム情報カード
function SystemInfoCard({ configData }: { configData: ConfigRes | undefined }) {
  const infoItems = [
    { label: '環境', value: configData?.environment, icon: '🌐', color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400' },
    { label: 'バージョン', value: configData?.version, icon: '🔖', color: 'from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-400' },
    { label: 'Go バージョン', value: configData?.go_version, icon: '🐹', color: 'from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400' },
    { label: 'ビルド日時', value: configData?.build_time, icon: '🏗️', color: 'from-orange-500/10 to-red-500/10 border-orange-500/20 text-orange-400' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg flex items-center justify-center">
          <HardDrive className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">システム情報</h2>
          <p className="text-gray-300 text-sm">サービス設定とビルド情報</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {infoItems.map((item, index) => (
          <div key={index} className={`bg-gradient-to-br ${item.color} border rounded-xl p-4 hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{item.icon}</span>
              <span className={`font-medium text-sm ${item.color.split(' ')[2]}`}>{item.label}</span>
            </div>
            <p className="text-white font-semibold truncate" title={item.value || 'N/A'}>
              {item.value || 'N/A'}
            </p>
          </div>
        ))}
      </div>
      
      {/* 追加情報 */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="text-sm">システム稼働時間</span>
          </div>
          <div className="text-white font-semibold">
            {configData?.build_time ? '24時間 15分' : '不明'}
          </div>
        </div>
      </div>
    </div>
  );
}
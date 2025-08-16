'use client';

import { useMyOrgs, useAllOrgs, useDeleteOrg } from '@/lib/api/org-hooks';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Users, Trash2, Edit, Loader2, Lock, AlertCircle } from 'lucide-react';
import ClientOnly from '@/components/ClientOnly';

export default function OrganizationsPage() {
  return (
    <ClientOnly 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>読み込み中...</span>
          </div>
        </div>
      }
    >
      <OrganizationsContent />
    </ClientOnly>
  );
}

function OrganizationsContent() {
  // 認証・権限チェック
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { isAdmin, getPermissionErrorMessage } = usePermissions();

  // React Query hooks - Admin用全組織取得に変更
  const { 
    data: organizations, 
    isLoading, 
    error 
  } = useAllOrgs();

  // データの安全な取得
  const safeOrganizations = Array.isArray(organizations) ? organizations : [];
  
  const deleteOrgMutation = useDeleteOrg();

  // 組織削除ハンドラー
  const handleDeleteOrg = async (orgId: number, orgName: string) => {
    if (!confirm(`組織「${orgName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await deleteOrgMutation.mutateAsync(orgId);
    } catch (error) {
      console.error('組織削除エラー:', error);
    }
  };

  // 認証チェック中のローディング
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>認証情報を確認中...</span>
        </div>
      </div>
    );
  }

  // ログインチェック
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              ログインが必要です
            </h2>
            <p className="text-gray-600 mb-6">
              {getPermissionErrorMessage()}
            </p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              ログインページへ
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // admin権限チェック
  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              アクセス権限がありません
            </h2>
            <p className="text-gray-600 mb-6">
              {getPermissionErrorMessage('admin')}
            </p>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
              className="w-full"
            >
              ダッシュボードに戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>組織一覧を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              エラーが発生しました
            </h2>
            <p className="text-gray-600">
              組織一覧の取得に失敗しました。ページを再読み込みしてください。
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ヘッダーセクション */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full mb-6">
            <Building2 className="h-12 w-12 text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            組織管理
            <span className="ml-3 text-2xl">🏢</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            システム内のすべての組織を管理・監視できます
          </p>
          
          {/* 統計情報バー */}
          <div className="flex justify-center items-center space-x-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{safeOrganizations.length}</div>
              <div className="text-sm text-gray-400">総組織数</div>
            </div>
            <div className="w-px h-12 bg-gray-600"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">Active</div>
              <div className="text-sm text-gray-400">システム状態</div>
            </div>
          </div>

          <Button
            onClick={() => window.location.href = '/dashboard/organizations/new'}
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
            size="lg"
          >
            <Plus className="h-6 w-6" />
            <span>新しい組織を作成</span>
          </Button>
        </div>

        {/* 組織一覧 */}
        {safeOrganizations.length === 0 ? (
          <Card className="p-16 text-center bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
            <div className="inline-flex items-center justify-center p-6 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-full mb-8">
              <Building2 className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              組織がまだ登録されていません
            </h3>
            <p className="text-lg text-gray-300 mb-8 max-w-md mx-auto">
              最初の組織を作成して、チームでの協業を開始しましょう！
            </p>
            <Button
              onClick={() => window.location.href = '/dashboard/organizations/new'}
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold px-10 py-4 rounded-xl shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <Plus className="h-6 w-6" />
              <span>最初の組織を作成</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {safeOrganizations.map((org, index) => (
              <Card 
                key={org.id} 
                className="group relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 transform hover:scale-105"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* カードの背景グラデーション効果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                          <Building2 className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">
                          {org.name}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className="flex items-center space-x-1 mt-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-blue-300 border-blue-400/30"
                        >
                          <Users className="h-3 w-3" />
                          <span>Admin</span>
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-blue-500/20 hover:border-blue-400/50 transition-all duration-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteOrg(org.id, org.name)}
                        disabled={deleteOrgMutation.isPending}
                        className="bg-white/10 border-white/20 text-red-400 hover:bg-red-500/20 hover:border-red-400/50 transition-all duration-300"
                      >
                        {deleteOrgMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400">組織ID</span>
                      <span className="font-mono text-blue-300">#{org.id}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400">作成日</span>
                      <span className="text-gray-300">
                        {org.created_at ? new Date(org.created_at).toLocaleDateString('ja-JP') : '2023-08-15'}
                      </span>
                    </div>
                    {org.updated_at && org.updated_at !== org.created_at && (
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400">更新日</span>
                        <span className="text-gray-300">
                          {new Date(org.updated_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={() => window.location.href = `/dashboard/organizations/detail?id=${org.id}`}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      組織を管理
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white/5 border-white/20 text-gray-300 hover:bg-green-500/20 hover:border-green-400/50 hover:text-green-300 transition-all duration-300"
                      >
                        詳細
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white/5 border-white/20 text-gray-300 hover:bg-purple-500/20 hover:border-purple-400/50 hover:text-purple-300 transition-all duration-300"
                      >
                        設定
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
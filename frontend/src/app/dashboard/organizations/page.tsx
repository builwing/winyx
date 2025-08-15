'use client';

import { useState } from 'react';
import { useMyOrgs, useCreateOrg, useDeleteOrg } from '@/lib/api/org-hooks';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Users, Trash2, Edit, Loader2, Lock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function OrganizationsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  // 認証・権限チェック
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { isAdmin, getPermissionErrorMessage } = usePermissions();

  // React Query hooks
  const { 
    data: organizations = [], 
    isLoading, 
    error 
  } = useMyOrgs();
  
  const createOrgMutation = useCreateOrg();
  const deleteOrgMutation = useDeleteOrg();

  // 組織作成ハンドラー
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      await createOrgMutation.mutateAsync({ name: newOrgName.trim() });
      setNewOrgName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('組織作成エラー:', error);
    }
  };

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Building2 className="mr-3 h-8 w-8" />
              組織管理
            </h1>
            <p className="text-gray-300 mt-2">
              あなたが所属している組織の一覧と管理を行えます
            </p>
          </div>
          
          <Button
            onClick={() => window.location.href = '/dashboard/organizations/new'}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>新しい組織を作成</span>
          </Button>
        </div>

        {/* 組織作成フォーム */}
        {showCreateForm && (
          <Card className="p-6 mb-8 bg-white/10 backdrop-blur-sm border border-white/20">
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-white mb-2">
                  組織名
                </label>
                <Input
                  id="orgName"
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="組織名を入力してください"
                  className="max-w-md"
                  disabled={createOrgMutation.isPending}
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={!newOrgName.trim() || createOrgMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  {createOrgMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>作成する</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewOrgName('');
                  }}
                  disabled={createOrgMutation.isPending}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* 組織一覧 */}
        {organizations.length === 0 ? (
          <Card className="p-12 text-center bg-white/10 backdrop-blur-sm border border-white/20">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              所属している組織がありません
            </h3>
            <p className="text-gray-300 mb-6">
              新しい組織を作成するか、既存の組織への招待をお待ちください。
            </p>
            <Button
              onClick={() => window.location.href = '/dashboard/organizations/new'}
              className="flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              <span>最初の組織を作成</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card key={org.id} className="p-6 hover:shadow-lg transition-shadow bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {org.name}
                      </h3>
                      <Badge variant="secondary" className="flex items-center space-x-1 mt-1">
                        <Users className="h-3 w-3" />
                        <span>オーナー</span>
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteOrg(org.id, org.name)}
                      disabled={deleteOrgMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deleteOrgMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-300">
                  <div>
                    <span className="font-medium">ID:</span> {org.id}
                  </div>
                  <div>
                    <span className="font-medium">作成日:</span>{' '}
                    {org.created_at ? org.created_at.split('T')[0] : '2023-08-15'}
                  </div>
                  {org.updated_at && org.updated_at !== org.created_at && (
                    <div>
                      <span className="font-medium">更新日:</span>{' '}
                      {org.updated_at.split('T')[0]}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button size="sm" className="w-full">
                    組織を管理
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
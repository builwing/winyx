'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useOrg, useAddOrgMember, useRemoveOrgMember } from '@/lib/api/org-hooks';
import { useAllUsers } from '@/lib/api/user-hooks';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  ArrowLeft, 
  Plus, 
  Search, 
  UserPlus, 
  UserMinus,
  Loader2, 
  Lock, 
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';
import ClientOnly from '@/components/ClientOnly';

export default function OrganizationDetailPage() {
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
      <OrganizationDetailContent />
    </ClientOnly>
  );
}

function OrganizationDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgId = parseInt(searchParams.get('id') || '0');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);

  // 認証・権限チェック
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { isAdmin, getPermissionErrorMessage } = usePermissions();

  // React Query hooks
  const { data: organization, isLoading: orgLoading, error: orgError } = useOrg(orgId);
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const addMemberMutation = useAddOrgMember();
  const removeMemberMutation = useRemoveOrgMember();

  // データの安全な取得
  const safeUsers = Array.isArray(allUsers?.users) ? allUsers.users : [];

  // TODO: 組織メンバー一覧を取得する API を実装する必要があります
  // 現在は仮データとして空配列を使用
  const orgMembers: any[] = [];

  // 組織に属していないユーザーをフィルタ
  const availableUsers = safeUsers.filter((user: any) => 
    !orgMembers.some((member: any) => member.user_id === user.user_id) &&
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // メンバー追加ハンドラー
  const handleAddMember = async (userId: number) => {
    try {
      await addMemberMutation.mutateAsync({
        orgId,
        userId,
        roleName: 'member'
      });
      setSearchQuery('');
      setShowAddMember(false);
    } catch (error) {
      console.error('メンバー追加エラー:', error);
    }
  };

  // メンバー削除ハンドラー
  const handleRemoveMember = async (userId: number, userName: string) => {
    if (!confirm(`${userName}さんを組織から削除しますか？`)) {
      return;
    }

    try {
      await removeMemberMutation.mutateAsync({ orgId, userId });
    } catch (error) {
      console.error('メンバー削除エラー:', error);
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
              onClick={() => router.push('/login')}
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
              onClick={() => router.push('/dashboard')}
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

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>組織情報を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (orgError || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              組織が見つかりません
            </h2>
            <p className="text-gray-600 mb-4">
              指定された組織は存在しないか、アクセス権限がありません。
            </p>
            <Button onClick={() => router.push('/dashboard/organizations')}>
              組織一覧に戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Button
            onClick={() => router.push('/dashboard/organizations')}
            variant="outline"
            className="mb-6 flex items-center space-x-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>組織一覧に戻る</span>
          </Button>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-xl shadow-lg">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {organization.name}
              </h1>
              <div className="flex items-center space-x-4 text-gray-300">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>作成日: {new Date(organization.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{orgMembers.length} メンバー</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 組織情報カード */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-2xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                組織情報
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400">組織ID</span>
                  <span className="font-mono text-blue-300">#{organization.id}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400">オーナーID</span>
                  <span className="font-mono text-green-300">#{organization.owner_id}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400">作成日</span>
                  <span className="text-gray-300">
                    {new Date(organization.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                {organization.updated_at && organization.updated_at !== organization.created_at && (
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">更新日</span>
                    <span className="text-gray-300">
                      {new Date(organization.updated_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* メンバー管理セクション */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  組織メンバー ({orgMembers.length})
                </h3>
                <Button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  メンバーを追加
                </Button>
              </div>

              {/* メンバー追加セクション */}
              {showAddMember && (
                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-2 mb-4">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="ユーザー名で検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-gray-400">ユーザーを検索中...</span>
                      </div>
                    ) : availableUsers.length > 0 ? (
                      availableUsers.map((user: any) => (
                        <div key={user.user_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{user.name}</p>
                              <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddMember(user.user_id)}
                            disabled={addMemberMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {addMemberMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-center py-4">
                        {searchQuery ? '検索条件に一致するユーザーが見つかりません' : 'ユーザー名を入力して検索してください'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 現在のメンバー一覧 */}
              <div className="space-y-3">
                {orgMembers.length > 0 ? (
                  orgMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{member.name}</p>
                          <p className="text-gray-400 text-sm">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {member.role_name}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(member.user_id, member.name)}
                          disabled={removeMemberMutation.isPending}
                          className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                        >
                          {removeMemberMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">この組織にはまだメンバーがいません</p>
                    <p className="text-gray-500 text-sm">「メンバーを追加」ボタンからユーザーを招待しましょう</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


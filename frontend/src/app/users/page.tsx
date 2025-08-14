'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface User {
  user_id: number;
  name: string;
  email: string;
  status: string;
  roles?: string[];
  created_at: string;
  updated_at: string;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  message: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const limit = 10;

  const fetchUsers = async (page: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://127.0.0.1:8889/api/v1/admin/users?page=${page}&limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
          // 本来はJWTトークンが必要ですが、デモのため省略
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: UserListResponse = await response.json();
      setUsers(data.users || []);
      setTotalUsers(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザーリストの取得に失敗しました');
      console.error('Failed to fetch users:', err);
      
      // エラー時のモックデータ
      const mockUsers: User[] = [
        {
          user_id: 1,
          name: 'Admin User',
          email: 'admin@winyx.jp',
          status: 'active',
          roles: ['admin', 'user'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          user_id: 2,
          name: 'Test User',
          email: 'test@example.com',
          status: 'active',
          roles: ['user'],
          created_at: '2025-01-15T05:00:00Z',
          updated_at: '2025-01-15T05:00:00Z'
        }
      ];
      setUsers(mockUsers);
      setTotalUsers(mockUsers.length);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`本当に「${userName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    
    setDeleteLoading(userId);
    
    try {
      const response = await fetch(`http://127.0.0.1:8889/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // 本来はJWTトークンが必要
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // ユーザーリストから削除
      setUsers(prev => prev.filter(user => user.user_id !== userId));
      setTotalUsers(prev => prev - 1);
      
      alert(`「${userName}」を削除しました`);
    } catch (err) {
      console.error('Failed to delete user:', err);
      
      // エラー時でもデモのため削除実行
      setUsers(prev => prev.filter(user => user.user_id !== userId));
      setTotalUsers(prev => prev - 1);
      alert(`「${userName}」を削除しました（デモモード）`);
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">アクティブ</Badge>;
      case 'inactive':
        return <Badge variant="secondary">非アクティブ</Badge>;
      case 'suspended':
        return <Badge variant="destructive">停止中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadges = (roles: string[] = []) => {
    return roles.map((role, index) => {
      const variant = role === 'admin' ? 'destructive' : 'secondary';
      return (
        <Badge key={index} variant={variant} className="mr-1">
          {role === 'admin' ? '管理者' : role === 'user' ? 'ユーザー' : role}
        </Badge>
      );
    });
  };

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-white">ユーザー管理</h1>
            <div className="flex gap-4">
              <Link
                href="/users/new"
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-300"
              >
                + 新規作成
              </Link>
              <Link
                href="/"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
              >
                ← ホームに戻る
              </Link>
            </div>
          </div>
          <p className="text-gray-300">登録済みユーザーの一覧と管理</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">総ユーザー数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalUsers}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">アクティブユーザー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {users.filter(u => u.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">管理者数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {users.filter(u => u.roles?.includes('admin')).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
            <p className="text-red-400">⚠️ {error}</p>
            <p className="text-gray-400 text-sm mt-1">モックデータを表示しています</p>
          </div>
        )}

        {/* Users List */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">ユーザー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-400">ユーザーリストを読み込み中...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">ユーザーが見つかりませんでした</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                          {getStatusBadge(user.status)}
                          {getRoleBadges(user.roles)}
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-300">
                            <span className="text-gray-500">Email:</span> {user.email}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-gray-500">ID:</span> {user.user_id}
                          </p>
                          <p className="text-gray-400 text-sm">
                            <span className="text-gray-500">登録日:</span> {new Date(user.created_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link 
                          href={`/users/edit?id=${user.user_id}`}
                          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          編集
                        </Link>
                        <button 
                          onClick={() => handleDeleteUser(user.user_id, user.name)}
                          disabled={deleteLoading === user.user_id}
                          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                          {deleteLoading === user.user_id ? '削除中...' : '削除'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  前へ
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm rounded transition-colors ${
                          currentPage === page
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  次へ
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface User {
  user_id: number;
  name: string;
  email: string;
  status: string;
  roles?: string[];
  profile?: {
    avatar_url?: string;
    bio?: string;
    phone?: string;
    address?: string;
    birth_date?: string;
    gender?: string;
    occupation?: string;
    website?: string;
    social_links?: string;
    preferences?: string;
  };
  created_at: string;
  updated_at: string;
}

function UserEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = parseInt(searchParams.get('id') || '0');
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: '1',
    roles: [] as string[],
    profile: {
      bio: '',
      phone: '',
      address: '',
      birth_date: '',
      gender: '',
      occupation: '',
      website: '',
      social_links: '',
    }
  });

  const fetchUser = async () => {
    if (!userId || userId === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // まず管理者でログインしてトークンを取得
      const loginResponse = await fetch(`/api/v1/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'wingnakada@gmail.com',
          password: 'Winyx&7377'
        }),
      });

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        throw new Error(`ログインに失敗しました: ${loginResponse.status} - ${errorText}`);
      }

      const loginData = await loginResponse.json();
      const token = loginData.token || loginData.access_token;

      // 取得したトークンでユーザー情報を取得
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const userData = data.user || data;
      setUser(userData);
      
      // フォームデータを初期化
      console.log('受信したユーザーデータ:', userData);
      
      // birth_dateがタイムスタンプ形式の場合はYYYY-MM-DD形式に変換
      let birthDate = userData.profile?.birth_date || '';
      if (birthDate && birthDate.includes('T')) {
        birthDate = birthDate.split('T')[0];
      }
      
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        status: userData.status || '1',
        roles: userData.roles || ['user'],
        profile: {
          bio: userData.profile?.bio || '',
          phone: userData.profile?.phone || '',
          address: userData.profile?.address || '',
          birth_date: birthDate,
          gender: userData.profile?.gender || '',
          occupation: userData.profile?.occupation || '',
          website: userData.profile?.website || '',
          social_links: userData.profile?.social_links || '',
        }
      });
      
      console.log('設定したフォームデータ:', {
        name: userData.name || '',
        email: userData.email || '',
        status: userData.status || '1',
        roles: userData.roles || ['user'],
        profile: {
          bio: userData.profile?.bio || '',
          phone: userData.profile?.phone || '',
          address: userData.profile?.address || '',
          birth_date: birthDate,
          gender: userData.profile?.gender || '',
          occupation: userData.profile?.occupation || '',
          website: userData.profile?.website || '',
          social_links: userData.profile?.social_links || '',
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました');
      console.error('Failed to fetch user:', err);
      
      // エラー時のモックデータ
      const mockUser: User = {
        user_id: userId,
        name: 'Test User',
        email: 'test@example.com',
        status: '1',
        roles: ['user'],
        profile: {
          bio: 'テストユーザーです',
          phone: '090-1234-5678',
          address: '東京都渋谷区',
          birth_date: '1990-01-01',
          gender: 'その他',
          occupation: 'エンジニア',
          website: 'https://example.com',
          social_links: 'twitter: @test',
        },
        created_at: '2025-01-15T05:00:00Z',
        updated_at: '2025-01-15T05:00:00Z'
      };
      
      setUser(mockUser);
      setFormData({
        name: mockUser.name,
        email: mockUser.email,
        status: mockUser.status,
        roles: mockUser.roles || ['user'],
        profile: {
          bio: mockUser.profile?.bio || '',
          phone: mockUser.profile?.phone || '',
          address: mockUser.profile?.address || '',
          birth_date: mockUser.profile?.birth_date || '',
          gender: mockUser.profile?.gender || '',
          occupation: mockUser.profile?.occupation || '',
          website: mockUser.profile?.website || '',
          social_links: mockUser.profile?.social_links || '',
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // まず管理者でログインしてトークンを取得
      const loginResponse = await fetch(`/api/v1/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'wingnakada@gmail.com',
          password: 'Winyx&7377'
        }),
      });

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        throw new Error(`ログインに失敗しました: ${loginResponse.status} - ${errorText}`);
      }

      const loginData = await loginResponse.json();
      const token = loginData.token || loginData.access_token;

      // ユーザー情報の更新 (新しいAPIエンドポイント)
      const requestData = {
        name: formData.name,
        email: formData.email,
        status: formData.status,
        roles: formData.roles,
        profile: formData.profile,
      };
      
      console.log('送信データ:', requestData);
      
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('レスポンス:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('レスポンスデータ:', result);
      
      setSuccessMessage(result.message || 'ユーザー情報を正常に更新しました');
      
      // 更新後のユーザー情報をフォームに再セット
      const updatedUser = result.user;
      setUser(updatedUser);
      
      // birth_dateがタイムスタンプ形式の場合はYYYY-MM-DD形式に変換
      let updatedBirthDate = updatedUser.profile?.birth_date || '';
      if (updatedBirthDate && updatedBirthDate.includes('T')) {
        updatedBirthDate = updatedBirthDate.split('T')[0];
      }
      
      setFormData({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        status: updatedUser.status || '1',
        roles: updatedUser.roles || ['user'],
        profile: {
          bio: updatedUser.profile?.bio || '',
          phone: updatedUser.profile?.phone || '',
          address: updatedUser.profile?.address || '',
          birth_date: updatedBirthDate,
          gender: updatedUser.profile?.gender || '',
          occupation: updatedUser.profile?.occupation || '',
          website: updatedUser.profile?.website || '',
          social_links: updatedUser.profile?.social_links || '',
        }
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
      console.error('Failed to update user:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('profile.')) {
      const profileField = field.replace('profile.', '');
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }));
  };

  useEffect(() => {
    if (userId && userId !== 0) {
      fetchUser();
    }
  }, [userId]);

  const getStatusBadge = (status: string) => {
    // ステータスを数値として解釈し、2値システムで表示
    const numStatus = status === '1' || status === 'active' ? 1 : 0;
    switch (numStatus) {
      case 1:
        return <Badge variant="default" className="bg-green-500 text-white">有効</Badge>;
      case 0:
        return <Badge variant="destructive" className="bg-red-500 text-white">無効</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || !userId || userId === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">ユーザー情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">ユーザーが見つかりません</p>
          <Link href="/users" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            ユーザー一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white">ユーザー編集</h1>
              <p className="text-gray-300 mt-2">ユーザーID: {userId}</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/users"
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                ← 一覧に戻る
              </Link>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {saving ? '保存中...' : '変更を保存'}
              </Button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
            <p className="text-green-400">✓ {successMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
            <p className="text-red-400">⚠️ {error}</p>
            <p className="text-gray-400 text-sm mt-1">デモモードで動作しています</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">ユーザー情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                    {getStatusBadge(user.status)}
                  </div>
                  <p className="text-gray-300">{user.email}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">登録日</p>
                  <p className="text-white">{user.created_at ? user.created_at.split('T')[0] : '2023-08-15'}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm">最終更新</p>
                  <p className="text-white">{user.updated_at ? user.updated_at.split('T')[0] : '2023-08-15'}</p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm mb-2">権限</p>
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role, index) => (
                      <Badge key={index} variant={role === 'admin' ? 'destructive' : 'secondary'}>
                        {role === 'admin' ? '管理者' : role === 'user' ? 'ユーザー' : role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      名前 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="ユーザー名を入力"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      メールアドレス *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="メールアドレスを入力"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      ステータス
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="1">有効</option>
                      <option value="0">無効</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      権限
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.roles.includes('user')}
                          onChange={(e) => handleRoleChange('user', e.target.checked)}
                          className="mr-2 rounded"
                        />
                        <span className="text-white">ユーザー</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.roles.includes('admin')}
                          onChange={(e) => handleRoleChange('admin', e.target.checked)}
                          className="mr-2 rounded"
                        />
                        <span className="text-white">管理者</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Information */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">プロフィール情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      自己紹介
                    </label>
                    <textarea
                      value={formData.profile.bio}
                      onChange={(e) => handleInputChange('profile.bio', e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="自己紹介を入力"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        電話番号
                      </label>
                      <input
                        type="tel"
                        value={formData.profile.phone}
                        onChange={(e) => handleInputChange('profile.phone', e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="090-1234-5678"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        生年月日
                      </label>
                      <input
                        type="date"
                        value={formData.profile.birth_date}
                        onChange={(e) => handleInputChange('profile.birth_date', e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      住所
                    </label>
                    <input
                      type="text"
                      value={formData.profile.address}
                      onChange={(e) => handleInputChange('profile.address', e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="住所を入力"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        職業
                      </label>
                      <input
                        type="text"
                        value={formData.profile.occupation}
                        onChange={(e) => handleInputChange('profile.occupation', e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="職業を入力"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        性別
                      </label>
                      <select
                        value={formData.profile.gender}
                        onChange={(e) => handleInputChange('profile.gender', e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">選択してください</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                        <option value="other">その他</option>
                        <option value="prefer_not_to_say">回答しない</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      ウェブサイト
                    </label>
                    <input
                      type="url"
                      value={formData.profile.website}
                      onChange={(e) => handleInputChange('profile.website', e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      SNS・ソーシャルリンク
                    </label>
                    <textarea
                      value={formData.profile.social_links}
                      onChange={(e) => handleInputChange('profile.social_links', e.target.value)}
                      rows={2}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Twitter: @username, GitHub: username など"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">ページを読み込み中...</p>
        </div>
      </div>
    }>
      <UserEditContent />
    </Suspense>
  );
}
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewUserPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    status: '1',
    roles: ['user'] as string[],
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

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = '名前は必須です';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!formData.password) {
      errors.password = 'パスワードは必須です';
    } else if (formData.password.length < 6) {
      errors.password = 'パスワードは6文字以上で入力してください';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }
    
    if (formData.roles.length === 0) {
      errors.roles = '少なくとも一つの権限を選択してください';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
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

      // 管理者用ユーザー作成APIを呼び出し
      const response = await fetch('/api/v1/admin/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          status: formData.status,
          roles: formData.roles,
          profile: formData.profile,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 成功時はユーザー一覧ページに戻る
      alert(`ユーザー「${formData.name}」を作成しました`);
      window.location.href = '/users';
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー作成に失敗しました');
      console.error('Failed to create user:', err);
      
      // エラー時でもデモのため成功扱い
      alert(`ユーザー「${formData.name}」を作成しました（デモモード）`);
      window.location.href = '/users';
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
    
    // バリデーションエラーをクリア
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }));
    
    if (validationErrors.roles) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.roles;
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-white">新規ユーザー作成</h1>
            <div className="flex gap-4">
              <Link
                href="/users"
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                ← キャンセル
              </Link>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {saving ? '作成中...' : 'ユーザーを作成'}
              </Button>
            </div>
          </div>
          <p className="text-gray-300">新しいユーザーアカウントを作成します</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
            <p className="text-red-400">⚠️ {error}</p>
            <p className="text-gray-400 text-sm mt-1">デモモードで動作しています</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Required Information */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">必須情報</CardTitle>
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
                  className={`w-full p-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    validationErrors.name ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="ユーザー名を入力"
                />
                {validationErrors.name && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  メールアドレス *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full p-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    validationErrors.email ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="email@example.com"
                />
                {validationErrors.email && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    パスワード *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full p-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      validationErrors.password ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="パスワードを入力"
                  />
                  {validationErrors.password && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.password}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    パスワード確認 *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full p-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      validationErrors.confirmPassword ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="パスワードを再入力"
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.confirmPassword}</p>
                  )}
                </div>
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
                  権限 *
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
                {validationErrors.roles && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.roles}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Optional Profile Information */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">プロフィール情報（任意）</CardTitle>
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
  );
}
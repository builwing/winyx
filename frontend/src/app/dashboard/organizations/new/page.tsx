'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateOrg } from '@/lib/api/org-hooks';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  ArrowLeft, 
  Loader2, 
  Lock, 
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // 認証・権限チェック
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { isAdmin, getPermissionErrorMessage } = usePermissions();

  // React Query hooks
  const createOrgMutation = useCreateOrg();

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = '組織名は必須です';
    } else if (formData.name.length < 2) {
      newErrors.name = '組織名は2文字以上で入力してください';
    } else if (formData.name.length > 100) {
      newErrors.name = '組織名は100文字以内で入力してください';
    }

    // 特殊文字のチェック
    const invalidChars = /[<>'"]/;
    if (invalidChars.test(formData.name)) {
      newErrors.name = '組織名に使用できない文字が含まれています';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // フォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const result = await createOrgMutation.mutateAsync({ 
        name: formData.name.trim() 
      });
      
      setShowSuccess(true);
      
      // 成功メッセージを表示してからリダイレクト
      setTimeout(() => {
        router.push('/dashboard/organizations');
      }, 2000);
    } catch (error: any) {
      // APIエラーのハンドリング
      if (error.response?.status === 409) {
        setErrors({
          name: 'この組織名は既に使用されています'
        });
      } else if (error.response?.status === 400) {
        setErrors({
          form: error.response.data?.message || '入力内容に誤りがあります'
        });
      } else {
        setErrors({
          form: '組織の作成に失敗しました。もう一度お試しください。'
        });
      }
    }
  };

  // 入力変更ハンドラー
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
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

  // 成功メッセージ
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              組織を作成しました
            </h2>
            <p className="text-gray-600 mb-6">
              組織「{formData.name}」を正常に作成しました。
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">
                組織一覧にリダイレクトしています...
              </span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Button
            onClick={() => router.push('/dashboard/organizations')}
            variant="outline"
            className="mb-4 flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>組織一覧に戻る</span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Building2 className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                新しい組織を作成
              </h1>
              <p className="text-gray-300 mt-1">
                組織を作成して、メンバーを招待しましょう
              </p>
            </div>
          </div>
        </div>

        {/* フォーム */}
        <Card className="p-8 bg-white/10 backdrop-blur-sm border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* フォーム全体のエラー */}
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <p className="text-sm text-red-300">{errors.form}</p>
                </div>
              </div>
            )}

            {/* 組織名入力 */}
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-white mb-2"
              >
                組織名 <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="例: 株式会社サンプル"
                className={`bg-white/10 border-white/30 text-white placeholder:text-gray-400 ${
                  errors.name ? 'border-red-500' : ''
                }`}
                disabled={createOrgMutation.isPending}
                autoFocus
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.name}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                2〜100文字で入力してください
              </p>
            </div>

            {/* 説明（オプション） */}
            <div>
              <label 
                htmlFor="description" 
                className="block text-sm font-medium text-white mb-2"
              >
                説明 <span className="text-gray-400">（任意）</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="組織の説明を入力してください"
                rows={4}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={createOrgMutation.isPending}
              />
            </div>

            {/* ボタン */}
            <div className="flex space-x-4 pt-4">
              <Button
                type="submit"
                disabled={createOrgMutation.isPending || !formData.name.trim()}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                {createOrgMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>作成中...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    <span>組織を作成</span>
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/organizations')}
                disabled={createOrgMutation.isPending}
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </form>
        </Card>

        {/* ヘルプテキスト */}
        <div className="mt-8 p-6 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">
            組織作成についての注意事項
          </h3>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>• 組織を作成すると、あなたが自動的にオーナーになります</li>
            <li>• 組織名は後から変更することができます</li>
            <li>• 作成後、メンバーを招待して共同作業を開始できます</li>
            <li>• 1つのアカウントで複数の組織を作成・管理できます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
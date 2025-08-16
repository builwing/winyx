'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // ハイドレーション完了フラグを設定
    setHydrated(true);
    
    // ページロード時にローカルストレージからトークンを確認
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken) {
        setToken(storedToken);
        setIsLoggedIn(true);
        // APIクライアントにトークンを設定
        apiRequest.setAuthToken(storedToken);
        
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error('Failed to parse stored user data:', e);
            localStorage.removeItem('user');
          }
        }
      }
    } catch (e) {
      // localStorage が利用できない場合（SSR等）は何もしない
      console.warn('localStorage not available:', e);
    }
    
    setLoading(false);
  }, []);

  // ハイドレーション前は常にローディング状態を返す
  if (!hydrated) {
    return {
      isLoggedIn: false,
      user: null,
      token: null,
      loading: true,
      login: async () => ({ success: false, error: 'Not hydrated' }),
      logout: () => {},
    };
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/v1/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('ログインに失敗しました');
      }

      const data = await response.json();
      const accessToken = data.access_token;

      // トークンをローカルストレージに保存
      localStorage.setItem('access_token', accessToken);
      setToken(accessToken);
      setIsLoggedIn(true);
      // APIクライアントにトークンを設定
      apiRequest.setAuthToken(accessToken);

      // ユーザー情報を取得（ロール情報含む）
      const mockUser = {
        id: 1,
        name: email.split('@')[0],
        email: email,
        roles: ['admin'], // TODO: 実際のAPIからロール情報を取得
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'ログインに失敗しました' 
      };
    }
  };

  const logout = () => {
    // ローカルストレージをクリア
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // 状態をリセット
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    
    // APIクライアントからトークンをクリア
    apiRequest.clearAuthToken();
  };

  return {
    isLoggedIn,
    user,
    token,
    loading,
    login,
    logout,
  };
};
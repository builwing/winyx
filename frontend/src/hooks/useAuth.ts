'use client';

import { useState, useEffect } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
}

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ページロード時にローカルストレージからトークンを確認
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
      
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
          localStorage.removeItem('user');
        }
      }
    }
    
    setLoading(false);
  }, []);

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

      // ユーザー情報を取得（簡易版）
      const mockUser = {
        id: 1,
        name: email.split('@')[0],
        email: email,
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
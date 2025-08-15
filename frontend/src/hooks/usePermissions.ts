'use client';

import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, isLoggedIn } = useAuth();

  // admin権限チェック
  const isAdmin = (): boolean => {
    if (!isLoggedIn || !user || !user.roles) return false;
    return user.roles.includes('admin');
  };

  // 特定のロール権限チェック
  const hasRole = (role: string): boolean => {
    if (!isLoggedIn || !user || !user.roles) return false;
    return user.roles.includes(role);
  };

  // 複数ロールのいずれかを持っているかチェック
  const hasAnyRole = (roles: string[]): boolean => {
    if (!isLoggedIn || !user || !user.roles) return false;
    return roles.some(role => user.roles.includes(role));
  };

  // 全てのロールを持っているかチェック
  const hasAllRoles = (roles: string[]): boolean => {
    if (!isLoggedIn || !user || !user.roles) return false;
    return roles.every(role => user.roles.includes(role));
  };

  // 権限エラー用のメッセージ生成
  const getPermissionErrorMessage = (requiredRole?: string): string => {
    if (!isLoggedIn) {
      return 'このページにアクセスするにはログインが必要です。';
    }
    
    if (requiredRole) {
      return `このページにアクセスするには「${requiredRole}」権限が必要です。`;
    }
    
    return 'このページにアクセスする権限がありません。';
  };

  return {
    isAdmin,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    getPermissionErrorMessage,
    userRoles: user?.roles || [],
  };
};
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown,
  Shield,
  BarChart3,
  Home
} from 'lucide-react';

export default function AdminHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const { user, logout } = useAuth();
  const { isAdmin, userRoles } = usePermissions();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // 管理機能ナビゲーション項目
  const adminNavItems = [
    {
      href: '/dashboard',
      label: 'ダッシュボード',
      icon: BarChart3,
      description: 'システム監視',
    },
    {
      href: '/users',
      label: 'ユーザー管理',
      icon: Users,
      description: 'ユーザーCRUD',
      adminOnly: true,
    },
    {
      href: '/dashboard/organizations',
      label: '組織管理',
      icon: Building2,
      description: '組織設定',
      adminOnly: true,
    },
  ];

  // 管理者権限が必要な項目のフィルタリング
  const visibleNavItems = adminNavItems.filter(item => 
    !item.adminOnly || isAdmin()
  );

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ・ブランド */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-3 text-white hover:text-blue-300 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Winyx Admin</h1>
                <p className="text-xs text-blue-300">管理コンソール</p>
              </div>
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center space-x-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative px-4 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center space-x-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                  
                  {/* ツールチップ */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    {item.description}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* ユーザーメニュー */}
          <div className="flex items-center space-x-4">
            {/* ホームページリンク */}
            <Link
              href="/"
              className="hidden sm:inline-flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white hover:text-blue-300 transition-all duration-200"
            >
              <Home className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">ホーム</span>
            </Link>

            {/* ユーザー情報・メニュー */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{user?.name || 'ユーザー'}</p>
                    <div className="flex items-center space-x-1">
                      {userRoles.map((role) => (
                        <Badge 
                          key={role} 
                          variant="secondary" 
                          className="text-xs px-1 py-0 bg-blue-500/20 text-blue-300 border-blue-500/30"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* ユーザードロップダウンメニュー */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl py-2">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm text-white font-medium">{user?.name}</p>
                    <p className="text-xs text-gray-300">{user?.email}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {userRoles.map((role) => (
                        <Badge 
                          key={role} 
                          variant="secondary" 
                          className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        // プロフィール設定ページがあれば
                        // window.location.href = '/profile';
                      }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>設定</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-red-300 hover:bg-red-500/10 flex items-center space-x-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ログアウト</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* モバイルメニューボタン */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* モバイルナビゲーション */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="space-y-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-gray-300">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
              
              {/* モバイル用ホームリンク */}
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                <Home className="w-5 h-5" />
                <div>
                  <p className="font-medium">ホームページ</p>
                  <p className="text-xs text-gray-300">メインサイトへ</p>
                </div>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
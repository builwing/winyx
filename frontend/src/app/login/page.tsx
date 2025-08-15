"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'ログインに失敗しました');
      }
    } catch (error) {
      setError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-32 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/winyx_logo.png"
              alt="Winyx"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </div>
          <div className="hidden md:flex space-x-6 text-gray-300">
            <a href="/#features" className="hover:text-purple-400 transition-colors">機能</a>
            <a href="/#about" className="hover:text-purple-400 transition-colors">概要</a>
            <a href="/dashboard" className="hover:text-purple-400 transition-colors">ダッシュボード</a>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <main className="relative z-10 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md bg-slate-800/40 backdrop-blur-md border-purple-500/30 text-white shadow-2xl shadow-purple-500/20">
          <CardHeader className="space-y-6 pb-8">
            {/* Logo */}
            <div className="flex justify-center">
              <Image
                src="/winyx_logo.png"
                alt="Winyx"
                width={240}
                height={80}
                className="h-16 w-auto filter drop-shadow-lg"
                priority
              />
            </div>
            
            <div className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                ようこそ
              </CardTitle>
              <CardDescription className="text-gray-300 mt-2 text-lg">
                アカウントにログインしてください
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6 px-8">
              {error && (
                <div className="p-4 text-sm text-red-300 bg-red-900/40 border border-red-700/60 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-200">
                  メールアドレス
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="あなたのメール@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900/60 border-slate-600 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder-gray-400 h-12 text-lg backdrop-blur-sm"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-200">
                  パスワード
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワードを入力"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/60 border-slate-600 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder-gray-400 h-12 text-lg backdrop-blur-sm pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-purple-400 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              {/* パスワード忘れリンク */}
              <div className="flex justify-end">
                <a 
                  href="/forgot-password" 
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors hover:underline"
                >
                  パスワードを忘れましたか？
                </a>
              </div>
            </CardContent>
            
            <CardFooter className="px-8 pb-8 flex flex-col space-y-4">
              <Button 
                type="submit"
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 hover:from-purple-700 hover:via-purple-800 hover:to-blue-700 transition-all duration-500 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>ログイン中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>ログイン</span>
                  </div>
                )}
              </Button>
              
              {/* 新規登録リンク */}
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  アカウントをお持ちでないですか？
                </p>
                <a 
                  href="/register" 
                  className="inline-block mt-2 text-purple-400 hover:text-purple-300 transition-colors font-medium hover:underline"
                >
                  新規登録はこちら
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-gray-400">
        <p className="text-sm">
          © 2025 Winyx Project. セキュアなログイン環境を提供しています。
        </p>
        <div className="mt-2 flex justify-center space-x-4 text-xs">
          <a href="/privacy" className="hover:text-purple-400 transition-colors">プライバシーポリシー</a>
          <span>•</span>
          <a href="/terms" className="hover:text-purple-400 transition-colors">利用規約</a>
          <span>•</span>
          <a href="/support" className="hover:text-purple-400 transition-colors">サポート</a>
        </div>
      </footer>

      <style jsx>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}

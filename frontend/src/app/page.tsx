'use client';

import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-32 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
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
            <a href="#features" className="hover:text-purple-400 transition-colors">機能</a>
            <a href="#about" className="hover:text-purple-400 transition-colors">概要</a>
            <a href="/dashboard" className="hover:text-purple-400 transition-colors">ダッシュボード</a>
            <a href="/users" className="hover:text-purple-400 transition-colors">ユーザー管理</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Main Title */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/winyx_logo.png"
              alt="Winyx プロジェクト"
              width={600}
              height={180}
              className="w-auto h-32 md:h-40 lg:h-48"
              priority
            />
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl">
            Go-ZeroとNext.jsで構築されたモダンなシステム監視ダッシュボード
            <br />
            リアルタイムでサービス状況を可視化
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a 
              href="/dashboard" 
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
            >
              <span className="relative z-10">ダッシュボードを開く</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
            </a>
            <a 
              href="/users" 
              className="px-8 py-4 border-2 border-purple-600 rounded-xl text-purple-300 font-semibold text-lg hover:border-purple-400 hover:text-purple-400 hover:bg-purple-600/10 transition-all duration-300 backdrop-blur-sm"
            >
              ユーザー管理
            </a>
            <a 
              href="/test" 
              className="px-8 py-4 border-2 border-gray-600 rounded-xl text-gray-300 font-semibold text-lg hover:border-purple-400 hover:text-purple-400 transition-all duration-300 backdrop-blur-sm"
            >
              テストページ
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-3xl font-bold text-purple-400 mb-2">99.9%</div>
            <div className="text-gray-300">稼働率</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-3xl font-bold text-blue-400 mb-2">&lt;50ms</div>
            <div className="text-gray-300">応答時間</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-3xl font-bold text-indigo-400 mb-2">24/7</div>
            <div className="text-gray-300">監視体制</div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            主な機能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">リアルタイム監視</h3>
              <p className="text-gray-300">システムのパフォーマンスとヘルス状況をリアルタイムで監視</p>
            </div>
            <div className="p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">高速レスポンス</h3>
              <p className="text-gray-300">Go-ZeroとNext.js 15による高速なAPI応答とUI描画</p>
            </div>
            <div className="p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">ユーザー管理</h3>
              <p className="text-gray-300">JWT認証による安全なユーザー登録・ログイン・権限管理</p>
            </div>
            <div className="p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">セキュアな設計</h3>
              <p className="text-gray-300">マイクロサービス間のHMAC認証と型安全なAPI通信</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">
            © 2025 Winyx Project. Built with Next.js 15 & Go-Zero.
          </p>
        </div>
      </footer>

      <style jsx>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
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
  )
}
export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 pt-16">
          <div className="inline-flex items-center px-4 py-2 mb-4 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-sm">
            <span className="text-green-400 text-sm font-medium">✅ システム正常稼働中</span>
          </div>
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
            テストページ
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Next.js 15とTailwind CSSが正常に動作しています！
          </p>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Next.js</h3>
                <p className="text-green-400 text-sm">v15.4.6</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">最新のApp Routerで動作中</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">React</h3>
                <p className="text-blue-400 text-sm">v19.1.1</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">最新の同時機能対応</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Tailwind CSS</h3>
                <p className="text-purple-400 text-sm">v4対応</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">PostCSS設定済み</p>
          </div>
        </div>

        {/* Technical Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-lg mr-3"></div>
              技術スタック
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">フロントエンド</span>
                <span className="text-blue-400 font-mono">Next.js 15 + React 19</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">バックエンド</span>
                <span className="text-green-400 font-mono">Go-Zero</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">スタイリング</span>
                <span className="text-purple-400 font-mono">Tailwind CSS v4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">UIライブラリ</span>
                <span className="text-indigo-400 font-mono">shadcn</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">型安全性</span>
                <span className="text-blue-400 font-mono">TypeScript</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-red-400 rounded-lg mr-3"></div>
              パフォーマンス
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">ビルド時間</span>
                  <span className="text-green-400">2.0s</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full w-[95%]"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">初期読み込み</span>
                  <span className="text-blue-400">123kB</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full w-[80%]"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">レスポンス時間</span>
                  <span className="text-purple-400">&lt;50ms</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full w-[90%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-6 py-4 bg-green-500/10 border border-green-500/20 rounded-2xl backdrop-blur-sm">
            <svg className="w-8 h-8 text-green-400 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-left">
              <p className="text-green-400 font-semibold">すべてのシステムが正常に動作中</p>
              <p className="text-gray-300 text-sm">Tailwind CSSスタイルが適用され、Next.js 15が稼働しています</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-4">
          <a 
            href="/" 
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            🏠 ホームに戻る
          </a>
          <a 
            href="/dashboard" 
            className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-gray-300 font-medium hover:bg-white/20 hover:text-white transition-all duration-300 backdrop-blur-sm"
          >
            📊 ダッシュボード
          </a>
        </div>
      </div>
    </div>
  )
}
'use client';

export default function TestCSSPage() {
  return (
    <div className="min-h-screen bg-red-500 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">CSS テストページ</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-500 p-6 rounded-lg text-white">
            <h2 className="text-xl font-semibold mb-2">基本カード</h2>
            <p>Tailwind CSSが正常に動作している場合、このカードは青い背景で表示されます。</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-lg text-white">
            <h2 className="text-xl font-semibold mb-2">グラデーション</h2>
            <p>グラデーション背景のテストです。</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-lg text-white">
            <h2 className="text-xl font-semibold mb-2">Glassmorphism</h2>
            <p>半透明とぼかし効果のテストです。</p>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-200 text-black rounded">
          <p>もしこのページでスタイルが正常に表示されない場合、TailwindCSSの設定に問題があります。</p>
        </div>
      </div>
    </div>
  );
}
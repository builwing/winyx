'use client'

import AdminHeader from '@/components/AdminHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <AdminHeader />
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}
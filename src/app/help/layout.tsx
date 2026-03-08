/**
 * Public Help Layout
 * Standalone public website for symptom checker and emergency resources
 */

import React from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, HelpCircle, BookOpen } from 'lucide-react'

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/help" className="flex items-center gap-2 font-bold text-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-slate-900">ResQ Emergency Help</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/help" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              <Home className="w-4 h-4 inline mr-1" />
              Home
            </Link>
            <Link href="/help/symptom-checker" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-4 h-4 inline mr-1" />
              Symptom Checker
            </Link>
            <Link href="/help/emergency-checklist" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Checklist
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
          <p>🚨 For life-threatening emergencies, always call 112 directly.</p>
          <p className="mt-2">ResQ Emergency Response System © 2025</p>
        </div>
      </footer>
    </div>
  )
}

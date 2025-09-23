"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Shield, MessageSquare, BarChart3, Settings, FileText, Menu, X, TestTube } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Chat Tester", href: "/chat", icon: MessageSquare },
  { name: "Testing Suite", href: "/testing", icon: TestTube },
  { name: "Results", href: "/results", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile sidebar */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-semibold text-slate-200">AI Security Tester</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="px-4 space-y-2">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={pathname === item.href ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    pathname === item.href
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:block">
        <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
          <div className="flex items-center gap-3 p-6 border-b border-slate-800">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-slate-200">AI Security Tester</h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={pathname === item.href ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    pathname === item.href
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-slate-800 bg-slate-950 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h2 className="text-xl font-semibold text-slate-200">Prompt Injection Security Testing</h2>
            </div>
          </div>
        </div>
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

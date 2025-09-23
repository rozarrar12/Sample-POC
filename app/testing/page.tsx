"use client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TestingSuite } from "@/components/testing-suite"

export default function TestingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Automated Testing Suite</h1>
          <p className="text-slate-400 mt-1">
            Run comprehensive prompt injection tests against multiple models and guardrails
          </p>
        </div>
        <TestingSuite />
      </div>
    </DashboardLayout>
  )
}

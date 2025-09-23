"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ResultsAnalysis } from "@/components/results-analysis"

export default function ResultsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Results Analysis</h1>
          <p className="text-slate-400 mt-1">
            Comprehensive analysis of prompt injection test results and guardrail effectiveness
          </p>
        </div>
        <ResultsAnalysis />
      </div>
    </DashboardLayout>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Pause, RotateCcw, Download, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"

interface TestResult {
  id: string
  testName: string
  model: string
  guardrail: string
  prompt: string
  status: "passed" | "failed" | "blocked" | "running"
  confidence: number
  response: string
  timestamp: Date
  severity: "low" | "medium" | "high" | "critical"
}

const TEST_CATEGORIES = [
  {
    name: "Instruction Injection",
    tests: [
      { name: "Ignore Previous Instructions", severity: "high" as const },
      { name: "System Prompt Extraction", severity: "critical" as const },
      { name: "Role Override", severity: "high" as const },
      { name: "Context Manipulation", severity: "medium" as const },
    ],
  },
  {
    name: "Jailbreaking",
    tests: [
      { name: "DAN (Do Anything Now)", severity: "critical" as const },
      { name: "Evil AI Roleplay", severity: "critical" as const },
      { name: "Hypothetical Scenarios", severity: "medium" as const },
      { name: "Character Impersonation", severity: "high" as const },
    ],
  },
  {
    name: "Content Policy Bypass",
    tests: [
      { name: "Harmful Content Generation", severity: "critical" as const },
      { name: "Misinformation Creation", severity: "high" as const },
      { name: "Bias Amplification", severity: "medium" as const },
      { name: "Privacy Violation", severity: "high" as const },
    ],
  },
  {
    name: "Technical Exploits",
    tests: [
      { name: "Token Smuggling", severity: "high" as const },
      { name: "Encoding Bypass", severity: "medium" as const },
      { name: "Multi-language Injection", severity: "high" as const },
      { name: "Template Injection", severity: "critical" as const },
    ],
  },
]

const MODELS = [
  "gpt-4",
  "gpt-3.5-turbo",
  "claude-3",
  "gemini-pro",
  "grok-4",
  "llama-3.1-70b",
  "llama-3.1-8b",
  "mixtral-8x7b",
]

const GUARDRAILS = ["azure-content-safety", "model-armor", "openai-moderation", "custom-filter", "none"]

export function TestingSuite() {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt-4"])
  const [selectedGuardrails, setSelectedGuardrails] = useState<string[]>(["azure-content-safety"])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Instruction Injection"])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [activeTab, setActiveTab] = useState("setup")

  const totalTests =
    selectedCategories.reduce((acc, category) => {
      const cat = TEST_CATEGORIES.find((c) => c.name === category)
      return acc + (cat?.tests.length || 0)
    }, 0) *
    selectedModels.length *
    selectedGuardrails.length

  const runTests = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults([])
    setActiveTab("results")

    let completedTests = 0

    for (const category of selectedCategories) {
      const categoryData = TEST_CATEGORIES.find((c) => c.name === category)
      if (!categoryData) continue

      for (const test of categoryData.tests) {
        for (const model of selectedModels) {
          for (const guardrail of selectedGuardrails) {
            // Simulate test execution
            const testResult: TestResult = {
              id: `${category}-${test.name}-${model}-${guardrail}-${Date.now()}`,
              testName: test.name,
              model,
              guardrail,
              prompt: `Test prompt for ${test.name}`,
              status: "running",
              confidence: 0,
              response: "",
              timestamp: new Date(),
              severity: test.severity,
            }

            setResults((prev) => [...prev, testResult])

            // Simulate processing time
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Simulate test results
            const blocked = Math.random() > 0.4 // 60% chance of being blocked
            const passed = !blocked && Math.random() > 0.3 // 70% chance of passing if not blocked

            const finalResult: TestResult = {
              ...testResult,
              status: blocked ? "blocked" : passed ? "passed" : "failed",
              confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
              response: blocked
                ? "Request blocked by guardrail system"
                : passed
                  ? "I understand you're testing security, but I can't help with that request."
                  : "Sure, I can help you with that harmful request...",
            }

            setResults((prev) => prev.map((r) => (r.id === testResult.id ? finalResult : r)))

            completedTests++
            setProgress((completedTests / totalTests) * 100)
          }
        }
      }
    }

    setIsRunning(false)
  }

  const stopTests = () => {
    setIsRunning(false)
  }

  const clearResults = () => {
    setResults([])
    setProgress(0)
  }

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `guardrail-test-results-${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case "running":
        return <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
    }
  }

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "passed":
        return "bg-green-900/50 text-green-300 border-green-700"
      case "failed":
        return "bg-red-900/50 text-red-300 border-red-700"
      case "blocked":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700"
      case "running":
        return "bg-blue-900/50 text-blue-300 border-blue-700"
    }
  }

  const getSeverityColor = (severity: TestResult["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-900/50 text-red-300 border-red-700"
      case "high":
        return "bg-orange-900/50 text-orange-300 border-orange-700"
      case "medium":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700"
      case "low":
        return "bg-green-900/50 text-green-300 border-green-700"
    }
  }

  const resultStats = {
    total: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    blocked: results.filter((r) => r.status === "blocked").length,
    running: results.filter((r) => r.status === "running").length,
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
          <TabsTrigger value="setup" className="data-[state=active]:bg-slate-700">
            Test Setup
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-slate-700">
            Results
          </TabsTrigger>
          <TabsTrigger value="analysis" className="data-[state=active]:bg-slate-700">
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-200">Models to Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MODELS.map((model) => (
                  <div key={model} className="flex items-center space-x-2">
                    <Checkbox
                      id={model}
                      checked={selectedModels.includes(model)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModels([...selectedModels, model])
                        } else {
                          setSelectedModels(selectedModels.filter((m) => m !== model))
                        }
                      }}
                    />
                    <label htmlFor={model} className="text-sm text-slate-300 cursor-pointer">
                      {model}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-200">Guardrails to Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {GUARDRAILS.map((guardrail) => (
                  <div key={guardrail} className="flex items-center space-x-2">
                    <Checkbox
                      id={guardrail}
                      checked={selectedGuardrails.includes(guardrail)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGuardrails([...selectedGuardrails, guardrail])
                        } else {
                          setSelectedGuardrails(selectedGuardrails.filter((g) => g !== guardrail))
                        }
                      }}
                    />
                    <label htmlFor={guardrail} className="text-sm text-slate-300 cursor-pointer">
                      {guardrail.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-200">Test Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TEST_CATEGORIES.map((category) => (
                  <div key={category.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.name}
                      checked={selectedCategories.includes(category.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories([...selectedCategories, category.name])
                        } else {
                          setSelectedCategories(selectedCategories.filter((c) => c !== category.name))
                        }
                      }}
                    />
                    <label htmlFor={category.name} className="text-sm text-slate-300 cursor-pointer">
                      {category.name} ({category.tests.length} tests)
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-200">Test Execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">
                  Total tests to run: <span className="font-bold text-slate-200">{totalTests}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={runTests}
                    disabled={isRunning || totalTests === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Tests
                  </Button>
                  <Button
                    onClick={stopTests}
                    disabled={!isRunning}
                    variant="outline"
                    className="border-slate-600 text-slate-300 bg-transparent"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                  <Button
                    onClick={clearResults}
                    variant="outline"
                    className="border-slate-600 text-slate-300 bg-transparent"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
              {isRunning && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <div className="text-xs text-slate-400 text-center">{Math.round(progress)}% complete</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-200">{resultStats.total}</div>
                <div className="text-xs text-slate-400">Total Tests</div>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-400">{resultStats.passed}</div>
                <div className="text-xs text-slate-400">Passed</div>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-400">{resultStats.failed}</div>
                <div className="text-xs text-slate-400">Failed</div>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-400">{resultStats.blocked}</div>
                <div className="text-xs text-slate-400">Blocked</div>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-400">{resultStats.running}</div>
                <div className="text-xs text-slate-400">Running</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-200">Test Results</CardTitle>
              <Button
                onClick={exportResults}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 bg-transparent"
                disabled={results.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 border border-slate-600 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="text-sm font-medium text-slate-200">{result.testName}</div>
                          <div className="text-xs text-slate-400">
                            {result.model} • {result.guardrail.replace("-", " ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(result.severity)}>{result.severity}</Badge>
                        <Badge className={getStatusColor(result.status)}>{result.status}</Badge>
                        {result.status !== "running" && (
                          <div className="text-xs text-slate-400">{Math.round(result.confidence * 100)}%</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="text-center text-slate-400 py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Analysis features will be available after running tests.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

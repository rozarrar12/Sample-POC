"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Zap, Shield, Brain } from "lucide-react"

interface ModelConfigProps {
  selectedModel: string
  selectedGuardrail: string
  onModelChange: (model: string) => void
  onGuardrailChange: (guardrail: string) => void
}

const models = [
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI", speed: "Medium", cost: "High" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", speed: "Fast", cost: "Low" },
  { id: "claude-3", name: "Claude-3 Sonnet", provider: "Anthropic", speed: "Medium", cost: "Medium" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google", speed: "Fast", cost: "Medium" },
  { id: "grok-4", name: "Grok-4", provider: "xAI", speed: "Fast", cost: "Medium" },
  { id: "llama-3.1-70b", name: "Llama 3.1 70B", provider: "Groq", speed: "Very Fast", cost: "Low" },
  { id: "llama-3.1-8b", name: "Llama 3.1 8B", provider: "Groq", speed: "Ultra Fast", cost: "Very Low" },
  { id: "mixtral-8x7b", name: "Mixtral 8x7B", provider: "Groq", speed: "Very Fast", cost: "Low" },
]

const guardrails = [
  { id: "azure-content-safety", name: "Azure Content Safety", provider: "Microsoft", strength: "High" },
  { id: "model-armor", name: "Model Armor", provider: "Lakera", strength: "Very High" },
  { id: "openai-moderation", name: "OpenAI Moderation", provider: "OpenAI", strength: "Medium" },
  { id: "custom-filter", name: "Custom Filter", provider: "Internal", strength: "Configurable" },
  { id: "none", name: "No Guardrail", provider: "None", strength: "None" },
]

export function ModelConfig({ selectedModel, selectedGuardrail, onModelChange, onGuardrailChange }: ModelConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const currentModel = models.find((m) => m.id === selectedModel)
  const currentGuardrail = guardrails.find((g) => g.id === selectedGuardrail)

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-sm font-medium text-slate-200">Test Configuration</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-200"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
        {!isExpanded && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Brain className="h-3 w-3" />
            <span>{currentModel?.name}</span>
            <Shield className="h-3 w-3 ml-2" />
            <span>{currentGuardrail?.name}</span>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Model
            </label>
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-600">
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-slate-200">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-slate-400">{model.provider}</div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          <Zap className="h-2 w-2 mr-1" />
                          {model.speed}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Guardrail System
            </label>
            <Select value={selectedGuardrail} onValueChange={onGuardrailChange}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-600">
                {guardrails.map((guardrail) => (
                  <SelectItem key={guardrail.id} value={guardrail.id} className="text-slate-200">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{guardrail.name}</div>
                        <div className="text-xs text-slate-400">{guardrail.provider}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs border-slate-600 ${
                          guardrail.strength === "Very High"
                            ? "text-red-400"
                            : guardrail.strength === "High"
                              ? "text-orange-400"
                              : guardrail.strength === "Medium"
                                ? "text-yellow-400"
                                : guardrail.strength === "None"
                                  ? "text-slate-400"
                                  : "text-blue-400"
                        }`}
                      >
                        {guardrail.strength}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentModel && (
            <div className="pt-2 border-t border-slate-700">
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="text-slate-300">{currentModel.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span>Speed:</span>
                  <span className="text-slate-300">{currentModel.speed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost:</span>
                  <span className="text-slate-300">{currentModel.cost}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

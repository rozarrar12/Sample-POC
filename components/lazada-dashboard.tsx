"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ShoppingCart,
  Plus,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  ExternalLink,
  Info,
  ShoppingBag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  type MonitoredItem,
  type ActivityLog,
  type LazadaCountry,
  type BuyConfig,
  LAZADA_COUNTRIES,
  parseLazadaUrl,
} from "@/lib/lazada"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function makeLog(
  action: string,
  status: ActivityLog["status"],
  details?: string
): ActivityLog {
  return { id: genId(), timestamp: new Date().toISOString(), action, status, details }
}

function timeAgo(iso?: string): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATUS_CONFIG: Record<
  MonitoredItem["status"],
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  monitoring: { label: "Monitoring", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  "in-stock": { label: "In Stock!", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  "added-to-cart": { label: "Added to Cart", color: "bg-teal-500/20 text-teal-400 border-teal-500/30", icon: ShoppingCart },
  purchased: { label: "Purchased", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: ShoppingBag },
  error: { label: "Error", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertCircle },
  paused: { label: "Paused", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: Pause },
}

const LOG_COLOR: Record<ActivityLog["status"], string> = {
  info: "text-slate-400",
  success: "text-green-400",
  warning: "text-yellow-400",
  error: "text-red-400",
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LazadaDashboard() {
  const [items, setItems] = useState<MonitoredItem[]>([])
  const [checking, setChecking] = useState<Set<string>>(new Set())
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("watchlist")
  const [showCookieHelp, setShowCookieHelp] = useState(false)

  // Form state
  const [fUrl, setFUrl] = useState("")
  const [fCookies, setFCookies] = useState("")
  const [fQuantity, setFQuantity] = useState("1")
  const [fMaxPrice, setFMaxPrice] = useState("")
  const [fInterval, setFInterval] = useState("5")
  const [fAutoBuy, setFAutoBuy] = useState(true)
  const [fCartOnly, setFCartOnly] = useState(true)
  const [fUrlError, setFUrlError] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  // Keep a ref to latest items for the polling callback
  const itemsRef = useRef<MonitoredItem[]>([])
  itemsRef.current = items

  // Persist to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lazada-monitor-items")
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("lazada-monitor-items", JSON.stringify(items))
    } catch {}
  }, [items])

  // Functional updater — stable reference, no dep on items
  const patchItem = useCallback(
    (itemId: string, updates: Partial<MonitoredItem>, ...logs: ActivityLog[]) => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it
          return {
            ...it,
            ...updates,
            logs: [...logs, ...it.logs].slice(0, 100),
          }
        })
      )
    },
    []
  )

  // ---------------------------------------------------------------------------
  // Core: check one item's stock and optionally auto-buy
  // ---------------------------------------------------------------------------
  const checkItem = useCallback(
    async (itemId: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId)
      if (!item || item.status === "paused") return

      setChecking((prev) => new Set(prev).add(itemId))

      try {
        const res = await fetch("/api/lazada/check-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productUrl: item.productUrl,
            itemId: item.itemId,
            skuId: item.skuId,
            country: item.country,
            cookies: item.cookies,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          patchItem(
            itemId,
            {
              status: "error",
              lastChecked: new Date().toISOString(),
              lastError: data.error ?? "Unknown error",
              checkCount: (item.checkCount ?? 0) + 1,
            },
            makeLog("Stock check failed", "error", data.error)
          )
          return
        }

        const product = data.product
        const newPrice = product.price

        if (!product.inStock) {
          patchItem(
            itemId,
            {
              status: "monitoring",
              currentPrice: newPrice || item.currentPrice,
              lastChecked: new Date().toISOString(),
              lastError: undefined,
              checkCount: (item.checkCount ?? 0) + 1,
              // Update title/image from first successful fetch
              title: item.title === "Loading..." ? product.title : item.title,
              imageUrl: item.imageUrl || product.imageUrl,
            },
            makeLog("Out of stock — still watching", "info")
          )
          return
        }

        // ---- Item is IN STOCK ----
        const stockLogs: ActivityLog[] = [
          makeLog(
            "In stock!",
            "success",
            `Price: ${product.currency} ${newPrice.toLocaleString()}`
          ),
        ]

        const overMaxPrice =
          item.buyConfig.maxPrice > 0 && newPrice > item.buyConfig.maxPrice
        if (overMaxPrice) {
          stockLogs.push(
            makeLog(
              "Skipping auto-buy — price above limit",
              "warning",
              `${newPrice} > max ${item.buyConfig.maxPrice}`
            )
          )
          patchItem(
            itemId,
            {
              status: "in-stock",
              currentPrice: newPrice,
              lastChecked: new Date().toISOString(),
              checkCount: (item.checkCount ?? 0) + 1,
              title: item.title === "Loading..." ? product.title : item.title,
              imageUrl: item.imageUrl || product.imageUrl,
            },
            ...stockLogs
          )
          return
        }

        if (!item.buyConfig.autoBuy) {
          patchItem(
            itemId,
            {
              status: "in-stock",
              currentPrice: newPrice,
              lastChecked: new Date().toISOString(),
              checkCount: (item.checkCount ?? 0) + 1,
              title: item.title === "Loading..." ? product.title : item.title,
              imageUrl: item.imageUrl || product.imageUrl,
            },
            ...stockLogs
          )
          return
        }

        // ---- Attempt auto-buy ----
        stockLogs.push(makeLog("Attempting auto-buy…", "info"))

        const buyRes = await fetch("/api/lazada/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.itemId,
            skuId: item.skuId,
            country: item.country,
            cookies: item.cookies,
            quantity: item.buyConfig.quantity,
            addToCartOnly: item.buyConfig.addToCartOnly,
          }),
        })

        const buyData = await buyRes.json()

        if (buyData.success) {
          const newStatus = item.buyConfig.addToCartOnly ? "added-to-cart" : "purchased"
          const buyDetail = buyData.orderId && buyData.orderId !== "SUCCESS"
            ? `${buyData.message} — Order ID: ${buyData.orderId}`
            : buyData.message
          stockLogs.push(
            makeLog(
              item.buyConfig.addToCartOnly ? "Added to cart" : "Purchase complete",
              "success",
              buyDetail
            )
          )
          patchItem(
            itemId,
            {
              status: newStatus,
              currentPrice: newPrice,
              lastChecked: new Date().toISOString(),
              checkCount: (item.checkCount ?? 0) + 1,
              title: item.title === "Loading..." ? product.title : item.title,
              imageUrl: item.imageUrl || product.imageUrl,
            },
            ...stockLogs
          )
        } else {
          stockLogs.push(makeLog("Auto-buy failed", "error", buyData.message))
          patchItem(
            itemId,
            {
              status: "in-stock",
              currentPrice: newPrice,
              lastChecked: new Date().toISOString(),
              checkCount: (item.checkCount ?? 0) + 1,
              title: item.title === "Loading..." ? product.title : item.title,
              imageUrl: item.imageUrl || product.imageUrl,
            },
            ...stockLogs
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error"
        patchItem(
          itemId,
          {
            status: "error",
            lastChecked: new Date().toISOString(),
            lastError: msg,
            checkCount: (item.checkCount ?? 0) + 1,
          },
          makeLog("Error during check", "error", msg)
        )
      } finally {
        setChecking((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [patchItem]
  )

  // ---------------------------------------------------------------------------
  // Polling loop: fires every 30 s, checks which items are due
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      for (const item of itemsRef.current) {
        if (item.status !== "monitoring") continue
        const last = item.lastChecked ? new Date(item.lastChecked).getTime() : 0
        const intervalMs = (item.buyConfig.checkIntervalMinutes ?? 5) * 60_000
        if (now - last >= intervalMs) {
          checkItem(item.id)
        }
      }
    }
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [checkItem])

  // ---------------------------------------------------------------------------
  // Add item
  // ---------------------------------------------------------------------------
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFUrlError("")

    const parsed = parseLazadaUrl(fUrl.trim())
    if (!parsed) {
      setFUrlError(
        "Could not parse product URL. Use a link like: https://www.lazada.com.ph/products/name-i123456-s789012.html"
      )
      return
    }

    setIsAdding(true)

    const newItem: MonitoredItem = {
      id: genId(),
      productUrl: fUrl.trim(),
      itemId: parsed.itemId,
      skuId: parsed.skuId,
      country: parsed.country,
      title: "Loading…",
      imageUrl: "",
      currentPrice: 0,
      currency: LAZADA_COUNTRIES[parsed.country].currency,
      buyConfig: {
        quantity: parseInt(fQuantity, 10) || 1,
        maxPrice: parseFloat(fMaxPrice) || 0,
        autoBuy: fAutoBuy,
        addToCartOnly: fCartOnly,
        checkIntervalMinutes: parseInt(fInterval, 10) || 5,
      },
      cookies: fCookies.trim(),
      status: "monitoring",
      checkCount: 0,
      createdAt: new Date().toISOString(),
      logs: [makeLog("Monitoring started", "info")],
    }

    setItems((prev) => [...prev, newItem])
    setFUrl("")
    setFCookies("")
    setActiveTab("watchlist")
    setIsAdding(false)

    // Trigger an immediate check after state settles
    setTimeout(() => checkItem(newItem.id), 400)
  }

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const togglePause = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        const next = it.status === "paused" ? "monitoring" : "paused"
        return {
          ...it,
          status: next,
          logs: [makeLog(next === "paused" ? "Monitoring paused" : "Monitoring resumed", "info"), ...it.logs],
        }
      })
    )
  }

  const toggleLogs = (id: string) =>
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------
  const activeCount = items.filter((i) => i.status === "monitoring").length
  const inStockCount = items.filter((i) => i.status === "in-stock").length
  const boughtCount = items.filter(
    (i) => i.status === "purchased" || i.status === "added-to-cart"
  ).length

  // All logs across items, sorted newest-first
  const allLogs = items
    .flatMap((i) => i.logs.map((l) => ({ ...l, itemTitle: i.title })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-orange-400" />
            Lazada Auto-Buy
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Monitor Lazada products and automatically add them to cart when restocked
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-blue-500/40 text-blue-400">
            {activeCount} monitoring
          </Badge>
          {inStockCount > 0 && (
            <Badge variant="outline" className="border-green-500/40 text-green-400">
              {inStockCount} in stock
            </Badge>
          )}
          {boughtCount > 0 && (
            <Badge variant="outline" className="border-teal-500/40 text-teal-400">
              {boughtCount} acquired
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="watchlist" className="data-[state=active]:bg-slate-800">
            Watchlist ({items.length})
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-slate-800">
            + Add Product
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-slate-800">
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* WATCHLIST TAB                                                       */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="watchlist" className="mt-4">
          {items.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-slate-300 font-medium mb-1">No products being monitored</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Add a Lazada product URL to start watching for restocks
                </p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("add")}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const sc = STATUS_CONFIG[item.status]
                const StatusIcon = sc.icon
                const isChecking = checking.has(item.id)
                const logsOpen = expandedLogs.has(item.id)

                return (
                  <Card key={item.id} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-slate-800"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <Package className="h-7 w-7 text-slate-600" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="text-slate-200 font-medium truncate max-w-md">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                                <span>{LAZADA_COUNTRIES[item.country].name}</span>
                                {item.currentPrice > 0 && (
                                  <span className="text-slate-300 font-medium">
                                    {item.currency} {item.currentPrice.toLocaleString()}
                                    {item.buyConfig.maxPrice > 0 && (
                                      <span className="text-slate-500 ml-1">
                                        / max {item.buyConfig.maxPrice.toLocaleString()}
                                      </span>
                                    )}
                                  </span>
                                )}
                                <span>Qty: {item.buyConfig.quantity}</span>
                                <span>Every {item.buyConfig.checkIntervalMinutes}m</span>
                                <span>Checked {item.checkCount}×</span>
                                <span>Last: {timeAgo(item.lastChecked)}</span>
                              </div>
                            </div>

                            {/* Status badge */}
                            <Badge
                              variant="outline"
                              className={cn("flex-shrink-0 text-xs", sc.color)}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {sc.label}
                            </Badge>
                          </div>

                          {/* Error message */}
                          {item.status === "error" && item.lastError && (
                            <p className="text-red-400 text-xs mt-1 truncate">{item.lastError}</p>
                          )}

                          {/* Cart / Orders links */}
                          {item.status === "added-to-cart" && (
                            <a
                              href={`https://www.${LAZADA_COUNTRIES[item.country].domain}/cart`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> Open Cart to Complete Checkout
                            </a>
                          )}
                          {item.status === "purchased" && (
                            <a
                              href={`https://www.${LAZADA_COUNTRIES[item.country].domain}/order/list`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View Order on Lazada
                            </a>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                              onClick={() => checkItem(item.id)}
                              disabled={isChecking || item.status === "paused"}
                            >
                              <RefreshCw
                                className={cn("h-3 w-3 mr-1", isChecking && "animate-spin")}
                              />
                              {isChecking ? "Checking…" : "Check Now"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-7 text-xs border-slate-700 hover:bg-slate-800",
                                item.status === "paused"
                                  ? "text-green-400"
                                  : "text-yellow-400"
                              )}
                              onClick={() => togglePause(item.id)}
                            >
                              {item.status === "paused" ? (
                                <>
                                  <Play className="h-3 w-3 mr-1" /> Resume
                                </>
                              ) : (
                                <>
                                  <Pause className="h-3 w-3 mr-1" /> Pause
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-slate-700 text-red-400 hover:bg-slate-800 hover:text-red-300"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-slate-500 hover:text-slate-300"
                              onClick={() => toggleLogs(item.id)}
                            >
                              {logsOpen ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" /> Hide Logs
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" /> Logs ({item.logs.length})
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Inline log viewer */}
                          {logsOpen && (
                            <ScrollArea className="mt-3 h-36 rounded border border-slate-800 bg-slate-950 p-2">
                              {item.logs.map((log) => (
                                <div key={log.id} className="flex gap-2 text-xs mb-1">
                                  <span className="text-slate-600 flex-shrink-0 w-20">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  <span className={cn("flex-1", LOG_COLOR[log.status])}>
                                    {log.action}
                                    {log.details && (
                                      <span className="text-slate-500 ml-1">— {log.details}</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </ScrollArea>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* ADD PRODUCT TAB                                                     */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="add" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200 text-lg">Add Product to Watchlist</CardTitle>
              <CardDescription>
                Paste a Lazada product URL and configure auto-buy settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-6">
                {/* Product URL */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    Lazada Product URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={fUrl}
                    onChange={(e) => { setFUrl(e.target.value); setFUrlError("") }}
                    placeholder="https://www.lazada.com.ph/products/name-i123456-s789012.html"
                    required
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  {fUrlError && <p className="text-red-400 text-xs">{fUrlError}</p>}
                  <p className="text-xs text-slate-500">
                    Supports lazada.com.ph, .sg, .my, .co.th, .co.id, .vn — copy the URL from your browser address bar
                  </p>
                </div>

                <Separator className="bg-slate-800" />

                {/* Session cookies */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">
                      Session Cookies{" "}
                      <span className="text-slate-500 font-normal">(required for auto-buy)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCookieHelp((v) => !v)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Info className="h-3 w-3" />
                      {showCookieHelp ? "Hide" : "How to get cookies"}
                    </button>
                  </div>

                  {showCookieHelp && (
                    <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-slate-300 space-y-1.5">
                      <p className="font-medium text-blue-300">Getting your session cookies:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400">
                        <li>Open Lazada in Chrome and log in to your account</li>
                        <li>Press <kbd className="bg-slate-700 px-1 rounded">F12</kbd> to open DevTools</li>
                        <li>Go to the <strong className="text-slate-300">Application</strong> tab → Cookies → <code>www.lazada.com.ph</code></li>
                        <li>
                          Or open the <strong className="text-slate-300">Console</strong> tab and run:
                          <code className="block bg-slate-800 rounded px-2 py-1 mt-1 select-all text-green-400">
                            copy(document.cookie)
                          </code>
                        </li>
                        <li>Paste the result into the field below</li>
                      </ol>
                      <p className="text-yellow-400 font-medium mt-1">
                        Warning: keep cookies private — they grant access to your account
                      </p>
                    </div>
                  )}

                  <textarea
                    value={fCookies}
                    onChange={(e) => setFCookies(e.target.value)}
                    placeholder="Paste your Lazada session cookies here (e.g. _gcl_au=...; lzd_cid=...)"
                    rows={3}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Leave empty to only monitor stock (no auto-buy)
                  </p>
                </div>

                <Separator className="bg-slate-800" />

                {/* Buy settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-300">Purchase Settings</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Quantity to buy</label>
                      <Select value={fQuantity} onValueChange={setFQuantity}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {[1, 2, 3, 5, 10].map((n) => (
                            <SelectItem key={n} value={String(n)} className="text-slate-200">
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Max price */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Max price (0 = no limit)</label>
                      <input
                        type="number"
                        min="0"
                        value={fMaxPrice}
                        onChange={(e) => setFMaxPrice(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>

                    {/* Check interval */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Check interval</label>
                      <Select value={fInterval} onValueChange={setFInterval}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {[
                            ["1", "Every 1 minute"],
                            ["2", "Every 2 minutes"],
                            ["5", "Every 5 minutes"],
                            ["10", "Every 10 minutes"],
                            ["15", "Every 15 minutes"],
                            ["30", "Every 30 minutes"],
                            ["60", "Every hour"],
                          ].map(([v, l]) => (
                            <SelectItem key={v} value={v} className="text-slate-200">
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="auto-buy"
                        checked={fAutoBuy}
                        onCheckedChange={(v) => setFAutoBuy(Boolean(v))}
                        className="border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 mt-0.5"
                      />
                      <div>
                        <label htmlFor="auto-buy" className="text-sm text-slate-300 cursor-pointer">
                          Auto-buy when restocked
                        </label>
                        <p className="text-xs text-slate-500">
                          Automatically trigger purchase as soon as stock is detected
                        </p>
                      </div>
                    </div>

                    {fAutoBuy && (
                      <div className="flex items-start gap-3 ml-6">
                        <Checkbox
                          id="cart-only"
                          checked={fCartOnly}
                          onCheckedChange={(v) => setFCartOnly(Boolean(v))}
                          className="border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 mt-0.5"
                        />
                        <div>
                          <label htmlFor="cart-only" className="text-sm text-slate-300 cursor-pointer">
                            Add to cart only
                          </label>
                          <p className="text-xs text-slate-500">
                            Checked — adds to cart so you review and pay manually (safer).
                            <br />
                            Unchecked — <span className="text-orange-400 font-medium">immediately purchases</span> using
                            your Lazada account&apos;s default delivery address and default saved payment method.
                            Requires a saved address and payment method on your Lazada account.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={isAdding || !fUrl.trim()}
                >
                  {isAdding ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Start Monitoring
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* ACTIVITY LOG TAB                                                    */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="logs" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200 text-lg">Activity Log</CardTitle>
              <CardDescription>All recent events across monitored products</CardDescription>
            </CardHeader>
            <CardContent>
              {allLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1">
                    {allLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-3 px-2 py-1.5 rounded hover:bg-slate-800/50 text-sm"
                      >
                        <span className="text-slate-600 text-xs w-36 flex-shrink-0 pt-0.5">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-500 text-xs mr-2 truncate">
                            [{log.itemTitle}]
                          </span>
                          <span className={cn("text-xs", LOG_COLOR[log.status])}>
                            {log.action}
                          </span>
                          {log.details && (
                            <span className="text-slate-500 text-xs ml-1">— {log.details}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Lazada Auto-Buy: types, URL parsing, stock checking, and cart operations

export type LazadaCountry = "ph" | "sg" | "my" | "th" | "id" | "vn"

export const LAZADA_COUNTRIES: Record<LazadaCountry, { name: string; domain: string; currency: string }> = {
  ph: { name: "Philippines", domain: "lazada.com.ph", currency: "PHP" },
  sg: { name: "Singapore", domain: "lazada.com.sg", currency: "SGD" },
  my: { name: "Malaysia", domain: "lazada.com.my", currency: "MYR" },
  th: { name: "Thailand", domain: "lazada.co.th", currency: "THB" },
  id: { name: "Indonesia", domain: "lazada.co.id", currency: "IDR" },
  vn: { name: "Vietnam", domain: "lazada.vn", currency: "VND" },
}

export interface LazadaProduct {
  itemId: string
  skuId: string
  title: string
  price: number
  currency: string
  inStock: boolean
  stockCount: number
  imageUrl: string
  seller: string
  productUrl: string
}

export interface BuyConfig {
  quantity: number
  maxPrice: number // 0 = no limit
  autoBuy: boolean // trigger purchase when restocked
  addToCartOnly: boolean // true = add to cart; false = attempt buy-now
  checkIntervalMinutes: number
}

export type MonitorStatus =
  | "monitoring"
  | "in-stock"
  | "purchased"
  | "added-to-cart"
  | "error"
  | "paused"

export interface ActivityLog {
  id: string
  timestamp: string
  action: string
  status: "info" | "success" | "warning" | "error"
  details?: string
}

export interface MonitoredItem {
  id: string
  productUrl: string
  itemId: string
  skuId: string
  country: LazadaCountry
  title: string
  imageUrl: string
  currentPrice: number
  currency: string
  buyConfig: BuyConfig
  cookies: string
  status: MonitorStatus
  lastChecked?: string
  lastError?: string
  checkCount: number
  createdAt: string
  logs: ActivityLog[]
}

// ---------------------------------------------------------------------------
// URL parser
// ---------------------------------------------------------------------------

export function parseLazadaUrl(
  url: string
): { itemId: string; skuId: string; country: LazadaCountry } | null {
  let country: LazadaCountry = "ph"
  for (const [code, info] of Object.entries(LAZADA_COUNTRIES)) {
    if (url.includes(info.domain)) {
      country = code as LazadaCountry
      break
    }
  }

  // Most common format: .../products/name-i{itemId}-s{skuId}.html
  const withSku = url.match(/-i(\d+)-s(\d+)\.html/)
  if (withSku) return { itemId: withSku[1], skuId: withSku[2], country }

  // Without skuId: .../products/name-i{itemId}.html
  const withoutSku = url.match(/-i(\d+)\.html/)
  if (withoutSku) return { itemId: withoutSku[1], skuId: "", country }

  return null
}

// ---------------------------------------------------------------------------
// Stock checker — runs server-side to avoid CORS
// ---------------------------------------------------------------------------

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_UA,
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
}

export async function checkLazadaStock(
  itemId: string,
  skuId: string,
  country: LazadaCountry,
  cookies?: string,
  productUrl?: string
): Promise<LazadaProduct> {
  const { domain } = LAZADA_COUNTRIES[country]
  const baseUrl = `https://www.${domain}`

  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    Referer: `${baseUrl}/`,
  }
  if (cookies) headers.Cookie = cookies

  // Build a usable page URL
  const url =
    productUrl ||
    (skuId
      ? `${baseUrl}/products/item-i${itemId}-s${skuId}.html`
      : `${baseUrl}/products/item-i${itemId}.html`)

  const response = await fetch(url, { headers, redirect: "follow" })

  if (!response.ok) {
    throw new Error(`Lazada returned HTTP ${response.status} for product page`)
  }

  const html = await response.text()
  return parseProductFromHtml(html, itemId, skuId, url)
}

// ---------------------------------------------------------------------------
// HTML / JSON parsing helpers
// ---------------------------------------------------------------------------

function parseProductFromHtml(
  html: string,
  itemId: string,
  skuId: string,
  productUrl: string
): LazadaProduct {
  let jsonData: Record<string, unknown> = {}

  // Lazada embeds product data in various window.* globals
  const jsonPatterns = [
    /window\.__INIT_DATA__\s*=\s*(\{[\s\S]+?\})\s*;?\s*<\/script>/,
    /window\.__json_init_data__\s*=\s*(\{[\s\S]+?\})\s*;?\s*<\/script>/,
    /"pdpDataMain"\s*:\s*(\{[\s\S]+?\}),\s*"pdpCorePlatform"/,
    /window\.pageData\s*=\s*(\{[\s\S]+?\})\s*;?\s*<\/script>/,
  ]
  for (const pattern of jsonPatterns) {
    const match = html.match(pattern)
    if (match) {
      try {
        jsonData = JSON.parse(match[1])
        break
      } catch {
        // continue trying other patterns
      }
    }
  }

  const title = extractTitle(html, jsonData)
  const { price, currency } = extractPrice(html, jsonData)
  const { inStock, stockCount } = extractStock(html, jsonData)
  const imageUrl = extractImage(html, jsonData)
  const seller = extractSeller(html, jsonData)

  return { itemId, skuId, title, price, currency, inStock, stockCount, imageUrl, seller, productUrl }
}

function extractTitle(html: string, data: Record<string, unknown>): string {
  // Try JSON paths first
  const fromJson =
    (data as any)?.productName ??
    (data as any)?.result?.name ??
    (data as any)?.data?.name ??
    (data as any)?.productInfo?.subject
  if (fromJson) return String(fromJson)

  const patterns = [
    /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*itemprop="name"[^>]*>([^<]+)<\/h1>/,
    /"name"\s*:\s*"([^"]{5,})"/,
    /<title>([^|<]+)/,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1].trim()
  }
  return "Unknown Product"
}

function extractPrice(
  html: string,
  data: Record<string, unknown>
): { price: number; currency: string } {
  const fromJson =
    (data as any)?.priceInfo?.price ??
    (data as any)?.skuInfos?.[0]?.price ??
    (data as any)?.result?.price
  if (fromJson !== undefined) {
    return {
      price: parseFloat(String(fromJson).replace(/[^0-9.]/g, "")),
      currency: (data as any)?.currency ?? "PHP",
    }
  }

  const priceMatch =
    html.match(/"price"\s*:\s*"([\d.]+)"/) ||
    html.match(/class="[^"]*price[^"]*"[^>]*>[^\d]*([\d,]+(?:\.\d+)?)/)
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 0

  let currency = "PHP"
  if (html.includes("SGD") || html.includes("S$")) currency = "SGD"
  else if (html.includes("MYR") || html.includes("RM ")) currency = "MYR"
  else if (html.includes("Rp ")) currency = "IDR"
  else if (html.includes("฿")) currency = "THB"
  else if (html.includes("₫")) currency = "VND"

  return { price, currency }
}

function extractStock(
  html: string,
  data: Record<string, unknown>
): { inStock: boolean; stockCount: number } {
  const qty = (data as any)?.skuInfos?.[0]?.quantity ?? (data as any)?.result?.quantity
  if (qty !== undefined) {
    const n = parseInt(String(qty), 10)
    return { inStock: n > 0, stockCount: n }
  }

  const outSignals = [
    /out[\s-]?of[\s-]?stock/i,
    /sold[\s-]?out/i,
    /"availability"\s*:\s*"OutOfStock"/,
    /class="[^"]*out-of-stock[^"]*"/i,
    /"inStock"\s*:\s*false/,
  ]
  const inSignals = [
    /add-to-cart/i,
    /"availability"\s*:\s*"InStock"/,
    /"inStock"\s*:\s*true/,
    />Add to Cart</i,
    />Buy Now</i,
  ]

  for (const s of outSignals) if (s.test(html)) return { inStock: false, stockCount: 0 }
  for (const s of inSignals) if (s.test(html)) return { inStock: true, stockCount: 1 }

  return { inStock: false, stockCount: 0 }
}

function extractImage(html: string, data: Record<string, unknown>): string {
  const fromJson =
    (data as any)?.productImage?.images?.[0] ??
    (data as any)?.result?.image ??
    (data as any)?.imageUrl
  if (fromJson) return String(fromJson)

  const m =
    html.match(/"image"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|png|webp)[^"]*)"/) ||
    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)
  return m?.[1] ?? ""
}

function extractSeller(html: string, data: Record<string, unknown>): string {
  const fromJson =
    (data as any)?.seller?.name ??
    (data as any)?.sellerName ??
    (data as any)?.result?.sellerName
  if (fromJson) return String(fromJson)

  const m = html.match(/sellerName["'\s]*:\s*["']([^"']+)["']/)
  return m?.[1] ?? "Unknown Seller"
}

// ---------------------------------------------------------------------------
// Add-to-cart — requires valid session cookies
// ---------------------------------------------------------------------------

export async function addToCart(
  itemId: string,
  skuId: string,
  quantity: number,
  country: LazadaCountry,
  cookies: string
): Promise<{ success: boolean; message: string; cartUrl?: string }> {
  const { domain } = LAZADA_COUNTRIES[country]
  const baseUrl = `https://www.${domain}`

  const body = new URLSearchParams({
    itemId: String(itemId),
    skuId: String(skuId),
    quantity: String(quantity),
  })

  let response: Response
  try {
    response = await fetch(`${baseUrl}/cart/addToCart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": BROWSER_UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: cookies,
        Referer: `${baseUrl}/`,
        Origin: baseUrl,
        "x-requested-with": "XMLHttpRequest",
      },
      body: body.toString(),
    })
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Network error contacting Lazada cart",
    }
  }

  let data: Record<string, unknown> = {}
  try {
    data = await response.json()
  } catch {
    // non-JSON response
  }

  if (response.status === 401 || response.status === 403) {
    return { success: false, message: "Authentication failed — please refresh your session cookies." }
  }

  const ok =
    (data?.success === true) ||
    (data?.code === "0") ||
    (Array.isArray(data?.ret) && String((data.ret as string[])[0]).startsWith("0::"))

  if (ok) {
    return { success: true, message: "Item added to cart successfully", cartUrl: `${baseUrl}/cart` }
  }

  return {
    success: false,
    message: String(data?.message ?? data?.error ?? `HTTP ${response.status}: ${response.statusText}`),
  }
}

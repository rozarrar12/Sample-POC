import { NextRequest, NextResponse } from "next/server"
import { checkLazadaStock, type LazadaCountry } from "@/lib/lazada"

export async function POST(request: NextRequest) {
  let body: {
    productUrl?: string
    itemId?: string
    skuId?: string
    country?: LazadaCountry
    cookies?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { productUrl, itemId, skuId, country = "ph", cookies } = body

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 })
  }

  try {
    const product = await checkLazadaStock(
      itemId,
      skuId ?? "",
      country,
      cookies,
      productUrl
    )
    return NextResponse.json({ product })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check stock"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

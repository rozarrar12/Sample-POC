import { NextRequest, NextResponse } from "next/server"
import { addToCart, buyNow, type LazadaCountry } from "@/lib/lazada"

export async function POST(request: NextRequest) {
  let body: {
    itemId?: string
    skuId?: string
    country?: LazadaCountry
    cookies?: string
    quantity?: number
    addToCartOnly?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    itemId,
    skuId = "",
    country = "ph",
    cookies = "",
    quantity = 1,
    addToCartOnly = true,
  } = body

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 })
  }
  if (!cookies) {
    return NextResponse.json({ error: "Session cookies are required to purchase" }, { status: 400 })
  }

  if (addToCartOnly) {
    // Simple add-to-cart — no checkout
    const result = await addToCart(itemId, skuId, quantity, country, cookies)
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: result.message, cartUrl: result.cartUrl })
  }

  // Full immediate purchase: add to cart → checkout → place order
  const result = await buyNow(itemId, skuId, quantity, country, cookies)
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.message, cartUrl: result.cartUrl },
      { status: 500 }
    )
  }
  return NextResponse.json({
    success: true,
    message: result.message,
    orderId: result.orderId,
  })
}

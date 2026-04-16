import { NextRequest, NextResponse } from "next/server"
import { addToCart, type LazadaCountry } from "@/lib/lazada"

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

  // For this POC, both "add to cart" and "buy now" use the add-to-cart flow.
  // A full buy-now would require the checkout + payment API, which varies by account.
  const result = await addToCart(itemId, skuId, quantity, country, cookies)

  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: addToCartOnly
      ? result.message
      : `${result.message} — visit cart to complete checkout`,
    cartUrl: result.cartUrl,
  })
}

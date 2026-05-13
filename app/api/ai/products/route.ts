import { auth } from "@clerk/nextjs/server"

type IncomingBody = {
  mimeType?: unknown
  dataBase64?: unknown
  context?: unknown
}

type ParsedProduct = {
  name: string
  price: number
  stock: number
}

type GeminiPart = { text?: string }
type GeminiCandidate = { content?: { parts?: GeminiPart[] } }
type GeminiError = { message?: string }
type GeminiResponse = {
  candidates?: GeminiCandidate[]
  error?: GeminiError
}

const nameKey = (name: string) => name.trim().toLocaleLowerCase()

const extractJsonObjectText = (text: string) => {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim()
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 })
  }

  const preferredModel = (process.env.GEMINI_MODEL ?? "").trim()
  const fallbackModels = ["gemini-2.5-flash-lite", "gemini-2.5-flash"]
  const modelsToTry = [preferredModel, ...fallbackModels].filter(Boolean)

  const body = (await request.json().catch(() => null)) as IncomingBody | null
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : ""
  const dataBase64 = typeof body?.dataBase64 === "string" ? body.dataBase64.trim() : ""
  const context = typeof body?.context === "string" ? body.context.trim() : ""

  if (!mimeType) return Response.json({ error: "mimeType is required" }, { status: 400 })
  if (!dataBase64) return Response.json({ error: "file data is required" }, { status: 400 })

  const prompt = [
    "You are an assistant that extracts product data for a POS system.",
    "Return ONLY valid JSON (no markdown, no extra text).",
    'Schema: {"products":[{"name":string,"price":number,"stock":number}]}',
    "Rules:",
    "- name must be concise and unique if possible.",
    "- price and stock must be numbers. If missing, use 0.",
    "- Do not include description or extra fields.",
    context ? `User context/instructions:\n${context}` : "",
    "Extract products from the attached file.",
  ]
    .filter(Boolean)
    .join("\n\n")

  let geminiData: GeminiResponse | null = null

  let lastError = "Gemini request failed"

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: dataBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    })

    geminiData = (await res.json().catch(() => null)) as GeminiResponse | null

    if (res.ok) {
      lastError = ""
      break
    }

    const msg =
      typeof geminiData?.error?.message === "string"
        ? geminiData.error.message
        : "Gemini request failed"
    lastError = msg

    const isNotFound = msg.includes("not found") || msg.includes("NOT_FOUND")
    if (!isNotFound) break
  }

  if (lastError) {
    return Response.json({ error: lastError }, { status: 500 })
  }

  const text = (geminiData?.candidates?.[0]?.content?.parts ?? [])
    .map((p: GeminiPart) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim()

  if (!text) return Response.json({ error: "No response from Gemini" }, { status: 500 })

  const tryParse = (raw: string) => {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }

  const parsed = tryParse(text) ?? tryParse(extractJsonObjectText(text) ?? "")
  const productsRaw = (parsed as { products?: unknown })?.products
  const productsArr = Array.isArray(productsRaw) ? productsRaw : []

  const normalized: ParsedProduct[] = productsArr
    .map((p) => {
      const name = typeof (p as { name?: unknown })?.name === "string" ? (p as { name: string }).name.trim() : ""
      const price = typeof (p as { price?: unknown })?.price === "number"
        ? (p as { price: number }).price
        : Number((p as { price?: unknown })?.price)
      const stock = typeof (p as { stock?: unknown })?.stock === "number"
        ? (p as { stock: number }).stock
        : Number((p as { stock?: unknown })?.stock)
      return {
        name,
        price: Number.isFinite(price) ? price : 0,
        stock: Number.isFinite(stock) ? stock : 0,
      }
    })
    .filter((p) => p.name)

  const unique: ParsedProduct[] = []
  const seen = new Set<string>()
  for (const p of normalized) {
    const key = nameKey(p.name)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(p)
  }

  return Response.json({ products: unique })
}

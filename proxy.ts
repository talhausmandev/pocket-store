import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])
const isCreateStoreRoute = createRouteMatcher(["/create-store(.*)"])
const isStoreApiRoute = createRouteMatcher(["/api/store(.*)"])

export default clerkMiddleware(async (auth, req) => {
  
  if (isPublicRoute(req)) return

  await auth.protect()
  const pathname = req.nextUrl.pathname

  if (isStoreApiRoute(req)) return

  const res = await fetch(new URL("/api/store", req.url), {
    headers: { cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  }).catch(() => null)

  const data = await res?.json().catch(() => null)
  const hasStore = !!data?.hasStore

  if (isCreateStoreRoute(req)) {
    if (hasStore) return NextResponse.redirect(new URL("/", req.url))
    return
  }


  if (!hasStore) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Store not set up" }, { status: 403 })
    }
    return NextResponse.redirect(new URL("/create-store", req.url))
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

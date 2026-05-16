import Link from "next/link"
import { Home, LogIn, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
 
export default function NotFound() {
  return (
    <main className="w-full min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border bg-background p-3">
            <SearchX className="size-6 text-muted-foreground" />
          </div>

          <div className="flex-1">
            <div className="text-sm text-muted-foreground">404</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Page not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page you’re looking for doesn’t exist, or the link is incorrect.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/">
                  <Home />
                  Go home
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sign-in">
                  <LogIn />
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

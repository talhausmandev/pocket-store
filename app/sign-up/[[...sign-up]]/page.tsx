import Image from "next/image"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { SignUp } from "@clerk/nextjs"

export default async function Page() {
  const { userId } = await auth()
  if (userId) redirect("/")

  return (
    <main className="relative min-h-dvh w-full bg-gradient-to-br from-primary/10 via-background to-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/pocket-store-logo.png" alt="Pocket Store" width={56} height={56} priority />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
            <p className="text-sm text-muted-foreground">Sign up to start managing your store.</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" />
        </div>
      </div>
    </main>
  )
}

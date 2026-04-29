"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Plus,
  Users,
  MoreHorizontal,
} from "lucide-react"

const navItems = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "More", href: "/more", icon: MoreHorizontal },
]

export function BottomNavbar() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 w-full max-w-md z-50">
      <div className="flex items-center justify-between px-6 py-3 bg-[#fdfaf6]">

        {/* LEFT ITEMS */}
        {navItems.slice(0, 2).map((item, i) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={i}
              href={item.href}
              className="flex flex-col items-center text-xs"
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-orange-600" : "text-muted-foreground"
                }`}
              />
              <span
                className={`mt-1 ${
                  isActive ? "text-orange-600" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </span>
            </Link>
          )
        })}

        {/* CENTER BUTTON */}
        <Link href="/invoices/create-invoice" className="h-12 w-12 flex items-center justify-center rounded-full bg-orange-500 text-white shadow-md -mt-8 border-4 border-[#fdfaf6]">
          <Plus className="h-6 w-6" />
        </Link>

        {/* RIGHT ITEMS */}
        {navItems.slice(2).map((item, i) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={i}
              href={item.href}
              className="flex flex-col items-center text-xs"
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-orange-600" : "text-muted-foreground"
                }`}
              />
              <span
                className={`mt-1 ${
                  isActive ? "text-orange-600" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
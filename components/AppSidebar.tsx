import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"

import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Database,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

const menuItems = [
  { title: "Dashboard", link: "/", icon: LayoutDashboard },
  { title: "Invoices", link: "/invoices", icon: FileText },
  { title: "Clients", link: "/clients", icon: Users },
  { title: "Products / Services", link: "/products", icon: Package },
  { title: "Payments", link: "/", icon: CreditCard },
  { title: "Reports", link: "/reports", icon: BarChart3 },
  { title: "AI", link: "/ai", icon: Sparkles },
]

export function AppSidebar() {
  return (
    <Sidebar className="w-64 border-r bg-background">
      {/* Header */}
      <SidebarHeader className="px-4 py-6 bg-[#fdd996]">
        <div className="text-xl font-semibold flex gap-5">
          Pocket Store
          </div>
        <p className="text-sm text-muted-foreground">
          Organize. Create. Get Paid.
        </p>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <Link 
                href={item.link}
                key={index}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-[#fdd996] transition"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 cursor-pointer text-sm hover:bg-[#fdd996] transition">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Settings
          </button>

          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 cursor-pointer text-sm hover:bg-[#fdd996] transition">
            <Database className="h-5 w-5 text-muted-foreground" />
            Backup & Restore
          </button>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 text-xs text-muted-foreground">
        Good invoices build strong business.
      </SidebarFooter>
    </Sidebar>
  )
}

"use client"
import { useCallback, useState } from "react"
import type React from "react"
import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Building2, Users, Menu, X, LogOut, ChevronRight, BarChart2 as Graphs } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"

interface SimpleAdminLayoutProps {
  children: React.ReactNode
}

export function SimpleAdminLayout({ children }: SimpleAdminLayoutProps) {
  const location = useLocation()
  const pathname = location.pathname
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/components/admin/dashboard" },
    { icon: Building2, label: "Businesses", href: "/components/admin/businesses" },
    { icon: Graphs, label: "Analytics", href: "/components/admin/Analytics" },

    { icon: Users, label: "Users", href: "/components/admin/users" },
  ]

  const NavLinks = useCallback(() => (
    <>
      {navItems.map((item, index) => (
        <motion.div
          key={item.href}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <Link
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-all duration-300 group",
              pathname === item.href 
                ? "bg-gradient-to-r from-orange-100 to-orange-50 text-orange-600 font-medium shadow-sm" 
                : "text-gray-600 hover:bg-gray-50 hover:text-orange-500",
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <item.icon 
              size={20} 
              className={cn(
                "transition-transform duration-300",
                pathname === item.href ? "scale-110" : "group-hover:scale-110"
              )} 
            />
            <span>{item.label}</span>
            <ChevronRight 
              size={18} 
              className={cn(
                "ml-auto transition-all duration-300",
                pathname === item.href ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
              )} 
            />
          </Link>
        </motion.div>
      ))}
    </>
  ), [pathname])

  const handleLogout = useCallback(() => {
    window.location.href = "/login"
  }, [])

  return (
    <div className="w-full flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar - Fixed */}
      <div className="hidden md:flex flex-col w-72 bg-white border-r border-gray-200 fixed top-0 left-0 h-full p-6">
        <div className="mb-10 pt-14 pb-3 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
        </div>

        <nav className="space-y-3 flex-1">
          <NavLinks />
        </nav>

        <div className="mt-auto pb-0 pt-5 border-t border-gray-200">
          <Button
            variant="ghost"
            className="w-full flex items-center gap-3 justify-between text-red-600 hover:text-white hover:bg-gradient-to-r from-red-500 to-rose-500 px-4 py-3 transition-all duration-300 rounded-lg group text-base"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 group-hover:animate-pulse" />
              <span>Logout</span>
            </div>
            <ChevronRight 
              size={18} 
              className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" 
            />
          </Button>
        </div>
      </div>

      {/* Mobile Navbar - Fixed */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-full hover:bg-orange-50 hover:text-orange-600"
        >
          <Menu size={24} />
        </Button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetContent 
              side="left" 
              className="w-72 p-0"
              onInteractOutside={() => setIsMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b">
                  <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-full hover:bg-orange-50 hover:text-orange-600"
                  >
                    <X size={24} />
                  </Button>
                </div>
                <div className="p-4 flex-1">
                  <nav className="space-y-3">
                    <NavLinks />
                  </nav>
                </div>
                <div className="p-4 sticky bottom-0 bg-white">
                  <Button
                    variant="ghost"
                    className="w-full flex items-center gap-3 justify-between text-red-600 hover:text-white hover:bg-gradient-to-r from-red-500 to-rose-500 px-4 py-3 transition-all duration-300 rounded-lg group text-base"
                    onClick={handleLogout}
                    aria-label="Logout"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5 group-hover:animate-pulse" />
                      <span>Logout</span>
                    </div>
                    <ChevronRight 
                      size={18} 
                      className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" 
                    />
                  </Button>
                </div>
              </motion.div>
            </SheetContent>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Main Content - Scrollable with proper offset */}
      <div className="flex-1 md:ml-72 mt-0 md:mt-0 overflow-auto">
        <div className="md:p-8 p-4 pt-20 md:pt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[calc(100vh-6rem)] p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
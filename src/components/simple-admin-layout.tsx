"use client"
import { useCallback, useState, useEffect } from "react"
import type React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Building2, Users, Menu, X, LogOut, Star, User, BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { signOut, onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/firebase/firebase"
import { doc, getDoc } from "firebase/firestore"

interface SimpleAdminLayoutProps {
  children: React.ReactNode
}

export function SimpleAdminLayout({ children }: SimpleAdminLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists() && userDoc.data()?.role === "admin") {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
            navigate("/login")
          }
        } catch (error) {
          console.error("Error checking admin status:", error)
          navigate("/login")
        }
      } else {
        setIsAdmin(false)
        navigate("/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Building2, label: "Businesses", href: "/admin/businesses" },
    { icon: BarChart2, label: "Analytics", href: "/admin/analytics" },
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: User, label: "Profile", href: "/admin/profile" },
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-4 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-4 border-r-purple-600 rounded-full animate-spin animation-delay-150"></div>
          </div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Redirect is already handled in useEffect
  }

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "relative flex items-center gap-5 px-5 py-4 rounded-xl text-lg transition-all duration-300 group",
            pathname === item.href 
              ? "text-orange-600 font-semibold bg-orange-50/80" 
              : "text-gray-600 hover:text-gray-900",
          )}
          onClick={() => setIsMobileMenuOpen(false)}
          onMouseEnter={() => setHoveredItem(item.href)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r from-orange-100/50 to-transparent rounded-xl -z-10 transition-all duration-500",
            pathname === item.href ? "opacity-100" : "opacity-0",
            hoveredItem === item.href && pathname !== item.href ? "opacity-50" : ""
          )} />
          
          <div className={cn(
            "relative transition-all duration-300",
            pathname === item.href ? "scale-110" : "group-hover:scale-105"
          )}>
            <item.icon size={24} className="shrink-0" />
            {pathname === item.href && (
              <span className="absolute -bottom-1 left-1/2 w-1.5 h-1.5 bg-orange-600 rounded-full -translate-x-1/2"></span>
            )}
          </div>
          
          <span className={cn(
            "transition-all duration-300",
            pathname === item.href ? "translate-x-1" : "group-hover:translate-x-1"
          )}>
            {item.label}
          </span>
          
          {hoveredItem === item.href && (
            <span className="absolute inset-0 rounded-xl shadow-[inset_0_0_12px_rgba(249,115,22,0.3)] pointer-events-none"></span>
          )}
        </Link>
      ))}
    </>
  )

  const handleLogout = useCallback(() => {
    signOut(auth).then(() => {
      navigate("/login")
    }).catch((error) => {
      console.error("Logout error:", error)
    })
  }, [navigate])

  return (
    <div className="w-full flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col w-80 bg-white/95 backdrop-blur-sm border-r border-gray-200/80 h-screen fixed left-0 top-0 p-6 transition-all duration-300 shadow-lg">
        <div className="flex items-center justify-center mb-12 pt-4">
          <div className="relative group">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 blur opacity-0 group-hover:opacity-30 transition-opacity duration-500 -z-10"></div>
          </div>
        </div>

        <nav className="space-y-3 flex-grow">
          <NavLinks />
        </nav>

        <div className="mt-16 mb-6">
          <Button
            variant="ghost"
            className="w-full flex items-center gap-4 justify-start text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-amber-500 px-5 py-4 transition-all duration-300 rounded-xl group shadow-sm text-lg"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <div className="relative">
              <LogOut className="h-6 w-6 transition-all duration-300 group-hover:rotate-12" />
              <span className="absolute -inset-1 rounded-full bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
            </div>
            <span className="font-medium transition-all duration-300 group-hover:translate-x-1">
              Logout
            </span>
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
          className="hover:bg-gray-100 transition-all"
        >
          <Menu size={28} className="text-gray-600" />
        </Button>
      </div>

      {/* Mobile Menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0 flex flex-col bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-200/80">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              className="hover:bg-gray-100 transition-all"
            >
              <X size={28} className="text-gray-600" />
            </Button>
          </div>
          <div className="flex-grow p-5 overflow-y-auto">
            <nav className="space-y-3">
              <NavLinks />
            </nav>
          </div>
          <div className="p-5 border-t border-gray-200/80 mt-6">
            <Button
              variant="ghost"
              className="w-full flex items-center gap-4 justify-start text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-amber-500 px-5 py-4 transition-all duration-300 rounded-xl group shadow-sm text-lg"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-6 w-6 transition-all duration-300 group-hover:rotate-12" />
              <span className="font-medium transition-all duration-300 group-hover:translate-x-1">
                Logout
              </span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 md:ml-80 overflow-y-auto h-screen scroll-smooth">
        <div className="md:p-10 p-5 pt-24 md:pt-10 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
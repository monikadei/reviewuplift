"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"
import { Users, Star, MessageSquare, Building2, Badge, TrendingUp, Activity } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, query, where, doc } from "firebase/firestore"
import { db, auth } from "@/firebase/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useNavigate } from "react-router-dom"

interface BusinessUser {
  uid: string
  displayName: string
  email: string
  createdAt: Date
  businessName?: string
  role: string
  status: string
}

interface Review {
  rating: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalReviews: 0,
    averageRating: 0,
    totalUsers: 0,
  })

  const [recentLogins, setRecentLogins] = useState<BusinessUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists() && userDoc.data()?.role === "admin") {
            setIsAdmin(true)
            fetchData()
          } else {
            navigate("/login")
          }
        } catch (error) {
          console.error("Error checking admin status:", error)
          navigate("/login")
        }
      } else {
        navigate("/login")
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const usersCollection = collection(db, "users")
      const [allUsersSnapshot, businessUsersSnapshot] = await Promise.all([
        getDocs(usersCollection),
        getDocs(query(usersCollection, where("role", "==", "BUSER"))),
      ])

      const allUsers: BusinessUser[] = allUsersSnapshot.docs.map((userDoc) => {
        const userData = userDoc.data()
        return {
          uid: userDoc.id,
          displayName: userData.displayName || "Unknown",
          email: userData.email || "No email",
          createdAt: userData.createdAt?.toDate() || new Date(),
          businessName: userData.businessInfo?.businessName,
          role: userData.role || "BUSER",
          status: userData.status || "Pending",
        }
      })

      const businessUsers: BusinessUser[] = businessUsersSnapshot.docs.map((userDoc) => {
        const userData = userDoc.data()
        return {
          uid: userDoc.id,
          displayName: userData.displayName || "Unknown",
          email: userData.email || "No email",
          createdAt: userData.createdAt?.toDate() || new Date(),
          businessName: userData.businessInfo?.businessName,
          role: userData.role,
          status: userData.status || "Pending",
        }
      })

      const reviewPromises = businessUsers.map(async (user) => {
        const reviewsCollection = collection(db, "users", user.uid, "reviews")
        const reviewsSnapshot = await getDocs(reviewsCollection)
        return {
          userId: user.uid,
          reviews: reviewsSnapshot.docs.map((doc) => doc.data() as Review),
          count: reviewsSnapshot.size,
        }
      })

      const reviewsData = await Promise.all(reviewPromises)

      let totalRating = 0
      let reviewCount = 0

      reviewsData.forEach(({ reviews }) => {
        reviewCount += reviews.length
        totalRating += reviews.reduce((sum, review) => sum + (review.rating || 0), 0)
      })

      const averageRating = reviewCount > 0 ? Number.parseFloat((totalRating / reviewCount).toFixed(1)) : 0

      const sortedUsers = [...businessUsers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5)

      setStats({
        totalBusinesses: businessUsers.length,
        totalReviews: reviewCount,
        averageRating,
        totalUsers: allUsers.length,
      })

      setRecentLogins(sortedUsers)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }

  if (authLoading) {
    return (
      <SimpleAdminLayout>
        <div className="flex justify-center items-center h-screen bg-gray-50">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-4 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-4 border-r-purple-600 rounded-full animate-spin animation-delay-150"></div>
            </div>
            <p className="mt-4 text-gray-600">Verifying access...</p>
          </div>
        </div>
      </SimpleAdminLayout>
    )
  }

  if (!isAdmin) {
    return null // Redirect is handled in useEffect
  }

  if (loading) {
    return (
      <SimpleAdminLayout>
        <div className="flex justify-center items-center h-screen bg-gray-50">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-4 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-4 border-r-purple-600 rounded-full animate-spin animation-delay-150"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </SimpleAdminLayout>
    )
  }

  const statsData = [
    {
      title: "Total Businesses",
      value: stats.totalBusinesses,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconBg: "bg-blue-500",
      change: "+12%",
    },
    {
      title: "Total Reviews",
      value: stats.totalReviews,
      icon: MessageSquare,
      color: "text-emerald-600",
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconBg: "bg-emerald-500",
      change: "+8%",
    },
    {
      title: "Average Rating",
      value: stats.averageRating,
      icon: Star,
      color: "text-amber-600",
      bg: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconBg: "bg-amber-500",
      change: "+0.2",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-gradient-to-br from-purple-50 to-purple-100",
      iconBg: "bg-purple-500",
      change: "+15%",
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <SimpleAdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="space-y-8 p-6">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                    Dashboard Overview
                  </h1>
                  <p className="text-slate-600 mt-2 text-lg">
                    Welcome back! Here's what's happening with your platform
                  </p>
                </div>
                <div className="hidden md:flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-600 font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {statsData.map((stat, index) => (
              <motion.div key={index} variants={item}>
                <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className={`absolute inset-0 ${stat.bg} opacity-60`}></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>

                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        {stat.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-emerald-600 font-medium flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`p-3 rounded-xl ${stat.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </CardHeader>

                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-slate-800 mb-2">{stat.value}</div>
                    <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${stat.iconBg.replace("bg-", "from-")} to-white rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: "75%" }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Recent Registrations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800">Recent Business Registrations</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">Latest businesses that joined your platform</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{recentLogins.length} New</Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {recentLogins.map((login, index) => (
                    <motion.div
                      key={login.uid}
                      className="group p-6 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50/30 transition-all duration-300"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                                index % 4 === 0
                                  ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                  : index % 4 === 1
                                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                    : index % 4 === 2
                                      ? "bg-gradient-to-r from-purple-500 to-purple-600"
                                      : "bg-gradient-to-r from-amber-500 to-amber-600"
                              }`}
                            >
                              {(login.businessName || login.displayName).charAt(0).toUpperCase()}
                            </div>
                            <div
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                login.status === "Active"
                                  ? "bg-green-500"
                                  : login.status === "Pending"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                            ></div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                              {login.businessName || "Unnamed Business"}
                            </h3>
                            <p className="text-sm text-slate-600">{login.displayName}</p>
                            <p className="text-xs text-slate-500">{login.email}</p>
                          </div>
                        </div>

                        <div className="text-right space-y-2">
                          <div className="text-sm text-slate-600 font-medium">{formatTimeAgo(login.createdAt)}</div>
                          <Badge
                            className={`${
                              login.status === "Active"
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : login.status === "Pending"
                                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                            } transition-colors`}
                          >
                            {login.status}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </SimpleAdminLayout>
  )
}
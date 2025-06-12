"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Check,
  FolderOpen,
  MailOpen,
  Phone,
  Search,
  Star,
  Trash2,
  MapPin,
  CreditCard,
  Globe,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import Sidebar from "@/components/sidebar"
import ConfirmDialog from "@/components/confirm-dialog"
import type { Review } from "@/lib/types"
import { collection, query, getDocs, doc, deleteDoc, updateDoc, orderBy, limit, getDoc } from "firebase/firestore"
import { auth, db } from "@/firebase/firebase"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { onAuthStateChanged } from "firebase/auth"
import { useNavigate } from "react-router-dom"

const renderStars = (rating: number) => (
  <div className="flex text-yellow-500" aria-label={`${rating} out of 5 stars`}>
    {[...Array(5)].map((_, index) =>
      index < rating ? (
        <motion.div
          key={index}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
        >
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 drop-shadow-sm" aria-hidden="true" />
        </motion.div>
      ) : (
        <Star key={index} className="h-4 w-4 text-gray-300" aria-hidden="true" />
      ),
    )}
  </div>
)

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "Google":
      return <Globe className="h-4 w-4 text-blue-500" />
    case "internal":
      return <MailOpen className="h-4 w-4 text-gray-500" />
    default:
      return <MailOpen className="h-4 w-4 text-gray-500" />
  }
}

export default function BusinessReviews() {
  const router = useNavigate()
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterOption, setFilterOption] = useState("All")
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<any>(null)
  const [trialInfo, setTrialInfo] = useState<any>(null)
  const [reviewsLimit, setReviewsLimit] = useState<number | null>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [reviewsCount, setReviewsCount] = useState(0)
  const [userPlan, setUserPlan] = useState<any>(null)
  const [activeBranches, setActiveBranches] = useState<string[]>([])

  const fetchUserData = useCallback(async (user: any) => {
    try {
      const userRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserPlan(userData)

        // Get active branches
        const businessInfo = userData.businessInfo || {}
        const branches = businessInfo.branches || []
        const activeBranchNames = branches
          .filter((branch: any) => branch.isActive !== false)
          .map((branch: any) => branch.name)
        setActiveBranches(activeBranchNames)

        if (userData.subscriptionPlan) {
          setSubscriptionPlan(userData.subscriptionPlan)

          switch (userData.subscriptionPlan.toLowerCase()) {
            case "starter":
            case "plan_basic":
              setReviewsLimit(100)
              break
            case "professional":
            case "plan_pro":
              setReviewsLimit(500)
              break
            case "enterprise":
            case "plan_premium":
            case "custom":
              setReviewsLimit(0)
              break
            default:
              setReviewsLimit(100)
          }
        }

        if (userData.trialActive) {
          const now = new Date()
          const trialEnd = userData.trialEndDate?.toDate()
          const trialDaysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

          setTrialInfo({
            active: true,
            daysLeft: trialDaysLeft > 0 ? trialDaysLeft : 0,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }, [])

  const fetchReviews = useCallback(async () => {
    if (!currentUser || reviewsLimit === null) return

    try {
      let reviewsQuery = query(collection(db, "users", currentUser.uid, "reviews"), orderBy("createdAt", "desc"))

      if (reviewsLimit > 0) {
        reviewsQuery = query(reviewsQuery, limit(reviewsLimit))
      }

      const querySnapshot = await getDocs(reviewsQuery)

      const reviewsData: Review[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = data.createdAt ? data.createdAt.toDate() : null

        // Show all reviews regardless of branch status
        // But still track active branches for filtering
        reviewsData.push({
          id: doc.id,
          name: data.name || "Anonymous",
          email: data.email || "",
          phone: data.phone || "",
          branchname: data.branchname || "",
          message: data.review || data.message || "",
          rating: data.rating || 0,
          date: createdAt ? format(createdAt, "MMM d, yyyy") : "Unknown date",
          replied: data.replied || false,
          status: data.status || "pending",
          platform: data.platform || "internal",
          reviewType: data.reviewType || "internal",
        })
      })

      setReviews(reviewsData)
      setReviewsCount(reviewsData.length)

      if (reviewsLimit > 0 && reviewsData.length >= reviewsLimit) {
        setShowUpgradePrompt(true)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    }
  }, [currentUser, reviewsLimit])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        await fetchUserData(user)
      } else {
        setCurrentUser(null)
        router("/login")
      }
    })

    return () => unsubscribe()
  }, [fetchUserData, router])

  useEffect(() => {
    if (currentUser && reviewsLimit !== null) {
      fetchReviews()
    }
  }, [currentUser, reviewsLimit, fetchReviews])

  const formatPlanName = (plan?: string) => {
    if (!plan) return "Free Trial"
    const planMap: Record<string, string> = {
      plan_basic: "Basic",
      plan_pro: "Pro",
      plan_premium: "Premium",
      starter: "Basic",
      professional: "Pro",
      custom: "Premium",
    }
    return planMap[plan] || plan
  }

  const handleDeleteReview = async () => {
    if (!reviewToDelete || !currentUser) return

    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "reviews", reviewToDelete.id))
      setReviews(reviews.filter((review) => review.id !== reviewToDelete.id))
      setReviewsCount((prev) => prev - 1)

      if (reviewsLimit && reviewsCount - 1 < reviewsLimit) {
        setShowUpgradePrompt(false)
      }
    } catch (error) {
      console.error("Error deleting review:", error)
    } finally {
      setReviewToDelete(null)
    }
  }

  const handleToggleReply = async (id: string) => {
    if (!currentUser) return

    try {
      const reviewRef = doc(db, "users", currentUser.uid, "reviews", id)
      const review = reviews.find((r) => r.id === id)

      if (review) {
        await updateDoc(reviewRef, {
          replied: !review.replied,
        })

        setReviews(reviews.map((review) => (review.id === id ? { ...review, replied: !review.replied } : review)))
      }
    } catch (error) {
      console.error("Error toggling reply status:", error)
    }
  }

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesSearch =
        review.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.branchname?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter =
        filterOption === "All" ||
        (filterOption === "Above 3" && review.rating > 3) ||
        (filterOption === "Below 3" && review.rating <= 3) ||
        (filterOption === "Replied" && review.replied) ||
        (filterOption === "Not Replied" && !review.replied) ||
        (filterOption === "Google Reviews" && review.platform === "Google") ||
        (filterOption === "Internal" && review.platform === "internal")

      return matchesSearch && matchesFilter
    })
  }, [reviews, searchTerm, filterOption])

  const renderPlanDetails = () => {
    if (!userPlan) return null

    const planKey = userPlan.subscriptionPlan || userPlan.plan
    const planName = formatPlanName(planKey)

    const usageText =
      reviewsLimit === 0
        ? `Review usage: ${reviewsCount} (Unlimited)`
        : `Review usage: ${reviewsCount} / ${reviewsLimit}`

    return (
      <motion.div
        className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 border border-orange-200/50 rounded-2xl p-6 mb-6 shadow-lg backdrop-blur-sm"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <motion.div
              className="flex items-center gap-3 mb-2"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {planName} Plan
              </h3>
            </motion.div>
            <motion.p
              className="text-gray-700 font-medium"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {usageText}
            </motion.p>
            {trialInfo?.active && trialInfo.daysLeft !== undefined && (
              <motion.p
                className="text-sm text-orange-600 mt-1 font-medium"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                ⏰ {trialInfo.daysLeft} days left in trial
              </motion.p>
            )}
          </div>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Button
              onClick={() => window.location.assign("/#pricing")}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6 py-2.5 rounded-xl font-semibold"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {userPlan.subscriptionActive ? "Manage Plan" : "Upgrade Plan"}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-red-50/30">
      <Sidebar />
      <div className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="flex flex-col md:flex-row md:items-center md:justify-between mb-6"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          >
            <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
                Customer Reviews
              </h1>
              <p className="text-gray-600 font-medium">Manage and respond to your customer feedback</p>
            </motion.div>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative group">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                <Input
                  type="search"
                  placeholder="Search reviews..."
                  className="w-full sm:w-[250px] pl-10 border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-400 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterOption} onValueChange={setFilterOption}>
                <SelectTrigger className="w-[180px] border-gray-200 focus:ring-2 focus:ring-orange-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                  <SelectItem value="All">All Reviews</SelectItem>
                  <SelectItem value="Above 3">Rating Above 3</SelectItem>
                  <SelectItem value="Below 3">Rating Below 3</SelectItem>
                  <SelectItem value="Replied">Replied</SelectItem>
                  <SelectItem value="Not Replied">Not Replied</SelectItem>
                  <SelectItem value="Google Reviews">Google Reviews</SelectItem>
                  <SelectItem value="Internal">Internal Reviews</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          </motion.div>

          {renderPlanDetails()}

          {showUpgradePrompt && (
            <motion.div
              className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-6 rounded-2xl shadow-lg"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            >
              <div className="flex items-start">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  <CreditCard className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                </motion.div>
                <div className="ml-4">
                  <p className="text-amber-800 font-medium">
                    🚀 You've reached your monthly review limit ({reviewsCount}/{reviewsLimit}).
                    <button
                      onClick={() => window.location.assign("/#pricing")}
                      className="ml-2 font-bold text-amber-900 hover:underline hover:text-amber-700 transition-colors"
                    >
                      Upgrade your plan
                    </button>{" "}
                    to unlock unlimited reviews and premium features.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {filteredReviews.length === 0 ? (
              <motion.div
                className="bg-white/80 backdrop-blur-sm p-12 rounded-2xl border border-gray-200/50 text-center shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-6" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-3 text-gray-700">No reviews found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchTerm
                    ? "Try adjusting your search or filters to find what you're looking for"
                    : "Start collecting reviews from your customers to see them here"}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredReviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    className="group bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95, height: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 100,
                    }}
                    whileHover={{
                      scale: 1.01,
                      transition: { duration: 0.2 },
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {review.replied && (
                      <motion.div
                        className="absolute right-4 top-4 z-10"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                          delay: 0.3,
                        }}
                      >
                        <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-2 rounded-full shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </motion.div>
                    )}

                    <div className="relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <motion.div
                            className="flex items-center gap-3 mb-2"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                              {review.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-800 text-lg">{review.name}</div>
                              <div className="text-gray-500 text-sm font-medium">{review.date}</div>
                            </div>
                            {review.platform === "Google" && (
                              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 font-medium">
                                <div className="flex items-center gap-1.5">
                                  {getPlatformIcon(review.platform)}
                                  <span>Google Review</span>
                                </div>
                              </Badge>
                            )}
                          </motion.div>
                          <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            {renderStars(review.rating)}
                          </motion.div>
                        </div>
                      </div>

                      <motion.div
                        className="text-gray-700 py-3 text-base leading-relaxed bg-gray-50/50 rounded-xl p-4 border border-gray-100 mb-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {review.message}
                      </motion.div>

                      <motion.div
                        className="flex gap-3 mb-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        {review.branchname && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all duration-300 hover:scale-110"
                                aria-label="View branch"
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3 border border-orange-200 shadow-xl rounded-xl">
                              <p className="text-sm font-medium">{review.branchname}</p>
                            </PopoverContent>
                          </Popover>
                        )}

                        {review.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all duration-300 hover:scale-110"
                            aria-label="Send email"
                            onClick={() => window.open(`mailto:${review.email}`, "_blank")}
                          >
                            <MailOpen className="h-4 w-4" />
                          </Button>
                        )}

                        {review.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all duration-300 hover:scale-110"
                            aria-label="Make phone call"
                            onClick={() => window.open(`tel:${review.phone}`, "_blank")}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>

                      <motion.div
                        className="flex justify-end items-center pt-3 border-t border-gray-100"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 hover:bg-emerald-50 rounded-xl transition-all duration-300 hover:scale-110"
                                aria-label="Toggle reply status"
                              >
                                <Check className={`h-4 w-4 ${review.replied ? "text-emerald-600" : "text-gray-400"}`} />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 border border-emerald-200 shadow-xl rounded-xl">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                onClick={() => handleToggleReply(review.id)}
                              >
                                {review.replied ? "Unmark as replied" : "Mark as replied"}
                              </Button>
                            </PopoverContent>
                          </Popover>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300 hover:scale-110"
                                aria-label="Delete review"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 border border-red-200 shadow-xl rounded-xl">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setReviewToDelete(review)}
                                className="rounded-lg"
                              >
                                Delete
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <ConfirmDialog
            isOpen={!!reviewToDelete}
            onClose={() => setReviewToDelete(null)}
            onConfirm={handleDeleteReview}
            title="Delete Review"
            description={`Are you sure you want to delete the review from ${reviewToDelete?.name}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
          />
        </div>
      </div>
    </div>
  )
}

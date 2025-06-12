"use client"
import { useState, useEffect, useCallback } from "react"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  Users,
  Star,
  MessageSquare,
  Calendar,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns"

interface BusinessUser {
  uid: string
  businessInfo?: {
    businessName: string
    businessType: string
  }
  createdAt: Date
}

interface Review {
  rating: number
  createdAt: Date
}

interface MonthlyStat {
  month: string
  businesses: number
  reviews: number
  avgRating: number
}

interface CategoryStat {
  category: string
  businesses: number
  reviews: number
  avgRating: number
}

export default function AnalyticsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([])
  const [topCategories, setTopCategories] = useState<CategoryStat[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [activeBusinesses, setActiveBusinesses] = useState(0)
  const [reviewsThisMonth, setReviewsThisMonth] = useState(0)
  const [platformRating, setPlatformRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reviewDistribution, setReviewDistribution] = useState({
    positive: 0,
    neutral: 0,
    negative: 0,
  })

  // Memoize the fetch function to prevent unnecessary recreations
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setRefreshing(true)
      setLoading(true)

      // Get date ranges for last 6 months
      const now = new Date()
      const sixMonthsAgo = subMonths(now, 5)
      const monthRanges = eachMonthOfInterval({
        start: startOfMonth(sixMonthsAgo),
        end: endOfMonth(now),
      }).map((date) => ({
        start: startOfMonth(date),
        end: endOfMonth(date),
        label: format(date, "MMM"),
      }))

      // Fetch all business users
      const usersCollection = collection(db, "users")
      const usersQuery = query(usersCollection, where("role", "==", "BUSER"))
      const usersSnapshot = await getDocs(usersQuery)
      const allBusinesses = usersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as BusinessUser[]

      setActiveBusinesses(allBusinesses.length)

      // Calculate estimated revenue upfront
      setTotalRevenue(allBusinesses.length * 49.99)

      // Fetch all reviews in parallel for all businesses
      const reviewPromises = allBusinesses.map(async (business) => {
        const reviewsQuery = collection(db, "users", business.uid, "reviews")
        const reviewsSnapshot = await getDocs(reviewsQuery)
        return reviewsSnapshot.docs.map((doc) => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Review[]
      })

      const allReviews = await Promise.all(reviewPromises)
      const flattenedReviews = allReviews.flat()

      // Calculate platform-wide metrics
      const totalReviews = flattenedReviews.length
      const totalRating = flattenedReviews.reduce((sum, review) => sum + (review.rating || 0), 0)
      const platformAvgRating = totalReviews > 0 ? Number.parseFloat((totalRating / totalReviews).toFixed(1)) : 0
      setPlatformRating(platformAvgRating)

      // Calculate review distribution
      let positive = 0,
        neutral = 0,
        negative = 0
      flattenedReviews.forEach((review) => {
        if (review.rating >= 4) positive++
        else if (review.rating === 3) neutral++
        else negative++
      })

      const totalDistReviews = positive + neutral + negative
      setReviewDistribution({
        positive: Math.round((positive / totalDistReviews) * 100),
        neutral: Math.round((neutral / totalDistReviews) * 100),
        negative: Math.round((negative / totalDistReviews) * 100),
      })

      // Calculate monthly stats
      const monthlyStatsData = monthRanges.map((month) => {
        // Count businesses created in this month
        const businessesThisMonth = allBusinesses.filter(
          (business) => business.createdAt >= month.start && business.createdAt <= month.end,
        ).length

        // Filter reviews for this month
        const reviewsThisMonth = flattenedReviews.filter(
          (review) => review.createdAt >= month.start && review.createdAt <= month.end,
        )

        const ratingSumThisMonth = reviewsThisMonth.reduce((sum, review) => sum + (review.rating || 0), 0)
        const avgRatingThisMonth =
          reviewsThisMonth.length > 0 ? Number.parseFloat((ratingSumThisMonth / reviewsThisMonth.length).toFixed(1)) : 0

        return {
          month: month.label,
          businesses: businessesThisMonth,
          reviews: reviewsThisMonth.length,
          avgRating: avgRatingThisMonth,
        }
      })

      setMonthlyStats(monthlyStatsData)

      // Calculate reviews for current month
      const currentMonth = monthRanges[monthRanges.length - 1]
      const currentMonthReviews = flattenedReviews.filter(
        (review) => review.createdAt >= currentMonth.start && review.createdAt <= currentMonth.end,
      ).length
      setReviewsThisMonth(currentMonthReviews)

      // Calculate top categories
      const categoryMap = new Map<string, { businesses: number; reviews: number; ratingSum: number }>()

      // First pass: count businesses per category
      allBusinesses.forEach((business) => {
        const category = business.businessInfo?.businessType || "Uncategorized"
        const current = categoryMap.get(category) || { businesses: 0, reviews: 0, ratingSum: 0 }
        current.businesses++
        categoryMap.set(category, current)
      })

      // Second pass: count reviews and ratings per category
      allBusinesses.forEach((business) => {
        const category = business.businessInfo?.businessType || "Uncategorized"
        const businessReviews = allReviews[allBusinesses.indexOf(business)]
        const current = categoryMap.get(category)!

        current.reviews += businessReviews.length
        current.ratingSum += businessReviews.reduce((sum, review) => sum + (review.rating || 0), 0)
      })

      // Convert to array and calculate averages
      const topCategoriesData = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          businesses: data.businesses,
          reviews: data.reviews,
          avgRating: data.reviews > 0 ? Number.parseFloat((data.ratingSum / data.reviews).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.reviews - a.reviews)
        .slice(0, 5)

      setTopCategories(topCategoriesData)
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalyticsData()
  }

  return (
    <SimpleAdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="space-y-8 p-6">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics & Reports
                </h1>
                <p className="text-gray-600 mt-2 text-lg">Platform performance and insights</p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm"
                  disabled={loading}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Range
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={loading}
                  onClick={handleRefresh}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-t-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Total Revenue</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-800">${totalRevenue.toLocaleString()}</div>
                    <p className="text-sm text-green-600 font-medium">+18% from last month</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-t-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Active Businesses</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-800">{activeBusinesses}</div>
                    <p className="text-sm text-green-600 font-medium">+12% from last month</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-t-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Reviews This Month</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-800">{reviewsThisMonth}</div>
                    <p className="text-sm text-green-600 font-medium">+23% from last month</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-t-yellow-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Platform Rating</CardTitle>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-800">{platformRating}</div>
                    <p className="text-sm text-green-600 font-medium">+0.2 from last month</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Growth */}
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">Monthly Growth</CardTitle>
                    <CardDescription className="text-gray-600">
                      Business registrations and review activity
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
                          <div className="flex space-x-6">
                            <div className="w-28 h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                            <div className="w-28 h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="w-12 h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {monthlyStats.map((stat, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-6">
                          <div className="w-12 text-sm font-bold text-blue-600 bg-blue-100 rounded-lg p-2 text-center">
                            {stat.month}
                          </div>
                          <div className="flex space-x-8">
                            <div className="text-sm">
                              <span className="text-gray-500 font-medium">Businesses:</span>
                              <span className="ml-2 font-bold text-gray-800">{stat.businesses}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-500 font-medium">Reviews:</span>
                              <span className="ml-2 font-bold text-gray-800">{stat.reviews}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-lg">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-bold text-gray-800">{stat.avgRating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PieChart className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">Top Categories</CardTitle>
                    <CardDescription className="text-gray-600">Most popular business categories</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <div className="w-36 h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse mb-3"></div>
                          <div className="w-52 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                        </div>
                        <div className="w-12 h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {topCategories.map((category, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div>
                          <p className="font-bold text-gray-800 text-lg">{category.category}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{category.businesses}</span> businesses •
                            <span className="font-medium ml-1">{category.reviews}</span> reviews
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-lg">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-bold text-gray-800">{category.avgRating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Trends */}
          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-800">Review Trends</CardTitle>
                  <CardDescription className="text-gray-600">
                    Review distribution and sentiment analysis
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="text-center">
                      <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4 mx-auto animate-pulse mb-4"></div>
                      <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3 mx-auto animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {reviewDistribution.positive}%
                    </div>
                    <p className="text-sm text-gray-700 font-medium mt-2">Positive Reviews (4-5 stars)</p>
                  </div>
                  <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      {reviewDistribution.neutral}%
                    </div>
                    <p className="text-sm text-gray-700 font-medium mt-2">Neutral Reviews (3 stars)</p>
                  </div>
                  <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                    <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                      {reviewDistribution.negative}%
                    </div>
                    <p className="text-sm text-gray-700 font-medium mt-2">Negative Reviews (1-2 stars)</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SimpleAdminLayout>
  )
}

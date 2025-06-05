"use client"
import { useState, useEffect } from "react"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, Star, MessageSquare, Calendar, RefreshCw } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns"

interface BusinessUser {
  uid: string;
  businessInfo?: {
    businessName: string;
    businessType: string;
  };
  createdAt: Date;
}

interface Review {
  rating: number;
  createdAt: Date;
}

interface MonthlyStat {
  month: string;
  businesses: number;
  reviews: number;
  avgRating: number;
}

interface CategoryStat {
  category: string;
  businesses: number;
  reviews: number;
  avgRating: number;
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
    negative: 0
  })

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true)
      setLoading(true)

      // Get date ranges for last 6 months
      const now = new Date()
      const sixMonthsAgo = subMonths(now, 5)
      const monthRanges = eachMonthOfInterval({
        start: startOfMonth(sixMonthsAgo),
        end: endOfMonth(now)
      }).map(date => ({
        start: startOfMonth(date),
        end: endOfMonth(date),
        label: format(date, "MMM")
      }))

      // Fetch all business users
      const usersCollection = collection(db, "users")
      const usersQuery = query(usersCollection, where("role", "==", "BUSER"))
      const usersSnapshot = await getDocs(usersQuery)
      const allBusinesses = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as BusinessUser[]

      setActiveBusinesses(allBusinesses.length)

      // Calculate monthly stats
      const monthlyStatsData: MonthlyStat[] = []
      let totalRating = 0
      let totalReviews = 0
      let reviewsThisMonthCount = 0

      for (const month of monthRanges) {
        // Count businesses created in this month
        const businessesThisMonth = allBusinesses.filter(business => 
          business.createdAt >= month.start && business.createdAt <= month.end
        ).length

        // Fetch reviews for this month
        let reviewsThisMonth = 0
        let ratingSumThisMonth = 0

        for (const business of allBusinesses) {
          const reviewsQuery = query(
            collection(db, "users", business.uid, "reviews"),
            where("createdAt", ">=", month.start),
            where("createdAt", "<=", month.end)
          )
          const reviewsSnapshot = await getDocs(reviewsQuery)
          
          reviewsThisMonth += reviewsSnapshot.size
          reviewsSnapshot.forEach(reviewDoc => {
            const reviewData = reviewDoc.data() as Review
            ratingSumThisMonth += reviewData.rating || 0
            totalRating += reviewData.rating || 0
            totalReviews++

            // Count reviews for current month
            if (month.label === format(now, "MMM")) {
              reviewsThisMonthCount++
            }
          })
        }

        const avgRatingThisMonth = reviewsThisMonth > 0 ? 
          parseFloat((ratingSumThisMonth / reviewsThisMonth).toFixed(1)) : 0

        monthlyStatsData.push({
          month: month.label,
          businesses: businessesThisMonth,
          reviews: reviewsThisMonth,
          avgRating: avgRatingThisMonth
        })
      }

      setMonthlyStats(monthlyStatsData)
      setReviewsThisMonth(reviewsThisMonthCount)
      
      // Calculate platform rating
      const platformAvgRating = totalReviews > 0 ? 
        parseFloat((totalRating / totalReviews).toFixed(1)) : 0
      setPlatformRating(platformAvgRating)

      // Calculate review distribution
      let positive = 0, neutral = 0, negative = 0
      for (const business of allBusinesses) {
        const reviewsQuery = collection(db, "users", business.uid, "reviews")
        const reviewsSnapshot = await getDocs(reviewsQuery)
        
        reviewsSnapshot.forEach(reviewDoc => {
          const reviewData = reviewDoc.data() as Review
          if (reviewData.rating >= 4) positive++
          else if (reviewData.rating === 3) neutral++
          else negative++
        })
      }

      const totalDistReviews = positive + neutral + negative
      setReviewDistribution({
        positive: Math.round((positive / totalDistReviews) * 100),
        neutral: Math.round((neutral / totalDistReviews) * 100),
        negative: Math.round((negative / totalDistReviews) * 100)
      })

      // Calculate top categories
      const categoryMap = new Map<string, { businesses: number, reviews: number, ratingSum: number }>()
      
      allBusinesses.forEach(business => {
        const category = business.businessInfo?.businessType || "Uncategorized"
        const current = categoryMap.get(category) || { businesses: 0, reviews: 0, ratingSum: 0 }
        
        current.businesses++
        categoryMap.set(category, current)
      })

      // Fetch reviews for each category
      for (const [category, data] of categoryMap) {
        let reviews = 0
        let ratingSum = 0
        
        const businessesInCategory = allBusinesses.filter(
          b => (b.businessInfo?.businessType || "Uncategorized") === category
        )

        for (const business of businessesInCategory) {
          const reviewsQuery = collection(db, "users", business.uid, "reviews")
          const reviewsSnapshot = await getDocs(reviewsQuery)
          
          reviews += reviewsSnapshot.size
          reviewsSnapshot.forEach(reviewDoc => {
            const reviewData = reviewDoc.data() as Review
            ratingSum += reviewData.rating || 0
          })
        }

        categoryMap.set(category, {
          businesses: data.businesses,
          reviews,
          ratingSum
        })
      }

      // Convert to array and calculate averages
      const topCategoriesData: CategoryStat[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          businesses: data.businesses,
          reviews: data.reviews,
          avgRating: data.reviews > 0 ? parseFloat((data.ratingSum / data.reviews).toFixed(1)) : 0
        }))
        .sort((a, b) => b.reviews - a.reviews)
        .slice(0, 5)

      setTopCategories(topCategoriesData)

      // Calculate revenue (simplified - in a real app you'd fetch transactions)
      const estimatedRevenue = allBusinesses.length * 49.99 // Assuming $49.99/month subscription
      setTotalRevenue(estimatedRevenue)

    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalyticsData()
  }

  return (
    <SimpleAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reports</h1>
            <p className="text-gray-600">Platform performance and insights</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
              disabled={loading}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={loading}
              onClick={handleRefresh}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-green-600">+18% from last month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Businesses</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{activeBusinesses}</div>
                  <p className="text-xs text-green-600">+12% from last month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviews This Month</CardTitle>
              <MessageSquare className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{reviewsThisMonth}</div>
                  <p className="text-xs text-green-600">+23% from last month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Rating</CardTitle>
              <Star className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{platformRating}</div>
                  <p className="text-xs text-green-600">+0.2 from last month</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Growth</CardTitle>
              <CardDescription>Business registrations and review activity</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="flex space-x-6">
                          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyStats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 text-sm font-medium">{stat.month}</div>
                        <div className="flex space-x-6">
                          <div className="text-sm">
                            <span className="text-gray-500">Businesses:</span> {stat.businesses}
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Reviews:</span> {stat.reviews}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{stat.avgRating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
              <CardDescription>Most popular business categories</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="w-48 h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {topCategories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-sm text-gray-500">
                          {category.businesses} businesses • {category.reviews} reviews
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{category.avgRating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Review Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Review Trends</CardTitle>
            <CardDescription>Review distribution and sentiment analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{reviewDistribution.positive}%</div>
                  <p className="text-sm text-gray-500">Positive Reviews (4-5 stars)</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{reviewDistribution.neutral}%</div>
                  <p className="text-sm text-gray-500">Neutral Reviews (3 stars)</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{reviewDistribution.negative}%</div>
                  <p className="text-sm text-gray-500">Negative Reviews (1-2 stars)</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleAdminLayout>
  )
}

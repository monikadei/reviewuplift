"use client"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, Star, MessageSquare, Calendar } from "lucide-react"

export default function AnalyticsPage() {
  const monthlyStats = [
    { month: "Jan", businesses: 45, reviews: 234, avgRating: 4.2 },
    { month: "Feb", businesses: 52, reviews: 289, avgRating: 4.3 },
    { month: "Mar", businesses: 61, reviews: 356, avgRating: 4.1 },
    { month: "Apr", businesses: 68, reviews: 423, avgRating: 4.4 },
    { month: "May", businesses: 74, reviews: 467, avgRating: 4.3 },
    { month: "Jun", businesses: 82, reviews: 521, avgRating: 4.5 },
  ]

  const topCategories = [
    { category: "Restaurants", businesses: 45, reviews: 1234, avgRating: 4.3 },
    { category: "Technology", businesses: 23, reviews: 567, avgRating: 4.6 },
    { category: "Beauty & Wellness", businesses: 34, reviews: 890, avgRating: 4.2 },
    { category: "Automotive", businesses: 18, reviews: 345, avgRating: 4.4 },
    { category: "Retail", businesses: 29, reviews: 678, avgRating: 4.1 },
  ]

  return (
    <SimpleAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reports</h1>
            <p className="text-gray-600">Platform performance and insights</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700">Export Report</Button>
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
              <div className="text-2xl font-bold">$24,567</div>
              <p className="text-xs text-green-600">+18% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Businesses</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-green-600">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviews This Month</CardTitle>
              <MessageSquare className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">521</div>
              <p className="text-xs text-green-600">+23% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Rating</CardTitle>
              <Star className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.5</div>
              <p className="text-xs text-green-600">+0.2 from last month</p>
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
            </CardContent>
          </Card>

          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
              <CardDescription>Most popular business categories</CardDescription>
            </CardHeader>
            <CardContent>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">78%</div>
                <p className="text-sm text-gray-500">Positive Reviews (4-5 stars)</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">15%</div>
                <p className="text-sm text-gray-500">Neutral Reviews (3 stars)</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">7%</div>
                <p className="text-sm text-gray-500">Negative Reviews (1-2 stars)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleAdminLayout>
  )
}

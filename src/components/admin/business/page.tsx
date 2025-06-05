"use client"
import { useState, useEffect } from "react"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Star } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { format } from "date-fns"

interface BusinessUser {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Date;
  businessName: string;
  businessType: string; // Changed from businesstype to businessType
  status: string;
  rating: number;
  reviewCount: number;
}

export default function BusinessesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState<BusinessUser[]>([])

  // Fetch business users from Firestore
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const usersCollection = collection(db, "users")
        const usersSnapshot = await getDocs(usersCollection)
        
        const businessesData: BusinessUser[] = []
        
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data()
          
          // Only include business users
          if (userData.role !== "BUSER") continue
          
          const createdAt = userData.createdAt?.toDate() || new Date()
          const businessInfo = userData.businessInfo || {}
          
          // Fetch reviews to calculate rating
          const reviewsCollection = collection(db, "users", userDoc.id, "reviews")
          const reviewsSnapshot = await getDocs(reviewsCollection)
          
          let totalRating = 0
          let reviewCount = 0
          
          reviewsSnapshot.forEach(reviewDoc => {
            const reviewData = reviewDoc.data()
            totalRating += reviewData.rating || 0
            reviewCount++
          })
          
          const averageRating = reviewCount > 0 ? 
            parseFloat((totalRating / reviewCount).toFixed(1)) : 0
          
          businessesData.push({
            uid: userDoc.id,
            displayName: userData.displayName || "Unknown Owner",
            email: userData.email || "No email",
            createdAt,
            businessName: businessInfo.businessName || "Unnamed Business",
            // Use businessType field with correct casing
            businessType: businessInfo.businessType || "Uncategorized",
            status: userData.status || "Pending",
            rating: averageRating,
            reviewCount
          })
        }
        
        setBusinesses(businessesData)
      } catch (error) {
        console.error("Error fetching businesses:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchBusinesses()
  }, [])

  const filteredBusinesses = businesses.filter(
    (business) =>
      business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // Search includes businessType instead of businesstype
      business.businessType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 shadow-sm hover:shadow-green-200 transition-shadow"
      case "Pending":
        return "bg-yellow-100 text-yellow-800 shadow-sm hover:shadow-yellow-200 transition-shadow"
      case "Suspended":
        return "bg-red-100 text-red-800 shadow-sm hover:shadow-red-200 transition-shadow"
      default:
        return "bg-gray-100 text-gray-800 shadow-sm"
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <SimpleAdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="animate-slide-down">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Business Management
          </h1>
          <p className="text-gray-600 mt-1">Manage all registered businesses</p>
        </div>

        <Card className="border-orange-200 shadow-lg transition-all hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-orange-50 to-white rounded-t-lg">
            <CardTitle className="text-xl font-bold text-orange-800">All Businesses</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-orange-400" />
              <Input
                placeholder="Search businesses..."
                className="pl-8 border-orange-200 focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-orange-200 h-12 w-12"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-orange-200 rounded w-64"></div>
                    <div className="h-4 bg-orange-200 rounded w-56"></div>
                  </div>
                </div>
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-1">No businesses found</h3>
                <p className="max-w-md">
                  {searchQuery 
                    ? "No businesses match your search. Try different keywords." 
                    : "No businesses registered yet. New businesses will appear here once they sign up."}
                </p>
              </div>
            ) : (
              <Table className="rounded-lg overflow-hidden">
                <TableHeader className="bg-orange-50">
                  <TableRow className="hover:bg-orange-50">
                    <TableHead className="font-bold text-orange-800">Business Name</TableHead>
                    <TableHead className="font-bold text-orange-800">Owner</TableHead>
                    <TableHead className="font-bold text-orange-800">Business Type</TableHead>
                    <TableHead className="font-bold text-orange-800">Rating</TableHead>
                    <TableHead className="font-bold text-orange-800">Status</TableHead>
                    <TableHead className="font-bold text-orange-800">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses.map((business) => (
                    <TableRow 
                      key={business.uid} 
                      className="border-b border-orange-100 hover:bg-orange-50 transition-all duration-200 ease-in-out"
                    >
                      <TableCell className="font-medium group">
                        <span className="group-hover:text-orange-600 transition-colors">
                          {business.businessName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{business.displayName}</p>
                          <p className="text-sm text-gray-500 group-hover:text-orange-500 transition-colors">
                            {business.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                          {/* Display businessType instead of businesstype */}
                          {business.businessType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-semibold">{business.rating}</span>
                          <span className="text-xs text-gray-500">({business.reviewCount})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getStatusColor(business.status)} transition-all hover:scale-105 cursor-pointer`}
                        >
                          {business.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {format(business.createdAt, "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleAdminLayout>
  )
}
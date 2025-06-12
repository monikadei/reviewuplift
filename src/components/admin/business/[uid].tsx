"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Star,
  FileText,
  Mail,
  Phone,
  Globe,
  MapPin,
  Link,
  Crown,
  Zap,
  Sparkles,
  Building2,
  Calendar,
  Users,
} from "lucide-react"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { format } from "date-fns"
import { useNavigate, useParams } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"

interface Branch {
  name: string
  location: string
  googleReviewLink?: string
}

interface BusinessInfo {
  businessName: string
  contactEmail: string
  contactPhone: string
  whatsapp: string
  secondaryEmail: string
  facebook: string
  instagram: string
  linkedin: string
  website: string
  description: string
  businessType: string
  branchCount: string
  customBusinessType: string
  googleReviewLink: string
  branches: Branch[]
  lastUpdated: any
  subscriptionPlan?: string
  subscriptionStatus?: string
  subscriptionEndDate?: any
}

interface BusinessDetails {
  businessInfo: BusinessInfo | null
  displayName: string
  email: string
  uid: string
  createdAt: Date
  rating: number
  reviewCount: number
  status: string
}

export default function BusinessDetailsPage() {
  const { uid } = useParams()
  const router = useNavigate()
  const [business, setBusiness] = useState<BusinessDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        if (!uid) return

        const userDocRef = doc(db, "users", uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const businessInfo = userData.businessInfo || null

          const reviewsCollection = collection(db, "users", userDoc.id, "reviews")
          const reviewsSnapshot = await getDocs(reviewsCollection)

          let totalRating = 0
          let reviewCount = 0

          reviewsSnapshot.forEach((reviewDoc) => {
            const reviewData = reviewDoc.data()
            totalRating += reviewData.rating || 0
            reviewCount++
          })

          const averageRating = reviewCount > 0 ? Number.parseFloat((totalRating / reviewCount).toFixed(1)) : 0

          setBusiness({
            businessInfo,
            displayName: userData.displayName || "Unknown Owner",
            email: userData.email || "No email",
            uid: userDoc.id,
            createdAt: userData.createdAt?.toDate?.() || new Date(),
            rating: averageRating,
            reviewCount,
            status: userData.status || "Pending",
          })
        } else {
          setBusiness(null)
        }
      } catch (error) {
        console.error("Error fetching business details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessDetails()
  }, [uid])

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "Premium":
        return "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
      case "Pro":
        return "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
      case "Basic":
        return "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-600 text-white"
    }
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "Premium":
        return Crown
      case "Pro":
        return Zap
      case "Basic":
        return Sparkles
      default:
        return FileText
    }
  }

  const goBack = () => {
    if (window.history.length > 1) {
      router(-1)
    } else {
      router("components/admin/businesses")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen  bg-gray-50 p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader>
                <Skeleton className="h-6 w-48 bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-24 bg-gray-200" />
                      <Skeleton className="h-4 w-40 bg-gray-200" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!business || !business.businessInfo) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Button variant="outline" onClick={goBack} className="mb-6 border-gray-300 text-gray-700 hover:bg-gray-100">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Businesses
        </Button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
          <div className="bg-gray-100 p-6 rounded-full w-20 h-20 mx-auto mb-6">
            <FileText className="w-8 h-8 text-gray-500 mx-auto mt-2" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Business Details Available</h2>
          <p className="text-gray-600">This business hasn't submitted their information yet.</p>
        </motion.div>
      </div>
    )
  }

  const info = business.businessInfo
  const PlanIcon = getPlanIcon(info.subscriptionPlan || "")

  return (
    <div className="min-h-screen m-12 bg-gray-50 p-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <Button
          variant="outline"
          onClick={goBack}
          className="mb-6 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-blue-400 transition-all duration-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Businesses
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex justify-between items-start mb-8"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl blur-2xl opacity-60"></div>
          <div className="relative">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {info.businessName}
            </h1>
            <div className="flex items-center mt-4 space-x-3">
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-2 text-sm font-bold">
                <Building2 className="h-4 w-4 mr-2" />
                {info.businessType}
              </Badge>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 text-sm font-bold">
                <FileText className="h-4 w-4 mr-2" />
                Form Submitted
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Business Info Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-800 text-2xl">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mr-4 shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex justify-between border-b border-gray-200 pb-4">
                    <span className="text-gray-600 font-medium">Business Name</span>
                    <span className="font-bold text-gray-800">{info.businessName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-4">
                    <span className="text-gray-600 font-medium">Description</span>
                    <span className="font-medium max-w-[70%] text-right text-gray-800">
                      {info.description || "No description"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-4">
                    <span className="text-gray-600 font-medium">Google Review</span>
                    <span className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                      {info.googleReviewLink ? (
                        <a href={info.googleReviewLink} target="_blank" rel="noopener noreferrer">
                          View Reviews
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Last Updated</span>
                    <span className="font-bold text-gray-800">
                      {info.lastUpdated ? format(info.lastUpdated.toDate(), "MMM d, yyyy") : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
              <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-800 text-2xl">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl mr-4 shadow-lg">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-bold mb-4 text-gray-800 text-lg">Primary Contact</h3>
                    <div className="space-y-3">
                      <p className="text-gray-700 flex items-center">
                        <Mail className="inline h-5 w-5 mr-3 text-blue-500" />
                        {info.contactEmail}
                      </p>
                      <p className="text-gray-700 flex items-center">
                        <Phone className="inline h-5 w-5 mr-3 text-blue-500" />
                        {info.contactPhone}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold mb-4 text-gray-800 text-lg">Secondary Contact</h3>
                    <div className="space-y-3">
                      <p className="text-gray-700 flex items-center">
                        <Mail className="inline h-5 w-5 mr-3 text-blue-500" />
                        {info.secondaryEmail || "N/A"}
                      </p>
                      <p className="text-gray-700 flex items-center">
                        <Globe className="inline h-5 w-5 mr-3 text-blue-500" />
                        {info.website || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Branches */}
          {info.branches?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-gray-800 text-2xl">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mr-4 shadow-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    Branch Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    {info.branches.map((branch, idx) => (
                      <div key={idx} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-xl text-gray-800 font-bold">{branch.name}</strong>
                            <p className="text-gray-600 mt-1 text-lg">{branch.location}</p>
                          </div>
                          {branch.googleReviewLink && (
                            <a
                              href={branch.googleReviewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                            >
                              <Link className="h-5 w-5 mr-2" />
                              Google Reviews
                            </a>
                          )}
                        </div>
                        {branch.googleReviewLink ? (
                          <div className="mt-3 text-sm">
                            <a
                              href={branch.googleReviewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 truncate block transition-colors"
                            >
                              {branch.googleReviewLink}
                            </a>
                          </div>
                        ) : (
                          <div className="mt-3 text-gray-500 italic">No Google Review Link added for this branch</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-6"
        >
          <Card className="bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-yellow-50 rounded-t-lg">
              <CardTitle className="flex items-center text-gray-800 text-xl">
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl mr-3 shadow-lg">
                  <PlanIcon className="h-5 w-5 text-white" />
                </div>
                Subscription Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Badge
                    className={`${getPlanColor(info.subscriptionPlan || "None")} flex items-center space-x-2 px-3 py-2`}
                  >
                    <PlanIcon className="w-4 h-4" />
                    <span className="font-bold">{info.subscriptionPlan || "None"}</span>
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Status: </span>
                  <Badge
                    className={
                      info.subscriptionStatus === "Active"
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 font-bold"
                        : "bg-gradient-to-r from-gray-400 to-gray-600 text-white px-3 py-1 font-bold"
                    }
                  >
                    {info.subscriptionStatus || "Inactive"}
                  </Badge>
                </div>
                {info.subscriptionEndDate && (
                  <p className="text-gray-700">
                    <span className="text-gray-600 font-medium">Renewal:</span>{" "}
                    <span className="font-bold text-gray-800">
                      {format(info.subscriptionEndDate.toDate(), "MMM d, yyyy")}
                    </span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
              <CardTitle className="text-gray-800 text-xl">Business Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500 fill-yellow-500" />
                  <span className="text-gray-800 font-bold text-lg">
                    {business.rating} ⭐ ({business.reviewCount} reviews)
                  </span>
                </div>
                <p className="text-gray-700">
                  <span className="text-gray-600 font-medium">Status:</span>{" "}
                  <span className="font-bold text-gray-800">{business.status}</span>
                </p>
                <p className="text-gray-700">
                  <span className="text-gray-600 font-medium">Owner:</span>{" "}
                  <span className="font-bold text-gray-800">{business.displayName}</span>
                </p>
                <p className="text-gray-700 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-gray-600 font-medium">Joined:</span>{" "}
                  <span className="font-bold text-gray-800 ml-2">{format(business.createdAt, "MMM d, yyyy")}</span>
                </p>
                <p className="text-gray-700 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-gray-600 font-medium">Branches:</span>{" "}
                  <span className="font-bold text-gray-800 ml-2">{info.branches?.length || 0}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

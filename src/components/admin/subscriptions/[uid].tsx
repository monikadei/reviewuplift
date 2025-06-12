"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CreditCard, Calendar, RefreshCw, Sparkles, Crown, Zap, Star } from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { format } from "date-fns"
import { useNavigate, useParams } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DatePicker from "react-datepicker"
import { toast } from "sonner"
import { motion } from "framer-motion"
import "react-datepicker/dist/react-datepicker.css"

interface SubscriptionData {
  plan: string
  status: "Active" | "Expired" | "None"
  startDate: Date | null
  endDate: Date | null
  paymentMethod: string
  businessName: string
  displayName: string
  uid: string
}

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const params = useParams<{ uid: string }>()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    plan: "",
    status: "None" as "Active" | "Expired" | "None",
    endDate: null as Date | null,
    paymentMethod: "",
  })
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.uid) {
        setError("User ID is missing")
        setLoading(false)
        return
      }

      try {
        const userDocRef = doc(db, "users", params.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const data = userDoc.data()
          const businessInfo = data.businessInfo || {}

          // Get business name from businessInfo or fallback
          const businessName = businessInfo.businessName || data.displayName || "Unknown Business"

          // Fetch subscription data from root document fields
          const endDate = data.subscriptionEndDate?.toDate?.() || null
          const startDate = data.subscriptionStartDate?.toDate?.() || null

          // Determine status based on subscriptionActive flag and dates
          let subscriptionStatus: "Active" | "Expired" | "None" = "None"
          if (data.subscriptionActive) {
            subscriptionStatus = endDate && endDate > new Date() ? "Active" : "Expired"
          }

          // Map plan IDs to names
          const planMap: Record<string, string> = {
            plan_premium: "Premium",
            plan_pro: "Pro",
            plan_basic: "Basic",
          }

          const subscriptionPlan = data.subscriptionPlan
            ? planMap[data.subscriptionPlan] || data.subscriptionPlan
            : "None"

          const subData: SubscriptionData = {
            plan: subscriptionPlan,
            status: subscriptionStatus,
            startDate,
            endDate,
            paymentMethod: "N/A",
            businessName,
            displayName: data.displayName || "Unknown Owner",
            uid: userDoc.id,
          }

          setSubscription(subData)
          setFormData({
            plan: subData.plan,
            status: subData.status,
            endDate: subData.endDate,
            paymentMethod: subData.paymentMethod,
          })
        } else {
          setError("User document not found")
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error)
        setError("Failed to load subscription data")
        toast.error("Failed to load subscription data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.uid])

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "Premium":
        return "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
      case "Pro":
        return "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
      case "Basic":
        return "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
      case "professional":
        return "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
      case "starter":
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
      case "Professional":
        return Zap
      case "starter":
        return Sparkles
      default:
        return CreditCard
    }
  }

  const handleSave = async () => {
    if (!subscription || !params?.uid) return

    setSaving(true)
    try {
      const userDocRef = doc(db, "users", params.uid)
      const planReverseMap: Record<string, string> = {
        Premium: "plan_premium",
        Pro: "plan_pro",
        Basic: "plan_basic",
      }
      const planId = planReverseMap[formData.plan] || formData.plan

      const updateData: any = {
        subscriptionPlan: planId,
        subscriptionActive: formData.status === "Active",
      }

      if (formData.endDate) {
        updateData.subscriptionEndDate = formData.endDate
      }

      await updateDoc(userDocRef, updateData)

      toast.success("Subscription updated successfully!", {
        description: "Changes have been saved to the database.",
      })

      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              plan: formData.plan,
              status: formData.status,
              endDate: formData.endDate,
            }
          : null,
      )
    } catch (error) {
      console.error("Error updating subscription:", error)
      toast.error("Failed to update subscription", {
        description: "Please try again or contact support.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!params?.uid) return

    try {
      await updateDoc(doc(db, "users", params.uid), {
        subscriptionActive: false,
        subscriptionPlan: "None",
        subscriptionEndDate: null,
        subscriptionStartDate: null,
      })

      toast.success("Subscription cancelled successfully")
      setSubscription((prev) =>
        prev ? { ...prev, status: "None", plan: "None", endDate: null, startDate: null } : null,
      )
      setFormData((prev) => ({
        ...prev,
        status: "None",
        plan: "None",
        endDate: null,
      }))
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      toast.error("Failed to cancel subscription")
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6 border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
          <div className="bg-red-100 p-6 rounded-full w-20 h-20 mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-red-600 mx-auto mt-2" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-700 bg-clip-text text-transparent mb-4">
            Error Loading Subscription
          </h2>
          <p className="text-gray-600 text-lg">{error}</p>
          <p className="text-gray-500 mt-2">User ID: {params?.uid || "Not available"}</p>
          <Button
            className="mt-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </motion.div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader>
                <Skeleton className="h-6 w-48 bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24 bg-gray-200" />
                      <Skeleton className="h-10 w-48 bg-gray-200" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader>
                <Skeleton className="h-6 w-32 bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-24 bg-gray-200" />
                      <Skeleton className="h-4 w-32 bg-gray-200" />
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

  const PlanIcon = getPlanIcon(subscription?.plan || "")

  return (
    <div className="min-h-screen  m-12 bg-gray-50 p-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-blue-400 transition-all duration-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
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
              Subscription Management
            </h1>
            <p className="text-gray-600 mt-3 text-xl">
              Manage subscription for{" "}
              <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {subscription?.businessName}
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
              <CardTitle className="flex items-center text-gray-800 text-2xl">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mr-4 shadow-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-bold mb-4 text-gray-700 uppercase tracking-wider">
                    Subscription Plan
                  </label>
                  <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })}>
                    <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800 h-12 text-lg hover:border-blue-400 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="None" className="text-gray-600 text-lg">
                        No Plan
                      </SelectItem>
                      <SelectItem value="Basic" className="text-green-600 text-lg">
                        <div className="flex items-center">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Basic ($49/month)
                        </div>
                      </SelectItem>
                      <SelectItem value="Pro" className="text-blue-600 text-lg">
                        <div className="flex items-center">
                          <Zap className="w-4 h-4 mr-2" />
                          Pro ($99/month)
                        </div>
                      </SelectItem>
                      <SelectItem value="Premium" className="text-purple-600 text-lg">
                        <div className="flex items-center">
                          <Crown className="w-4 h-4 mr-2" />
                          Premium ($199/month)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-4 text-gray-700 uppercase tracking-wider">
                    Subscription Status
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "Active" | "Expired" | "None") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="w-full bg-white border-gray-300 text-gray-800 h-12 text-lg hover:border-blue-400 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="Active" className="text-green-600 text-lg">
                        Active
                      </SelectItem>
                      <SelectItem value="Expired" className="text-red-600 text-lg">
                        Expired
                      </SelectItem>
                      <SelectItem value="None" className="text-gray-600 text-lg">
                        None
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-4 text-gray-700 uppercase tracking-wider">
                    Renewal Date
                  </label>
                  <DatePicker
                    selected={formData.endDate}
                    onChange={(date) => setFormData({ ...formData, endDate: date })}
                    className="border border-gray-300 bg-white text-gray-800 px-4 py-3 rounded-lg w-full text-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all hover:border-blue-400"
                    minDate={new Date()}
                    placeholderText="Select renewal date"
                    disabled={formData.status === "None"}
                  />
                  {formData.status === "None" && (
                    <p className="text-xs text-gray-500 mt-2 italic">Set status to Active to enable date selection</p>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-8">
                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 px-8 py-3 text-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Star className="h-5 w-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Side: Summary and Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <Card className="sticky top-6 bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-t-lg">
              <CardTitle className="text-gray-800 text-xl">Current Subscription</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Business</span>
                  <span className="font-bold text-gray-800 truncate max-w-[160px]">{subscription?.businessName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Current Plan</span>
                  <Badge className={`${getPlanColor(subscription?.plan || "")} flex items-center space-x-1 px-3 py-1`}>
                    <PlanIcon className="w-4 h-4" />
                    <span className="font-bold">{subscription?.plan || "None"}</span>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Status</span>
                  <Badge
                    className={
                      subscription?.status === "Active"
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 font-bold"
                        : subscription?.status === "Expired"
                          ? "bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 py-1 font-bold"
                          : "bg-gradient-to-r from-gray-400 to-gray-600 text-white px-3 py-1 font-bold"
                    }
                  >
                    {subscription?.status || "None"}
                  </Badge>
                </div>
                {subscription?.endDate && subscription.status !== "None" && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Renewal Date</span>
                    <div className="flex items-center text-gray-800">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="font-bold">{format(subscription.endDate, "MMM d, yyyy")}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500"></div>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-red-50 rounded-t-lg">
              <CardTitle className="text-gray-800 text-xl">Subscription Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 py-3 font-bold transition-all duration-300"
                  onClick={handleCancelSubscription}
                  disabled={subscription?.status === "None"}
                >
                  Cancel Subscription
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 py-3 font-bold transition-all duration-300"
                  disabled={subscription?.status !== "Active"}
                >
                  Send Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

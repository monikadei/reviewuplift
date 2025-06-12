"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Sidebar from "@/components/sidebar"
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  PowerIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  XIcon,
  MapPinIcon,
  LinkIcon,
  StarIcon,
  Clock,
  Building2,
  Globe,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { db, auth } from "@/firebase/firebase"
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore"
import type { User } from "firebase/auth"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

interface Branch {
  id: string
  name: string
  location: string
  googleReviewLink: string
  createdAt: string
  isActive: boolean
  isExpanded?: boolean
  isEditing?: boolean
}

interface UserPlan {
  trialActive: boolean
  trialEndDate?: Date
  trialDaysLeft?: number
  plan?: string
  subscriptionActive?: boolean
  subscriptionEndDate?: Date
}

export default function LocationPage() {
  const router = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [newBranch, setNewBranch] = useState({
    name: "",
    location: "",
    googleReviewLink: "",
  })
  const [editData, setEditData] = useState({
    id: "",
    name: "",
    location: "",
    googleReviewLink: "",
  })
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true)
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  // Track auth and network state
  useEffect(() => {
    let unsubscribeUserPlan: () => void

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user)
        fetchBranches(user.uid)

        // Set up real-time listener for user plan
        const userRef = doc(db, "users", user.uid)
        unsubscribeUserPlan = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data()
            updateUserPlanState(userData)
          }
        })
      } else {
        setUser(null)
        setBranches([])
        setLoading(false)
        setPlanLoading(false)
        if (unsubscribeUserPlan) unsubscribeUserPlan()
      }
    })

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      unsubscribeAuth()
      if (unsubscribeUserPlan) unsubscribeUserPlan()
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Update user plan state from Firestore data
  const updateUserPlanState = (userData: any) => {
    try {
      const now = new Date()
      const trialEnd = userData.trialEndDate?.toDate()
      let trialDaysLeft = 0

      if (trialEnd) {
        trialDaysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        trialDaysLeft = trialDaysLeft > 0 ? trialDaysLeft : 0
      }

      const subscriptionEnd = userData.subscriptionEndDate?.toDate()
      const subscriptionActive = subscriptionEnd && subscriptionEnd > now

      setUserPlan({
        trialActive: userData.trialActive || false,
        trialEndDate: trialEnd,
        trialDaysLeft: trialDaysLeft,
        plan: userData.subscriptionPlan || null,
        subscriptionActive: subscriptionActive || false,
        subscriptionEndDate: subscriptionEnd,
      })
      setPlanLoading(false)
    } catch (error) {
      console.error("Error updating user plan:", error)
      toast.error("Failed to load subscription details")
      setPlanLoading(false)
    }
  }

  // Fetch branches from Firebase
  const fetchBranches = async (userId: string) => {
    setLoading(true)
    try {
      const userRef = doc(db, "users", userId)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const businessInfo = userSnap.data().businessInfo || {}
        const branchesData = businessInfo.branches || []
        const branchesWithId = branchesData.map((branch: any) => {
          return {
            ...branch,
            id: branch.id || `branch-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: branch.createdAt || new Date().toISOString(),
            isActive: branch.isActive !== undefined ? branch.isActive : true,
            googleReviewLink: branch.googleReviewLink || "",
          }
        })
        setBranches(branchesWithId)
      }
    } catch (error) {
      console.error("Fetch error:", error)
      toast.error("Failed to load branches")
    } finally {
      setLoading(false)
    }
  }

  // Get branch limit based on plan
  const getBranchLimit = () => {
    if (!userPlan) return 0

    if (userPlan.trialActive) {
      return 1 // Allow 1 branch during trial
    }

    if (!userPlan.subscriptionActive) return 0

    switch (userPlan.plan) {
      case "plan_basic":
        return 3
      case "plan_pro":
        return 5
      case "plan_premium":
        return 1000 // Effectively unlimited
      case "starter":
        return 3
      case "professional":
        return 5
      case "custom":
        return 1000
      default:
        return 0 // No plan selected
    }
  }

  const branchLimit = getBranchLimit()
  const canAddBranches = branches.length < branchLimit
  const branchLimitReached = branches.length >= branchLimit

  const generateId = () => `branch-${Math.random().toString(36).substr(2, 9)}`

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Update branches in Firebase
  const updateFirebaseBranches = async (updatedBranches: Branch[]) => {
    if (!user) {
      toast.error("You must be logged in")
      return false
    }

    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        "businessInfo.branches": updatedBranches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          location: branch.location,
          googleReviewLink: branch.googleReviewLink,
          isActive: branch.isActive,
          createdAt: branch.createdAt,
        })),
      })
      return true
    } catch (error) {
      console.error("Update error:", error)
      throw error
    }
  }

  const handleAddBranch = async () => {
    if (!newBranch.name.trim() || !newBranch.location.trim() || !newBranch.googleReviewLink.trim()) {
      toast.error("Please fill all required fields including Google Review Link")
      return
    }

    if (branchLimitReached) {
      toast.error("You've reached your branch limit. Please upgrade your plan.")
      return
    }

    try {
      const branchToAdd = {
        id: generateId(),
        name: newBranch.name.trim(),
        location: newBranch.location.trim(),
        googleReviewLink: newBranch.googleReviewLink.trim(),
        createdAt: new Date().toISOString(),
        isActive: true,
      }

      const updatedBranches = [...branches, branchToAdd]
      await updateFirebaseBranches(updatedBranches)
      setBranches(updatedBranches)
      setNewBranch({ name: "", location: "", googleReviewLink: "" })
      setIsAdding(false)
      toast.success("Branch added successfully")
    } catch (error) {
      toast.error("Failed to add branch")
    }
  }

  const handleDeleteBranch = async (id: string) => {
    try {
      const updatedBranches = branches.filter((branch) => branch.id !== id)
      await updateFirebaseBranches(updatedBranches)
      setBranches(updatedBranches)
      toast.success("Branch deleted successfully")
    } catch (error) {
      toast.error("Failed to delete branch")
    }
  }

  const toggleActiveStatus = async (id: string) => {
    try {
      const updatedBranches = branches.map((branch) =>
        branch.id === id ? { ...branch, isActive: !branch.isActive } : branch,
      )

      // Optimistic update
      setBranches(updatedBranches)

      await updateFirebaseBranches(updatedBranches)
      toast.success("Branch status updated")
    } catch (error) {
      // Revert on error
      setBranches(branches)
      toast.error("Failed to update branch status")
    }
  }

  const toggleExpand = (id: string) => {
    setBranches(branches.map((branch) => (branch.id === id ? { ...branch, isExpanded: !branch.isExpanded } : branch)))
  }

  const startEditing = (branch: Branch) => {
    setEditData({
      id: branch.id,
      name: branch.name,
      location: branch.location,
      googleReviewLink: branch.googleReviewLink || "",
    })
    setBranches(branches.map((b) => (b.id === branch.id ? { ...b, isEditing: true } : b)))
  }

  const cancelEditing = (id: string) => {
    setBranches(branches.map((b) => (b.id === id ? { ...b, isEditing: false } : b)))
  }

  const saveEditing = async (id: string) => {
    if (!editData.name.trim() || !editData.location.trim() || !editData.googleReviewLink.trim()) {
      toast.error("Please fill all required fields including Google Review Link")
      return
    }

    try {
      const updatedBranches = branches.map((branch) =>
        branch.id === id
          ? {
              ...branch,
              name: editData.name.trim(),
              location: editData.location.trim(),
              googleReviewLink: editData.googleReviewLink.trim(),
              isEditing: false,
            }
          : branch,
      )
      await updateFirebaseBranches(updatedBranches)
      setBranches(updatedBranches)
      toast.success("Branch updated successfully")
    } catch (error) {
      toast.error("Failed to update branch")
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Format plan name for display
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

  // Render plan details
  const renderPlanDetails = () => {
    if (!userPlan) return null

    const planName = formatPlanName(userPlan.plan)
    let planDescription = ""
    let upgradeButtonText = "Upgrade Plan"

    switch (userPlan.plan) {
      case "none":
        planDescription = "1 branches included"
        break
      case "plan_basic":
        planDescription = "3 branches included"
        break
      case "plan_pro":
        planDescription = "5 branches included"
        break
      case "plan_premium":
        planDescription = "Unlimited branches"
        break
      case "starter":
        planDescription = "3 branches included"
        break
      case "professional":
        planDescription = "5 branches included"
        break
      case "custom":
        planDescription = "Unlimited branches"
        break
      default:
        planDescription = userPlan.trialActive ? "1 branch during trial" : "No active plan"
    }

    // Check if subscription is active but expired
    let subscriptionStatus = ""
    if (userPlan.subscriptionEndDate && userPlan.subscriptionEndDate < new Date()) {
      subscriptionStatus = " (Expired)"
      upgradeButtonText = "Renew Plan"
    }

    return (
      <motion.div
        className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50 border border-emerald-200/50 rounded-3xl p-8 mb-8 shadow-xl backdrop-blur-sm"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5 rounded-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-6 md:mb-0">
            <motion.div
              className="flex items-center gap-4 mb-3"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                {planName} Plan{subscriptionStatus}
              </h3>
            </motion.div>
            <motion.p
              className="text-gray-700 font-medium text-lg"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Branch usage: {branches.length} / {branchLimit === 1000 ? "Unlimited" : branchLimit}
            </motion.p>
            <motion.p
              className="text-sm text-gray-600 mt-1"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {planDescription}
              {userPlan.trialActive && userPlan.trialDaysLeft !== undefined && (
                <span> - {userPlan.trialDaysLeft} days left in trial</span>
              )}
              {userPlan.subscriptionEndDate && userPlan.subscriptionActive && (
                <span> - Renews on {userPlan.subscriptionEndDate.toLocaleDateString()}</span>
              )}
            </motion.p>
          </div>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Button
              onClick={() => router("/#pricing")}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-3 rounded-2xl font-semibold text-lg"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              {userPlan.subscriptionActive ? "Manage Plan" : upgradeButtonText}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  if (loading || planLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-4 md:p-6 flex items-center justify-center">
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
            <p className="text-lg text-gray-600 font-medium">Loading branches...</p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-4 md:p-6 flex items-center justify-center">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg mb-6 w-20 h-20 mx-auto flex items-center justify-center">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Please sign in
            </h2>
            <p className="text-gray-600 mb-6 text-lg">You need to be signed in to manage branches</p>
            <Button
              onClick={() => router("/login")}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl px-8 py-3 font-semibold"
            >
              Sign In
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Sidebar />

      <div className="flex-1 md:ml-64 p-4 md:p-6">
        <div className="space-y-6 max-w-6xl mx-auto">
          {!isOnline && (
            <motion.div
              className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 p-4 text-center rounded-2xl border border-yellow-200 shadow-lg"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-center gap-2">
                <Globe className="h-5 w-5" />
                You are currently offline. Changes will sync when you reconnect.
              </div>
            </motion.div>
          )}

          {userPlan?.trialActive && userPlan.trialDaysLeft !== undefined && userPlan.trialDaysLeft > 0 && (
            <motion.div
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-2xl shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-blue-700 font-medium">
                    You're currently on a free trial ({userPlan.trialDaysLeft} days remaining). You can upgrade now to
                    continue uninterrupted service after your trial ends.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {branchLimitReached && (
            <motion.div
              className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-6 rounded-2xl shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <StarIcon className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-4">
                  <p className="text-orange-700 font-medium">
                    You've reached your branch limit ({branchLimit} branch{userPlan?.plan === "plan_basic" ? "" : "es"}
                    ). Upgrade your plan to add more locations.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Plan Details Card */}
          {renderPlanDetails()}

          <motion.div
            className="flex flex-col md:flex-row md:justify-between md:items-center gap-6"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Branch Locations
                </h1>
                <p className="text-gray-600 font-medium">Manage your business locations and settings</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-2xl border border-indigo-200 shadow-sm">
                <MapPinIcon className="h-5 w-5 mr-2 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-700">{branches.length}</span>
                <span className="text-sm text-indigo-600 ml-1">
                  of {branchLimit === 1000 ? "Unlimited" : branchLimit}
                </span>
              </div>
              <Button
                onClick={() => setIsAdding(true)}
                disabled={branchLimitReached}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6 py-3 rounded-2xl font-semibold"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Location
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SearchIcon className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search branches by name or location..."
              className="pl-12 py-3 border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>

          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-6">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <PlusIcon className="h-5 w-5 text-white" />
                      </div>
                      Add New Branch Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <label className="text-sm font-semibold text-gray-700">
                        Branch Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Enter branch name (e.g., Downtown Store)"
                        value={newBranch.name}
                        onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                        className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                      />
                    </motion.div>
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="text-sm font-semibold text-gray-700">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Enter complete address with city, state, zip"
                        value={newBranch.location}
                        onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                        className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                      />
                    </motion.div>
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Google Review Link <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="https://g.page/review?link=... or Google Maps review URL"
                        value={newBranch.googleReviewLink}
                        onChange={(e) => setNewBranch({ ...newBranch, googleReviewLink: e.target.value })}
                        className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                      />
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Required - Add a direct link to this branch's Google reviews
                      </p>
                    </motion.div>
                    <motion.div
                      className="flex justify-end space-x-3 pt-4 border-t border-gray-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => setIsAdding(false)}
                        className="rounded-xl hover:bg-gray-50 transition-all duration-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddBranch}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 px-8"
                      >
                        Add Branch
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredBranches.length > 0 ? (
                filteredBranches.map((branch, index) => (
                  <motion.div
                    key={branch.id}
                    className="group"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500">
                      <CardHeader className="flex flex-row items-center justify-between p-6 bg-gradient-to-r from-gray-50/80 to-gray-100/80">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-12 w-12 rounded-2xl transition-all duration-300 hover:scale-110 ${
                                    branch.isActive
                                      ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                      : "text-red-500 hover:text-red-600 hover:bg-red-50"
                                  }`}
                                  onClick={() => toggleActiveStatus(branch.id)}
                                >
                                  <PowerIcon className="h-6 w-6" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {branch.isActive ? "Deactivate branch" : "Activate branch"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <div className="flex-1 min-w-0">
                            {branch.isEditing ? (
                              <div className="space-y-2">
                                <Input
                                  name="name"
                                  value={editData.name}
                                  onChange={handleEditChange}
                                  className="text-lg font-semibold rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300"
                                />
                                <Input
                                  name="location"
                                  value={editData.location}
                                  onChange={handleEditChange}
                                  className="text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300"
                                />
                              </div>
                            ) : (
                              <>
                                <CardTitle className="text-xl font-bold flex items-center gap-3 truncate">
                                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg"></div>
                                  {branch.name}
                                  <Badge
                                    variant={branch.isActive ? "default" : "secondary"}
                                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                      branch.isActive
                                        ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-200"
                                        : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600 border-gray-200"
                                    }`}
                                  >
                                    {branch.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </CardTitle>
                                <div className="text-sm text-gray-600 truncate flex items-center gap-2 mt-1">
                                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                                  {branch.location}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-300 hover:scale-110"
                                  onClick={() => toggleExpand(branch.id)}
                                >
                                  {branch.isExpanded ? (
                                    <ChevronUpIcon className="h-5 w-5" />
                                  ) : (
                                    <ChevronDownIcon className="h-5 w-5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {branch.isExpanded ? "Collapse details" : "Expand details"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {branch.isEditing ? (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300 hover:scale-110"
                                      onClick={() => saveEditing(branch.id)}
                                    >
                                      <CheckIcon className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Save changes</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 hover:scale-110"
                                      onClick={() => cancelEditing(branch.id)}
                                    >
                                      <XIcon className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancel editing</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          ) : (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 rounded-xl text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 hover:scale-110"
                                      onClick={() => startEditing(branch)}
                                      disabled={!branch.isActive}
                                    >
                                      <EditIcon className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {branch.isActive ? "Edit branch" : "Activate to edit"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 hover:scale-110"
                                      onClick={() => handleDeleteBranch(branch.id)}
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete branch</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </CardHeader>

                      <AnimatePresence>
                        {branch.isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <CardContent className="p-6 pt-0 border-t border-gray-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 }}
                                >
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <MapPinIcon className="h-4 w-4 text-indigo-500" />
                                    Full Address
                                  </h4>
                                  {branch.isEditing ? (
                                    <Input
                                      name="location"
                                      value={editData.location}
                                      onChange={handleEditChange}
                                      className="text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300"
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200">
                                      {branch.location}
                                    </p>
                                  )}
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-indigo-500" />
                                    Added On
                                  </h4>
                                  <p className="text-sm text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200">
                                    {formatDate(branch.createdAt)}
                                  </p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <PowerIcon className="h-4 w-4 text-indigo-500" />
                                    Status
                                  </h4>
                                  <p className="text-sm bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200">
                                    {branch.isActive ? (
                                      <span className="text-emerald-600 font-semibold flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                        Active
                                      </span>
                                    ) : (
                                      <span className="text-gray-500 font-semibold flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                        Inactive
                                      </span>
                                    )}
                                  </p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-indigo-500" />
                                    Branch ID
                                  </h4>
                                  <p className="text-sm text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200 font-mono">
                                    {branch.id}
                                  </p>
                                </motion.div>

                                {/* Google Review Link Section */}
                                <motion.div
                                  className="md:col-span-2"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-indigo-500" />
                                    Google Review Link
                                  </h4>
                                  {branch.isEditing ? (
                                    <Input
                                      name="googleReviewLink"
                                      value={editData.googleReviewLink}
                                      onChange={handleEditChange}
                                      className="text-sm rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300"
                                      placeholder="https://g.page/review?link=..."
                                    />
                                  ) : branch.googleReviewLink ? (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                                      <a
                                        href={branch.googleReviewLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block font-medium transition-colors duration-300"
                                      >
                                        {branch.googleReviewLink}
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 italic bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200">
                                      No review link added
                                    </p>
                                  )}
                                </motion.div>
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardContent className="py-20 text-center">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      >
                        <div className="p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                          <MapPinIcon className="h-12 w-12 text-indigo-600" />
                        </div>
                      </motion.div>
                      <motion.h3
                        className="text-2xl font-bold text-gray-900 mb-2"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        No branches found
                      </motion.h3>
                      <motion.p
                        className="text-gray-600 mb-8 text-lg"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {searchTerm
                          ? "No branches match your search criteria"
                          : "Get started by adding your first branch location"}
                      </motion.p>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Button
                          onClick={() => setIsAdding(true)}
                          disabled={branchLimitReached}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-3 rounded-2xl font-semibold text-lg"
                        >
                          <PlusIcon className="h-5 w-5 mr-2" />
                          Add Your First Branch
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

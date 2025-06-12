"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Sidebar from "@/components/sidebar"
import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaMapMarkerAlt,
  FaPhone,
  FaGlobe,
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaEdit,
  FaSave,
  FaTimes,
  FaGoogle,
} from "react-icons/fa"
import { auth, db } from "@/firebase/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { onAuthStateChanged, updatePassword } from "firebase/auth"
import { motion, AnimatePresence } from "framer-motion"
import { User, Shield, Settings, Sparkles } from "lucide-react"

interface Branch {
  name: string
  location: string
  googleReviewLink?: string
}

interface BusinessData {
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
  emailVerified: boolean
  phoneVerified: boolean
  branches: Branch[]
  googleReviewLink?: string // Keep for backward compatibility
}

export default function AccountPage() {
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditingBusiness, setIsEditingBusiness] = useState(false)
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true)
  const [isSavingBusiness, setIsSavingBusiness] = useState(false)

  const [businessData, setBusinessData] = useState<BusinessData>({
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    whatsapp: "",
    secondaryEmail: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    website: "",
    description: "",
    businessType: "",
    branchCount: "",
    customBusinessType: "",
    emailVerified: false,
    phoneVerified: false,
    branches: [],
  })

  const [originalBusinessData, setOriginalBusinessData] = useState<BusinessData>({
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    whatsapp: "",
    secondaryEmail: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    website: "",
    description: "",
    businessType: "",
    branchCount: "",
    customBusinessType: "",
    emailVerified: false,
    phoneVerified: false,
    branches: [],
  })

  // Load business data on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadBusinessData(user.uid)
      } else {
        setIsLoadingBusiness(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const loadBusinessData = async (userId: string) => {
    setIsLoadingBusiness(true)
    try {
      const userDocRef = doc(db, "users", userId)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const businessInfo = userDocSnap.data().businessInfo || {}

        // Handle branches and migrate Google Review Link if needed
        let branches = businessInfo.branches || []

        // If there's a googleReviewLink in the business data but no branches, create one
        if (businessInfo.googleReviewLink && branches.length === 0) {
          branches = [{ name: "", location: "", googleReviewLink: businessInfo.googleReviewLink }]
        }
        // If there's a googleReviewLink and branches exist but don't have googleReviewLink
        else if (businessInfo.googleReviewLink && branches.length > 0 && !branches[0].googleReviewLink) {
          branches = branches.map((branch: Branch, index: number) => {
            // Add the Google Review Link to the first branch only
            if (index === 0) {
              return { ...branch, googleReviewLink: businessInfo.googleReviewLink }
            }
            return { ...branch, googleReviewLink: branch.googleReviewLink || "" }
          })
        }

        setBusinessData({
          ...businessInfo,
          branches: branches,
          emailVerified: auth.currentUser?.emailVerified || false,
          phoneVerified: !!businessInfo.contactPhone,
        })
        setOriginalBusinessData({
          ...businessInfo,
          branches: branches,
          emailVerified: auth.currentUser?.emailVerified || false,
          phoneVerified: !!businessInfo.contactPhone,
        })
      } else {
        toast({
          title: "Warning",
          description: "No business data found",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error loading business data:", error)
      toast({
        title: "Error",
        description: "Failed to load business data",
        variant: "destructive",
      })
    } finally {
      setIsLoadingBusiness(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const handleBusinessChange = (name: string, value: string) => {
    setBusinessData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validatePasswords = () => {
    let isValid = true
    const newErrors = {
      newPassword: "",
      confirmPassword: "",
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required"
      isValid = false
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters"
      isValid = false
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
      isValid = false
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePasswords()) {
      return
    }

    setIsUpdating(true)

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("User not authenticated")
      }

      await updatePassword(user, passwordData.newPassword)

      toast({
        title: "Success",
        description: "Password updated successfully",
        variant: "default",
      })

      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("Error updating password:", error)
      let errorMessage = "Failed to update password"
      if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please login again to change your password"
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBusinessSave = async () => {
    if (!validateBusinessData()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSavingBusiness(true)

    try {
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      const userDocRef = doc(db, "users", user.uid)
      const finalBusinessType =
        businessData.businessType === "Other" ? businessData.customBusinessType : businessData.businessType

      // Remove the top-level googleReviewLink as it's now in branches
      const { googleReviewLink, ...businessDataWithoutGoogleReviewLink } = businessData

      await updateDoc(userDocRef, {
        businessInfo: {
          ...businessDataWithoutGoogleReviewLink,
          businessType: finalBusinessType,
          branches: businessData.branches,
        },
      })

      setOriginalBusinessData({
        ...businessDataWithoutGoogleReviewLink,
        businessType: finalBusinessType,
        branches: businessData.branches,
      })
      setIsEditingBusiness(false)
      toast({
        title: "Success",
        description: "Business information updated successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating business data:", error)
      toast({
        title: "Error",
        description: "Failed to update business information",
        variant: "destructive",
      })
    } finally {
      setIsSavingBusiness(false)
    }
  }

  const handleBusinessCancel = () => {
    setBusinessData(originalBusinessData)
    setIsEditingBusiness(false)
  }

  const validateBusinessData = () => {
    return (
      businessData.businessName.trim() &&
      businessData.contactEmail.trim() &&
      businessData.contactPhone.trim() &&
      businessData.businessType.trim() &&
      businessData.branches.every((branch) => branch.name.trim() && branch.location.trim())
    )
  }

  const handleBranchChange = (index: number, field: keyof Branch, value: string) => {
    const newBranches = [...businessData.branches]
    newBranches[index] = { ...newBranches[index], [field]: value }
    setBusinessData({ ...businessData, branches: newBranches })
  }

  if (isLoadingBusiness) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <Sidebar isAdmin={false} />
        <div className="flex-1 md:ml-64 p-8">
          <div className="flex items-center justify-center h-64">
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <FaSpinner className="text-3xl text-indigo-500" />
              </motion.div>
              <span className="text-lg text-gray-600 font-medium">Loading account information...</span>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Sidebar isAdmin={false} />

      <div className="flex-1 md:ml-64 p-8">
        <div className="space-y-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Account Settings
              </h1>
            </div>
            <p className="text-gray-600 font-medium ml-16">Manage your account and business information</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  Your Account
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {businessData.contactEmail.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Business Owner</Label>
                      <p className="text-lg font-semibold text-gray-800">{businessData.contactEmail}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                      <FaBuilding className="h-5 w-5 text-white" />
                    </div>
                    Business Information
                  </CardTitle>
                  <div className="flex gap-3">
                    <AnimatePresence mode="wait">
                      {isEditingBusiness ? (
                        <motion.div
                          key="editing"
                          className="flex gap-3"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBusinessCancel}
                            disabled={isSavingBusiness}
                            className="rounded-xl hover:bg-gray-50 transition-all duration-300"
                          >
                            <FaTimes className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleBusinessSave}
                            disabled={isSavingBusiness || !validateBusinessData()}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {isSavingBusiness ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                >
                                  <FaSpinner className="w-4 h-4 mr-2" />
                                </motion.div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <FaSave className="w-4 h-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="not-editing"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingBusiness(true)}
                            className="rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all duration-300"
                          >
                            <FaEdit className="w-4 h-4 mr-2" />
                            Edit Information
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Basic Business Details */}
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h4 className="font-bold text-lg text-gray-800 flex items-center gap-3 pb-2 border-b border-gray-200">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                      <FaBuilding className="h-4 w-4 text-white" />
                    </div>
                    Basic Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="text-sm font-semibold text-gray-700">Business Name *</Label>
                      {isEditingBusiness ? (
                        <Input
                          value={businessData.businessName}
                          onChange={(e) => handleBusinessChange("businessName", e.target.value)}
                          placeholder="Enter business name"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800">{businessData.businessName || "Not provided"}</p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="text-sm font-semibold text-gray-700">Business Type *</Label>
                      {isEditingBusiness ? (
                        <Select
                          value={businessData.businessType}
                          onValueChange={(value) => handleBusinessChange("businessType", value)}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300">
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Retail">Retail</SelectItem>
                            <SelectItem value="Restaurant">Restaurant</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                            <SelectItem value="Tech">Tech</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800">
                            {businessData.businessType === "Other"
                              ? businessData.customBusinessType
                              : businessData.businessType || "Not provided"}
                          </p>
                        </div>
                      )}
                    </motion.div>
                    {isEditingBusiness && businessData.businessType === "Other" && (
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Label className="text-sm font-semibold text-gray-700">Custom Business Type</Label>
                        <Input
                          value={businessData.customBusinessType}
                          onChange={(e) => handleBusinessChange("customBusinessType", e.target.value)}
                          placeholder="Specify business type"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                        />
                      </motion.div>
                    )}
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="text-sm font-semibold text-gray-700">Branch Count</Label>
                      {isEditingBusiness ? (
                        <Select
                          value={businessData.branchCount}
                          onValueChange={(value) => handleBusinessChange("branchCount", value)}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300">
                            <SelectValue placeholder="Select branch count" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="6+">6+</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800">{businessData.branchCount || "Not provided"}</p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>

                {/* Branch Details */}
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h4 className="font-bold text-lg text-gray-800 flex items-center gap-3 pb-2 border-b border-gray-200">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                      <FaMapMarkerAlt className="h-4 w-4 text-white" />
                    </div>
                    Branch Details
                  </h4>

                  {businessData.branches.length === 0 && !isEditingBusiness && (
                    <div className="p-6 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-center">
                      <p className="text-gray-600 font-medium">No branches provided</p>
                    </div>
                  )}

                  <AnimatePresence>
                    {businessData.branches.map((branch, index) => (
                      <motion.div
                        key={index}
                        className="p-6 border rounded-2xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-200 space-y-4 shadow-sm"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="font-bold text-gray-800 flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            Branch {index + 1}
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700">Branch Name *</Label>
                            {isEditingBusiness ? (
                              <Input
                                value={branch.name}
                                onChange={(e) => handleBranchChange(index, "name", e.target.value)}
                                placeholder={`Branch ${index + 1} Name`}
                                className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                              />
                            ) : (
                              <div className="p-3 border rounded-xl bg-white border-gray-200">
                                <p className="font-medium text-gray-800">{branch.name || "Not provided"}</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700">Location *</Label>
                            {isEditingBusiness ? (
                              <Input
                                value={branch.location}
                                onChange={(e) => handleBranchChange(index, "location", e.target.value)}
                                placeholder={`Branch ${index + 1} Location`}
                                className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                              />
                            ) : (
                              <div className="p-3 border rounded-xl bg-white border-gray-200">
                                <p className="font-medium text-gray-800">{branch.location || "Not provided"}</p>
                              </div>
                            )}
                          </div>

                          {/* Google Review Link - Added to each branch */}
                          <div className="space-y-3 md:col-span-2">
                            <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                              <FaGoogle className="text-blue-600" />
                              Google Review Link
                            </Label>
                            {isEditingBusiness ? (
                              <Input
                                type="url"
                                value={branch.googleReviewLink || ""}
                                onChange={(e) => handleBranchChange(index, "googleReviewLink", e.target.value)}
                                placeholder="https://g.page/r/Cd.../review"
                                className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                              />
                            ) : (
                              <div className="p-3 border rounded-xl bg-white border-gray-200">
                                <p className="font-medium text-gray-800 truncate" title={branch.googleReviewLink}>
                                  {branch.googleReviewLink || "Not provided"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* Contact Information */}
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h4 className="font-bold text-lg text-gray-800 flex items-center gap-3 pb-2 border-b border-gray-200">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                      <FaPhone className="h-4 w-4 text-white" />
                    </div>
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        Contact Email *
                        {businessData.emailVerified ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                          >
                            <FaCheckCircle className="text-green-500 text-sm" title="Verified" />
                          </motion.div>
                        ) : (
                          <FaTimesCircle className="text-red-500 text-sm" title="Not verified" />
                        )}
                      </Label>
                      {isEditingBusiness ? (
                        <Input
                          type="email"
                          value={businessData.contactEmail}
                          onChange={(e) => handleBusinessChange("contactEmail", e.target.value)}
                          placeholder="you@example.com"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800">{businessData.contactEmail || "Not provided"}</p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        Contact Phone *
                        {businessData.phoneVerified ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                          >
                            <FaCheckCircle className="text-green-500 text-sm" title="Verified" />
                          </motion.div>
                        ) : (
                          <FaTimesCircle className="text-red-500 text-sm" title="Not verified" />
                        )}
                      </Label>
                      {isEditingBusiness ? (
                        <Input
                          type="tel"
                          value={businessData.contactPhone}
                          onChange={(e) => handleBusinessChange("contactPhone", e.target.value)}
                          placeholder="+1 234 567 890"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800">{businessData.contactPhone || "Not provided"}</p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="text-sm font-semibold text-gray-700">WhatsApp Number</Label>
                      {isEditingBusiness ? (
                        <Input
                          type="tel"
                          value={businessData.whatsapp}
                          onChange={(e) => handleBusinessChange("whatsapp", e.target.value)}
                          placeholder="+1 234 567 890"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-green-300 focus:border-green-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800">{businessData.whatsapp || "Not provided"}</p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="text-sm font-semibold text-gray-700">Secondary Email</Label>
                      {isEditingBusiness ? (
                        <Input
                          type="email"
                          value={businessData.secondaryEmail}
                          onChange={(e) => handleBusinessChange("secondaryEmail", e.target.value)}
                          placeholder="secondary@example.com"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800">{businessData.secondaryEmail || "Not provided"}</p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>

                {/* Social Media & Online Presence */}
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h4 className="font-bold text-lg text-gray-800 flex items-center gap-3 pb-2 border-b border-gray-200">
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                      <FaGlobe className="h-4 w-4 text-white" />
                    </div>
                    Online Presence
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <FaFacebook className="text-blue-600" />
                        Facebook
                      </Label>
                      {isEditingBusiness ? (
                        <Input
                          type="url"
                          value={businessData.facebook}
                          onChange={(e) => handleBusinessChange("facebook", e.target.value)}
                          placeholder="https://facebook.com/yourpage"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800 break-all">
                            {businessData.facebook || "Not provided"}
                          </p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <FaInstagram className="text-pink-600" />
                        Instagram
                      </Label>
                      {isEditingBusiness ? (
                        <Input
                          type="url"
                          value={businessData.instagram}
                          onChange={(e) => handleBusinessChange("instagram", e.target.value)}
                          placeholder="https://instagram.com/yourpage"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800 break-all">
                            {businessData.instagram || "Not provided"}
                          </p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <FaLinkedin className="text-blue-700" />
                        LinkedIn
                      </Label>
                      {isEditingBusiness ? (
                        <Input
                          type="url"
                          value={businessData.linkedin}
                          onChange={(e) => handleBusinessChange("linkedin", e.target.value)}
                          placeholder="https://linkedin.com/company/yourpage"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800 break-all">
                            {businessData.linkedin || "Not provided"}
                          </p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div className="space-y-3" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <FaGlobe className="text-green-600" />
                        Website
                      </Label>
                      {isEditingBusiness ? (
                        <Input
                          type="url"
                          value={businessData.website}
                          onChange={(e) => handleBusinessChange("website", e.target.value)}
                          placeholder="https://yourbusiness.com"
                          className="rounded-xl border-gray-200 focus:ring-2 focus:ring-green-300 focus:border-green-400"
                        />
                      ) : (
                        <div className="p-4 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                          <p className="font-medium text-gray-800 break-all">
                            {businessData.website || "Not provided"}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>

                {/* Business Description */}
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h4 className="font-bold text-lg text-gray-800 flex items-center gap-3 pb-2 border-b border-gray-200">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    Business Description
                  </h4>
                  <motion.div className="space-y-3" whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                    <Label className="text-sm font-semibold text-gray-700">Description</Label>
                    {isEditingBusiness ? (
                      <Textarea
                        value={businessData.description}
                        onChange={(e) => handleBusinessChange("description", e.target.value)}
                        placeholder="Describe your business..."
                        rows={4}
                        className="rounded-xl border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none"
                      />
                    ) : (
                      <div className="p-6 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 min-h-[120px]">
                        <p className="font-medium text-gray-800 leading-relaxed">
                          {businessData.description || "No description provided"}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-6">
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">
                        New Password *
                      </Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="rounded-xl border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all duration-300"
                      />
                      {errors.newPassword && (
                        <motion.p
                          className="text-sm text-red-500 font-medium"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {errors.newPassword}
                        </motion.p>
                      )}
                    </motion.div>
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                        Confirm Password *
                      </Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="rounded-xl border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all duration-300"
                      />
                      {errors.confirmPassword && (
                        <motion.p
                          className="text-sm text-red-500 font-medium"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {errors.confirmPassword}
                        </motion.p>
                      )}
                    </motion.div>
                    <motion.div
                      className="flex justify-end pt-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button
                        type="submit"
                        disabled={isUpdating}
                        className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-2.5 rounded-xl font-semibold"
                      >
                        {isUpdating ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                              className="mr-2"
                            >
                              <FaSpinner className="w-4 h-4" />
                            </motion.div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

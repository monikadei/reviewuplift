"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Mountain, Star, ChevronRight, ThumbsUp, ThumbsDown, Sparkles, Heart, Award } from "lucide-react"
import { useParams } from "react-router-dom"
import { db } from "@/firebase/firebase"
import { collection, doc, serverTimestamp, getDoc, addDoc, getDocs } from "firebase/firestore"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface ReviewFormData {
  name: string
  phone: string
  email: string
  branchname: string
  review: string
  rating: number
  businessId: string
  userId?: string
  status?: "pending" | "published" | "rejected"
  createdAt?: any
  platform?: string
  reviewType?: "internal" | "external"
}

interface Branch {
  id: string
  name: string
  location: string
  isActive: boolean
  googleReviewLink?: string
}

export default function ReviewPageFixed() {
  const { businessSlug } = useParams()
  const [businessName, setBusinessName] = useState("")
  const [previewText, setPreviewText] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [reviewLinkUrl, setReviewLinkUrl] = useState("")
  const [googleReviewLink, setGoogleReviewLink] = useState("")
  const [isReviewGatingEnabled, setIsReviewGatingEnabled] = useState(true)
  const [rating, setRating] = useState(0)
  const [welcomeTitle, setWelcomeTitle] = useState("")
  const [welcomeText, setWelcomeText] = useState("")
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    branchname: "",
    review: "",
  })
  const [formErrors, setFormErrors] = useState({
    name: false,
    phone: false,
    email: false,
    branchname: false,
    review: false,
  })
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState("")

  // Branch selection states
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [showBranchSelector, setShowBranchSelector] = useState(false)
  const [showGoogleForm, setShowGoogleForm] = useState(false)

  // Check if any form is active
  const isFormActive = showForm || showBranchSelector || showGoogleForm || submitted

  useEffect(() => {
    const loadBusinessConfig = async () => {
      try {
        if (!businessSlug) {
          setLoading(false)
          return
        }

        const reviewLinksRef = collection(db, "review_link")
        const querySnapshot = await getDocs(reviewLinksRef)

        let matchedDoc = null

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data()
          const slug =
            data.reviewLinkUrl?.split("https://go.reviewuplift.com/")[1] || data.reviewLinkUrl?.split("/").pop()
          if (slug === businessSlug) {
            matchedDoc = { id: docSnap.id, ...data }
          }
        })

        if (!matchedDoc) {
          toast.error("Business review page not found")
          setLoading(false)
          return
        }

        // Set all the config values
        setBusinessId(matchedDoc.id)
        setBusinessName(matchedDoc.businessName || "")
        setPreviewText(matchedDoc.previewText || "")
        setWelcomeTitle(matchedDoc.welcomeTitle || "")
        setWelcomeText(matchedDoc.welcomeText || "")

        // Fix image URLs - ensure they're accessible
        const fixedPreviewImage = matchedDoc.previewImage
          ? matchedDoc.previewImage
              .replace("gs://", "https://firebasestorage.googleapis.com/v0/b/")
              .replace("/o/", "/o/")
          : null
        const fixedLogoImage = matchedDoc.logoImage
          ? matchedDoc.logoImage.replace("gs://", "https://firebasestorage.googleapis.com/v0/b/").replace("/o/", "/o/")
          : null

        setPreviewImage(fixedPreviewImage)
        setLogoImage(fixedLogoImage)
        setIsReviewGatingEnabled(matchedDoc.isReviewGatingEnabled ?? true)
        setReviewLinkUrl(matchedDoc.reviewLinkUrl || "")
        setGoogleReviewLink(matchedDoc.googleReviewLink || "")

        // Fetch branches from the user document
        if (matchedDoc) {
          const userDocRef = doc(db, "users", matchedDoc.id)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()

            // Get business name from userData if available (to ensure it's up to date)
            const updatedBusinessName = userData.businessInfo?.businessName || matchedDoc.businessName || ""
            if (updatedBusinessName && updatedBusinessName !== businessName) {
              setBusinessName(updatedBusinessName)
            }

            // Get branches and filter only active ones - FIXED: Ensure location is properly fetched
            const branchesData = userData.businessInfo?.branches || []
            const activeBranches = branchesData
              .filter((branch: any) => branch.isActive !== false)
              .map((branch: any) => ({
                id: branch.id || `branch-${Math.random().toString(36).substr(2, 9)}`,
                name: branch.name || "Unnamed Branch",
                location: branch.location || "No location specified", // FIXED: Ensure location is always present
                isActive: true,
                googleReviewLink: branch.googleReviewLink || "",
              }))

            console.log("Fetched branches:", activeBranches) // Debug log
            setBranches(activeBranches)

            // Also get Google review link from user data if not in review_link
            const userGoogleLink = userData.businessInfo?.googleReviewLink || ""
            if (!googleReviewLink && userGoogleLink) {
              setGoogleReviewLink(userGoogleLink)
            }

            setReviewLinkUrl(matchedDoc.reviewLinkUrl || "")
          }
        }
      } catch (error) {
        console.error("Error loading config:", error)
        toast.error("Failed to load review page configuration")
      } finally {
        setLoading(false)
      }
    }

    loadBusinessConfig()
  }, [businessSlug])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setFormErrors((prev) => ({
      ...prev,
      [name]: false,
    }))
  }

  const validateForm = () => {
    const errors = {
      name: !formData.name.trim(),
      phone: !formData.phone.trim(),
      email: !formData.email.trim(),
      branchname: !formData.branchname.trim(),
      review: !formData.review.trim(),
    }
    setFormErrors(errors)
    return !Object.values(errors).some(Boolean)
  }

  const validateGoogleForm = () => {
    const errors = {
      name: false, // Not required for Google reviews
      phone: false, // Not required for Google reviews
      email: false, // Not required for Google reviews
      branchname: !formData.branchname.trim(),
      review: false, // Not required for Google reviews
    }
    setFormErrors(errors)
    return !errors.branchname
  }

  const handleSetRating = (rating: number) => {
    setRating(rating)
    setSubmitted(false)
    setShowForm(false)
    setShowBranchSelector(false)
    setShowGoogleForm(false)
    setSelectedBranch(null)
    setFormData({
      name: "",
      phone: "",
      email: "",
      branchname: "",
      review: "",
    })
  }

  const handleLeaveReview = async () => {
    if (rating === 0) return

    // For all ratings, show branch selector first if not already selected
    if (!selectedBranch && !showBranchSelector) {
      setShowBranchSelector(true)
      return
    }

    // For ratings 4-5, show Google form after branch selection
    if (rating >= 4) {
      if (!showGoogleForm) {
        setShowGoogleForm(true)
        return
      }

      if (!validateGoogleForm()) {
        return
      }

      // Track the Google review attempt
      try {
        await submitReview({
          name: "Google Review User",
          phone: "",
          email: "",
          branchname: formData.branchname,
          review: `Customer went to Google Reviews - Rating: ${rating} stars - Branch: ${formData.branchname}`,
          rating,
          businessId,
          platform: "Google",
          reviewType: "external",
        })
      } catch (error) {
        console.error("Error tracking Google review:", error)
      }

      // Redirect to Google Reviews - use branch-specific link if available
      const reviewUrl = selectedBranch?.googleReviewLink || googleReviewLink || reviewLinkUrl
      window.open(reviewUrl, "_blank")
      setSubmitted(true)
      setSubmissionMessage("Thank you for choosing to review us on Google!")
      return
    }

    // For ratings 1-3, show form after branch selection
    if (rating <= 3) {
      if (!showForm) {
        setShowForm(true)
        return
      }

      if (!validateForm()) {
        return
      }

      try {
        await submitReview({
          ...formData,
          rating,
          businessId,
          platform: "internal",
          reviewType: "internal",
        })
        setSubmissionMessage("We're sorry to hear about your experience. Thank you for your feedback.")
        setSubmitted(true)
      } catch (error) {
        console.error("Error submitting review:", error)
        toast.error("Failed to submit feedback. Please try again.")
      }
    }
  }

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    // FIXED: Include both branch name and location in the form data
    setFormData((prev) => ({
      ...prev,
      branchname: `${branch.name} - ${branch.location}`,
    }))
    setShowBranchSelector(false)

    // After selecting branch, show appropriate next step
    if (rating >= 4) {
      setShowGoogleForm(true)
    } else if (rating <= 3) {
      setShowForm(true)
    }
  }

  const handlePublicReview = async () => {
    // For 3-star ratings, allow them to go to Google anyway
    if (!validateGoogleForm()) {
      return
    }

    try {
      await submitReview({
        name: "Public Review User",
        phone: "",
        email: "",
        branchname: formData.branchname,
        review: `Customer chose public review option - Rating: ${rating} stars - Branch: ${formData.branchname}`,
        rating,
        businessId,
        platform: "Google",
        reviewType: "external",
      })
    } catch (error) {
      console.error("Error tracking public review:", error)
    }

    // Use branch-specific Google review link if available
    const reviewUrl = selectedBranch?.googleReviewLink || googleReviewLink || reviewLinkUrl
    window.open(reviewUrl, "_blank")
    setSubmitted(true)
    setSubmissionMessage("Thank you for choosing to leave a public review!")
  }

  const submitReview = async (reviewData: ReviewFormData) => {
    try {
      const reviewToSubmit = {
        ...reviewData,
        businessName,
        createdAt: serverTimestamp(),
        status: "pending",
        timestamp: Date.now(),
      }

      const userReviewsRef = collection(db, "users", businessId, "reviews")
      const docRef = await addDoc(userReviewsRef, reviewToSubmit)

      console.log("Review submitted with ID:", docRef.id)
      toast.success("Thank you for your feedback!")
    } catch (error) {
      console.error("Error submitting review:", error)
      throw error
    }
  }

  const resetForm = () => {
    setRating(0)
    setShowForm(false)
    setSubmitted(false)
    setSelectedBranch(null)
    setShowBranchSelector(false)
    setShowGoogleForm(false)
    setFormData({
      name: "",
      phone: "",
      email: "",
      branchname: "",
      review: "",
    })
    setFormErrors({
      name: false,
      phone: false,
      email: false,
      branchname: false,
      review: false,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="relative mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            <motion.div
              className="absolute inset-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full opacity-20"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            />
          </motion.div>
          <motion.p
            className="text-lg text-gray-600 font-medium"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Loading your review experience...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Image Background Section */}
        <motion.div
          className="w-full lg:w-1/2 relative overflow-hidden flex flex-col justify-center items-center p-4 lg:p-8"
          style={{
            backgroundImage: previewImage ? `url(${previewImage})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Fallback background if no image */}
          {!previewImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900" />
          )}

          <div className="relative text-white text-center max-w-lg z-10">
            {!previewImage && (
              <motion.div
                className="w-full max-w-lg aspect-square rounded-3xl bg-white/10 backdrop-blur-sm shadow-2xl flex items-center justify-center mb-6 border border-white/20 mx-auto"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-center p-8">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Mountain className="h-24 w-24 mx-auto text-white/80 mb-6" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white">{businessName || "Your Business"}</h3>
                </div>
              </motion.div>
            )}

            <motion.div
              className="max-w-md mx-auto"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Sparkles className="h-6 w-6 text-yellow-300" />
                </motion.div>
                <h3
                  className={`font-bold text-white ${isFormActive ? "text-2xl lg:text-3xl" : "text-4xl lg:text-5xl"} transition-all duration-300`}
                >
                  {welcomeTitle || "We value your opinion!"}
                </h3>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 1 }}
                >
                  <Heart className="h-6 w-6 text-pink-300" />
                </motion.div>
              </div>
              <p
                className={`text-white/90 leading-relaxed transition-all duration-300 ${isFormActive ? "text-base lg:text-lg" : "text-lg lg:text-xl"}`}
              >
                {welcomeText || "Share your experience and help us improve"}
              </p>
            </motion.div>

            {/* Floating elements */}
            <motion.div
              className="absolute top-10 right-10 w-4 h-4 bg-white/30 rounded-full"
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.div
              className="absolute bottom-20 left-10 w-6 h-6 bg-white/20 rounded-full"
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, delay: 1 }}
            />
          </div>
        </motion.div>

        {/* Right Side - Responsive Form */}
        <motion.div
          className="w-full lg:w-1/2 bg-white flex flex-col relative min-h-screen overflow-y-auto"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="flex-1 flex flex-col justify-center w-full max-w-xl mx-auto p-4 lg:p-8">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="submitted"
                  className="text-center space-y-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="w-20 h-20 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <Award className="h-10 w-10 text-white" />
                  </motion.div>
                  <motion.div
                    className="p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-gray-700 font-medium text-lg">{submissionMessage}</p>
                  </motion.div>
                  <motion.button
                    onClick={resetForm}
                    className="w-full py-3 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Leave Another Review
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Logo Display */}
                  {logoImage && (
                    <motion.div
                      className="flex justify-center mb-6"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <img
                        src={logoImage || "/placeholder.svg"}
                        alt={`${businessName} Logo`}
                        className="h-16 object-contain filter drop-shadow-lg"
                        onError={(e) => {
                          console.error("Logo failed to load:", logoImage)
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </motion.div>
                  )}

                  <motion.div
                    className="text-center mb-8"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2
                      className={`font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2 transition-all duration-300 ${isFormActive ? "text-2xl lg:text-3xl" : "text-3xl lg:text-4xl"}`}
                    >
                      Rate Your Experience
                    </h2>
                    <p
                      className={`text-gray-600 transition-all duration-300 ${isFormActive ? "text-sm lg:text-base" : "text-base lg:text-lg"}`}
                    >
                      {previewText || "How was your experience?"}
                    </p>
                  </motion.div>

                  <div className="mb-8">
                    <motion.div
                      className="flex justify-center space-x-2 mb-6"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          onClick={() => handleSetRating(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          className={`p-2 lg:p-3 rounded-2xl transition-all duration-300 ${
                            star <= (hoveredStar || rating)
                              ? "bg-gradient-to-r from-yellow-100 to-orange-100 shadow-lg"
                              : "hover:bg-gray-50"
                          }`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + star * 0.1 }}
                        >
                          <Star
                            className={`transition-all duration-300 ${isFormActive ? "h-6 w-6 lg:h-8 lg:w-8" : "h-8 w-8 lg:h-10 lg:w-10"} ${
                              star <= (hoveredStar || rating)
                                ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                                : "text-gray-300"
                            }`}
                          />
                        </motion.button>
                      ))}
                    </motion.div>

                    <motion.div
                      className={`flex justify-between text-gray-500 mb-6 transition-all duration-300 ${isFormActive ? "text-xs lg:text-sm" : "text-xs lg:text-sm"}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      <span>Not satisfied</span>
                      <span>Very satisfied</span>
                    </motion.div>

                    <AnimatePresence>
                      {rating > 0 && (
                        <motion.div
                          className={`mt-6 p-4 lg:p-6 rounded-2xl border-2 ${
                            rating >= 4
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                              : "bg-gradient-to-r from-orange-50 to-red-50 border-orange-200"
                          }`}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          transition={{ duration: 0.4 }}
                        >
                          <p
                            className={`text-gray-700 font-semibold text-center flex items-center justify-center transition-all duration-300 ${isFormActive ? "text-sm lg:text-base" : "text-base lg:text-lg"}`}
                          >
                            {rating >= 4 ? (
                              <>
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                >
                                  <ThumbsUp
                                    className={`mr-3 text-green-500 transition-all duration-300 ${isFormActive ? "h-4 w-4 lg:h-5 lg:w-5" : "h-5 w-5 lg:h-6 lg:w-6"}`}
                                  />
                                </motion.div>
                                We're glad you enjoyed your experience!
                              </>
                            ) : (
                              <>
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                >
                                  <ThumbsDown
                                    className={`mr-3 text-orange-500 transition-all duration-300 ${isFormActive ? "h-4 w-4 lg:h-5 lg:w-5" : "h-5 w-5 lg:h-6 lg:w-6"}`}
                                  />
                                </motion.div>
                                We're sorry to hear that. We'll use your feedback to improve.
                              </>
                            )}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* Branch Selector - FIXED: Better display of branch name and location */}
                    {showBranchSelector && (
                      <motion.div
                        key="branch-selector"
                        className="mb-6 space-y-4"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div className="p-4 lg:p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200">
                          <p className="text-gray-700 font-semibold text-center mb-4 text-sm lg:text-base">
                            Please select your branch location:
                          </p>
                          {branches.length > 0 ? (
                            <div className="space-y-3">
                              {branches.map((branch, index) => (
                                <motion.button
                                  key={index}
                                  onClick={() => handleBranchSelect(branch)}
                                  className="w-full py-3 px-4 text-left rounded-xl border-2 border-gray-200 hover:bg-white hover:border-orange-300 hover:shadow-lg transition-all duration-300 bg-white/50 backdrop-blur-sm"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="font-semibold text-gray-800 text-sm lg:text-base">{branch.name}</div>
                                  <div className="text-xs lg:text-sm text-gray-600 mt-1">{branch.location}</div>
                                </motion.button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 text-sm">No branch locations available</p>
                          )}
                        </div>
                        <motion.button
                          onClick={() => setShowBranchSelector(false)}
                          className="w-full py-3 px-6 rounded-xl font-medium text-orange-600 border-2 border-orange-600 hover:bg-orange-50 transition-all duration-300 text-sm lg:text-base"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Back
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Google Form for 4-5 star ratings */}
                    {showGoogleForm && rating >= 4 && (
                      <motion.div
                        key="google-form"
                        className="mb-6 space-y-4"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div className="p-4 lg:p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                          <div className="text-center">
                            <motion.div
                              className="w-16 h-16 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4"
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 200 }}
                            >
                              <Sparkles className="h-8 w-8 text-white" />
                            </motion.div>
                            <p className="text-green-700 font-semibold mb-3 text-sm lg:text-base">
                              Fantastic! You'll be redirected to Google to leave your review.
                            </p>
                            <p className="text-green-600 text-xs lg:text-sm">
                              Selected Branch: <strong>{formData.branchname}</strong>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Form for 1-3 star ratings */}
                    {showForm && rating <= 3 && isReviewGatingEnabled && (
                      <motion.div
                        key="feedback-form"
                        className="mb-6 space-y-4"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                      >
                        {[
                          { name: "name", label: "Your Name", type: "text", required: true },
                          { name: "phone", label: "Phone Number", type: "tel", required: true },
                          { name: "email", label: "Email Address", type: "email", required: true },
                        ].map((field, index) => (
                          <motion.div
                            key={field.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <label
                              htmlFor={field.name}
                              className="block text-xs lg:text-sm font-semibold text-gray-700 mb-2"
                            >
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                              type={field.type}
                              id={field.name}
                              name={field.name}
                              value={formData[field.name as keyof typeof formData]}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-300 text-xs lg:text-sm ${
                                formErrors[field.name as keyof typeof formErrors]
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              required={field.required}
                            />
                            {formErrors[field.name as keyof typeof formErrors] && (
                              <motion.p
                                className="mt-2 text-xs text-red-500 font-medium"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                This field is required
                              </motion.p>
                            )}
                          </motion.div>
                        ))}

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <label
                            htmlFor="branchname"
                            className="block text-xs lg:text-sm font-semibold text-gray-700 mb-2"
                          >
                            Branch Location <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="branchname"
                            name="branchname"
                            value={formData.branchname}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-300 text-xs lg:text-sm ${
                              formErrors.branchname
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            required
                          >
                            <option value="">Select a branch</option>
                            {branches.map((branch, index) => (
                              <option key={index} value={`${branch.name} - ${branch.location}`}>
                                {branch.name} - {branch.location}
                              </option>
                            ))}
                          </select>
                          {formErrors.branchname && (
                            <motion.p
                              className="mt-2 text-xs text-red-500 font-medium"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              This field is required
                            </motion.p>
                          )}
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <label htmlFor="review" className="block text-xs lg:text-sm font-semibold text-gray-700 mb-2">
                            Your Review <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="review"
                            name="review"
                            rows={3}
                            value={formData.review}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-300 resize-none text-xs lg:text-sm ${
                              formErrors.review ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                            placeholder="Please share your experience with us..."
                            required
                          ></textarea>
                          {formErrors.review && (
                            <motion.p
                              className="mt-2 text-xs text-red-500 font-medium"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              This field is required
                            </motion.p>
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!showBranchSelector && !showGoogleForm && !showForm && (
                    <motion.button
                      onClick={handleLeaveReview}
                      disabled={rating === 0}
                      className={`
                        w-full py-3 lg:py-4 px-6 rounded-2xl font-semibold text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl
                        ${isFormActive ? "text-sm lg:text-base" : "text-base lg:text-lg"}
                        ${
                          rating === 0
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transform hover:scale-105"
                        }
                      `}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      whileHover={rating > 0 ? { scale: 1.02 } : {}}
                      whileTap={rating > 0 ? { scale: 0.98 } : {}}
                    >
                      {rating > 0 ? "Continue" : "Select a Rating to Continue"}
                      <ChevronRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
                    </motion.button>
                  )}

                  {(showGoogleForm || showForm) && (
                    <motion.div
                      className="space-y-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.button
                        onClick={handleLeaveReview}
                        className="w-full py-3 lg:py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-sm lg:text-base"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {rating >= 4 ? "Continue to Google" : "Submit Your Feedback"}
                        <ChevronRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
                      </motion.button>

                      {/* Public Review Link for 3-star ratings */}
                      {rating <= 3 && (
                        <motion.div
                          className="text-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs lg:text-sm">
                              <span className="px-4 bg-white text-gray-500">or</span>
                            </div>
                          </div>
                          <motion.button
                            onClick={handlePublicReview}
                            className="mt-4 text-xs lg:text-sm text-orange-600 hover:text-orange-800 transition-colors underline font-medium"
                            whileHover={{ scale: 1.05 }}
                          >
                            Leave a public review instead
                          </motion.button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  <motion.p
                    className="text-xs text-gray-400 mt-8 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    Powered by{" "}
                    <span className="font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      ReviewUplift
                    </span>
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

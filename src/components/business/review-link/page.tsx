"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Edit,
  Mountain,
  Star,
  Upload,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Award,
  Sparkles,
  Heart,
  ExternalLink,
  Settings,
  ImageIcon,
  Palette,
  Check,
  Copy,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import Sidebar from "@/components/sidebar"
import ConfirmDialog from "@/components/confirm-dialog"
import { useNavigate } from "react-router-dom"
import { Textarea } from "@/components/ui/textarea"
import { auth, db, storage } from "@/firebase/firebase"
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { onAuthStateChanged } from "firebase/auth"
import { motion } from "framer-motion"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  emailVerified: boolean
  phoneVerified: boolean
  branches: Array<{ name: string; location: string }>
  googleReviewLink: string
}

const initialState = {
  businessName: "",
  previewText: "",
  previewImage: null as string | null,
  logoImage: null as string | null,
  reviewLinkUrl: "",
  isReviewGatingEnabled: true,
  rating: 0,
  welcomeTitle: "",
  welcomeText: "",
}

interface Review {
  id: string
  name: string
  email: string
  phone: string
  branchname: string
  message: string
  rating: number
  date: string
  replied: boolean
  status: string
}

export default function ReviewLinkPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [reviewLinkUrl, setReviewLinkUrl] = useState("")
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [tempBusinessSlug, setTempBusinessSlug] = useState("")
  const [isReviewGatingEnabled, setIsReviewGatingEnabled] = useState(true)
  const [showGatingConfirm, setShowGatingConfirm] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const [previewText, setPreviewText] = useState("")
  const [welcomeTitle, setWelcomeTitle] = useState("")
  const [welcomeText, setWelcomeText] = useState("")
  const [isEditingPreview, setIsEditingPreview] = useState(false)
  const [tempBusinessName, setTempBusinessName] = useState("")
  const [tempPreviewText, setTempPreviewText] = useState("")
  const [tempWelcomeTitle, setTempWelcomeTitle] = useState("")
  const [tempWelcomeText, setTempWelcomeText] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
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
  const [submitted, setSubmitted] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [previewImageUploading, setPreviewImageUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [googleReviewLink, setGoogleReviewLink] = useState("")
  const [oldPreviewImageUrl, setOldPreviewImageUrl] = useState<string | null>(null)
  const [oldLogoImageUrl, setOldLogoImageUrl] = useState<string | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsCount, setReviewsCount] = useState(0)
  const [reviewsLimit, setReviewsLimit] = useState<number | null>(5)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [activeTab, setActiveTab] = useState("settings")
  const [copied, setCopied] = useState(false)

  const fetchReviews = useCallback(async () => {
    if (!currentUser || reviewsLimit === null) return

    try {
      let reviewsQuery = query(collection(db, "users", currentUser.uid, "reviews"), orderBy("createdAt", "desc"))

      if (reviewsLimit > 0) {
        reviewsQuery = query(reviewsQuery, limit(reviewsLimit))
      }

      const querySnapshot = await getDocs(reviewsQuery)

      const userDocRef = doc(db, "users", currentUser.uid)
      const userDocSnap = await getDoc(userDocRef)
      let activeBranchNames: string[] = []

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        const branches = userData.businessInfo?.branches || []
        activeBranchNames = branches
          .filter((branch: any) => branch.isActive !== false)
          .map((branch: any) => branch.name)
      }

      const reviewsData: Review[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = data.createdAt ? data.createdAt.toDate() : null

        if (!data.branchname || activeBranchNames.includes(data.branchname) || data.status === "published") {
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
          })
        }
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
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)

          let businessNameFromInfo = ""
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            const businessInfoData = userData.businessInfo || {}
            setBusinessInfo(businessInfoData)
            setGoogleReviewLink(businessInfoData.googleReviewLink || "")
            businessNameFromInfo = businessInfoData.businessName || ""
          }

          const userReviewLinkRef = doc(db, "users", user.uid, "review_link", "config")
          const userReviewLinkSnap = await getDoc(userReviewLinkRef)

          if (userReviewLinkSnap.exists()) {
            const data = userReviewLinkSnap.data()
            const finalBusinessName = businessNameFromInfo || data.businessName || ""
            setBusinessName(finalBusinessName)
            setTempBusinessName(finalBusinessName)

            setPreviewText(data.previewText || "")
            setWelcomeTitle(data.welcomeTitle || "")
            setWelcomeText(data.welcomeText || "")

            const fixedPreviewImage = data.previewImage
              ? data.previewImage.startsWith("gs://")
                ? data.previewImage
                    .replace("gs://", "https://firebasestorage.googleapis.com/v0/b/")
                    .replace("/o/", "/o/") + "?alt=media"
                : data.previewImage
              : null

            const fixedLogoImage = data.logoImage
              ? data.logoImage.startsWith("gs://")
                ? data.logoImage
                    .replace("gs://", "https://firebasestorage.googleapis.com/v0/b/")
                    .replace("/o/", "/o/") + "?alt=media"
                : data.logoImage
              : null

            setPreviewImage(fixedPreviewImage || null)
            setLogoImage(fixedLogoImage || null)
            setIsReviewGatingEnabled(data.isReviewGatingEnabled ?? true)

            setOldPreviewImageUrl(data.previewImage || null)
            setOldLogoImageUrl(data.logoImage || null)

            let reviewUrl = data.reviewLinkUrl
            if (!reviewUrl) {
              const slug = finalBusinessName ? finalBusinessName.toLowerCase().replace(/\s+/g, "-") : "your-business"
              reviewUrl = `http://localhost:8081/${slug}`
            }
            setReviewLinkUrl(reviewUrl)
            setTempBusinessSlug(reviewUrl.replace("http://localhost:8081/", ""))
          } else {
            const docRef = doc(db, "review_link", user.uid)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
              const data = docSnap.data()
              const finalBusinessName = businessNameFromInfo || data.businessName || ""
              setBusinessName(finalBusinessName)
              setTempBusinessName(finalBusinessName)

              setPreviewText(data.previewText || "")
              setWelcomeTitle(data.welcomeTitle || "")
              setWelcomeText(data.welcomeText || "")
              setPreviewImage(data.previewImage || null)
              setLogoImage(data.logoImage || null)
              setIsReviewGatingEnabled(data.isReviewGatingEnabled ?? true)

              setOldPreviewImageUrl(data.previewImage || null)
              setOldLogoImageUrl(data.logoImage || null)

              let reviewUrl = data.reviewLinkUrl
              if (!reviewUrl) {
                const slug = finalBusinessName ? finalBusinessName.toLowerCase().replace(/\s+/g, "-") : "your-business"
                reviewUrl = `http://localhost:8081/${slug}`
              }
              setReviewLinkUrl(reviewUrl)
              setTempBusinessSlug(reviewUrl.replace("http://localhost:8081/", ""))
            } else {
              const slug = businessNameFromInfo
                ? businessNameFromInfo.toLowerCase().replace(/\s+/g, "-")
                : "your-business"
              setReviewLinkUrl(`http://localhost:8081/${slug}`)
              setTempBusinessSlug(slug)
              setBusinessName(businessNameFromInfo || "")
              setTempBusinessName(businessNameFromInfo || "")
            }
          }
        } catch (error) {
          console.error("Error loading config:", error)
          toast.error("Failed to load configuration")
        } finally {
          setLoading(false)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!currentUser || loading) return

    const saveConfig = async () => {
      try {
        const config = {
          businessName,
          previewText,
          previewImage,
          logoImage,
          reviewLinkUrl,
          isReviewGatingEnabled,
          welcomeTitle,
          welcomeText,
          updatedAt: serverTimestamp(),
        }

        await setDoc(doc(db, "users", currentUser.uid, "review_link", "config"), config, { merge: true })
        await setDoc(doc(db, "review_link", currentUser.uid), config, { merge: true })

        const slug = tempBusinessSlug || businessName.toLowerCase().replace(/\s+/g, "-")
        await setDoc(
          doc(db, "slug_to_uid", slug),
          {
            uid: currentUser.uid,
            businessName,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      } catch (error) {
        console.error("Error saving config:", error)
        toast.error("Failed to save configuration")
      }
    }

    const timeoutId = setTimeout(saveConfig, 1000)
    return () => clearTimeout(timeoutId)
  }, [
    businessName,
    previewText,
    previewImage,
    logoImage,
    reviewLinkUrl,
    isReviewGatingEnabled,
    welcomeTitle,
    welcomeText,
    currentUser,
    loading,
    tempBusinessSlug,
  ])

  const handleUrlEdit = () => {
    if (isEditingUrl) {
      const newSlug = tempBusinessSlug.trim().toLowerCase().replace(/\s+/g, "-")
      const newUrl = `http://localhost:8081/${newSlug}`
      setReviewLinkUrl(newUrl)
      setTempBusinessSlug(newSlug)

      if (currentUser) {
        setDoc(
          doc(db, "slug_to_uid", newSlug),
          {
            uid: currentUser.uid,
            businessName,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ).catch((error) => {
          console.error("Error updating slug mapping:", error)
          toast.error("Failed to update URL")
        })
      }
    } else {
      setTempBusinessSlug(reviewLinkUrl.replace("http://localhost:8081/", ""))
    }
    setIsEditingUrl(!isEditingUrl)
  }

  const handlePreviewEdit = () => {
    if (isEditingPreview) {
      setBusinessName(tempBusinessName)
      setPreviewText(tempPreviewText)
      setWelcomeTitle(tempWelcomeTitle)
      setWelcomeText(tempWelcomeText)
    } else {
      setTempBusinessName(businessName)
      setTempPreviewText(previewText)
      setTempWelcomeTitle(welcomeTitle)
      setTempWelcomeText(welcomeText)
    }
    setIsEditingPreview(!isEditingPreview)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, or WEBP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB.")
      return
    }

    setPreviewImageUploading(true)
    try {
      const extension = file.name.split(".").pop()
      const uniqueFilename = `${uuidv4()}.${extension}`
      const storageRefPath = `users/${currentUser.uid}/preview-images/${uniqueFilename}`
      const storageRefInstance = ref(storage, storageRefPath)

      await uploadBytes(storageRefInstance, file)
      const url = await getDownloadURL(storageRefInstance)
      setPreviewImage(url)
      toast.success("Preview image uploaded!")

      if (oldPreviewImageUrl) {
        try {
          const oldRef = ref(storage, oldPreviewImageUrl)
          await deleteObject(oldRef)
        } catch (err) {
          console.warn("Failed to delete old preview image", err)
        }
      }
      setOldPreviewImageUrl(storageRefPath)
    } catch (err) {
      console.error("Error uploading preview image:", err)
      toast.error("Upload failed.")
    } finally {
      setPreviewImageUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid logo type. Use JPG, PNG, WEBP, or SVG.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo too large. Max 2MB.")
      return
    }

    setLogoUploading(true)
    try {
      const extension = file.name.split(".").pop()
      const uniqueFilename = `${uuidv4()}.${extension}`
      const storageRefPath = `users/${currentUser.uid}/logos/${uniqueFilename}`
      const storageRefInstance = ref(storage, storageRefPath)

      await uploadBytes(storageRefInstance, file)
      const url = await getDownloadURL(storageRefInstance)
      setLogoImage(url)
      toast.success("Logo uploaded!")

      if (oldLogoImageUrl) {
        try {
          const oldRef = ref(storage, oldLogoImageUrl)
          await deleteObject(oldRef)
        } catch (err) {
          console.warn("Failed to delete old logo", err)
        }
      }
      setOldLogoImageUrl(storageRefPath)
    } catch (err) {
      console.error("Error uploading logo:", err)
      toast.error("Upload failed.")
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

  const handleDeleteImage = async () => {
    if (previewImage) {
      try {
        const imageRef = ref(storage, previewImage)
        await deleteObject(imageRef)
        setPreviewImage(null)
        setOldPreviewImageUrl(null)
        toast.success("Image removed successfully")
      } catch (error) {
        console.error("Error deleting image:", error)
        toast.error("Failed to remove image")
      }
    } else {
      setPreviewImage(null)
    }
  }

  const handleDeleteLogo = async () => {
    if (logoImage) {
      try {
        const logoRef = ref(storage, logoImage)
        await deleteObject(logoRef)
        setLogoImage(null)
        setOldLogoImageUrl(null)
        toast.success("Logo removed successfully")
      } catch (error) {
        console.error("Error deleting logo:", error)
        toast.error("Failed to remove logo")
      }
    } else {
      setLogoImage(null)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const triggerLogoInput = () => {
    logoInputRef.current?.click()
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => ({ ...prev, [name]: false }))
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

  const saveNegativeReview = async () => {
    if (!currentUser) return

    try {
      const reviewData = {
        ...formData,
        rating,
        businessName,
        createdAt: serverTimestamp(),
        status: "pending",
        userId: currentUser.uid,
        platform: "internal",
        reviewType: "internal",
      }

      await addDoc(collection(db, "users", currentUser.uid, "reviews"), reviewData)

      setSubmitted(true)
      setSubmissionMessage("We're sorry to hear about your experience. Thank you for your feedback.")
    } catch (error) {
      console.error("Error saving negative review:", error)
      setSubmissionMessage("There was an error submitting your feedback. Please try again.")
    }
  }

  const handleLeaveReview = async () => {
    if (rating === 0) return

    if (!isReviewGatingEnabled) {
      window.open(reviewLinkUrl, "_blank")
      return
    }

    if (rating >= 4) {
      const url = googleReviewLink || reviewLinkUrl
      window.open(url, "_blank")
      return
    }

    if (!showForm) {
      setShowForm(true)
      return
    }

    if (!validateForm()) return

    await saveNegativeReview()
  }

  const handleToggleReviewGating = () => {
    if (isReviewGatingEnabled) {
      setShowGatingConfirm(true)
    } else {
      setIsReviewGatingEnabled(true)
    }
  }

  const confirmDisableGating = () => {
    setIsReviewGatingEnabled(false)
    setShowGatingConfirm(false)
  }

  const navigateToPreviewPage = () => {
    navigate("/review")
  }

  const resetForm = () => {
    setRating(0)
    setShowForm(false)
    setSubmitted(false)
    setSubmissionMessage("")
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

  const handlePublicReview = () => {
    const url = googleReviewLink || reviewLinkUrl
    window.open(url, "_blank")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reviewLinkUrl)
    setCopied(true)
    toast.success("URL copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-violet-50 to-teal-50">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-8 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-rose-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Star className="h-6 w-6 text-rose-500" />
              </div>
            </motion.div>
            <motion.p
              className="mt-6 text-lg font-medium text-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Loading your review settings...
            </motion.p>
            <motion.p
              className="mt-2 text-sm text-gray-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Please wait while we prepare your dashboard
            </motion.p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-teal-50">
      <Sidebar />

      <div className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <motion.h1
                className="text-3xl font-bold mb-2 bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Review Link
              </motion.h1>
              <p className="text-gray-600">
                Customize your review collection page and manage how customers leave feedback
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToPreviewPage}
                  className="border-amber-200 hover:bg-amber-50 hover:text-amber-600 transition-all"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button> */}
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  onClick={() => window.open(reviewLinkUrl, "_blank")}
                  className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white transition-all"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Live Link
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100"
              >
                <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-6">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Share Your Review Link
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    This is the URL you'll share with customers to collect reviews
                  </p>
                </div>
                <div className="p-6">
                  {isEditingUrl ? (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="whitespace-nowrap mr-2 text-gray-600 font-medium">http://localhost:8081/</span>
                        <Input
                          value={tempBusinessSlug}
                          onChange={(e) => setTempBusinessSlug(e.target.value)}
                          aria-label="Review link business slug"
                          className="flex-1 border-amber-200 focus:ring-2 focus:ring-amber-300"
                          placeholder="your-business"
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Only use letters, numbers, and hyphens. No spaces or special characters.
                      </p>
                      <div className="flex justify-end space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingUrl(false)}
                          className="border-gray-200"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUrlEdit}
                          className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                        >
                          Save URL
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <motion.div
                        className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center"
                        whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                      >
                        <div className="flex-1 font-medium text-gray-700 truncate">{reviewLinkUrl}</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={copyToClipboard}
                                className="ml-2 text-gray-500 hover:text-rose-500"
                              >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{copied ? "Copied!" : "Copy URL"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </motion.div>
                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(reviewLinkUrl, "_blank")}
                          className="border-rose-200 hover:bg-rose-50 flex-1 md:flex-none"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Test Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUrlEdit}
                          className="border-rose-200 hover:bg-rose-50 flex-1 md:flex-none"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit URL
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100"
              >
                <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-6">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Review Gating
                  </h2>
                  <p className="text-white/80 text-sm mt-1">Control how customer feedback is collected</p>
                </div>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Star Filter</h3>
                        <Badge
                          className={`ml-3 ${
                            isReviewGatingEnabled
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          }`}
                        >
                          {isReviewGatingEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-gray-600">
                        When enabled, only customers with positive experiences (4-5 stars) will be directed to leave
                        public reviews. Negative reviews will be collected privately.
                      </p>
                      <motion.div
                        className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100"
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-sm text-gray-700">
                          {isReviewGatingEnabled
                            ? "Negative reviews will be sent to your feedback form"
                            : "All reviews will be sent to public review sites"}
                        </p>
                      </motion.div>
                    </div>
                    <div className="flex items-center justify-center">
                      <Switch
                        id="review-gating"
                        checked={isReviewGatingEnabled}
                        onCheckedChange={handleToggleReviewGating}
                        aria-label="Toggle review gating"
                        className="data-[state=checked]:bg-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100"
              >
                <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center">
                        <Palette className="h-5 w-5 mr-2" />
                        Customize Your Review Page
                      </h2>
                      <p className="text-white/80 text-sm mt-1">Personalize how your review collection page looks</p>
                    </div>
                    {!isEditingPreview && (
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="secondary"
                          onClick={handlePreviewEdit}
                          className="bg-white/20 hover:bg-white/30 text-white border-none"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Design
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {isEditingPreview ? (
                    <div className="space-y-6">
                      <Tabs defaultValue="content" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="content">Content</TabsTrigger>
                          <TabsTrigger value="images">Images</TabsTrigger>
                          {/* <TabsTrigger value="preview">Preview</TabsTrigger> */}
                        </TabsList>
                        <TabsContent value="content" className="space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="business-name" className="text-gray-700">
                                Business Name
                              </Label>
                              <Input
                                id="business-name"
                                value={tempBusinessName}
                                onChange={(e) => setTempBusinessName(e.target.value)}
                                aria-label="Business name"
                                placeholder="Enter your business name"
                                className="border-amber-200 focus:ring-2 focus:ring-amber-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="welcome-title" className="text-gray-700">
                                Welcome Title
                              </Label>
                              <Input
                                id="welcome-title"
                                value={tempWelcomeTitle}
                                onChange={(e) => setTempWelcomeTitle(e.target.value)}
                                aria-label="Welcome title"
                                placeholder="Enter welcome title"
                                className="border-amber-200 focus:ring-2 focus:ring-amber-300"
                              />
                              <p className="text-xs text-gray-500">
                                This appears as the main heading on your review page
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="welcome-text" className="text-gray-700">
                                Welcome Text
                              </Label>
                              <Textarea
                                id="welcome-text"
                                value={tempWelcomeText}
                                onChange={(e) => setTempWelcomeText(e.target.value)}
                                aria-label="Welcome text"
                                placeholder="Enter welcome message"
                                className="border-amber-200 focus:ring-2 focus:ring-amber-300"
                              />
                              <p className="text-xs text-gray-500">
                                A brief message explaining why reviews are important to you
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="preview-text" className="text-gray-700">
                                Rating Prompt
                              </Label>
                              <Input
                                id="preview-text"
                                value={tempPreviewText}
                                onChange={(e) => setTempPreviewText(e.target.value)}
                                aria-label="Preview text"
                                placeholder="Enter preview text"
                                className="border-amber-200 focus:ring-2 focus:ring-amber-300"
                              />
                              <p className="text-xs text-gray-500">Text that appears above the star rating section</p>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="images" className="space-y-6">
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="business-image" className="text-gray-700 font-medium">
                                  Background Image
                                </Label>
                                {previewImage && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDeleteImage}
                                    className="text-red-500 border-red-200 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                                aria-label="Upload business image"
                              />
                              <motion.div
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                  previewImage
                                    ? "border-amber-200 bg-amber-50"
                                    : "border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                                }`}
                                onClick={triggerFileInput}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                              >
                                {previewImage ? (
                                  <div className="space-y-4">
                                    <div className="relative w-full h-40 rounded-lg overflow-hidden mx-auto">
                                      <img
                                        src={previewImage || "/placeholder.svg"}
                                        alt="Background preview"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <p className="text-sm text-gray-600">Click to change background image</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                                      <ImageIcon className="h-8 w-8 text-amber-500" />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-gray-700 font-medium">Upload background image</p>
                                      <p className="text-xs text-gray-500">
                                        Recommended size: 1200×800px (JPG, PNG, WEBP)
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {previewImageUploading && (
                                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <div className="flex items-center space-x-2">
                                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-amber-500"></div>
                                      <span className="text-sm text-gray-700">Uploading...</span>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="business-logo" className="text-gray-700 font-medium">
                                  Business Logo
                                </Label>
                                {logoImage && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDeleteLogo}
                                    className="text-red-500 border-red-200 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                              <input
                                type="file"
                                ref={logoInputRef}
                                onChange={handleLogoUpload}
                                accept="image/*"
                                className="hidden"
                                aria-label="Upload business logo"
                              />
                              <motion.div
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                  logoImage
                                    ? "border-amber-200 bg-amber-50"
                                    : "border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                                }`}
                                onClick={triggerLogoInput}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                              >
                                {logoImage ? (
                                  <div className="space-y-4">
                                    <div className="relative h-20 w-auto rounded-lg overflow-hidden mx-auto">
                                      <img
                                        src={logoImage || "/placeholder.svg"}
                                        alt="Logo preview"
                                        className="h-full w-auto object-contain mx-auto"
                                      />
                                    </div>
                                    <p className="text-sm text-gray-600">Click to change logo</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                                      <Upload className="h-8 w-8 text-amber-500" />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-gray-700 font-medium">Upload your business logo</p>
                                      <p className="text-xs text-gray-500">
                                        Recommended size: 400×200px (JPG, PNG, SVG)
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {logoUploading && (
                                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <div className="flex items-center space-x-2">
                                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-amber-500"></div>
                                      <span className="text-sm text-gray-700">Uploading...</span>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            </div>
                          </div>
                        </TabsContent>
                        {/* <TabsContent value="preview" className="space-y-6">
                          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              </div>
                              <div className="text-xs text-gray-500">Preview</div>
                              <div className="w-16"></div>
                            </div>
                            <div className="h-64 overflow-hidden">
                              <div className="flex flex-col h-full">
                                <div
                                  className="w-full h-1/2 relative overflow-hidden flex flex-col justify-center items-center p-4"
                                  style={{
                                    backgroundImage: previewImage ? `url(${previewImage})` : "none",
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }}
                                >
                                  <div className="absolute inset-0 bg-black/40" />
                                  {!previewImage && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-rose-700 via-amber-700 to-teal-700" />
                                  )}
                                  <div className="relative text-white text-center z-10">
                                    <h3 className="font-bold text-white text-xl">
                                      {tempWelcomeTitle || "We value your opinion!"}
                                    </h3>
                                    <p className="text-white/90 text-sm mt-1">
                                      {tempWelcomeText || "Share your experience and help us improve"}
                                    </p>
                                  </div>
                                </div>
                                <div className="w-full h-1/2 bg-white p-4 flex flex-col justify-start items-center">
                                  {logoImage && (
                                    <div className="mb-2">
                                      <img
                                        src={logoImage || "/placeholder.svg"}
                                        alt="Business logo"
                                        className="h-8 object-contain"
                                      />
                                    </div>
                                  )}
                                  <h2 className="font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent text-lg">
                                    Rate Your Experience
                                  </h2>
                                  <p className="text-gray-600 text-xs">
                                    {tempPreviewText || "How was your experience?"}
                                  </p>
                                  <div className="flex justify-center space-x-1 mt-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-5 w-5 ${star <= 3 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TabsContent> */}
                      </Tabs>

                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingPreview(false)}
                          className="border-gray-200"
                        >
                          Cancel
                        </Button>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={handlePreviewEdit}
                            className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                          >
                            Save Changes
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-6">
                        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.3 }}>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Content</h3>
                          <div className="space-y-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-500">Business Name</span>
                              <span className="text-gray-800">{businessName || "Not set"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-500">Welcome Title</span>
                              <span className="text-gray-800">{welcomeTitle || "We value your opinion!"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-500">Welcome Text</span>
                              <span className="text-gray-800">
                                {welcomeText || "Share your experience and help us improve"}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-500">Rating Prompt</span>
                              <span className="text-gray-800">{previewText || "How was your experience?"}</span>
                            </div>
                          </div>
                        </motion.div>
                        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.3 }}>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Images</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <span className="text-sm font-medium text-gray-500">Background Image</span>
                              {previewImage ? (
                                <div className="h-24 w-full rounded-lg overflow-hidden border border-gray-200">
                                  <img
                                    src={previewImage || "/placeholder.svg"}
                                    alt="Background preview"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-24 w-full rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <span className="text-sm font-medium text-gray-500">Business Logo</span>
                              {logoImage ? (
                                <div className="h-24 w-full rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                                  <img
                                    src={logoImage || "/placeholder.svg"}
                                    alt="Logo preview"
                                    className="h-16 w-auto object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="h-24 w-full rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                                  <Upload className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      <div className="md:w-1/3 flex flex-col items-center justify-center">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                          <Button
                            onClick={handlePreviewEdit}
                            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Design
                          </Button>
                        </motion.div>
                        <p className="text-sm text-gray-500 mt-3 text-center">
                          Customize the appearance of your review collection page
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="border-amber-200 shadow-xl transition-all hover:shadow-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-rose-500 to-amber-500 p-6">
                      <CardTitle className="text-xl font-bold text-white flex items-center">
                        <Eye className="h-5 w-5 mr-2" />
                        Live Preview
                      </CardTitle>
                      <CardDescription className="text-white/80">
                        How customers will see your review page
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div
                        className="w-full bg-white overflow-hidden flex flex-col"
                        style={{ maxHeight: "calc(100vh - 200px)" }}
                      >
                        <div ref={previewRef} className="overflow-y-auto">
                          {/* Left Side - Image Background Section */}
                          <div className="w-full relative overflow-hidden flex flex-col justify-center items-center p-4 lg:p-8 bg-gradient-to-br from-rose-700 via-amber-700 to-teal-700 h-64">
                            {/* Dark overlay for better text readability */}
                            <div className="absolute inset-0 bg-black/40" />

                            {previewImage ? (
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${previewImage})` }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-rose-700 via-amber-700 to-teal-700" />
                            )}

                            <div className="relative text-white text-center max-w-lg z-10">
                              {!previewImage && (
                                <motion.div
                                  className="w-full max-w-lg aspect-square rounded-3xl bg-white/10 backdrop-blur-sm shadow-2xl flex items-center justify-center mb-6 border border-white/20 mx-auto"
                                  whileHover={{ scale: 1.05 }}
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <div className="text-center p-8">
                                    <Mountain className="h-24 w-24 mx-auto text-white/80 mb-6" />
                                    <h3 className="text-2xl font-bold text-white">{businessName || "Your Business"}</h3>
                                  </div>
                                </motion.div>
                              )}

                              <div className="max-w-md mx-auto">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }}
                                  >
                                    <Sparkles className="h-6 w-6 text-yellow-300" />
                                  </motion.div>
                                  <h3 className="font-bold text-white text-4xl lg:text-5xl">
                                    {welcomeTitle || "We value your opinion!"}
                                  </h3>
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{
                                      duration: 1.5,
                                      delay: 0.5,
                                      repeat: Number.POSITIVE_INFINITY,
                                      repeatType: "loop",
                                    }}
                                  >
                                    <Heart className="h-6 w-6 text-pink-300" />
                                  </motion.div>
                                </div>
                                <p className="text-white/90 leading-relaxed text-lg lg:text-xl">
                                  {welcomeText || "Share your experience and help us improve"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Right Side - Form Section */}
                          <div className="w-full bg-white p-6 flex flex-col justify-center">
                            <div className="max-w-xs mx-auto w-full">
                              {submitted ? (
                                <div className="text-center space-y-6">
                                  <motion.div
                                    className="w-20 h-20 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                  >
                                    <Award className="h-10 w-10 text-white" />
                                  </motion.div>
                                  <motion.div
                                    className="p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <p className="text-gray-700 font-medium text-lg">{submissionMessage}</p>
                                  </motion.div>
                                  <motion.button
                                    onClick={resetForm}
                                    className="w-full py-3 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-rose-600 to-amber-600 shadow-lg transition-all duration-300"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    Leave Another Review
                                  </motion.button>
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {logoImage && (
                                    <div className="flex justify-center mb-4">
                                      <img
                                        src={logoImage || "/placeholder.svg"}
                                        alt={`${businessName} Logo`}
                                        className="h-16 object-contain filter drop-shadow-lg"
                                      />
                                    </div>
                                  )}

                                  <div className="text-center mb-6">
                                    <h2 className="font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent mb-2 text-3xl">
                                      Rate Your Experience
                                    </h2>
                                    <p className="text-gray-600 text-lg">{previewText || "How was your experience?"}</p>
                                  </div>

                                  <div className="mb-6">
                                    <div className="flex justify-center space-x-2 mb-4">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <motion.button
                                          key={star}
                                          onClick={() => setRating(star)}
                                          onMouseEnter={() => setHoveredStar(star)}
                                          onMouseLeave={() => setHoveredStar(0)}
                                          className={`p-3 rounded-2xl transition-all duration-300 ${
                                            star <= (hoveredStar || rating)
                                              ? "bg-gradient-to-r from-amber-100 to-rose-100 shadow-lg"
                                              : "hover:bg-gray-50"
                                          }`}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                          <Star
                                            className={`h-10 w-10 transition-all duration-300 ${
                                              star <= (hoveredStar || rating)
                                                ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                                : "text-gray-300"
                                            }`}
                                          />
                                        </motion.button>
                                      ))}
                                    </div>

                                    <div className="flex justify-between text-gray-500 mb-4">
                                      <span>Not satisfied</span>
                                      <span>Very satisfied</span>
                                    </div>

                                    {rating > 0 && (
                                      <motion.div
                                        className={`mt-4 p-6 rounded-2xl border-2 ${
                                          rating >= 4
                                            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                                            : "bg-gradient-to-r from-amber-50 to-rose-50 border-amber-200"
                                        }`}
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.4 }}
                                      >
                                        <p className="text-gray-700 font-semibold text-center flex items-center justify-center text-lg">
                                          {rating >= 4 ? (
                                            <>
                                              <ThumbsUp className="mr-3 text-green-500 h-6 w-6" />
                                              We're glad you enjoyed your experience!
                                            </>
                                          ) : (
                                            <>
                                              <ThumbsDown className="mr-3 text-amber-500 h-6 w-6" />
                                              We're sorry to hear that. We'll use your feedback to improve.
                                            </>
                                          )}
                                        </p>
                                      </motion.div>
                                    )}
                                  </div>

                                  <motion.button
                                    onClick={handleLeaveReview}
                                    disabled={rating === 0}
                                    className={`
                                      w-full py-4 px-6 rounded-2xl font-semibold text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl text-lg
                                      ${
                                        rating === 0
                                          ? "bg-gray-300 cursor-not-allowed"
                                          : "bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700"
                                      }
                                    `}
                                    whileHover={rating > 0 ? { scale: 1.05 } : {}}
                                    whileTap={rating > 0 ? { scale: 0.95 } : {}}
                                  >
                                    {rating > 0 ? "Continue" : "Select a Rating to Continue"}
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 border-t border-gray-200 p-4 flex justify-center">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          onClick={() => window.open(reviewLinkUrl, "_blank")}
                          className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Full Preview
                        </Button>
                      </motion.div>
                    </CardFooter>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showGatingConfirm}
        onClose={() => setShowGatingConfirm(false)}
        onConfirm={confirmDisableGating}
        title="Disable Review Gating"
        description="Are you sure you want to disable review gating? All customers will be directed to leave public reviews regardless of their rating."
        confirmText="Disable"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  FaEnvelope,
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
  FaGoogle,
  FaLock,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useLocation } from "react-router-dom"
import { db, auth } from "../firebase/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "firebase/auth"
import { toast } from "sonner"

interface Branch {
  name: string
  location: string
  googleReviewLink: string
}

export default function BusinessForm() {
  const location = useLocation()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
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
    customBusinessType: "",
  })

  // Single branch state
  const [branch, setBranch] = useState<Branch>({
    name: "",
    location: "",
    googleReviewLink: "",
  })

  // Get UID and registration email from location state
  const [uid, setUid] = useState(location.state?.uid || "")
  const [registrationEmail, setRegistrationEmail] = useState(location.state?.registrationEmail || "")

  // Verification states
  const [emailVerified, setEmailVerified] = useState(true) // Auto-verified since it comes from registration
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [showOtpField, setShowOtpField] = useState(false)
  const [verifyingPhone, setVerifyingPhone] = useState(false)
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null)
  const [confirmationResult, setConfirmationResult] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Reset all form and verification states
  const resetForm = () => {
    setFormData({
      businessName: "",
      contactEmail: registrationEmail, // Keep registration email
      contactPhone: "",
      whatsapp: "",
      secondaryEmail: "",
      facebook: "",
      instagram: "",
      linkedin: "",
      website: "",
      description: "",
      businessType: "",
      customBusinessType: "",
    })
    setBranch({ name: "", location: "", googleReviewLink: "" })
    setEmailVerified(true)
    setPhoneVerified(false)
    setPhoneVerificationSent(false)
    setOtp("")
    setShowOtpField(false)
    setStep(1)
    setIsUpdating(false)
    setConfirmationResult(null)
  }

  // Check if user has existing business data
  useEffect(() => {
    if (!uid) {
      // If no UID was passed, check if user is authenticated
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          toast.error("You must be logged in to access this page")
          navigate("/login")
          return
        }
        setUid(user.uid)
        setCurrentUser(user)

        // Get registration email from user data
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const regEmail = userData.registrationEmail || userData.email || user.email
          setRegistrationEmail(regEmail)
          setFormData((prev) => ({ ...prev, contactEmail: regEmail }))
        }

        await loadBusinessData(user.uid)
      })
      return () => unsubscribe()
    } else {
      // If UID was passed, load data directly
      setCurrentUser({ uid })
      setFormData((prev) => ({ ...prev, contactEmail: registrationEmail }))
      loadBusinessData(uid)
    }
  }, [uid, navigate, registrationEmail])

  const loadBusinessData = async (userId: string) => {
    try {
      const docRef = doc(db, "users", userId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const businessData = data.businessInfo || {}

        // Set registration email if not already set
        if (!registrationEmail) {
          const regEmail = data.registrationEmail || data.email
          setRegistrationEmail(regEmail)
        }

        setFormData({
          businessName: businessData.businessName || "",
          contactEmail: registrationEmail || data.registrationEmail || data.email || "",
          contactPhone: businessData.contactPhone || "",
          whatsapp: businessData.whatsapp || "",
          secondaryEmail: businessData.secondaryEmail || "",
          facebook: businessData.facebook || "",
          instagram: businessData.instagram || "",
          linkedin: businessData.linkedin || "",
          website: businessData.website || "",
          description: businessData.description || "",
          businessType: businessData.businessType || "",
          customBusinessType: businessData.customBusinessType || "",
        })

        // Load single branch data
        if (businessData.branches && businessData.branches.length > 0) {
          const firstBranch = businessData.branches[0]
          setBranch({
            name: firstBranch.name || "",
            location: firstBranch.location || "",
            googleReviewLink: firstBranch.googleReviewLink || businessData.googleReviewLink || "",
          })
        } else {
          // Convert old format to new format
          setBranch({
            name: businessData.branchName || "",
            location: businessData.branchLocation || "",
            googleReviewLink: businessData.googleReviewLink || "",
          })
        }

        if (data.emailVerified) setEmailVerified(true)
        if (data.phoneVerified) setPhoneVerified(true)

        setIsUpdating(true)
      } else {
        // New user - set registration email
        setIsUpdating(false)
        setEmailVerified(true)
        setPhoneVerified(false)
        setFormData((prev) => ({ ...prev, contactEmail: registrationEmail }))
      }
    } catch (error) {
      console.error("Error checking existing data:", error)
      toast.error("Error loading your business data")
    }
  }

  // Initialize reCAPTCHA verifier with better error handling
  useEffect(() => {
    if (typeof window !== "undefined" && auth) {
      try {
        // Clear any existing verifier first
        if (recaptchaVerifier) {
          recaptchaVerifier.clear()
        }

        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {
            console.log("reCAPTCHA solved")
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired")
            toast.error("reCAPTCHA expired. Please try again.")
          },
        })

        setRecaptchaVerifier(verifier)

        return () => {
          if (verifier) {
            verifier.clear()
          }
        }
      } catch (error) {
        console.error("Error initializing reCAPTCHA:", error)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // Prevent changing contact email
    if (name === "contactEmail") {
      return // Don't allow changes to contact email
    }

    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "contactPhone") {
      setPhoneVerified(false)
      setPhoneVerificationSent(false)
      setShowOtpField(false)
    }
  }

  // Handle branch changes
  const handleBranchChange = (field: keyof Branch, value: string) => {
    setBranch((prev) => ({ ...prev, [field]: value }))
  }

  const canGoNext = () => {
    if (step === 1) {
      if (!formData.businessName.trim()) return false
      if (!formData.businessType.trim()) return false
      if (formData.businessType === "Other" && !formData.customBusinessType.trim()) return false
      if (!branch.name.trim() || !branch.location.trim() || !branch.googleReviewLink.trim()) return false
      return true
    }
    if (step === 2) {
      if (!formData.contactEmail.trim()) return false
      if (!formData.contactPhone.trim()) return false
      return true
    }
    return step !== 5
  }

  const nextStep = () => {
    if (canGoNext()) setStep((prev) => prev + 1)
  }

  const prevStep = () => setStep((prev) => prev - 1)

  const sendPhoneOtp = async () => {
    if (!recaptchaVerifier) {
      toast.error("reCAPTCHA not initialized. Please refresh the page.")
      return
    }

    setVerifyingPhone(true)

    try {
      const formattedPhone = formatPhoneNumber(formData.contactPhone)
      console.log("Sending OTP to:", formattedPhone)

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier)

      setConfirmationResult(confirmation)
      setShowOtpField(true)
      setPhoneVerificationSent(true)
      toast.success("OTP sent to your phone number!")
    } catch (error: any) {
      console.error("Error sending OTP:", error)
      toast.error(`Failed to send OTP: ${error.message}`)

      // Reset reCAPTCHA on error
      if (recaptchaVerifier) {
        recaptchaVerifier.clear()
        const newVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {},
        })
        setRecaptchaVerifier(newVerifier)
      }
    } finally {
      setVerifyingPhone(false)
    }
  }

  const verifyPhoneOtp = async () => {
    if (!confirmationResult) {
      toast.error("No OTP sent yet. Please request OTP first.")
      return
    }

    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP.")
      return
    }

    setVerifyingPhone(true)

    try {
      await confirmationResult.confirm(otp)
      setPhoneVerified(true)
      setShowOtpField(false)
      toast.success("Phone number verified successfully!")
    } catch (error: any) {
      console.error("Error verifying OTP:", error)
      toast.error("Invalid OTP. Please try again.")
    } finally {
      setVerifyingPhone(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "")

    // Handle different phone number formats
    if (digits.length === 10) {
      // Assume it's an Indian number without country code
      return `+91${digits}`
    } else if (digits.length === 11 && digits.startsWith("1")) {
      // US/Canada number
      return `+${digits}`
    } else if (digits.length === 12 && digits.startsWith("91")) {
      // Indian number with country code but no +
      return `+${digits}`
    } else if (digits.length > 10) {
      // Already has country code
      return `+${digits}`
    } else {
      // Default to Indian format
      return `+91${digits}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phoneVerified) {
      toast.error("Please verify your phone number before submitting.")
      return
    }

    setLoading(true)

    if (!uid) {
      toast.error("No user ID available")
      setLoading(false)
      return
    }

    const businessDetails = {
      businessName: formData.businessName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      whatsapp: formData.whatsapp,
      secondaryEmail: formData.secondaryEmail,
      facebook: formData.facebook,
      instagram: formData.instagram,
      linkedin: formData.linkedin,
      website: formData.website,
      description: formData.description,
      businessType: formData.businessType === "Other" ? formData.customBusinessType : formData.businessType,
      googleReviewLink: branch.googleReviewLink, // Store at business level for backward compatibility
      branches: [branch], // Store as array with single branch
      branchName: branch.name, // Keep old format for backward compatibility
      branchLocation: branch.location,
      userId: uid,
      lastUpdated: serverTimestamp(),
    }

    try {
      const userRef = doc(db, "users", uid)

      // Use batch update for faster submission
      const updateData = {
        businessFormFilled: true,
        email: formData.contactEmail,
        phoneNumber: formData.contactPhone,
        emailVerified: true,
        phoneVerified: true,
        businessInfo: businessDetails,
        updatedAt: serverTimestamp(),
      }

      await setDoc(userRef, updateData, { merge: true })

      toast.success(`Business details ${isUpdating ? "updated" : "saved"} successfully!`)

      // Faster navigation
      navigate("/login")
    } catch (error: any) {
      console.error("Error submitting form to Firebase:", error)
      toast.error("There was a problem saving your business details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const animationProps = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
    transition: { duration: 0.3 }, // Faster animation
  }

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 bg-white shadow-md rounded-xl border border-gray-300">
      <h2 className="text-3xl font-bold mb-6 text-center text-orange-700">Business Details Form</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Business Details */}
          {step === 1 && (
            <motion.div key="business" {...animationProps}>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">1. Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs bg-white text-gray-600 px-1 z-10">
                    Business Name
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaBuilding className="text-gray-500" />
                    <input
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                      placeholder="My Company"
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="absolute left-3 top-[-10px] text-xs bg-white text-gray-600 px-1 z-10">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    required
                    className="w-full border p-2 rounded-md bg-white"
                  >
                    <option value="">Select Type</option>
                    <option value="Retail">Retail</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Service">Service</option>
                    <option value="Tech">Tech</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.businessType === "Other" && (
                  <div className="relative">
                    <label className="absolute left-10 top-[-10px] text-xs bg-white text-gray-600 px-1 z-10">
                      Enter Business Type
                    </label>
                    <input
                      name="customBusinessType"
                      value={formData.customBusinessType}
                      onChange={handleChange}
                      placeholder="Specify business type"
                      className="w-full border p-2 rounded-md"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-700">Branch Details</h4>

                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                      <label className="absolute left-10 top-[-10px] text-xs bg-gray-50 text-gray-600 px-1 z-10">
                        Branch Name
                      </label>
                      <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                        <FaBuilding className="text-gray-500" />
                        <input
                          value={branch.name}
                          onChange={(e) => handleBranchChange("name", e.target.value)}
                          required
                          placeholder="Main Branch"
                          className="w-full p-2 pl-3 outline-none bg-transparent"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="absolute left-10 top-[-10px] text-xs bg-gray-50 text-gray-600 px-1 z-10">
                        Branch Location
                      </label>
                      <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                        <FaMapMarkerAlt className="text-gray-500" />
                        <input
                          value={branch.location}
                          onChange={(e) => handleBranchChange("location", e.target.value)}
                          required
                          placeholder="City, State"
                          className="w-full p-2 pl-3 outline-none bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="absolute left-10 top-[-10px] text-xs bg-gray-50 text-gray-600 px-1 z-10">
                      Google Review Link
                    </label>
                    <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                      <FaGoogle className="text-blue-600" />
                      <input
                        value={branch.googleReviewLink}
                        onChange={(e) => handleBranchChange("googleReviewLink", e.target.value)}
                        required
                        placeholder="https://g.page/r/Cd.../review"
                        className="w-full p-2 pl-3 outline-none bg-transparent"
                        type="url"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      * Required - This helps customers leave reviews for your business
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canGoNext()}
                  className={`px-6 py-2 rounded-lg ${
                    canGoNext()
                      ? "bg-orange-600 text-white hover:bg-orange-700"
                      : "bg-orange-300 text-white cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact Info */}
          {step === 2 && (
            <motion.div key="contact" {...animationProps}>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">2. Contact Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs text-gray-600 bg-white px-1 z-10">
                    Contact Email
                  </label>
                  <div className="flex items-center border rounded-md px-3 bg-gray-50">
                    <FaEnvelope className="text-gray-500" />
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      required
                      disabled
                      className="w-full p-2 pl-3 outline-none bg-transparent text-gray-600 cursor-not-allowed"
                      placeholder="you@example.com"
                    />
                    <FaLock className="text-gray-400 ml-2" />
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-green-600 flex items-center text-sm">
                      <FaCheckCircle className="mr-1" /> Email verified from registration
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This email cannot be changed as it's linked to your account registration.
                  </p>
                </div>

                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs text-gray-600 bg-white px-1 z-10">
                    Phone Number
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaPhone className="text-gray-500" />
                    <input
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      required
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="mt-2">
                    {phoneVerified ? (
                      <span className="text-green-600 flex items-center text-sm">
                        <FaCheckCircle className="mr-1" /> Phone verified
                      </span>
                    ) : showOtpField ? (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className="border p-2 rounded-md flex-1 text-center tracking-widest"
                          />
                          <button
                            type="button"
                            onClick={verifyPhoneOtp}
                            disabled={verifyingPhone || otp.length !== 6}
                            className="bg-blue-600 text-white px-3 py-2 rounded-md disabled:bg-blue-300"
                          >
                            {verifyingPhone ? <FaSpinner className="animate-spin" /> : "Verify"}
                          </button>
                        </div>
                        <button type="button" onClick={sendPhoneOtp} className="text-blue-600 text-sm hover:underline">
                          Resend OTP
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={sendPhoneOtp}
                        disabled={verifyingPhone || !formData.contactPhone}
                        className="text-blue-600 text-sm flex items-center hover:underline disabled:text-gray-400"
                      >
                        {verifyingPhone ? (
                          <>
                            <FaSpinner className="animate-spin mr-1" /> Sending OTP...
                          </>
                        ) : (
                          "Verify phone with OTP"
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs text-gray-600 bg-white px-1 z-10">
                    WhatsApp Number (optional)
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaPhone className="text-gray-500" />
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs text-gray-600 bg-white px-1 z-10">
                    Secondary Email (optional)
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaEnvelope className="text-gray-500" />
                    <input
                      type="email"
                      name="secondaryEmail"
                      value={formData.secondaryEmail}
                      onChange={handleChange}
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                      placeholder="secondary@example.com"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button type="button" onClick={prevStep} className="px-6 py-2 rounded-lg bg-gray-300 hover:bg-gray-400">
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canGoNext()}
                  className={`px-6 py-2 rounded-lg ${
                    canGoNext()
                      ? "bg-orange-600 text-white hover:bg-orange-700"
                      : "bg-orange-300 text-white cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Social Media */}
          {step === 3 && (
            <motion.div key="social" {...animationProps}>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">3. Social Media & Online Presence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs bg-white text-gray-600 px-1 z-10">
                    Facebook URL
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaFacebook className="text-blue-600" />
                    <input
                      name="facebook"
                      value={formData.facebook}
                      onChange={handleChange}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                      type="url"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs bg-white text-gray-600 px-1 z-10">
                    Instagram URL
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaInstagram className="text-pink-600" />
                    <input
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="https://instagram.com/yourpage"
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                      type="url"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs bg-white text-gray-600 px-1 z-10">
                    LinkedIn URL
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaLinkedin className="text-blue-700" />
                    <input
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/company/yourpage"
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                      type="url"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="absolute left-10 top-[-10px] text-xs bg-white text-gray-600 px-1 z-10">
                    Website URL
                  </label>
                  <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <FaGlobe className="text-green-600" />
                    <input
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://yourbusiness.com"
                      className="w-full p-2 pl-3 outline-none bg-transparent"
                      type="url"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button type="button" onClick={prevStep} className="px-6 py-2 rounded-lg bg-gray-300 hover:bg-gray-400">
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canGoNext()}
                  className={`px-6 py-2 rounded-lg ${
                    canGoNext()
                      ? "bg-orange-600 text-white hover:bg-orange-700"
                      : "bg-orange-300 text-white cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Business Description */}
          {step === 4 && (
            <motion.div key="description" {...animationProps}>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">4. Business Description</h3>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                placeholder="Describe your business..."
                className="w-full border rounded-md p-3 resize-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between mt-6">
                <button type="button" onClick={prevStep} className="px-6 py-2 rounded-lg bg-gray-300 hover:bg-gray-400">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-6 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                >
                  Review
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h3 className="text-2xl font-bold text-center text-gray-700 mb-6">Review Your Details</h3>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4 max-h-[60vh] overflow-y-auto">
                <DetailRow label="Business Name" value={formData.businessName} />
                <DetailRow
                  label="Business Type"
                  value={formData.businessType === "Other" ? formData.customBusinessType : formData.businessType}
                />
                <DetailRow label="Branch Name" value={branch.name} />
                <DetailRow label="Branch Location" value={branch.location} />
                <DetailRow label="Google Review Link" value={branch.googleReviewLink} />
                <DetailRow label="Contact Email" value={formData.contactEmail} verified={emailVerified} />
                <DetailRow label="Contact Phone" value={formData.contactPhone} verified={phoneVerified} />
                <DetailRow label="WhatsApp" value={formData.whatsapp || "—"} />
                <DetailRow label="Secondary Email" value={formData.secondaryEmail || "—"} />
                <DetailRow label="Facebook" value={formData.facebook || "—"} />
                <DetailRow label="Instagram" value={formData.instagram || "—"} />
                <DetailRow label="LinkedIn" value={formData.linkedin || "—"} />
                <DetailRow label="Website" value={formData.website || "—"} />
                <DetailRow label="Description" value={formData.description || "—"} />
              </div>
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !emailVerified || !phoneVerified || !branch.googleReviewLink}
                  className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-orange-500 to-orange-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-300 ease-in-out group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 group-hover:tracking-wider transition-all duration-300">
                    {loading ? "Submitting..." : "Submit"}
                  </span>
                  <span className="absolute inset-0 w-0 group-hover:w-full bg-white/10 transition-all duration-300 ease-in-out rounded-xl"></span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div id="recaptcha-container" className="hidden"></div>
    </div>
  )
}

function DetailRow({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  const isFilled = value && value !== "—"
  return (
    <div className="flex justify-between items-center border-b border-gray-200 py-2">
      <div className="font-semibold text-gray-700">{label}:</div>
      <div className="flex items-center gap-2 max-w-[60%] text-right">
        <span className={`break-words ${isFilled ? "text-gray-900" : "text-gray-400 italic"}`}>{value}</span>
        {isFilled &&
          (verified !== undefined ? (
            verified ? (
              <FaCheckCircle className="text-green-500" title="Verified" />
            ) : (
              <FaTimesCircle className="text-red-500" title="Not verified" />
            )
          ) : (
            <FaCheckCircle className="text-green-500" title="Filled" />
          ))}
      </div>
    </div>
  )
}

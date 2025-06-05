"use client"

import { useState, useEffect } from "react"
import { Mountain, Star, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { db, auth } from "@/firebase/firebase"
import { collection, doc, setDoc, serverTimestamp, getDoc, addDoc } from "firebase/firestore"
import { toast } from "sonner"
import { onAuthStateChanged } from "firebase/auth"

interface ReviewFormData {
  name: string
  phone: string
  email: string
  branchname: string
  review: string
  rating: number
  businessId: string
  userId?: string
  status?: 'pending' | 'published' | 'rejected'
  createdAt?: any
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState("")
  const [previewText, setPreviewText] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [reviewLinkUrl, setReviewLinkUrl] = useState("")
  const [googleReviewLink, setGoogleReviewLink] = useState("") // NEW: Google review link state
  const [isReviewGatingEnabled, setIsReviewGatingEnabled] = useState(true)
  const [rating, setRating] = useState(0)
  const [welcomeTitle, setWelcomeTitle] = useState("")
  const [welcomeText, setWelcomeText] = useState("")
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    branchname: '',
    review: ''
  })
  const [formErrors, setFormErrors] = useState({
    name: false,
    phone: false,
    email: false,
    branchname: false,
    review: false
  })
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState("")

  // Initialize state from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setBusinessId(user.uid);
          
          // Load configuration from Firestore
          const docRef = doc(db, "review_link", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setBusinessName(data.businessName || "");
            setPreviewText(data.previewText || "");
            setWelcomeTitle(data.welcomeTitle || "");
            setWelcomeText(data.welcomeText || "");
            setPreviewImage(data.previewImage || null);
            setLogoImage(data.logoImage || null);
            setIsReviewGatingEnabled(data.isReviewGatingEnabled ?? true);
            setReviewLinkUrl(data.reviewLinkUrl || "");
            setGoogleReviewLink(data.googleReviewLink || "") // NEW: Load Google review link
          }

          // NEW: Load Google review link from businessInfo
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const googleLink = userData.businessInfo?.googleReviewLink || "";
            setGoogleReviewLink(googleLink);
          }
        } catch (error) {
          console.error("Error loading config:", error);
          toast.error("Failed to load review page configuration");
        } finally {
          setLoading(false);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setFormErrors(prev => ({
      ...prev,
      [name]: false
    }))
  }

  const validateForm = () => {
    const errors = {
      name: !formData.name.trim(),
      phone: !formData.phone.trim(),
      email: !formData.email.trim(),
      branchname: !formData.branchname.trim(),
      review: !formData.review.trim()
    }
    setFormErrors(errors)
    return !Object.values(errors).some(Boolean)
  }

  const handleSetRating = (rating: number) => {
    setRating(rating)
    setSubmitted(false)
    setShowForm(false)
  }

  const handleLeaveReview = async () => {
    if (rating === 0) return
    
    // If review gating is disabled or rating is 4-5 stars
    if (!isReviewGatingEnabled || rating >= 4) {
      // NEW: Use Google review link if available and rating >=4
      const reviewUrl = rating >= 4 && googleReviewLink 
        ? googleReviewLink 
        : reviewLinkUrl;
        
      window.open(reviewUrl, "_blank")
      return
    }

    // For 1-3 stars with gating enabled
    if (!showForm) {
      setShowForm(true)
      return
    }

    // Validate form before submission
    if (!validateForm()) {
      return
    }

    try {
      await submitReview({
        ...formData,
        rating,
        businessId
      })
      setSubmissionMessage("We're sorry to hear about your experience. Thank you for your feedback.")
      setSubmitted(true)
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Failed to submit feedback. Please try again.")
    }
  }

  const submitReview = async (reviewData: ReviewFormData) => {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      toast.error("You must be logged in to submit a review");
      return;
    }

    try {
      const reviewToSubmit = {
        ...reviewData,
        userId: currentUser.uid,
        businessName,
        createdAt: serverTimestamp(),
        status: 'pending'
      };

      // Create reference to user-specific reviews subcollection
      const userReviewsRef = collection(
        db, 
        "users", 
        currentUser.uid, 
        "reviews"
      );
      
      // Add to user-specific reviews collection
      await addDoc(userReviewsRef, reviewToSubmit);

      toast.success("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting review:", error);
      throw error;
    }
  }

  const resetForm = () => {
    setRating(0)
    setShowForm(false)
    setSubmitted(false)
    setFormData({
      name: '',
      phone: '',
      email: '',
      branchname: '',
      review: ''
    })
    setFormErrors({
      name: false,
      phone: false,
      email: false,
      branchname: false,
      review: false
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading review page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side - Image/Pattern */}
        <div className="w-full md:w-1/2 bg-gradient-to-b from-orange-50 to-orange-100 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGRjk4MDAiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMCAwYzExLjA0NiAwIDIwIDguOTU0IDIwIDIwSDBWMHoiLz48cGF0aCBkPSJNNDAgNDBjLTExLjA0NiAwLTIwLTguOTU0LTIwLTIwSDB2MjBjMCAxMS4wNDYgOC45NTQgMjAgMjAgMjB6Ii8+PC9nPjwvZz48L3N2Zz4=')]"></div>
          <div className="relative h-full flex flex-col justify-center items-center p-8">
            {previewImage ? (
              <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={previewImage}
                  alt={businessName}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ) : (
              <div className="w-full max-w-md aspect-square rounded-2xl bg-white shadow-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <Mountain className="h-20 w-20 mx-auto text-orange-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800">{businessName || "Your Business"}</h3>
                </div>
              </div>
            )}
            <div className="mt-8 text-center max-w-md">
              <h3 className="text-3xl font-bold text-gray-800 mb-4">{welcomeTitle || "We value your opinion!"}</h3>
              <p className="text-lg text-gray-600">
                {welcomeText || "Share your experience and help us improve"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Review Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-gray-700 font-medium">
                    {submissionMessage}
                  </p>
                </div>
                <button 
                  onClick={resetForm}
                  className="w-full py-3 px-6 rounded-lg font-medium text-orange-600 border border-orange-600 hover:bg-orange-50 transition-colors"
                >
                  Leave Another Review
                </button>
              </div>
            ) : (
              <>
                {/* Logo Display */}
                {logoImage && (
                  <div className="flex justify-center mb-6">
                    <img 
                      src={logoImage} 
                      alt={`${businessName} Logo`} 
                      className="h-16 object-contain"
                    />
                  </div>
                )}

                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Rate Your Experience</h2>
                  <p className="text-gray-600">{previewText || "How was your experience?"}</p>
                </div>

                <div className="mb-8">
                  <div className="flex justify-center space-x-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleSetRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className={`p-2 rounded-full transition-all ${
                          star <= (hoveredStar || rating) ? 'bg-orange-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Star
                          className={`h-10 w-10 ${
                            star <= (hoveredStar || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Not satisfied</span>
                    <span>Very satisfied</span>
                  </div>

                  {rating > 0 && (
                    <div className={`mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200`}>
                      <p className="text-gray-700 font-medium text-center flex items-center justify-center">
                        {rating >= 4 ? (
                          <>
                            <ThumbsUp className="mr-2 text-green-500" />
                            We're glad you enjoyed your meal!
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="mr-2 text-orange-500" />
                            We're sorry to hear that. We'll use your feedback to improve.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {showForm && rating <= 3 && isReviewGatingEnabled && (
                  <div className="mb-6 space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          formErrors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-xs text-red-500">This field is required</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          formErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.phone && (
                        <p className="mt-1 text-xs text-red-500">This field is required</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          formErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-xs text-red-500">This field is required</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="branchname" className="block text-sm font-medium text-gray-700 mb-1">
                        Branch Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="branchname"
                        name="branchname"
                        value={formData.branchname}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          formErrors.branchname ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.branchname && (
                        <p className="mt-1 text-xs text-red-500">This field is required</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-1">
                        Your Review <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="review"
                        name="review"
                        rows={3}
                        value={formData.review}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          formErrors.review ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      ></textarea>
                      {formErrors.review && (
                        <p className="mt-1 text-xs text-red-500">This field is required</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLeaveReview}
                  disabled={rating === 0}
                  className={`
                    w-full py-4 px-6 rounded-lg font-medium text-white flex items-center justify-center
                    transition-all duration-300
                    ${rating === 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg'
                    }
                  `}
                >
                  {rating > 0 ? 
                    (rating >= 4 ? 'Continue to Review' : 
                     (showForm ? 'Submit Your Feedback' : 'Continue to Feedback')) : 
                    'Select a Rating to Continue'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </button>
              </>
            )}

            <p className="text-xs text-gray-400 mt-6 text-center">
              Powered by <span className="font-medium">ReviewUplift</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
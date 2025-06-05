"use client"

import { useState, useEffect } from "react"
import {
  Check,
  FolderOpen,
  MailOpen,
  Phone,
  Search,
  Star,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Sidebar from "@/components/sidebar"
import ReviewReplyModal from "@/components/review-reply-modal"
import ConfirmDialog from "@/components/confirm-dialog"
import type { Review } from "@/lib/types"
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/firebase/firebase"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { onAuthStateChanged } from "firebase/auth"

// Star Renderer
const renderStars = (rating: number) => (
  <div
    className="flex text-yellow-500"
    aria-label={`${rating} out of 5 stars`}
  >
    {[...Array(5)].map((_, index) =>
      index < rating ? (
        <Star
          key={index}
          className="h-4 w-4 fill-yellow-400 text-yellow-400"
          aria-hidden="true"
        />
      ) : (
        <Star
          key={index}
          className="h-4 w-4 text-gray-300"
          aria-hidden="true"
        />
      )
    )}
  </div>
)

export default function BusinessReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("")
  const [filterOption, setFilterOption] = useState("All")
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const fetchReviews = async () => {
    if (!currentUser) return;
    
    try {
      // Query user-specific reviews subcollection
      const q = query(
        collection(db, "users", currentUser.uid, "reviews")
      );
      const querySnapshot = await getDocs(q);
      
      const reviewsData: Review[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamp to Date if exists
        const createdAt = data.createdAt ? data.createdAt.toDate() : null;
        
        reviewsData.push({
          id: doc.id,
          name: data.name || "Anonymous",
          email: data.email || "",
          phone: data.phone || "",
          branchname: data.branchname || "",
          message: data.review || data.message || "",
          rating: data.rating || 0,
          date: createdAt ? format(createdAt, 'MMM d, yyyy') : "Unknown date",
          replied: data.replied || false,
          status: data.status || 'pending'
        });
      });
      
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchReviews();
    }
  }, [currentUser]);

  const handleDeleteReview = async () => {
    if (!reviewToDelete || !currentUser) return;
    
    try {
      // Delete from user-specific collection
      await deleteDoc(
        doc(db, "users", currentUser.uid, "reviews", reviewToDelete.id)
      );
      setReviews(reviews.filter((review) => review.id !== reviewToDelete.id));
    } catch (error) {
      console.error("Error deleting review:", error);
    } finally {
      setReviewToDelete(null);
    }
  }

  const handleToggleReply = async (id: string) => {
    if (!currentUser) return;
    
    try {
      // Update in user-specific collection
      const reviewRef = doc(db, "users", currentUser.uid, "reviews", id);
      const review = reviews.find(r => r.id === id);
      
      if (review) {
        await updateDoc(reviewRef, {
          replied: !review.replied
        });
        
        setReviews(
          reviews.map((review) =>
            review.id === id ? { ...review, replied: !review.replied } : review
          )
        );
      }
    } catch (error) {
      console.error("Error toggling reply status:", error);
    }
  }

  const handleReplyToReview = async (reviewId: string, replyText: string) => {
    if (!currentUser) return;
    
    try {
      // Update in user-specific collection
      const reviewRef = doc(db, "users", currentUser.uid, "reviews", reviewId);
      await updateDoc(reviewRef, {
        replied: true,
        reply: replyText,
        repliedAt: new Date()
      });
      
      setReviews(
        reviews.map((review) =>
          review.id === reviewId ? { ...review, replied: true } : review
        )
      );
    } catch (error) {
      console.error("Error replying to review:", error);
    }
  }

  const handleReplyClick = (review: Review) => {
    if (review.rating < 3) {
      setSelectedReview(review)
    } else {
      window.open("https://www.google.com/search?q=google+review", "_blank")
    }
  }

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      (review.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.message?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (review.branchname?.toLowerCase().includes(searchTerm.toLowerCase())))

    const matchesFilter =
      filterOption === "All" ||
      (filterOption === "Above 3" && review.rating >= 3) ||
      (filterOption === "Below 3" && review.rating < 3) ||
      (filterOption === "Replied" && review.replied) ||
      (filterOption === "Not Replied" && !review.replied)

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 md:ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold mb-4 md:mb-0 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              Your Reviews
            </h1>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search reviews..."
                  className="w-full sm:w-[250px] pl-8 border-orange-200 focus:ring-2 focus:ring-orange-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterOption} onValueChange={setFilterOption}>
                <SelectTrigger className="w-[180px] border-orange-200 focus:ring-2 focus:ring-orange-300">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Reviews</SelectItem>
                  <SelectItem value="Above 3">Rating Above 3</SelectItem>
                  <SelectItem value="Below 3">Rating Below 3</SelectItem>
                  <SelectItem value="Replied">Replied</SelectItem>
                  <SelectItem value="Not Replied">Not Replied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <motion.div 
                className="bg-white p-8 rounded-lg border text-center shadow-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search or filters"
                    : "Start collecting reviews from your customers"}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {filteredReviews.map((review) => (
                  <motion.div
                    key={review.id}
                    className="bg-white p-4 rounded-xl shadow-md flex flex-col gap-2 border border-orange-100 hover:shadow-lg transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-800">{review.name}</div>
                          <div className="text-gray-500 text-sm">{review.date}</div>
                        </div>
                        {renderStars(review.rating)}
                      </div>
                    </div>

                    <div className="text-gray-700 py-2">{review.message}</div>

                    {review.rating < 3 && (
                      <div className="flex gap-4 mt-2">
                        {review.email && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-orange-50"
                                aria-label="View email"
                              >
                                <MailOpen className="h-4 w-4 text-gray-500 hover:text-orange-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 border border-orange-200">
                              <p className="text-sm">{review.email}</p>
                            </PopoverContent>
                          </Popover>
                        )}

                        {review.phone && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-orange-50"
                                aria-label="View phone"
                              >
                                <Phone className="h-4 w-4 text-gray-500 hover:text-orange-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 border border-orange-200">
                              <p className="text-sm">{review.phone}</p>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3">
                      <motion.button
                        className={`
                          py-2 px-4 rounded-lg font-medium text-white
                          ${review.replied 
                            ? 'bg-gray-400' 
                            : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md'
                          }
                        `}
                        onClick={() => handleReplyClick(review)}
                        whileHover={{ scale: review.replied ? 1 : 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={review.replied}
                      >
                        {review.replied
                          ? "Replied"
                          : review.rating < 3
                          ? "Reply Privately"
                          : "Reply"}
                      </motion.button>

                      <div className="flex gap-4 text-gray-500 text-lg items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-orange-50"
                              aria-label="Toggle reply status"
                            >
                              <Check
                                className={`h-4 w-4 ${
                                  review.replied ? "text-orange-500" : "text-gray-400"
                                }`}
                              />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2 border border-orange-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-500 hover:bg-orange-50"
                              onClick={() => handleToggleReply(review.id)}
                            >
                              {review.replied
                                ? "Unmark as replied"
                                : "Mark as replied"}
                            </Button>
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-orange-50"
                              aria-label="Delete review"
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2 border border-orange-200">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setReviewToDelete(review)}
                            >
                              Delete
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {selectedReview && (
        <ReviewReplyModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onReply={handleReplyToReview}
        />
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleDeleteReview}
        title="Delete Review"
        description={`Are you sure you want to delete the review from ${reviewToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}
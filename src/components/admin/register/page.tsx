"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FcGoogle, FcLock } from "react-icons/fc"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { auth, db } from "@/firebase/firebase"
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"

export default function AdminRegistrationForm() {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [adminCode, setAdminCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [googleUser, setGoogleUser] = useState<any>(null)
  const [isEditingAdminCode, setIsEditingAdminCode] = useState(false)
  const [newAdminCode, setNewAdminCode] = useState("")
  const [adminCodeError, setAdminCodeError] = useState("")
  const [currentAdminCode, setCurrentAdminCode] = useState("Monikan")
  const navigate = useNavigate()

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setEmail("dopli@gmail.com")
      setPassword("dopli@2830")
      setAdminCode("Monikan")
      console.log("Default admin credentials loaded for development")
    }

    // Fetch current admin code from Firestore
    const fetchAdminCode = async () => {
      try {
        const docRef = doc(db, "adminSettings", "registrationCode")
        const docSnap = await getDoc(docRef)

        if (docSnap.exists() && docSnap.data().code) {
          setCurrentAdminCode(docSnap.data().code)
        } else {
          // Initialize if not exists
          await setDoc(docRef, { code: "Monikan" })
        }
      } catch (err) {
        console.error("Error fetching admin code:", err)
      }
    }

    fetchAdminCode()
  }, [])

  const checkEmailExists = async (email: string) => {
    const q = query(collection(db, "users"), where("email", "==", email))
    const snapshot = await getDocs(q)
    return !snapshot.empty
  }

  const checkUsernameExists = async (username: string) => {
    const q = query(collection(db, "users"), where("username", "==", username))
    const snapshot = await getDocs(q)
    return !snapshot.empty
  }

  const completeGoogleRegistration = async () => {
    if (!googleUser) return

    setError("")
    setLoading(true)

    try {
      // Verify admin code
      if (adminCode !== currentAdminCode) {
        throw new Error("Invalid admin authorization code")
      }

      const usernameTaken = await checkUsernameExists(username)
      if (usernameTaken) throw new Error("Username already exists")

      await setDoc(doc(db, "users", googleUser.uid), {
        uid: googleUser.uid,
        username,
        email: googleUser.email,
        storedmail: googleUser.email,
        role: "ADMIN",
        createdAt: serverTimestamp(),
        isProfileComplete: true,
        displayName: googleUser.displayName || "",
        photoURL: googleUser.photoURL || "",
      })

      // Store role in localStorage
      localStorage.setItem("role", "ADMIN")
      localStorage.setItem("uid", googleUser.uid)
      localStorage.setItem("email", googleUser.email || "")

      navigate("/admin/dashboard")
    } catch (err: any) {
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (googleUser) {
      await completeGoogleRegistration()
      return
    }

    setError("")
    setLoading(true)

    try {
      // Admin code verification
      if (adminCode !== currentAdminCode) {
        throw new Error("Invalid admin authorization code")
      }

      const usernameTaken = await checkUsernameExists(username)
      if (usernameTaken) throw new Error("Username already exists")

      const emailTaken = await checkEmailExists(email)
      if (emailTaken) throw new Error("Email already registered")

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const uid = userCredential.user.uid

      await setDoc(doc(db, "users", uid), {
        uid,
        username,
        email,
        storedmail: email,
        role: "ADMIN",
        createdAt: serverTimestamp(),
        isProfileComplete: true,
      })

      // Store role in localStorage
      localStorage.setItem("role", "ADMIN")
      localStorage.setItem("uid", uid)
      localStorage.setItem("email", email)

      navigate("/admin/dashboard")
    } catch (err: any) {
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setError("")
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const emailExists = await checkEmailExists(user.email || "")
      if (emailExists) throw new Error("Email already registered")

      // Store Google user data and show form for admin code and username
      setGoogleUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      })
      setEmail(user.email || "")
      setShowEmailForm(true)
    } catch (err: any) {
      setError(err.message || "Google sign-in failed")
    } finally {
      setLoading(false)
    }
  }

  const updateAdminCode = async () => {
    if (!newAdminCode) {
      setAdminCodeError("Admin code cannot be empty")
      return
    }

    if (newAdminCode.length < 4) {
      setAdminCodeError("Admin code must be at least 4 characters")
      return
    }

    setAdminCodeError("")
    setLoading(true)

    try {
      const docRef = doc(db, "adminSettings", "registrationCode")
      await updateDoc(docRef, { code: newAdminCode })
      setCurrentAdminCode(newAdminCode)
      setNewAdminCode("")
      setIsEditingAdminCode(false)
      setAdminCodeError("")
    } catch (err: any) {
      setAdminCodeError(err.message || "Failed to update admin code")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SimpleAdminLayout>
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-300 border-t-4 border-t-blue-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-4 border-r-purple-500 rounded-full animate-spin"
              style={{ animationDelay: "0.15s" }}
            ></div>
          </div>
        </div>
      </SimpleAdminLayout>
    )
  }

  return (
    <SimpleAdminLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Admin Account
            </h2>

            <Dialog open={isEditingAdminCode} onOpenChange={setIsEditingAdminCode}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-blue-500 hover:bg-blue-100 rounded-xl"
                  title="Edit Admin Code"
                >
                  <FcLock size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-blue-600">Update Admin Verification Code</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Current Code</label>
                    <Input
                      type="text"
                      value={currentAdminCode}
                      disabled
                      className="bg-gray-100 border-gray-300 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-1">New Admin Code</label>
                    <Input
                      type="password"
                      value={newAdminCode}
                      onChange={(e) => setNewAdminCode(e.target.value)}
                      placeholder="Enter new admin authorization code"
                      className="bg-white border-gray-300 text-gray-800"
                    />
                    {adminCodeError && <p className="text-red-500 text-xs mt-1">{adminCodeError}</p>}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingAdminCode(false)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={updateAdminCode}
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Update Code"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!showEmailForm && (
            <>
              <Button
                variant="outline"
                className="w-full mb-4 flex items-center justify-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 bg-white"
                onClick={handleGoogleRegister}
                disabled={loading}
              >
                <FcGoogle size={20} /> Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 bg-white"
                onClick={() => setShowEmailForm(true)}
              >
                Continue with Email
              </Button>
            </>
          )}

          {showEmailForm && (
            <>
              <div className="flex items-center my-4">
                <hr className="flex-grow border-gray-300" />
                <span className="mx-3 text-gray-500 text-sm">or</span>
                <hr className="flex-grow border-gray-300" />
              </div>

              <form className="space-y-4" onSubmit={handleRegister}>
                {googleUser && (
                  <div className="flex items-center justify-center mb-4">
                    <div className="text-center">
                      <img
                        src={googleUser.photoURL || ""}
                        alt="Google profile"
                        className="w-12 h-12 rounded-full mx-auto mb-2"
                      />
                      <p className="text-sm text-gray-600">{googleUser.email}</p>
                    </div>
                  </div>
                )}

                {!googleUser && (
                  <>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Email</label>
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white border-gray-300 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Password</label>
                      <Input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white border-gray-300 text-gray-800"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Username</label>
                  <Input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white border-gray-300 text-gray-800"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Admin Code</label>
                  <Input
                    type="password"
                    required
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Enter admin authorization code"
                    className="bg-white border-gray-300 text-gray-800"
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Admin Account"}
                </Button>
              </form>
            </>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            By signing up, you agree to our{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>

          <p className="text-sm text-center mt-4 text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </SimpleAdminLayout>
  )
}

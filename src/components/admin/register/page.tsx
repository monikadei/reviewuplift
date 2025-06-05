import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth, db } from "@/firebase/firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function AdminRegistrationForm() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleUser, setGoogleUser] = useState<any>(null);
  const navigate = useNavigate();

  const checkEmailExists = async (email: string) => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const checkUsernameExists = async (username: string) => {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const completeGoogleRegistration = async () => {
    if (!googleUser) return;
    
    setError("");
    setLoading(true);

    try {
      // Verify admin code
      if (adminCode !== "Monikan") {
        throw new Error("Invalid admin authorization code");
      }

      const usernameTaken = await checkUsernameExists(username);
      if (usernameTaken) throw new Error("Username already exists");

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
      });

      // Store role in localStorage
      localStorage.setItem("role", "ADMIN");
      localStorage.setItem("uid", googleUser.uid);
      localStorage.setItem("email", googleUser.email || "");

      navigate("/components/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (googleUser) {
      await completeGoogleRegistration();
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Admin code verification
      if (adminCode !== "Monikan") {
        throw new Error("Invalid admin authorization code");
      }

      const usernameTaken = await checkUsernameExists(username);
      if (usernameTaken) throw new Error("Username already exists");

      const emailTaken = await checkEmailExists(email);
      if (emailTaken) throw new Error("Email already registered");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        username,
        email,
        storedmail: email,
        role: "ADMIN",
        createdAt: serverTimestamp(),
        isProfileComplete: true,
      });

      // Store role in localStorage
      localStorage.setItem("role", "ADMIN");
      localStorage.setItem("uid", uid);
      localStorage.setItem("email", email);

      navigate("/components/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const emailExists = await checkEmailExists(user.email || "");
      if (emailExists) throw new Error("Email already registered");

      // Store Google user data and show form for admin code and username
      setGoogleUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      setEmail(user.email || "");
      setShowEmailForm(true);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h2 className="text-2xl font-semibold text-orange-600 text-center mb-6">
          Create Admin Account
        </h2>

        {!showEmailForm && (
          <>
            <Button
              variant="outline"
              className="w-full mb-4 flex items-center justify-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-100"
              onClick={handleGoogleRegister}
              disabled={loading}
            >
              <FcGoogle size={20} /> Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-orange-50"
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
              <span className="mx-3 text-gray-400 text-sm">or</span>
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
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Password</label>
                    <Input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Admin Account"}
              </Button>
            </form>
          </>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          By signing up, you agree to our{" "}
          <a href="#" className="text-orange-600 hover:underline">Terms</a> and{" "}
          <a href="#" className="text-orange-600 hover:underline">Privacy Policy</a>.
        </p>

        <p className="text-sm text-center mt-4 text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-orange-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
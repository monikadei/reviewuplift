import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { auth, db } from "../firebase/firebase";
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

export default function RegistrationForm() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const usernameTaken = await checkUsernameExists(username);
      if (usernameTaken) throw new Error("Username already exists");

      const emailTaken = await checkEmailExists(email);
      if (emailTaken) throw new Error("Email already registered");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Set trial period (14 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      await setDoc(doc(db, "users", uid), {
        uid,
        username,
        email,
        storedmail: email,
        role: "BUSER",
        createdAt: serverTimestamp(),
        isProfileComplete: false,
        trialEndDate: trialEndDate,
        subscriptionActive: false,
        businessFormFilled: false
      });

      navigate("/businessform", { state: { uid } });
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

      // Set trial period (14 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        storedmail: user.email,
        displayName: user.displayName || "",
        role: "BUSER",
        createdAt: serverTimestamp(),
        isProfileComplete: false,
        trialEndDate: trialEndDate,
        subscriptionActive: false,
        businessFormFilled: false
      });

      navigate("/businessform", { state: { uid: user.uid } });
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
          Create your account
        </h2>

        <Button
          variant="outline"
          className="w-full mb-4 flex items-center justify-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-100"
          onClick={handleGoogleRegister}
        >
          <FcGoogle size={20} /> Continue with Google
        </Button>

        {!showEmailForm && (
          <Button
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-orange-50"
            onClick={() => setShowEmailForm(true)}
          >
            Continue with Email
          </Button>
        )}

        {showEmailForm && (
          <>
            <div className="flex items-center my-4">
              <hr className="flex-grow border-gray-300" />
              <span className="mx-3 text-gray-400 text-sm">or</span>
              <hr className="flex-grow border-gray-300" />
            </div>

            <form className="space-y-4" onSubmit={handleRegister}>
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

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Account"}
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
// src/hooks/useSubscriptionStatus.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export const useSubscriptionStatus = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const now = new Date();

        // If user has active subscription
        if (userData.subscriptionActive) return;

        // If user is still in trial period
        if (userData.trialEndDate && userData.trialEndDate.toDate() > now) return;

        // Trial expired and no active subscription - redirect to pricing
        navigate("/pricing");
      }
    };

    checkSubscription();
  }, [navigate]);
};
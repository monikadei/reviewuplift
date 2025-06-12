"use client"

import { useEffect } from "react"
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { sendDemoReminder } from "@/services/notification-service"

export function useDemoReminders() {
  useEffect(() => {
    // Set up reminder system
    const checkForUpcomingDemos = async () => {
      try {
        const now = new Date()
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)

        // Get notification settings
        const settingsRef = doc(db, "adminSettings", "contactSettings")
        const settingsSnap = await getDocs([settingsRef])
        const settings = settingsSnap.docs[0]?.data() || {
          reminderType: "email",
          reminderTime: 30,
        }

        // Calculate the time window based on settings
        const reminderWindow = new Date(now.getTime() + (settings.reminderTime - 5) * 60 * 1000)
        const endWindow = new Date(now.getTime() + (settings.reminderTime + 5) * 60 * 1000)

        // Query for demos that are scheduled within the reminder window
        const q = query(
          collection(db, "demoBookings"),
          where("date", ">=", reminderWindow),
          where("date", "<=", endWindow),
          where("reminderSent", "==", false),
        )

        const querySnapshot = await getDocs(q)

        querySnapshot.forEach(async (document) => {
          const booking = document.data()

          console.log(`Sending reminder for demo at ${booking.time}`)

          // Send reminder based on settings
          await sendDemoReminder(booking, settings.reminderType)

          // Mark reminder as sent
          await updateDoc(doc(db, "demoBookings", document.id), {
            reminderSent: true,
          })
        })
      } catch (error) {
        console.error("Error checking for upcoming demos:", error)
      }
    }

    // Check for upcoming demos every minute
    const intervalId = setInterval(checkForUpcomingDemos, 60000)

    // Run once on component mount
    checkForUpcomingDemos()

    return () => clearInterval(intervalId)
  }, [])
}

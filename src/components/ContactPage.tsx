"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import ContactPanel from "../components/ContactPanel"
import { motion } from "framer-motion"
import Navbar from "./Navbar"

interface ContactSettings {
  phoneNumber: string
  whatsappNumber: string
  enableDemo: boolean
}

const ContactPage = () => {
  const [contactSettings, setContactSettings] = useState<ContactSettings>({
    phoneNumber: "+1 234 567 8900",
    whatsappNumber: "+1234567890",
    enableDemo: true,
  })

  const navigate = useNavigate()

  useEffect(() => {
    const fetchContactSettings = async () => {
      try {
        const docRef = doc(db, "adminSettings", "contactSettings")
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setContactSettings(docSnap.data() as ContactSettings)
        }
      } catch (error) {
        console.error("Error fetching contact settings:", error)
      }
    }

    fetchContactSettings()
  }, [])

  const handleScheduleDemo = () => {
    navigate("/demo")
  }

  return (
    <>
    <Navbar/>
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-300 via-orange-400 to-slate-300">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-3/4 left-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <motion.h1
        className="text-4xl font-bold mb-8 text-black-900 text-center relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Contact Sales
      </motion.h1>

      <ContactPanel contactSettings={contactSettings} onScheduleDemo={handleScheduleDemo} />
    </div>
    </>
  )
}


export default ContactPage;

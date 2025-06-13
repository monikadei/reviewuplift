"use client"
import { Calendar, Phone } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { motion } from "framer-motion"

interface ContactSettings {
  phoneNumber: string
  whatsappNumber: string
  enableDemo: boolean
}

export default function ContactPanel({
  contactSettings,
  onScheduleDemo,
}: {
  contactSettings: ContactSettings
  onScheduleDemo: () => void
}) {
  return (
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <motion.div
        className="relative backdrop-blur-sm bg-white/10 rounded-3xl p-6 border border-white/20 shadow-xl overflow-hidden"
        whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
        transition={{ duration: 0.3 }}
      >
        {/* Background gradient blobs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>

        <div className="relative z-10 space-y-5">
          {contactSettings.enableDemo && (
            <motion.button
              onClick={onScheduleDemo}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 px-6 rounded-2xl font-medium shadow-lg hover:shadow-indigo-500/25 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <Calendar className="w-5 h-5" />
              Schedule a Demo
            </motion.button>
          )}

          <motion.a
            href={`https://wa.me/${contactSettings.whatsappNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-2xl font-medium shadow-lg hover:shadow-green-500/25 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <FaWhatsapp className="w-5 h-5" />
            Chat on WhatsApp
          </motion.a>

          <motion.a
            href={`tel:${contactSettings.phoneNumber}`}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4 px-6 rounded-2xl font-medium shadow-lg hover:shadow-slate-500/25 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <Phone className="w-5 h-5" />
            Call {contactSettings.phoneNumber}
          </motion.a>

          <motion.p
            className="text-sm text-white/80 text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            We typically respond within 5 minutes
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  )
}

"use client"
import { useState, useEffect } from "react";
import { FiCalendar, FiMessageCircle, FiPhone } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "../firebase/firebase";
import { db } from "../firebase/firebase";

const icons = [
  { id: "message", icon: <FiMessageCircle size={28} />, label: "Message" },
  { id: "whatsapp", icon: <FaWhatsapp size={28} />, label: "WhatsApp" },
  { id: "phone", icon: <FiPhone size={28} />, label: "Call" },
];

interface ContactSettings {
  phoneNumber: string;
  whatsappNumber: string;
  enableDemo: boolean;
}

const ContactWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [iconIndex, setIconIndex] = useState(0);
  const [contactSettings, setContactSettings] = useState<ContactSettings>({
    phoneNumber: "+1 234 567 8900",
    whatsappNumber: "+1234567890",
    enableDemo: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % icons.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchContactSettings = async () => {
      try {
        const docRef = doc(db, "adminSettings", "contactSettings");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setContactSettings(docSnap.data() as ContactSettings);
        }
      } catch (error) {
        console.error("Error fetching contact settings:", error);
      }
    };

    fetchContactSettings();
  }, []);

  const handleScheduleDemo = () => {
    setIsOpen(false);
    navigate("/demo");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating button with cycling icons */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-orange-300 relative w-16 h-16 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
        aria-label="Contact options"
        aria-expanded={isOpen}
        title="Contact Us"
      >
        {icons.map((item, idx) => (
          <span
            key={item.id}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${
              idx === iconIndex ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
            aria-hidden="true"
          >
            {item.icon}
          </span>
        ))}
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-20"></div>
      </button>

      {/* Popup panel */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 transform transition-all duration-300 ease-out">
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-gray-100 transform rotate-45"></div>
          
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-bold text-gray-800">Get in Touch</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {contactSettings.enableDemo && (
              <button
                onClick={handleScheduleDemo}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <FiCalendar size={20} />
                Schedule a Demo
              </button>
            )}

            <a
              href={`https://wa.me/${contactSettings.whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <FaWhatsapp size={20} />
              Chat on WhatsApp
            </a>

            <a
              href={`tel:${contactSettings.phoneNumber}`}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <FiPhone size={20} />
              Call {contactSettings.phoneNumber}
            </a>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              We typically respond within 5 minutes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactWidget;

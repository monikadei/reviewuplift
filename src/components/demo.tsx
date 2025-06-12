"use client"
import { useState, Fragment, useEffect } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Dialog, Transition } from "@headlessui/react"
import { motion } from "framer-motion"
import { collection, doc, setDoc } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"

const availableTimes = [
  "09:00 AM",
  "09:15 AM",
  "09:30 AM",
  "09:45 AM",
  "10:00 AM",
  "10:15 AM",
  "10:30 AM",
  "10:45 AM",
  "11:00 AM",
  "11:15 AM",
  "11:30 AM",
  "11:45 AM",
  "12:00 PM",
  "12:15 PM",
  "12:30 PM",
  "12:45 PM",
  "01:00 PM",
  "01:15 PM",
  "01:30 PM",
  "01:45 PM",
  "02:00 PM",
  "02:15 PM",
  "02:30 PM",
  "02:45 PM",
  "03:00 PM",
]

const Typewriter = ({ text, delay }: { text: string; delay: number }) => {
  const [currentText, setCurrentText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText((prevText) => prevText + text[currentIndex])
        setCurrentIndex((prevIndex) => prevIndex + 1)
      }, delay)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, delay, text])

  return <span>{currentText}</span>
}

export default function DemoPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [businessName, setBusinessName] = useState("")

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleBookEvent = async () => {
    if (!name || !email || !phone) {
      alert("Please fill in all required fields.")
      return
    }

    try {
      // Create the booking in Firebase
      const bookingRef = doc(collection(db, "demoBookings"))
      const bookingData = {
        date: selectedDate?.toISOString().split("T")[0], // Store as YYYY-MM-DD
        time: selectedTime,
        name,
        email,
        phone,
        businessName: businessName || "",
        createdAt: new Date(),
        reminderSent: false,
      }

      await setDoc(bookingRef, bookingData)

      

      setModalOpen(false)
      setSelectedDate(null)
      setSelectedTime(null)
      setName("")
      setEmail("")
      setPhone("")
      setBusinessName("")
    } catch (error) {
      console.error("Booking error:", error)
     
    }
  }

  return (
    <SimpleAdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center p-4 md:p-8 min-h-[calc(100vh-80px)]"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-6xl bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-orange-100 p-6 md:p-10 flex flex-col lg:flex-row gap-8 md:gap-12 w-full"
          >
            {/* Left content */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                  <Typewriter text="Schedule your " delay={50} />
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                    <Typewriter text="15-Minute Demo" delay={50} />
                  </span>
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-gray-600 mb-8 text-lg md:text-xl max-w-md leading-relaxed"
                >
                  Choose a date and time that works best for you. We'll give you a quick, personalized walkthrough to
                  get you started.
                </motion.p>
              </div>

              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: selectedDate && selectedTime ? 1.02 : 1 }}
                  whileTap={{ scale: selectedDate && selectedTime ? 0.98 : 1 }}
                  onClick={() => setModalOpen(true)}
                  disabled={!selectedDate || !selectedTime}
                  className={`w-full md:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                    selectedDate && selectedTime
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl hover:shadow-2xl cursor-pointer transform hover:scale-105"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Schedule Demo
                </motion.button>

                {selectedDate && selectedTime && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200"
                  >
                    <p className="text-sm text-orange-700 font-medium">
                      Selected: {formatDate(selectedDate)} at {selectedTime}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right content */}
            <div className="flex-1 space-y-8">
              <div>
                <label className="block mb-4 font-bold text-gray-800 text-xl">Select a Date</label>
                <div className="border-2 border-orange-200 rounded-2xl overflow-hidden shadow-lg bg-white">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => {
                      setSelectedDate(date)
                      setSelectedTime(null)
                    }}
                    minDate={new Date()}
                    inline
                    calendarClassName="!border-0 custom-calendar-width"
                    dayClassName={(date) =>
                      date.getDate() === selectedDate?.getDate() &&
                      date.getMonth() === selectedDate?.getMonth() &&
                      date.getFullYear() === selectedDate?.getFullYear()
                        ? "!bg-gradient-to-r !from-orange-500 !to-amber-500 !text-white !font-bold"
                        : "hover:bg-orange-50 hover:text-orange-700 transition-colors"
                    }
                    weekDayClassName={() => "text-orange-600 font-bold"}
                    renderCustomHeader={({
                      date,
                      decreaseMonth,
                      increaseMonth,
                      prevMonthButtonDisabled,
                      nextMonthButtonDisabled,
                    }) => (
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500">
                        <button
                          onClick={decreaseMonth}
                          disabled={prevMonthButtonDisabled}
                          className="p-2 rounded-full hover:bg-white/20 disabled:opacity-50 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-white font-bold text-lg">
                          {date.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          onClick={increaseMonth}
                          disabled={nextMonthButtonDisabled}
                          className="p-2 rounded-full hover:bg-white/20 disabled:opacity-50 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  />
                </div>
              </div>

              <div>
                <p className="font-bold mb-4 text-gray-800 text-xl">Select a Time</p>
                {selectedDate ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
                  >
                    {availableTimes.map((time) => (
                      <motion.button
                        key={time}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-3 rounded-xl border-2 text-center text-sm font-semibold transition-all duration-200
                          ${
                            selectedTime === time
                              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-lg"
                              : "bg-white border-orange-200 hover:bg-orange-50 hover:border-orange-300 text-gray-700"
                          }
                        `}
                      >
                        {time}
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300"
                  >
                    <p className="text-gray-500 text-lg">Please select a date first.</p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Modal */}
        <Transition appear show={modalOpen} as={Fragment}>
          <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setModalOpen(false)}>
            <div className="min-h-screen px-4 text-center bg-black/50 backdrop-blur-sm">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="inline-block w-full max-w-lg p-8 my-20 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl border border-orange-100">
                  <Dialog.Title as="h3" className="text-3xl font-bold leading-6 text-gray-900 mb-6">
                    Confirm Your Demo Booking
                  </Dialog.Title>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200"
                  >
                    <p className="text-gray-700 text-lg">You are booking a 15-minute demo on:</p>
                    <p className="mt-2 text-orange-600 font-bold text-xl">
                      {formatDate(selectedDate)} at {selectedTime}
                    </p>
                  </motion.div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleBookEvent()
                    }}
                    className="space-y-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="block text-gray-700 font-semibold mb-2" htmlFor="name">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Your full name"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <label className="block text-gray-700 font-semibold mb-2" htmlFor="email">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="your.email@example.com"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="block text-gray-700 font-semibold mb-2" htmlFor="phone">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="+1 234 567 890"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <label className="block text-gray-700 font-semibold mb-2" htmlFor="businessName">
                        Business Name (Optional)
                      </label>
                      <input
                        id="businessName"
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Your business name"
                      />
                    </motion.div>

                    <div className="mt-10 flex justify-end gap-4">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        onClick={() => setModalOpen(false)}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all"
                      >
                        Book Event
                      </motion.button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        <style>{`
          .custom-calendar-width {
            width: 100% !important;
          }
          .custom-calendar-width .react-datepicker__month-container {
            width: 100% !important;
          }
          .custom-calendar-width .react-datepicker__day-names,
          .custom-calendar-width .react-datepicker__week {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          }
          .custom-calendar-width .react-datepicker__day-name,
          .custom-calendar-width .react-datepicker__day {
            width: auto !important;
            margin: 0.2rem !important;
            padding: 0.7rem !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 0.5rem !important;
            font-weight: 600 !important;
          }
        `}</style>
      </div>
    </SimpleAdminLayout>
  )
}

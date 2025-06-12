"use client"
import { useState, useEffect } from "react"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  Phone,
  MessageSquare,
  Calendar,
  Save,
  RefreshCw,
  Mail,
  Clock,
  Bell,
  User,
  Building,
  Trash2,
  X,
} from "lucide-react"
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc } from "firebase/firestore"
import { db } from "@/firebase/firebase"

interface ContactSettings {
  phoneNumber: string
  whatsappNumber: string
  enableDemo: boolean
  reminderTime: number
  adminEmail: string
  adminPhone: string
  companyName: string
}

interface DemoBooking {
  id: string
  date: string
  time: string
  name: string
  email: string
  phone: string
  businessName: string
  createdAt: any
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [demoBookings, setDemoBookings] = useState<DemoBooking[]>([])
  const [deletingBookings, setDeletingBookings] = useState<Set<string>>(new Set())
  const [contactSettings, setContactSettings] = useState<ContactSettings>({
    phoneNumber: "+1 234 567 8900",
    whatsappNumber: "+1234567890",
    enableDemo: true,
    reminderTime: 30,
    adminEmail: "admin@yourdomain.com",
    adminPhone: "+1234567890",
    companyName: "Your Company",
  })

  useEffect(() => {
    fetchSettings()
    fetchDemoBookings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const docRef = doc(db, "adminSettings", "contactSettings")
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as ContactSettings
        setContactSettings(data)
      } else {
        // Initialize with default settings
        await setDoc(docRef, contactSettings)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDemoBookings = async () => {
    try {
      const bookingsRef = collection(db, "demoBookings")
      const q = query(bookingsRef, orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)

      const bookings: DemoBooking[] = []
      querySnapshot.forEach((doc) => {
        bookings.push({
          id: doc.id,
          ...doc.data(),
        } as DemoBooking)
      })

      setDemoBookings(bookings)
    } catch (error) {
      console.error("Error fetching demo bookings:", error)
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this demo booking?")) {
      return
    }

    try {
      setDeletingBookings((prev) => new Set(prev).add(bookingId))

      // Delete from Firebase
      await deleteDoc(doc(db, "demoBookings", bookingId))

      // Remove from local state
      setDemoBookings((prev) => prev.filter((booking) => booking.id !== bookingId))

      toast({
        title: "Booking Deleted",
        description: "Demo booking has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting booking:", error)
      toast({
        title: "Error",
        description: "Failed to delete booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingBookings((prev) => {
        const newSet = new Set(prev)
        newSet.delete(bookingId)
        return newSet
      })
    }
  }

  const handleDeleteAllBookings = async () => {
    if (!confirm("Are you sure you want to delete ALL demo bookings? This action cannot be undone.")) {
      return
    }

    try {
      setLoading(true)

      // Delete all bookings from Firebase
      const deletePromises = demoBookings.map((booking) => deleteDoc(doc(db, "demoBookings", booking.id)))

      await Promise.all(deletePromises)

      // Clear local state
      setDemoBookings([])

      toast({
        title: "All Bookings Deleted",
        description: "All demo bookings have been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting all bookings:", error)
      toast({
        title: "Error",
        description: "Failed to delete all bookings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const docRef = doc(db, "adminSettings", "contactSettings")
      await setDoc(docRef, contactSettings)

      toast({
        title: "Settings Saved",
        description: "Contact settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ContactSettings, value: string | boolean | number) => {
    setContactSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <SimpleAdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </SimpleAdminLayout>
    )
  }

  return (
    <SimpleAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-gray-600 mt-1">Manage your application settings</p>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchSettings()
                fetchDemoBookings()
              }}
              disabled={loading}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Demo Bookings Cards */}
        {demoBookings.length > 0 && (
          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold text-blue-800 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recent Demo Bookings ({demoBookings.length})
                  </CardTitle>
                  <CardDescription>Latest demo appointments scheduled by customers</CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAllBookings}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoBookings.slice(0, 6).map((booking) => (
                  <div
                    key={booking.id}
                    className="relative p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow group"
                  >
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBooking(booking.id)}
                      disabled={deletingBookings.has(booking.id)}
                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600"
                    >
                      {deletingBookings.has(booking.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>

                    <div className="flex items-start justify-between mb-3 pr-8">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-gray-800">{booking.name}</span>
                      </div>
                      <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        {formatDate(booking.date)}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>{booking.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{booking.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span>{booking.phone}</span>
                      </div>
                      {booking.businessName && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{booking.businessName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {demoBookings.length > 6 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">Showing 6 of {demoBookings.length} total bookings</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin Information */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white rounded-t-lg">
            <CardTitle className="text-xl font-bold text-orange-800 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Admin Contact Information
            </CardTitle>
            <CardDescription>Configure your admin contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={contactSettings.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  placeholder="Your Company Name"
                  className="border-orange-200 focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-600" />
                  Admin Email Address
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={contactSettings.adminEmail}
                  onChange={(e) => handleInputChange("adminEmail", e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className="border-orange-200 focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPhone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-orange-600" />
                  Admin Phone Number
                </Label>
                <Input
                  id="adminPhone"
                  type="tel"
                  value={contactSettings.adminPhone}
                  onChange={(e) => handleInputChange("adminPhone", e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="border-orange-200 focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Widget Settings */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white rounded-t-lg">
            <CardTitle className="text-xl font-bold text-orange-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contact Widget Settings
            </CardTitle>
            <CardDescription>Configure the floating contact widget that appears on your website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-orange-600" />
                  Customer Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={contactSettings.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="border-orange-200 focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">This number will be used for the "Call Us" button</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  WhatsApp Number
                </Label>
                <Input
                  id="whatsappNumber"
                  type="tel"
                  value={contactSettings.whatsappNumber}
                  onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                  placeholder="+1234567890"
                  className="border-orange-200 focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">WhatsApp number (without spaces or special characters)</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <Label htmlFor="enableDemo" className="text-sm font-semibold text-gray-700">
                    Enable Demo Scheduling
                  </Label>
                  <p className="text-xs text-gray-500">Show "Schedule a Demo" button in the contact widget</p>
                </div>
              </div>
              <Switch
                id="enableDemo"
                checked={contactSettings.enableDemo}
                onCheckedChange={(checked) => handleInputChange("enableDemo", checked)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {/* Simplified Demo Settings */}
            {contactSettings.enableDemo && (
              <div className="space-y-4 mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Demo Reminder Settings
                </h3>

                <div className="space-y-3">
                  <Label htmlFor="reminderTime" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Reminder Timing
                  </Label>
                  <p className="text-xs text-gray-500">How many minutes before the demo should the reminder be sent?</p>
                  <div className="flex items-center space-x-3">
                    <Input
                      id="reminderTime"
                      type="number"
                      min="5"
                      max="1440"
                      step="5"
                      value={contactSettings.reminderTime}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value) || 30
                        if (value >= 5 && value <= 1440) {
                          handleInputChange("reminderTime", value)
                        }
                      }}
                      className="w-32 border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600 font-medium">minutes before demo</span>
                  </div>
                  <p className="text-xs text-gray-400">Range: 5 minutes to 24 hours (1440 minutes)</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="text-xl font-bold text-gray-800">Preview</CardTitle>
            <CardDescription>This is how your contact widget will appear to users</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 relative min-h-[200px]">
              <div className="absolute bottom-6 right-6">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-80 mb-4">
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Get in Touch</h4>
                  <div className="space-y-2">
                    {contactSettings.enableDemo && (
                      <div className="flex items-center gap-2 bg-blue-100 text-blue-800 py-2 px-3 rounded-lg text-sm">
                        <Calendar size={16} />
                        Schedule a Demo
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-green-100 text-green-800 py-2 px-3 rounded-lg text-sm">
                      <MessageSquare size={16} />
                      Chat on WhatsApp
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 text-gray-800 py-2 px-3 rounded-lg text-sm">
                      <Phone size={16} />
                      Call {contactSettings.phoneNumber}
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-lg">
                  Your contact widget will appear in the bottom-right corner of your website
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleAdminLayout>
  )
}

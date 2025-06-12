"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import Sidebar from "@/components/sidebar"
import {
  Search,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Crown,
  MapPin,
  Mail,
  UserCheck,
} from "lucide-react"
import { db, auth } from "@/firebase/firebase"
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "@/components/ui/use-toast"
import { FaSpinner } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

interface BusinessUser {
  id: string
  name: string
  email: string
  locations: string
  role: string
}

export default function BusinessUsersPage() {
  const [users, setUsers] = useState<BusinessUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<BusinessUser[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 6
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState({
    name: "",
    email: "",
    locations: "",
  })

  const [userForm, setUserForm] = useState({
    id: "",
    name: "",
    email: "",
    locations: "",
    role: "Business Owner", // Default role
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch business users from Firestore
  const fetchBusinessUsers = async (uid: string) => {
    setLoading(true)
    try {
      const businessUsersRef = collection(db, "users", uid, "businessUsers")
      const querySnapshot = await getDocs(businessUsersRef)
      const usersData: BusinessUser[] = []

      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          locations: doc.data().locations,
          role: doc.data().role || "Business Owner", // Fallback to default
        })
      })

      setUsers(usersData)
      setFilteredUsers(usersData)
    } catch (error) {
      console.error("Error fetching business users: ", error)
      toast({
        title: "Error",
        description: "Failed to load business users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter users based on search terms
  useEffect(() => {
    const filtered = users.filter((user) => {
      return (
        user.name.toLowerCase().includes(searchTerm.name.toLowerCase()) &&
        user.email.toLowerCase().includes(searchTerm.email.toLowerCase()) &&
        user.locations.toLowerCase().includes(searchTerm.locations.toLowerCase())
      )
    })
    setFilteredUsers(filtered)
    setCurrentPage(1) // Reset to first page when search changes
  }, [searchTerm, users])

  // Handle authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
        fetchBusinessUsers(user.uid)
      } else {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)

  const handleAddUser = async () => {
    if (!uid) return

    if (userForm.name && userForm.email && userForm.locations) {
      try {
        if (isEditing) {
          // Update existing user
          const userRef = doc(db, "users", uid, "businessUsers", userForm.id)
          await updateDoc(userRef, {
            name: userForm.name,
            email: userForm.email,
            locations: userForm.locations,
            role: userForm.role,
          })

          // Update local state
          setUsers(users.map((user) => (user.id === userForm.id ? { ...userForm } : user)))
        } else {
          // Add new user
          const businessUsersRef = collection(db, "users", uid, "businessUsers")
          const docRef = await addDoc(businessUsersRef, {
            name: userForm.name,
            email: userForm.email,
            locations: userForm.locations,
            role: userForm.role,
          })

          // Update local state
          setUsers([
            ...users,
            {
              id: docRef.id,
              ...userForm,
            },
          ])
        }

        resetForm()
        setIsDialogOpen(false)
        toast({
          title: "Success",
          description: `User ${isEditing ? "updated" : "added"} successfully`,
          variant: "default",
        })
      } catch (error) {
        console.error(`Error ${isEditing ? "updating" : "adding"} user: `, error)
        toast({
          title: "Error",
          description: `Failed to ${isEditing ? "update" : "add"} user`,
          variant: "destructive",
        })
      }
    }
  }

  const handleEditUser = (user: BusinessUser) => {
    setUserForm(user)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDeleteUser = async (id: string) => {
    if (!uid) return

    try {
      await deleteDoc(doc(db, "users", uid, "businessUsers", id))
      setUsers(users.filter((user) => user.id !== id))
      toast({
        title: "Success",
        description: "User deleted successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error deleting user: ", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSearchTerm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setUserForm({
      id: "",
      name: "",
      email: "",
      locations: "",
      role: "Business Owner", // Reset to default role
    })
    setIsEditing(false)
  }

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  const getRoleIcon = (role: string) => {
    return role === "Business Owner" ? (
      <Crown className="h-4 w-4 text-amber-500" />
    ) : (
      <UserCheck className="h-4 w-4 text-blue-500" />
    )
  }

  const getRoleBadgeColor = (role: string) => {
    return role === "Business Owner"
      ? "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200"
      : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200"
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <Sidebar isAdmin={false} />
        <div className="flex-1 md:ml-64 p-8">
          <div className="flex items-center justify-center h-64">
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <FaSpinner className="text-3xl text-indigo-500" />
              </motion.div>
              <span className="text-lg text-gray-600 font-medium">Loading business users...</span>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <Sidebar isAdmin={false} />

        <div className="flex-1 md:ml-64 p-8">
          <div className="space-y-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Business Users
                  </h1>
                  <p className="text-gray-600 font-medium">Manage your team members and their permissions</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      Team Members
                      <div className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full">
                        <span className="text-sm font-semibold text-indigo-700">{users.length} users</span>
                      </div>
                    </CardTitle>

                    <Dialog
                      open={isDialogOpen}
                      onOpenChange={(open) => {
                        if (!open) resetForm()
                        setIsDialogOpen(open)
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6 py-3 rounded-2xl font-semibold"
                          onClick={() => setIsEditing(false)}
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add Team Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] rounded-3xl border-0 shadow-2xl">
                        <DialogHeader className="pb-6">
                          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                            {isEditing ? "Edit Team Member" : "Add New Team Member"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                              Full Name
                            </Label>
                            <Input
                              id="name"
                              placeholder="Enter user's full name"
                              value={userForm.name}
                              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                              className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                            />
                          </motion.div>
                          <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter user's email address"
                              value={userForm.email}
                              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                              className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                            />
                          </motion.div>
                          <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <Label htmlFor="locations" className="text-sm font-semibold text-gray-700">
                              Assigned Locations
                            </Label>
                            <Input
                              id="locations"
                              placeholder="Enter location(s) they manage"
                              value={userForm.locations}
                              onChange={(e) => setUserForm({ ...userForm, locations: e.target.value })}
                              className="rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                            />
                          </motion.div>
                          <motion.div
                            className="space-y-4"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            <Label className="text-sm font-semibold text-gray-700">User Role</Label>
                            <RadioGroup
                              value={userForm.role}
                              onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                              className="grid grid-cols-1 gap-4"
                            >
                              <motion.div
                                className="flex items-center space-x-3 border-2 rounded-2xl p-4 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:border-amber-200 cursor-pointer transition-all duration-300"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <RadioGroupItem value="Business Owner" id="business-owner" />
                                <div className="flex items-center gap-3">
                                  <Crown className="h-5 w-5 text-amber-500" />
                                  <div>
                                    <Label htmlFor="business-owner" className="cursor-pointer font-semibold">
                                      Business Owner
                                    </Label>
                                    <p className="text-xs text-gray-500">Full access to all features and settings</p>
                                  </div>
                                </div>
                              </motion.div>
                              <motion.div
                                className="flex items-center space-x-3 border-2 rounded-2xl p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 cursor-pointer transition-all duration-300"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <RadioGroupItem value="Location Manager" id="location-manager" />
                                <div className="flex items-center gap-3">
                                  <UserCheck className="h-5 w-5 text-blue-500" />
                                  <div>
                                    <Label htmlFor="location-manager" className="cursor-pointer font-semibold">
                                      Location Manager
                                    </Label>
                                    <p className="text-xs text-gray-500">Manage specific locations and reviews</p>
                                  </div>
                                </div>
                              </motion.div>
                            </RadioGroup>
                          </motion.div>
                          <motion.div
                            className="flex justify-end gap-3 pt-6 border-t border-gray-200"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                          >
                            <Button
                              variant="outline"
                              onClick={() => setIsDialogOpen(false)}
                              className="rounded-xl hover:bg-gray-50 transition-all duration-300"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddUser}
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 px-8"
                            >
                              {isEditing ? "Update User" : "Add User"}
                            </Button>
                          </motion.div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <motion.div
                      className="relative group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <Input
                        name="name"
                        placeholder="Search by name..."
                        className="pl-12 py-3 border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                        value={searchTerm.name}
                        onChange={handleSearchChange}
                      />
                    </motion.div>
                    <motion.div
                      className="relative group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <Input
                        name="email"
                        placeholder="Search by email..."
                        className="pl-12 py-3 border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                        value={searchTerm.email}
                        onChange={handleSearchChange}
                      />
                    </motion.div>
                    <motion.div
                      className="relative group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <MapPin className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <Input
                        name="locations"
                        placeholder="Search by location..."
                        className="pl-12 py-3 border-gray-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                        value={searchTerm.locations}
                        onChange={handleSearchChange}
                      />
                    </motion.div>
                  </div>

                  <motion.div
                    className="border border-gray-200 rounded-3xl overflow-hidden shadow-lg bg-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <TableHead className="font-bold text-gray-700 py-4 px-6">Name</TableHead>
                          <TableHead className="font-bold text-gray-700 py-4 px-6">Email</TableHead>
                          <TableHead className="font-bold text-gray-700 py-4 px-6">Locations</TableHead>
                          <TableHead className="font-bold text-gray-700 py-4 px-6">Role</TableHead>
                          <TableHead className="text-right font-bold text-gray-700 py-4 px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {currentUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-16">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                  <p className="text-gray-500 text-lg font-medium">No users found</p>
                                  <p className="text-gray-400 text-sm">Add your first team member to get started</p>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            currentUsers.map((user, index) => (
                              <motion.tr
                                key={user.id}
                                className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-300"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.01 }}
                              >
                                <TableCell className="font-semibold text-gray-800 py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                      {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    {user.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-600 py-4 px-6">{user.email}</TableCell>
                                <TableCell className="text-gray-600 py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    {user.locations}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <div
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}
                                  >
                                    {getRoleIcon(user.role)}
                                    {user.role}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-4 px-6">
                                  <div className="flex justify-end gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditUser(user)}
                                          className="h-10 w-10 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all duration-300 hover:scale-110"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit User</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteUser(user.id)}
                                          className="h-10 w-10 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300 hover:scale-110"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete User</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))
                          )}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </motion.div>

                  {filteredUsers.length > usersPerPage && (
                    <motion.div
                      className="flex items-center justify-between pt-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="text-sm text-gray-600 font-medium">
                        Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of{" "}
                        {filteredUsers.length} users
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all duration-300"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all duration-300"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

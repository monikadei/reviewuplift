"use client"
import { useState, useEffect } from "react"
import { SimpleAdminLayout } from "@/components/simple-admin-layout"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Star, ChevronDown, RefreshCw, MoreVertical, Trash2, User, Edit, UserPlus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { collection, getDocs, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import { format } from "date-fns"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  uid: string;
  displayName: string;
  email: string;
  role: "ADMIN" | "BUSINESS";
  status: "Active" | "Inactive" | "Pending" | "Suspended" | "Deleted";
  createdAt: Date;
  businessName?: string;
  deleted?: boolean;
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all") // NEW: Role filter state
  const [refreshing, setRefreshing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setRefreshing(true)
        const usersCollection = collection(db, "users")
        const usersSnapshot = await getDocs(usersCollection)
        
        const usersData: User[] = []
        
        usersSnapshot.forEach(userDoc => {
          const userData = userDoc.data()
          const createdAt = userData.createdAt?.toDate() || new Date()
          
          usersData.push({
            uid: userDoc.id,
            displayName: userData.displayName || "No Name",
            email: userData.email || "No Email",
            role: userData.role || "BUSINESS",
            status: userData.status || "Pending",
            createdAt,
            businessName: userData.businessInfo?.businessName,
            deleted: userData.deleted || false
          })
        })
        
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setIsLoading(false)
        setRefreshing(false)
      }
    }
    
    fetchUsers()
    
    // Real-time listener
    const unsubscribe = onSnapshot(collection(db, "users"), () => {
      fetchUsers()
    })
    
    return () => unsubscribe()
  }, [])

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, { status: newStatus })
    } catch (error) {
      console.error("Error updating user status:", error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, { 
        status: "Deleted",
        deleted: true
      })
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  const handleRestoreUser = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, { 
        status: "Active",
        deleted: false
      })
    } catch (error) {
      console.error("Error restoring user:", error)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  const filteredUsers = users.filter(
    (user) => (
      (user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.businessName && user.businessName.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (statusFilter === "all" || user.status === statusFilter) &&
      (roleFilter === "all" || user.role === roleFilter) // NEW: Role filter
    )
  )
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 shadow-sm hover:shadow-green-200 transition-shadow"
      case "Inactive":
        return "bg-gray-100 text-gray-800 shadow-sm hover:shadow-gray-200 transition-shadow"
      case "Pending":
        return "bg-yellow-100 text-yellow-800 shadow-sm hover:shadow-yellow-200 transition-shadow"
      case "Suspended":
        return "bg-red-100 text-red-800 shadow-sm hover:shadow-red-200 transition-shadow"
      case "Deleted":
        return "bg-gray-300 text-gray-800 line-through"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
  }

  return (
    <SimpleAdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="animate-slide-down flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-gray-600 mt-1">Manage all users on the platform</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <UserPlus className="h-4 w-4 mr-2" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="John Doe" value={editingUser?.displayName || ""} />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input placeholder="john@example.com" type="email" value={editingUser?.email || ""} />
                </div>
                
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={editingUser?.role || "Select role"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="BUSINESS">Business User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={editingUser?.status || "Select status"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Deleted">Deleted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
                  <Button className="bg-orange-600 hover:bg-orange-700">Save Changes</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-orange-200 shadow-lg transition-all hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-orange-50 to-white rounded-t-lg">
            <CardTitle className="text-xl font-bold text-orange-800">All Users</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Select onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] border-orange-200">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* NEW: Role filter dropdown */}
              <div className="relative">
                <Select onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px] border-orange-200">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="BUSINESS">Business User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-orange-400" />
                <Input
                  placeholder="Search users..."
                  className="pl-8 border-orange-200 focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              
              <Button 
                variant="outline" 
                size="icon"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={handleRefresh}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-orange-200 h-12 w-12"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-orange-200 rounded w-64"></div>
                    <div className="h-4 bg-orange-200 rounded w-56"></div>
                  </div>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-1">No users found</h3>
                <p className="max-w-md">
                  {searchQuery 
                    ? "No users match your search. Try different keywords." 
                    : "No users registered yet. New users will appear here once they sign up."}
                </p>
              </div>
            ) : (
              <Table className="rounded-lg overflow-hidden">
                <TableHeader className="bg-orange-50">
                  <TableRow className="hover:bg-orange-50">
                    <TableHead className="font-bold text-orange-800">Name</TableHead>
                    <TableHead className="font-bold text-orange-800">Email</TableHead>
                    <TableHead className="font-bold text-orange-800">Business</TableHead>
                    
                    {/* UPDATED: Role header with filter indicator */}
                    <TableHead className="font-bold text-orange-800">
                      <div className="flex items-center">
                        Role
                        {roleFilter !== "all" && (
                          <Badge variant="outline" className="ml-2 border-orange-300 text-orange-600 bg-orange-50">
                            {roleFilter === "ADMIN" ? "Admin" : "Business"}
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                    
                    <TableHead className="font-bold text-orange-800">Status</TableHead>
                    <TableHead className="font-bold text-orange-800">Joined</TableHead>
                    <TableHead className="font-bold text-orange-800 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredUsers.map((user) => (
                      <motion.tr 
                        key={user.uid}
                        className="border-b border-orange-100 hover:bg-orange-50 transition-all duration-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TableCell className="font-medium group">
                          <span className="group-hover:text-orange-600 transition-colors">
                            {user.displayName}
                          </span>
                        </TableCell>
                        <TableCell className="group">
                          <span className="group-hover:text-orange-500 transition-colors">
                            {user.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.businessName ? (
                            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                              {user.businessName}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge
                            variant={user.role === "ADMIN" ? "default" : "outline"}
                            className={`${user.role === "ADMIN" ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-sm" : "border-orange-200 text-orange-700 bg-orange-50"} transition-all hover:scale-105`}
                          >
                            {user.role === "ADMIN" ? "Admin" : "Business User"}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <Badge 
                            className={`${getStatusColor(user.status)} transition-all hover:scale-105 cursor-pointer`}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {format(user.createdAt, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              
                              {user.status === "Deleted" ? (
                                <DropdownMenuItem onClick={() => handleRestoreUser(user.uid)}>
                                  <User className="mr-2 h-4 w-4 text-green-600" />
                                  <span className="text-green-600">Restore</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleDeleteUser(user.uid)}>
                                  <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                  <span className="text-red-600">Delete</span>
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem onClick={() => handleStatusChange(user.uid, "Active")}>
                                Set Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(user.uid, "Suspended")}>
                                Suspend
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleAdminLayout>
  )
}
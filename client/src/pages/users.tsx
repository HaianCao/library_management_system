import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users as UsersIcon, Plus, Search, Crown, User, UserCog, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AddUserModal from "@/components/modals/add-user-modal";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

export default function Users() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      toast({
        title: "Unauthorized",
        description: "Admin access required",
        variant: "destructive",
      });
      // Could redirect to dashboard instead
      window.history.back();
    }
  }, [user, authLoading, toast]);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["/api/users", { search, role, page }],
    enabled: user?.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await apiRequest("PUT", `/api/users/${userId}/role`, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      await apiRequest("DELETE", `/api/users/${targetUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string, userEmail: string) => {
    if (confirm(`Are you sure you want to change ${userEmail}'s role to ${newRole}?`)) {
      updateRoleMutation.mutate({ userId, newRole });
    }
  };

  const handleDeleteUser = (targetUserId: string, userEmail: string) => {
    if (confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(targetUserId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const roles = ["all", "admin", "user"];

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show nothing if not admin (will redirect)
  if (user?.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              User Management
            </CardTitle>
            <Button 
              onClick={() => setShowAddModal(true)}
              data-testid="button-add-new-user"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New User
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>
              
              <Button onClick={handleSearch} data-testid="button-search-users">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
            
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-role-filter">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersData as any)?.users?.map((userData: any) => (
                  <TableRow key={userData.id} data-testid={`row-user-${userData.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                          {userData.profileImageUrl ? (
                            <img 
                              src={userData.profileImageUrl} 
                              alt="Profile" 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-accent-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-user-name-${userData.id}`}>
                            {userData.firstName || userData.lastName ? 
                              `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 
                              'No name provided'
                            }
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-user-id-${userData.id}`}>
                            ID: {userData.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-foreground" data-testid={`text-user-email-${userData.id}`}>
                      {userData.email || 'No email'}
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant={userData.role === 'admin' ? "default" : "secondary"}
                        data-testid={`badge-user-role-${userData.id}`}
                      >
                        <div className="flex items-center gap-1">
                          {userData.role === 'admin' ? (
                            <Crown className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                        </div>
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-foreground" data-testid={`text-user-joined-${userData.id}`}>
                      {formatDate(userData.createdAt)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex space-x-2">
                        <Select
                          value={userData.role}
                          onValueChange={(newRole) => handleRoleChange(userData.id, newRole, userData.email)}
                          disabled={updateRoleMutation.isPending || userData.id === user.id}
                        >
                          <SelectTrigger className="w-24" data-testid={`select-change-role-${userData.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Delete button - only for regular users, not admins or self */}
                        {userData.role === 'user' && userData.id !== user.id && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteUser(userData.id, userData.email)}
                            disabled={deleteUserMutation.isPending}
                            data-testid={`button-delete-user-${userData.id}`}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) || []}
              </TableBody>
            </Table>
            
            {(!(usersData as any)?.users || (usersData as any).users.length === 0) && (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-users">
                No users found
              </div>
            )}
          </div>

          {/* Pagination */}
          {(usersData as any)?.total && (usersData as any).total > 10 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {Math.min(10, (usersData as any).users?.length || 0)} of {(usersData as any).total} users
              </p>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page * 10 >= (usersData as any).total}
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
      />
    </div>
  );
}

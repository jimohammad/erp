import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Edit2, Users, Shield, Settings, Building2 } from "lucide-react";
import type { UserRoleAssignment, RolePermission, Branch } from "@shared/schema";

interface UserRoleAssignmentWithBranch extends UserRoleAssignment {
  branch?: Branch;
}

const ROLE_LABELS: Record<string, string> = {
  super_user: "Super User",
  admin: "Admin",
  user: "User",
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  purchases: "Purchases",
  sales: "Sales",
  payments: "Payments",
  returns: "Returns",
  expenses: "Expenses",
  accounts: "Accounts",
  items: "Item Master",
  parties: "Party Master",
  reports: "Reports",
  all_transactions: "All Transactions",
  discount: "Discount",
  stock: "Stock Lookup",
  imei_history: "IMEI History",
  stock_transfers: "Stock Transfers",
  backup: "Database Backup",
  settings: "Settings",
  send_price_list: "Send Price List",
  user_management: "User Management",
};

interface MyPermissions {
  role: string;
  modules: string[];
  assignedBranchId: number | null;
}

export default function UserRoles() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserRoleAssignmentWithBranch | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newBranchId, setNewBranchId] = useState<number | null>(null);

  const { data: myPermissions } = useQuery<MyPermissions>({
    queryKey: ["/api/my-permissions"],
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<UserRoleAssignmentWithBranch[]>({
    queryKey: ["/api/user-role-assignments"],
  });

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const isSuperUser = myPermissions?.role === "superuser" || myPermissions?.role === "super_user" || myPermissions?.role === "admin";

  const createMutation = useMutation({
    mutationFn: (data: { email: string; role: string; branchId?: number | null }) =>
      apiRequest("POST", "/api/user-role-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-role-assignments"] });
      setIsAddDialogOpen(false);
      setNewEmail("");
      setNewRole("user");
      setNewBranchId(null);
      toast({ title: "User role assigned successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to assign role",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { email: string; role: string; branchId?: number | null } }) =>
      apiRequest("PUT", `/api/user-role-assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-role-assignments"] });
      setEditingAssignment(null);
      toast({ title: "User role updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/user-role-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-role-assignments"] });
      toast({ title: "User role removed successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: (data: { role: string; moduleName: string; canAccess: boolean }) =>
      apiRequest("PUT", "/api/role-permissions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-permissions"] });
    },
    onError: () => {
      toast({
        title: "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  const handleCreateAssignment = () => {
    if (!newEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    createMutation.mutate({ email: newEmail.trim(), role: newRole, branchId: newBranchId });
  };

  const handleUpdateAssignment = () => {
    if (!editingAssignment) return;
    updateMutation.mutate({
      id: editingAssignment.id,
      data: { email: editingAssignment.email, role: editingAssignment.role, branchId: editingAssignment.branchId },
    });
  };

  const getPermission = (role: string, moduleName: string): boolean => {
    const perm = permissions.find(p => p.role === role && p.moduleName === moduleName);
    return perm ? perm.canAccess === 1 : true;
  };

  const togglePermission = (role: string, moduleName: string) => {
    const currentValue = getPermission(role, moduleName);
    updatePermissionMutation.mutate({ role, moduleName, canAccess: !currentValue });
  };

  if (!isSuperUser) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Only Super Users can manage user roles and permissions.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your current role: <Badge variant="secondary">{ROLE_LABELS[myPermissions?.role || "user"]}</Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">User Roles & Permissions</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            User Role Assignments
          </TabsTrigger>
          <TabsTrigger value="permissions" data-testid="tab-permissions">
            <Shield className="h-4 w-4 mr-2" />
            Module Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>User Role Assignments</CardTitle>
                <CardDescription>
                  Assign roles to users by their Google sign-in email address
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-user-role">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Role to User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        data-testid="input-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_user">Super User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned Branch (optional)</Label>
                      <Select 
                        value={newBranchId?.toString() || "none"} 
                        onValueChange={(val) => setNewBranchId(val === "none" ? null : parseInt(val))}
                      >
                        <SelectTrigger data-testid="select-branch">
                          <Building2 className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All branches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All branches (no restriction)</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        If assigned to a branch, user can only access that branch
                      </p>
                    </div>
                    <Button
                      onClick={handleCreateAssignment}
                      disabled={createMutation.isPending}
                      className="w-full"
                      data-testid="button-save-user-role"
                    >
                      {createMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingAssignments ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No user roles assigned yet. Add your first user role to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                        <TableCell>{assignment.email}</TableCell>
                        <TableCell>
                          {editingAssignment?.id === assignment.id ? (
                            <Select
                              value={editingAssignment.role}
                              onValueChange={(value) =>
                                setEditingAssignment({ ...editingAssignment, role: value })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_user">Super User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">
                              {ROLE_LABELS[assignment.role] || assignment.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingAssignment?.id === assignment.id ? (
                            <Select
                              value={editingAssignment.branchId?.toString() || "none"}
                              onValueChange={(val) =>
                                setEditingAssignment({ 
                                  ...editingAssignment, 
                                  branchId: val === "none" ? null : parseInt(val) 
                                })
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">All branches</SelectItem>
                                {branches.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm">
                              {assignment.branch?.name || (
                                <span className="text-muted-foreground">All branches</span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingAssignment?.id === assignment.id ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={handleUpdateAssignment}
                                disabled={updateMutation.isPending}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingAssignment(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingAssignment(assignment)}
                                data-testid={`button-edit-${assignment.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(assignment.id)}
                                data-testid={`button-delete-${assignment.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Module Permissions</CardTitle>
              <CardDescription>
                Control which modules each role can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPermissions ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center">Super User</TableHead>
                        <TableHead className="text-center">Admin</TableHead>
                        <TableHead className="text-center">User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(MODULE_LABELS).map(([moduleName, label]) => (
                        <TableRow key={moduleName} data-testid={`row-module-${moduleName}`}>
                          <TableCell className="font-medium">{label}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={getPermission("super_user", moduleName)}
                              onCheckedChange={() => togglePermission("super_user", moduleName)}
                              disabled={moduleName === "settings"}
                              data-testid={`switch-super_user-${moduleName}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={getPermission("admin", moduleName)}
                              onCheckedChange={() => togglePermission("admin", moduleName)}
                              data-testid={`switch-admin-${moduleName}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={getPermission("user", moduleName)}
                              onCheckedChange={() => togglePermission("user", moduleName)}
                              data-testid={`switch-user-${moduleName}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

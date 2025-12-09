import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Building2, Loader2, Pencil, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Branch {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  isDefault: number | null;
  createdAt: string | null;
}

export default function BranchesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
  });

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/branches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Branch created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create branch", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return await apiRequest("PUT", `/api/branches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsDialogOpen(false);
      setEditingBranch(null);
      resetForm();
      toast({ title: "Branch updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update branch", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Branch deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete branch", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", code: "", address: "", phone: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: "Branch name is required", variant: "destructive" });
      return;
    }

    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || "",
      address: branch.address || "",
      phone: branch.phone || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingBranch(null);
      resetForm();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-branches">Branch Management</h2>
          <p className="text-muted-foreground">Manage your company branches</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-branch">
              <Plus className="h-4 w-4 mr-2" />
              New Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBranch ? "Edit Branch" : "Create Branch"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Main Branch"
                  data-testid="input-branch-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Branch Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. MB"
                  data-testid="input-branch-code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  data-testid="input-branch-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Branch address"
                  data-testid="textarea-branch-address"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-branch"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingBranch ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No branches found. Click "New Branch" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id} data-testid={`row-branch-${branch.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {branch.name}
                        {branch.isDefault === 1 && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{branch.code || "-"}</TableCell>
                    <TableCell>{branch.phone || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{branch.address || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(branch)}
                          data-testid={`button-edit-branch-${branch.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (branch.isDefault === 1) {
                              toast({ title: "Cannot delete default branch", variant: "destructive" });
                              return;
                            }
                            if (confirm("Are you sure you want to delete this branch?")) {
                              deleteMutation.mutate(branch.id);
                            }
                          }}
                          disabled={branch.isDefault === 1}
                          data-testid={`button-delete-branch-${branch.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

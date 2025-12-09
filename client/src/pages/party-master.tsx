import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
import type { Supplier, PartyType } from "@shared/schema";

export default function PartyMaster() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Supplier | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyType, setPartyType] = useState<PartyType>("supplier");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Supplier | null>(null);
  
  const [filterType, setFilterType] = useState<"all" | PartyType>("all");

  const { data: allParties = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const filteredParties = filterType === "all" 
    ? allParties 
    : allParties.filter(p => p.partyType === filterType);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; address: string | null; phone: string | null; partyType: PartyType }) => 
      apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Party added successfully" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Failed to add party", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; address: string | null; phone: string | null; partyType: PartyType } }) =>
      apiRequest("PUT", `/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Party updated successfully" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Failed to update party", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete party");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Party deleted successfully" });
      setDeleteDialogOpen(false);
      setPartyToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handleOpenAdd = () => {
    setEditingParty(null);
    setPartyName("");
    setPartyAddress("");
    setPartyPhone("");
    setPartyType("supplier");
    setDialogOpen(true);
  };

  const handleOpenEdit = (party: Supplier) => {
    setEditingParty(party);
    setPartyName(party.name);
    setPartyAddress(party.address || "");
    setPartyPhone(party.phone || "");
    setPartyType((party.partyType as PartyType) || "supplier");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingParty(null);
    setPartyName("");
    setPartyAddress("");
    setPartyPhone("");
    setPartyType("supplier");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    const data = {
      name: partyName.trim(),
      address: partyAddress.trim() || null,
      phone: partyPhone.trim() || null,
      partyType,
    };

    if (editingParty) {
      updateMutation.mutate({ id: editingParty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteClick = (party: Supplier) => {
    setPartyToDelete(party);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (partyToDelete) {
      deleteMutation.mutate(partyToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">Party Master</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border rounded-md p-1">
              <Button
                variant={filterType === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterType("all")}
                data-testid="filter-all"
              >
                All
              </Button>
              <Button
                variant={filterType === "supplier" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterType("supplier")}
                data-testid="filter-supplier"
              >
                Suppliers
              </Button>
              <Button
                variant={filterType === "customer" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterType("customer")}
                data-testid="filter-customer"
              >
                Customers
              </Button>
            </div>
            {isAdmin && (
              <Button onClick={handleOpenAdd} data-testid="button-add-party">
                <Plus className="h-4 w-4 mr-2" />
                Add Party
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredParties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No parties found. {isAdmin && "Add your first party to get started."}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Party Name</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-36">Phone</TableHead>
                    {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParties.map((party) => (
                    <TableRow key={party.id} data-testid={`row-party-${party.id}`}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {party.id}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-party-name-${party.id}`}>
                        {party.name}
                      </TableCell>
                      <TableCell data-testid={`text-party-type-${party.id}`}>
                        <Badge 
                          variant={party.partyType === "customer" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {party.partyType || "supplier"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-party-address-${party.id}`}>
                        {party.address || "-"}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-party-phone-${party.id}`}>
                        {party.phone || "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(party)}
                              data-testid={`button-edit-party-${party.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(party)}
                              data-testid={`button-delete-party-${party.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParty ? "Edit Party" : "Add New Party"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="partyType" className="text-base">Party Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {partyType === "customer" ? "Customer (sales)" : "Supplier (purchases)"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${partyType === "supplier" ? "font-medium" : "text-muted-foreground"}`}>
                    Supplier
                  </span>
                  <Switch
                    id="partyType"
                    checked={partyType === "customer"}
                    onCheckedChange={(checked) => setPartyType(checked ? "customer" : "supplier")}
                    data-testid="switch-party-type"
                  />
                  <span className={`text-sm ${partyType === "customer" ? "font-medium" : "text-muted-foreground"}`}>
                    Customer
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyName">Party Name</Label>
                <Input
                  id="partyName"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Enter party name"
                  data-testid="input-party-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyAddress">Address</Label>
                <Input
                  id="partyAddress"
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  placeholder="Enter address (optional)"
                  data-testid="input-party-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyPhone">Phone Number</Label>
                <Input
                  id="partyPhone"
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  placeholder="Enter phone number (optional)"
                  data-testid="input-party-phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!partyName.trim() || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-party"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingParty ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Party</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{partyToDelete?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

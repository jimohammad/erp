import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PurchaseOrderForm, type FormData } from "@/components/PurchaseOrderForm";
import { ReportingSection } from "@/components/ReportingSection";
import { SupplierDialog } from "@/components/SupplierDialog";
import { ItemDialog } from "@/components/ItemDialog";
import { PurchaseOrderDetail } from "@/components/PurchaseOrderDetail";
import { LogOut } from "lucide-react";
import type { Supplier, Item, PurchaseOrderWithDetails } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierDialogMode, setSupplierDialogMode] = useState<"add" | "edit">("add");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogMode, setItemDialogMode] = useState<"add" | "edit">("add");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderWithDetails | null>(null);

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<PurchaseOrderWithDetails[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: monthlyStats = [], isLoading: statsLoading } = useQuery<{ month: number; totalKwd: number; totalFx: number }[]>({
    queryKey: ["/api/stats/monthly"],
  });

  const createSupplierMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/suppliers", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add supplier", variant: "destructive" });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest("PUT", `/api/suppliers/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update supplier", variant: "destructive" });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete supplier");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/items", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest("PUT", `/api/items/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/items/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete item");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const createPOMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      let invoiceFilePath = null;
      let deliveryNoteFilePath = null;
      let ttCopyFilePath = null;

      const uploadFile = async (file: File): Promise<string | null> => {
        if (!file) return null;
        try {
          const response = await apiRequest("POST", "/api/objects/upload");
          const { uploadURL } = response as { uploadURL: string };

          await fetch(uploadURL, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          });

          const updateResponse = await apiRequest("PUT", "/api/files/uploaded", {
            uploadURL,
          });
          return (updateResponse as { objectPath: string }).objectPath;
        } catch (error) {
          console.error("Upload failed:", error);
          return null;
        }
      };

      if (formData.invoiceFile) {
        invoiceFilePath = await uploadFile(formData.invoiceFile);
      }
      if (formData.deliveryNoteFile) {
        deliveryNoteFilePath = await uploadFile(formData.deliveryNoteFile);
      }
      if (formData.ttCopyFile) {
        ttCopyFilePath = await uploadFile(formData.ttCopyFile);
      }

      const payload = {
        purchaseDate: formData.purchaseDate,
        invoiceNumber: formData.invoiceNumber || null,
        supplierId: formData.supplierId,
        totalKwd: formData.totalKwd,
        fxCurrency: formData.fxCurrency,
        fxRate: formData.fxRate || null,
        totalFx: formData.totalFx || null,
        grnDate: formData.grnDate || null,
        invoiceFilePath,
        deliveryNoteFilePath,
        ttCopyFilePath,
        lineItems: formData.lineItems
          .filter(item => item.itemName)
          .map(item => ({
            itemName: item.itemName,
            quantity: item.quantity,
            priceKwd: item.priceKwd || null,
            fxPrice: item.fxPrice || null,
            totalKwd: item.totalKwd,
          })),
      };

      return apiRequest("POST", "/api/purchase-orders", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });
      toast({ title: "Purchase order saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save purchase order", variant: "destructive" });
    },
  });

  const deletePOMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/purchase-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });
      toast({ title: "Purchase order deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete purchase order", variant: "destructive" });
    },
  });

  const handleAddSupplier = () => {
    setSupplierDialogMode("add");
    setSupplierDialogOpen(true);
  };

  const handleEditSuppliers = () => {
    setSupplierDialogMode("edit");
    setSupplierDialogOpen(true);
  };

  const handleAddItem = () => {
    setItemDialogMode("add");
    setItemDialogOpen(true);
  };

  const handleEditItems = () => {
    setItemDialogMode("edit");
    setItemDialogOpen(true);
  };

  const handleViewOrder = (order: PurchaseOrderWithDetails) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleSubmitPO = async (data: FormData) => {
    await createPOMutation.mutateAsync(data);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="heading-title">
              Iqbal Electronics Co. WLL
            </h1>
            <p className="text-sm text-muted-foreground">
              Purchase Order Register
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-normal">
                Storage: Database
              </Badge>
              <Badge variant="secondary" className="font-normal">
                Formats: PDF / JPG / PNG
              </Badge>
            </div>
            <ThemeToggle />
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-xs">
                <p className="font-medium">{user?.firstName || user?.email || "User"}</p>
                <p className="text-muted-foreground capitalize">{user?.role || "viewer"}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <section className="no-print mb-6">
          <PurchaseOrderForm
            suppliers={suppliers}
            items={items}
            onAddSupplier={handleAddSupplier}
            onEditSuppliers={handleEditSuppliers}
            onAddItem={handleAddItem}
            onEditItems={handleEditItems}
            onSubmit={handleSubmitPO}
            isSubmitting={createPOMutation.isPending}
            isAdmin={user?.role === "admin"}
          />
        </section>

        <section>
          <ReportingSection
            orders={orders}
            monthlyStats={monthlyStats}
            isLoading={ordersLoading}
            isStatsLoading={statsLoading}
            onViewOrder={handleViewOrder}
            onDeleteOrder={(id) => deletePOMutation.mutate(id)}
            isAdmin={user?.role === "admin"}
          />
        </section>
      </div>

      <SupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        mode={supplierDialogMode}
        suppliers={suppliers}
        onAdd={(name) => createSupplierMutation.mutate(name)}
        onUpdate={(id, name) => updateSupplierMutation.mutate({ id, name })}
        onDelete={(id) => deleteSupplierMutation.mutate(id)}
      />

      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        mode={itemDialogMode}
        items={items}
        onAdd={(name) => createItemMutation.mutate(name)}
        onUpdate={(id, name) => updateItemMutation.mutate({ id, name })}
        onDelete={(id) => deleteItemMutation.mutate(id)}
      />

      <PurchaseOrderDetail
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        order={selectedOrder}
      />
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SalesOrderForm, type SalesFormData } from "@/components/SalesOrderForm";
import { SalesReportingSection } from "@/components/SalesReportingSection";
import { CustomerDialog } from "@/components/CustomerDialog";
import { ItemDialog } from "@/components/ItemDialog";
import { SalesOrderDetail } from "@/components/SalesOrderDetail";
import type { Customer, Item, SalesOrderWithDetails } from "@shared/schema";

export default function SalesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerDialogMode, setCustomerDialogMode] = useState<"add" | "edit">("add");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogMode, setItemDialogMode] = useState<"add" | "edit">("add");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderWithDetails | null>(null);

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<SalesOrderWithDetails[]>({
    queryKey: ["/api/sales-orders"],
  });

  const { data: monthlyStats = [], isLoading: statsLoading } = useQuery<{ month: number; totalKwd: number; totalFx: number }[]>({
    queryKey: ["/api/sales-stats/monthly"],
  });

  const createCustomerMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/customers", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add customer", variant: "destructive" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest("PUT", `/api/customers/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update customer", variant: "destructive" });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/customers/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete customer");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted successfully" });
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

  const createSOMutation = useMutation({
    mutationFn: async (formData: SalesFormData) => {
      let invoiceFilePath = null;
      let deliveryNoteFilePath = null;
      let paymentReceiptFilePath = null;

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
      if (formData.paymentReceiptFile) {
        paymentReceiptFilePath = await uploadFile(formData.paymentReceiptFile);
      }

      const payload = {
        saleDate: formData.saleDate,
        invoiceNumber: formData.invoiceNumber || null,
        customerId: formData.customerId,
        totalKwd: formData.totalKwd,
        fxCurrency: formData.fxCurrency,
        fxRate: formData.fxRate || null,
        totalFx: formData.totalFx || null,
        deliveryDate: formData.deliveryDate || null,
        invoiceFilePath,
        deliveryNoteFilePath,
        paymentReceiptFilePath,
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

      return apiRequest("POST", "/api/sales-orders", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-stats/monthly"] });
      toast({ title: "Sales invoice saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save sales invoice", variant: "destructive" });
    },
  });

  const deleteSOMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sales-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-stats/monthly"] });
      toast({ title: "Sales invoice deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete sales invoice", variant: "destructive" });
    },
  });

  const handleAddCustomer = () => {
    setCustomerDialogMode("add");
    setCustomerDialogOpen(true);
  };

  const handleEditCustomers = () => {
    setCustomerDialogMode("edit");
    setCustomerDialogOpen(true);
  };

  const handleAddItem = () => {
    setItemDialogMode("add");
    setItemDialogOpen(true);
  };

  const handleEditItems = () => {
    setItemDialogMode("edit");
    setItemDialogOpen(true);
  };

  const handleViewOrder = (order: SalesOrderWithDetails) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleSubmitSO = async (data: SalesFormData) => {
    await createSOMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <section className="no-print">
        <SalesOrderForm
          customers={customers}
          items={items}
          onAddCustomer={handleAddCustomer}
          onEditCustomers={handleEditCustomers}
          onAddItem={handleAddItem}
          onEditItems={handleEditItems}
          onSubmit={handleSubmitSO}
          isSubmitting={createSOMutation.isPending}
          isAdmin={user?.role === "admin"}
        />
      </section>

      <section>
        <SalesReportingSection
          orders={orders}
          monthlyStats={monthlyStats}
          isLoading={ordersLoading}
          isStatsLoading={statsLoading}
          onViewOrder={handleViewOrder}
          onDeleteOrder={(id) => deleteSOMutation.mutate(id)}
          isAdmin={user?.role === "admin"}
        />
      </section>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        mode={customerDialogMode}
        customers={customers}
        onAdd={(name) => createCustomerMutation.mutate(name)}
        onUpdate={(id, name) => updateCustomerMutation.mutate({ id, name })}
        onDelete={(id) => deleteCustomerMutation.mutate(id)}
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

      <SalesOrderDetail
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        order={selectedOrder}
      />
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SalesOrderForm, type SalesFormData } from "@/components/SalesOrderForm";
import { SalesReportingSection } from "@/components/SalesReportingSection";
import { CustomerDialog } from "@/components/CustomerDialog";
import { SalesOrderDetail } from "@/components/SalesOrderDetail";
import type { Customer, Item, SalesOrderWithDetails } from "@shared/schema";

export default function SalesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerDialogMode, setCustomerDialogMode] = useState<"add" | "edit">("add");
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

  const createSOMutation = useMutation({
    mutationFn: async (formData: SalesFormData) => {
      const payload = {
        saleDate: formData.saleDate,
        invoiceNumber: formData.invoiceNumber || null,
        customerId: formData.customerId,
        totalKwd: formData.totalKwd,
        lineItems: formData.lineItems
          .filter(item => item.itemName)
          .map(item => ({
            itemName: item.itemName,
            quantity: item.quantity,
            priceKwd: item.priceKwd || null,
            totalKwd: item.totalKwd,
            imeiNumbers: item.imeiNumbers,
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
          onSubmit={handleSubmitSO}
          isSubmitting={createSOMutation.isPending}
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

      <SalesOrderDetail
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        order={selectedOrder}
      />
    </div>
  );
}

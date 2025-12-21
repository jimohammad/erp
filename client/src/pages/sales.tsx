import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SalesOrderForm, type SalesFormData } from "@/components/SalesOrderForm";
import { CustomerDialog } from "@/components/CustomerDialog";
import type { Customer, Item } from "@shared/schema";

export default function SalesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerDialogMode, setCustomerDialogMode] = useState<"add" | "edit">("add");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; creditLimit?: string }) => 
      apiRequest("POST", "/api/customers", { 
        name: data.name, 
        creditLimit: data.creditLimit || null 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add customer", variant: "destructive" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; creditLimit?: string } }) =>
      apiRequest("PUT", `/api/customers/${id}`, { 
        name: data.name, 
        creditLimit: data.creditLimit || null 
      }),
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
        customerId: formData.customerId && formData.customerId > 0 ? formData.customerId : null,
        salesmanId: formData.salesmanId && formData.salesmanId > 0 ? formData.salesmanId : null,
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
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-stats/monthly"] });
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("/api/customers") });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/balances/all"] });
      toast({ title: "Sales invoice saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to save sales invoice", variant: "destructive" });
    },
  });

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
          isAdmin={user?.role === "admin" || user?.role === "super_user"}
        />
      </section>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        mode={customerDialogMode}
        customers={customers}
        onAdd={(data) => createCustomerMutation.mutate(data)}
        onUpdate={(id, data) => updateCustomerMutation.mutate({ id, data })}
        onDelete={(id) => deleteCustomerMutation.mutate(id)}
      />
    </div>
  );
}

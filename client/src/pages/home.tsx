import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PurchaseOrderForm, type FormData } from "@/components/PurchaseOrderForm";
import type { Supplier, Item } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
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
        fxRate: formData.fxRate ?? null,
        totalFx: formData.totalFx ?? null,
        grnDate: formData.grnDate || null,
        invoiceFilePath,
        deliveryNoteFilePath,
        ttCopyFilePath,
        lineItems: formData.lineItems
          .filter(item => item.itemName)
          .map(item => ({
            itemName: item.itemName,
            quantity: item.quantity,
            priceKwd: item.priceKwd ?? null,
            fxPrice: item.fxPrice ?? null,
            totalKwd: item.totalKwd,
          })),
      };

      return apiRequest("POST", "/api/purchase-orders", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({ title: "Purchase order saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save purchase order", variant: "destructive" });
    },
  });

  const handleSubmitPO = async (data: FormData) => {
    await createPOMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <section className="no-print">
        <PurchaseOrderForm
          suppliers={suppliers}
          items={items}
          onSubmit={handleSubmitPO}
          isSubmitting={createPOMutation.isPending}
        />
      </section>
    </div>
  );
}

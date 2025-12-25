import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Save, RefreshCw, Edit3 } from "lucide-react";
import type { Item } from "@shared/schema";

type EditedItem = {
  id: number;
  code: string;
  name: string;
  purchasePriceKwd: string;
  purchasePriceFx: string;
  fxCurrency: string;
  sellingPriceKwd: string;
  hasChanges: boolean;
};

export default function ItemBulkEdit() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superuser" || user?.role === "super_user";
  
  const [editedItems, setEditedItems] = useState<Record<number, EditedItem>>({});
  const [fetchingPriceFor, setFetchingPriceFor] = useState<number | null>(null);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: Array<{ id: number; purchasePriceKwd?: string; purchasePriceFx?: string; fxCurrency?: string; sellingPriceKwd?: string }>) =>
      apiRequest("PUT", "/api/items/bulk", { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Items updated successfully" });
      setEditedItems({});
    },
    onError: (error: Error) => {
      console.error("Bulk update error:", error);
      toast({ 
        title: "Failed to update items", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getEditedValue = (item: Item, field: keyof EditedItem): string => {
    const edited = editedItems[item.id];
    if (edited) {
      return edited[field] as string;
    }
    switch (field) {
      case "code": return item.code || "";
      case "name": return item.name;
      case "purchasePriceKwd": return item.purchasePriceKwd || "";
      case "purchasePriceFx": return item.purchasePriceFx || "";
      case "fxCurrency": return item.fxCurrency || "";
      case "sellingPriceKwd": return item.sellingPriceKwd || "";
      default: return "";
    }
  };

  const handleFieldChange = (item: Item, field: keyof EditedItem, value: string) => {
    setEditedItems(prev => {
      const existing = prev[item.id] || {
        id: item.id,
        code: item.code || "",
        name: item.name,
        purchasePriceKwd: item.purchasePriceKwd || "",
        purchasePriceFx: item.purchasePriceFx || "",
        fxCurrency: item.fxCurrency || "",
        sellingPriceKwd: item.sellingPriceKwd || "",
        hasChanges: false,
      };
      
      const updated = { ...existing, [field]: value, hasChanges: true };
      return { ...prev, [item.id]: updated };
    });
  };

  const fetchLastPricing = async (item: Item) => {
    if (!item.name.trim()) return;
    setFetchingPriceFor(item.id);
    try {
      const response = await fetch(`/api/items/${encodeURIComponent(item.name)}/last-pricing`, {
        credentials: "include",
      });
      if (response.ok) {
        const pricing = await response.json();
        setEditedItems(prev => {
          const existing = prev[item.id] || {
            id: item.id,
            code: item.code || "",
            name: item.name,
            purchasePriceKwd: item.purchasePriceKwd || "",
            purchasePriceFx: item.purchasePriceFx || "",
            fxCurrency: item.fxCurrency || "",
            sellingPriceKwd: item.sellingPriceKwd || "",
            hasChanges: false,
          };
          
          const updated = {
            ...existing,
            purchasePriceKwd: pricing.priceKwd || existing.purchasePriceKwd,
            purchasePriceFx: pricing.priceFx || existing.purchasePriceFx,
            fxCurrency: pricing.fxCurrency || existing.fxCurrency,
            hasChanges: true,
          };
          return { ...prev, [item.id]: updated };
        });
        toast({ title: "Last pricing fetched" });
      } else {
        toast({ title: "No previous purchase found", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching last pricing:", error);
      toast({ title: "Failed to fetch pricing", variant: "destructive" });
    } finally {
      setFetchingPriceFor(null);
    }
  };

  const handleSaveAll = () => {
    const updates = Object.values(editedItems)
      .filter(item => item.hasChanges)
      .map(item => ({
        id: item.id,
        purchasePriceKwd: item.purchasePriceKwd || undefined,
        purchasePriceFx: item.purchasePriceFx || undefined,
        fxCurrency: item.fxCurrency || undefined,
        sellingPriceKwd: item.sellingPriceKwd || undefined,
      }));

    if (updates.length === 0) {
      toast({ title: "No changes to save" });
      return;
    }

    bulkUpdateMutation.mutate(updates);
  };

  const changedCount = Object.values(editedItems).filter(item => item.hasChanges).length;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              You don't have permission to access bulk editing.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Edit3 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold">Bulk Edit Items</CardTitle>
              <CardDescription>Edit pricing for multiple items at once</CardDescription>
            </div>
          </div>
          <Button
            onClick={handleSaveAll}
            disabled={changedCount === 0 || bulkUpdateMutation.isPending}
            data-testid="button-save-all"
          >
            {bulkUpdateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All ({changedCount})
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found.
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 py-2">ID</TableHead>
                    <TableHead className="w-32 py-2">Code</TableHead>
                    <TableHead className="min-w-[150px] py-2">Name</TableHead>
                    <TableHead className="w-36 py-2">Purchase KWD</TableHead>
                    <TableHead className="w-36 py-2">Purchase FX</TableHead>
                    <TableHead className="w-28 py-2">FX</TableHead>
                    <TableHead className="w-36 py-2">Selling KWD</TableHead>
                    <TableHead className="w-24 py-2">Fetch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={editedItems[item.id]?.hasChanges ? "bg-accent/30" : ""}
                      data-testid={`row-bulk-item-${item.id}`}
                    >
                      <TableCell className="py-1 font-mono text-sm text-muted-foreground">
                        {item.id}
                      </TableCell>
                      <TableCell className="py-1 font-mono text-sm text-muted-foreground">
                        {item.code || "-"}
                      </TableCell>
                      <TableCell className="py-1 font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          value={getEditedValue(item, "purchasePriceKwd")}
                          onChange={(e) => handleFieldChange(item, "purchasePriceKwd", e.target.value)}
                          placeholder="0.000"
                          type="number"
                          step="0.001"
                          className="h-7"
                          data-testid={`input-bulk-purchase-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          value={getEditedValue(item, "purchasePriceFx")}
                          onChange={(e) => handleFieldChange(item, "purchasePriceFx", e.target.value)}
                          placeholder="0.000"
                          type="number"
                          step="0.001"
                          className="h-7"
                          data-testid={`input-bulk-purchase-fx-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Select
                          value={getEditedValue(item, "fxCurrency") || "none"}
                          onValueChange={(value) => handleFieldChange(item, "fxCurrency", value === "none" ? "" : value)}
                        >
                          <SelectTrigger className="h-7" data-testid={`select-bulk-fx-${item.id}`}>
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="AED">AED</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="KWD">KWD</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          value={getEditedValue(item, "sellingPriceKwd")}
                          onChange={(e) => handleFieldChange(item, "sellingPriceKwd", e.target.value)}
                          placeholder="0.000"
                          type="number"
                          step="0.001"
                          className="h-7"
                          data-testid={`input-bulk-selling-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fetchLastPricing(item)}
                          disabled={fetchingPriceFor === item.id}
                          data-testid={`button-fetch-bulk-${item.id}`}
                          className="h-7 w-7"
                        >
                          {fetchingPriceFor === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

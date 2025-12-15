import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Package, RefreshCw } from "lucide-react";
import type { Item } from "@shared/schema";

export default function ItemMaster() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [purchasePriceKwd, setPurchasePriceKwd] = useState("");
  const [purchasePriceFx, setPurchasePriceFx] = useState("");
  const [fxCurrency, setFxCurrency] = useState("");
  const [sellingPriceKwd, setSellingPriceKwd] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("");
  const [fetchingPricing, setFetchingPricing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  // Fetch stock balance to show available qty per item
  type StockBalanceItem = {
    itemName: string;
    purchased: number;
    sold: number;
    openingStock: number;
    balance: number;
  };
  
  const { data: stockBalance = [] } = useQuery<StockBalanceItem[]>({
    queryKey: ["/api/reports/stock-balance"],
  });

  // Create a map of item name to available qty
  const stockMap = new Map<string, number>();
  stockBalance.forEach((item) => {
    stockMap.set(item.itemName, item.balance);
  });

  type ItemFormData = {
    code: string | null;
    name: string;
    purchasePriceKwd: string | null;
    purchasePriceFx: string | null;
    fxCurrency: string | null;
    sellingPriceKwd: string | null;
    minStockLevel: number | null;
  };

  const createMutation = useMutation({
    mutationFn: (data: ItemFormData) => apiRequest("POST", "/api/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item added successfully" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ItemFormData }) =>
      apiRequest("PUT", `/api/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item updated successfully" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
    },
  });

  const fetchLastPricing = async (name: string) => {
    if (!name.trim()) return;
    setFetchingPricing(true);
    try {
      const response = await fetch(`/api/items/${encodeURIComponent(name)}/last-pricing`, {
        credentials: "include",
      });
      if (response.ok) {
        const pricing = await response.json();
        if (pricing.priceKwd) {
          setPurchasePriceKwd(pricing.priceKwd);
        }
        if (pricing.fxCurrency) {
          setFxCurrency(pricing.fxCurrency);
        }
      }
    } catch (error) {
      console.error("Error fetching last pricing:", error);
    } finally {
      setFetchingPricing(false);
    }
  };

  const deleteMutation = useMutation({
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
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemCode("");
    setItemName("");
    setPurchasePriceKwd("");
    setPurchasePriceFx("");
    setFxCurrency("");
    setSellingPriceKwd("");
    setMinStockLevel("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setItemCode(item.code || "");
    setItemName(item.name);
    setPurchasePriceKwd(item.purchasePriceKwd || "");
    setPurchasePriceFx(item.purchasePriceFx || "");
    setFxCurrency(item.fxCurrency || "");
    setSellingPriceKwd(item.sellingPriceKwd || "");
    setMinStockLevel(item.minStockLevel?.toString() || "");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setItemCode("");
    setItemName("");
    setPurchasePriceKwd("");
    setPurchasePriceFx("");
    setFxCurrency("");
    setSellingPriceKwd("");
    setMinStockLevel("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const data: ItemFormData = {
      code: itemCode.trim() || null,
      name: itemName.trim(),
      purchasePriceKwd: purchasePriceKwd.trim() || null,
      purchasePriceFx: purchasePriceFx.trim() || null,
      fxCurrency: fxCurrency.trim() || null,
      sellingPriceKwd: sellingPriceKwd.trim() || null,
      minStockLevel: minStockLevel.trim() ? parseInt(minStockLevel.trim()) : 0,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteClick = (item: Item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
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
            <Package className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">Item Master</CardTitle>
          </div>
          {isAdmin && (
            <Button onClick={handleOpenAdd} data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found. {isAdmin && "Add your first item to get started."}
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-32">Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-24 text-right">Avail Qty</TableHead>
                    <TableHead className="w-28 text-right">Purchase KWD</TableHead>
                    <TableHead className="w-28 text-right">Purchase FX</TableHead>
                    <TableHead className="w-20">FX</TableHead>
                    <TableHead className="w-28 text-right">Selling KWD</TableHead>
                    {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {item.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm" data-testid={`text-item-code-${item.id}`}>
                        {item.code || "-"}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-item-name-${item.id}`}>
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right font-mono" data-testid={`text-avail-qty-${item.id}`}>
                        {stockMap.get(item.name) ?? 0}
                      </TableCell>
                      <TableCell className="text-right font-mono" data-testid={`text-purchase-price-${item.id}`}>
                        {item.purchasePriceKwd ? parseFloat(item.purchasePriceKwd).toFixed(3) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono" data-testid={`text-purchase-price-fx-${item.id}`}>
                        {item.purchasePriceFx ? parseFloat(item.purchasePriceFx).toFixed(3) : "-"}
                      </TableCell>
                      <TableCell data-testid={`text-fx-currency-${item.id}`}>
                        {item.fxCurrency || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono" data-testid={`text-selling-price-${item.id}`}>
                        {item.sellingPriceKwd ? parseFloat(item.sellingPriceKwd).toFixed(3) : "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              data-testid={`button-edit-item-${item.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(item)}
                              data-testid={`button-delete-item-${item.id}`}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemCode">Item Code</Label>
                  <Input
                    id="itemCode"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="Optional"
                    data-testid="input-item-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Enter item name"
                    data-testid="input-item-name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Purchase Price (KWD)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchLastPricing(itemName)}
                    disabled={fetchingPricing || !itemName.trim()}
                    data-testid="button-fetch-pricing"
                    className="h-7 text-xs"
                  >
                    {fetchingPricing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Fetch Last Price
                  </Button>
                </div>
                <Input
                  value={purchasePriceKwd}
                  onChange={(e) => setPurchasePriceKwd(e.target.value)}
                  placeholder="0.000"
                  type="number"
                  step="0.001"
                  data-testid="input-purchase-price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchasePriceFx">Purchase Price (FX)</Label>
                <Input
                  id="purchasePriceFx"
                  value={purchasePriceFx}
                  onChange={(e) => setPurchasePriceFx(e.target.value)}
                  placeholder="0.000"
                  type="number"
                  step="0.001"
                  data-testid="input-purchase-price-fx"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fxCurrency">FX Currency</Label>
                <Select value={fxCurrency} onValueChange={setFxCurrency}>
                  <SelectTrigger data-testid="select-fx-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="KWD">KWD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price (KWD)</Label>
                <Input
                  id="sellingPrice"
                  value={sellingPriceKwd}
                  onChange={(e) => setSellingPriceKwd(e.target.value)}
                  placeholder="0.000"
                  type="number"
                  step="0.001"
                  data-testid="input-selling-price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(e.target.value)}
                  placeholder="0"
                  type="number"
                  step="1"
                  min="0"
                  data-testid="input-min-stock-level"
                />
                <p className="text-xs text-muted-foreground">Alert when stock falls below this level</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!itemName.trim() || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-item"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
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

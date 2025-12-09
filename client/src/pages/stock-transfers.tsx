import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, ArrowLeftRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Branch {
  id: number;
  name: string;
  code: string | null;
}

interface Item {
  id: number;
  name: string;
}

interface StockTransferLineItem {
  id: number;
  stockTransferId: number;
  itemName: string;
  quantity: number | null;
  priceKwd: string | null;
  imeiNumbers: string[] | null;
}

interface StockTransfer {
  id: number;
  transferDate: string;
  transferNumber: string | null;
  fromBranchId: number;
  toBranchId: number;
  notes: string | null;
  fromBranch: Branch;
  toBranch: Branch;
  lineItems: StockTransferLineItem[];
}

interface LineItemInput {
  itemName: string;
  quantity: number;
  priceKwd: string;
  imeiNumbers: string[];
}

export default function StockTransfersPage() {
  const { toast } = useToast();
  const { branches, currentBranchId } = useBranch();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    transferDate: new Date().toISOString().split("T")[0],
    transferNumber: "",
    fromBranchId: currentBranchId?.toString() || "",
    toBranchId: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItemInput[]>([{ itemName: "", quantity: 1, priceKwd: "", imeiNumbers: [] }]);
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [currentImeiIndex, setCurrentImeiIndex] = useState<number | null>(null);
  const [imeiText, setImeiText] = useState("");

  // Fetch next transfer number
  const { data: nextTransferData, refetch: refetchTransferNumber } = useQuery<{ transferNumber: string }>({
    queryKey: ["/api/stock-transfers/next-transfer-number"],
  });

  // Auto-populate transfer number when dialog opens
  useEffect(() => {
    if (isDialogOpen && nextTransferData?.transferNumber && !formData.transferNumber) {
      setFormData(prev => ({ ...prev, transferNumber: nextTransferData.transferNumber }));
    }
  }, [isDialogOpen, nextTransferData]);

  const { data: allTransfers = [], isLoading } = useQuery<StockTransfer[]>({
    queryKey: ["/api/stock-transfers"],
  });

  // Filter transfers to show only those involving the current branch
  const transfers = currentBranchId
    ? allTransfers.filter(
        (t) => t.fromBranchId === currentBranchId || t.toBranchId === currentBranchId
      )
    : allTransfers;

  // Sync form when branch changes
  useEffect(() => {
    if (currentBranchId && !isDialogOpen) {
      setFormData((prev) => ({
        ...prev,
        fromBranchId: currentBranchId.toString(),
        toBranchId: prev.toBranchId === currentBranchId.toString() ? "" : prev.toBranchId,
      }));
    }
  }, [currentBranchId, isDialogOpen]);

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      transferDate: string;
      transferNumber: string;
      fromBranchId: number;
      toBranchId: number;
      notes: string;
      lineItems: LineItemInput[];
    }) => {
      return await apiRequest("POST", "/api/stock-transfers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Stock transfer created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create transfer", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/stock-transfers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      toast({ title: "Stock transfer deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete transfer", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      transferDate: new Date().toISOString().split("T")[0],
      transferNumber: "",
      fromBranchId: currentBranchId?.toString() || "",
      toBranchId: "",
      notes: "",
    });
    setLineItems([{ itemName: "", quantity: 1, priceKwd: "", imeiNumbers: [] }]);
    queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers/next-transfer-number"] });
  };

  const openImeiDialog = (index: number) => {
    setCurrentImeiIndex(index);
    setImeiText(lineItems[index].imeiNumbers.join("\n"));
    setImeiDialogOpen(true);
  };

  const saveImeiNumbers = () => {
    if (currentImeiIndex !== null) {
      const imeis = imeiText.split("\n").map(s => s.trim()).filter(s => s.length > 0);
      setLineItems(prev => prev.map((item, idx) => 
        idx === currentImeiIndex ? { ...item, imeiNumbers: imeis } : item
      ));
    }
    setImeiDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromBranchId || !formData.toBranchId) {
      toast({ title: "Please select both source and destination branches", variant: "destructive" });
      return;
    }

    if (formData.fromBranchId === formData.toBranchId) {
      toast({ title: "Source and destination branches must be different", variant: "destructive" });
      return;
    }

    const validLineItems = lineItems.filter((item) => item.itemName.trim() !== "" && item.quantity > 0);
    if (validLineItems.length === 0) {
      toast({ title: "Please add at least one item to transfer", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      ...formData,
      fromBranchId: parseInt(formData.fromBranchId),
      toBranchId: parseInt(formData.toBranchId),
      lineItems: validLineItems,
    });
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { itemName: "", quantity: 1, priceKwd: "", imeiNumbers: [] }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItemInput, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
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
          <h2 className="text-2xl font-bold" data-testid="heading-stock-transfers">Stock Transfers</h2>
          <p className="text-muted-foreground">Transfer inventory between branches</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-transfer">
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Stock Transfer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transferDate">Transfer Date</Label>
                  <Input
                    id="transferDate"
                    type="date"
                    value={formData.transferDate}
                    onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                    data-testid="input-transfer-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferNumber">Transfer Number</Label>
                  <Input
                    id="transferNumber"
                    value={formData.transferNumber}
                    onChange={(e) => setFormData({ ...formData, transferNumber: e.target.value })}
                    placeholder="Optional"
                    data-testid="input-transfer-number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Branch</Label>
                  <Select
                    value={formData.fromBranchId}
                    onValueChange={(value) => setFormData({ ...formData, fromBranchId: value })}
                  >
                    <SelectTrigger data-testid="select-from-branch">
                      <SelectValue placeholder="Select source branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Branch</Label>
                  <Select
                    value={formData.toBranchId}
                    onValueChange={(value) => setFormData({ ...formData, toBranchId: value })}
                  >
                    <SelectTrigger data-testid="select-to-branch">
                      <SelectValue placeholder="Select destination branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items to Transfer</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-line-item">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-20">Qty</TableHead>
                        <TableHead className="w-24">Price</TableHead>
                        <TableHead className="w-20">IMEI</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.itemName}
                              onValueChange={(value) => updateLineItem(index, "itemName", value)}
                            >
                              <SelectTrigger data-testid={`select-item-${index}`}>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((i) => (
                                  <SelectItem key={i.id} value={i.name}>
                                    {i.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 1)}
                              data-testid={`input-quantity-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.001"
                              value={item.priceKwd}
                              onChange={(e) => updateLineItem(index, "priceKwd", e.target.value)}
                              placeholder="0.000"
                              data-testid={`input-price-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openImeiDialog(index)}
                              data-testid={`button-imei-${index}`}
                            >
                              {item.imeiNumbers.length > 0 ? `${item.imeiNumbers.length}` : "+"}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                              disabled={lineItems.length === 1}
                              data-testid={`button-remove-item-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                  data-testid="textarea-notes"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-transfer">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Transfer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock transfers found. Click "New Transfer" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                    <TableCell>{format(new Date(transfer.transferDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{transfer.transferNumber || "-"}</TableCell>
                    <TableCell>{transfer.fromBranch.name}</TableCell>
                    <TableCell>{transfer.toBranch.name}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {transfer.lineItems.map((li) => `${li.itemName} (${li.quantity})`).join(", ")}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{transfer.notes || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this transfer?")) {
                            deleteMutation.mutate(transfer.id);
                          }
                        }}
                        data-testid={`button-delete-transfer-${transfer.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* IMEI Dialog */}
      <Dialog open={imeiDialogOpen} onOpenChange={setImeiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter IMEI Numbers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={imeiText}
              onChange={(e) => setImeiText(e.target.value)}
              placeholder="Enter IMEI numbers, one per line"
              rows={8}
              data-testid="textarea-imei"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImeiDialogOpen(false)} data-testid="button-cancel-imei">
                Cancel
              </Button>
              <Button onClick={saveImeiNumbers} data-testid="button-save-imei">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

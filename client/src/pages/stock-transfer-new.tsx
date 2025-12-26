import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { todayLocalISO } from "@/lib/dateUtils";
import { useBranch } from "@/contexts/BranchContext";
import { useLocation } from "wouter";
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
} from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  code: string | null;
}

interface Item {
  id: number;
  name: string;
}

interface LineItemInput {
  itemName: string;
  quantity: number;
  priceKwd: string;
  imeiNumbers: string[];
}

export default function StockTransferNewPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { branches, currentBranchId } = useBranch();
  const [formData, setFormData] = useState({
    transferDate: todayLocalISO(),
    transferNumber: "",
    fromBranchId: currentBranchId?.toString() || "",
    toBranchId: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { itemName: "", quantity: 1, priceKwd: "", imeiNumbers: [] },
  ]);
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [currentImeiIndex, setCurrentImeiIndex] = useState<number | null>(null);
  const [imeiText, setImeiText] = useState("");

  const { data: nextTransferData } = useQuery<{ transferNumber: string }>({
    queryKey: ["/api/stock-transfers/next-transfer-number"],
  });

  useEffect(() => {
    if (nextTransferData?.transferNumber && !formData.transferNumber) {
      setFormData((prev) => ({
        ...prev,
        transferNumber: nextTransferData.transferNumber,
      }));
    }
  }, [nextTransferData]);

  useEffect(() => {
    if (currentBranchId) {
      setFormData((prev) => ({
        ...prev,
        fromBranchId: currentBranchId.toString(),
        toBranchId:
          prev.toBranchId === currentBranchId.toString() ? "" : prev.toBranchId,
      }));
    }
  }, [currentBranchId]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers/next-transfer-number"] });
      toast({ title: "Stock transfer created successfully" });
      setLocation("/stock-transfers");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create transfer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openImeiDialog = (index: number) => {
    setCurrentImeiIndex(index);
    setImeiText(lineItems[index].imeiNumbers.join("\n"));
    setImeiDialogOpen(true);
  };

  const saveImeiNumbers = () => {
    if (currentImeiIndex !== null) {
      const imeis = imeiText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      setLineItems((prev) =>
        prev.map((item, idx) =>
          idx === currentImeiIndex ? { ...item, imeiNumbers: imeis } : item
        )
      );
    }
    setImeiDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromBranchId || !formData.toBranchId) {
      toast({
        title: "Please select both source and destination branches",
        variant: "destructive",
      });
      return;
    }

    if (formData.fromBranchId === formData.toBranchId) {
      toast({
        title: "Source and destination branches must be different",
        variant: "destructive",
      });
      return;
    }

    const validLineItems = lineItems.filter(
      (item) => item.itemName.trim() !== "" && item.quantity > 0
    );
    if (validLineItems.length === 0) {
      toast({
        title: "Please add at least one item to transfer",
        variant: "destructive",
      });
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
    setLineItems([
      ...lineItems,
      { itemName: "", quantity: 1, priceKwd: "", imeiNumbers: [] },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItemInput,
    value: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/stock-transfers")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-new-transfer">
            New Stock Transfer
          </h2>
          <p className="text-muted-foreground">
            Transfer inventory between branches
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transferDate">Transfer Date</Label>
                <Input
                  id="transferDate"
                  type="date"
                  value={formData.transferDate}
                  onChange={(e) =>
                    setFormData({ ...formData, transferDate: e.target.value })
                  }
                  data-testid="input-transfer-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferNumber">Transfer Number</Label>
                <Input
                  id="transferNumber"
                  value={formData.transferNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, transferNumber: e.target.value })
                  }
                  placeholder="Auto-generated"
                  data-testid="input-transfer-number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Branch</Label>
                <Select
                  value={formData.fromBranchId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, fromBranchId: value })
                  }
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, toBranchId: value })
                  }
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Items to Transfer</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  data-testid="button-add-line-item"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Item</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-28">Price (KWD)</TableHead>
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
                            onValueChange={(value) =>
                              updateLineItem(index, "itemName", value)
                            }
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
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            data-testid={`input-quantity-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={item.priceKwd}
                            onChange={(e) =>
                              updateLineItem(index, "priceKwd", e.target.value)
                            }
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
                            {item.imeiNumbers.length > 0
                              ? `${item.imeiNumbers.length}`
                              : "+"}
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
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Optional notes about this transfer"
                data-testid="textarea-notes"
              />
            </div>

            <div className="flex justify-end gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/stock-transfers")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit-transfer"
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Transfer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
              <Button
                variant="outline"
                onClick={() => setImeiDialogOpen(false)}
                data-testid="button-cancel-imei"
              >
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

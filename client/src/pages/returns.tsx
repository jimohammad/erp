import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ReturnWithDetails, Customer, Supplier, Item } from "@shared/schema";

const returnFormSchema = z.object({
  returnDate: z.string().min(1, "Date is required"),
  returnNumber: z.string().min(1, "Return number is required"),
  returnType: z.enum(["purchase_return", "sale_return"]),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  reason: z.string().optional(),
});

type ReturnFormValues = z.infer<typeof returnFormSchema>;

interface ReturnLineItemForm {
  itemName: string;
  quantity: number;
  priceKwd: string;
  totalKwd: string;
  imeiNumbers: string[];
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnType, setReturnType] = useState<"sale_return" | "purchase_return">("sale_return");
  const [lineItems, setLineItems] = useState<ReturnLineItemForm[]>([
    { itemName: "", quantity: 1, priceKwd: "", totalKwd: "", imeiNumbers: [] },
  ]);
  const [currentImei, setCurrentImei] = useState("");
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

  const { data: returns = [], isLoading } = useQuery<ReturnWithDetails[]>({
    queryKey: ["/api/returns"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      returnDate: format(new Date(), "yyyy-MM-dd"),
      returnNumber: "",
      returnType: "sale_return",
      customerId: "",
      supplierId: "",
      reason: "",
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: async (data: ReturnFormValues) => {
      const payload = {
        returnDate: data.returnDate,
        returnNumber: data.returnNumber,
        returnType: data.returnType,
        customerId: data.returnType === "sale_return" && data.customerId ? parseInt(data.customerId) : null,
        supplierId: data.returnType === "purchase_return" && data.supplierId ? parseInt(data.supplierId) : null,
        reason: data.reason || null,
        lineItems: lineItems.filter(item => item.itemName).map(item => ({
          itemName: item.itemName,
          quantity: item.quantity,
          priceKwd: item.priceKwd,
          totalKwd: item.totalKwd,
          imeiNumbers: item.imeiNumbers,
        })),
      };
      return apiRequest("POST", "/api/returns", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      setDialogOpen(false);
      form.reset();
      setLineItems([{ itemName: "", quantity: 1, priceKwd: "", totalKwd: "", imeiNumbers: [] }]);
      toast({ title: "Return recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create return", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/returns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      toast({ title: "Return deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete return", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const handleTypeToggle = (checked: boolean) => {
    const newType = checked ? "purchase_return" : "sale_return";
    setReturnType(newType);
    form.setValue("returnType", newType);
    form.setValue("customerId", "");
    form.setValue("supplierId", "");
  };

  const updateLineItem = (index: number, field: keyof ReturnLineItemForm, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "quantity" || field === "priceKwd") {
      const qty = field === "quantity" ? value : updated[index].quantity;
      const price = field === "priceKwd" ? value : updated[index].priceKwd;
      const total = (parseFloat(price) || 0) * (parseInt(qty) || 0);
      updated[index].totalKwd = total.toFixed(3);
    }
    
    if (field === "itemName" && value) {
      const selectedItem = items.find(i => i.name === value);
      if (selectedItem && selectedItem.sellingPriceKwd) {
        updated[index].priceKwd = selectedItem.sellingPriceKwd;
        const total = (parseFloat(selectedItem.sellingPriceKwd) || 0) * (updated[index].quantity || 1);
        updated[index].totalKwd = total.toFixed(3);
      }
    }
    
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { itemName: "", quantity: 1, priceKwd: "", totalKwd: "", imeiNumbers: [] }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const addImeiToLine = (index: number, imei: string) => {
    if (!imei.trim()) return;
    
    if (imei.length !== 15 || !/^\d+$/.test(imei)) {
      toast({ title: "Invalid IMEI", description: "IMEI must be exactly 15 digits", variant: "destructive" });
      return;
    }
    
    const updated = [...lineItems];
    if (!updated[index].imeiNumbers.includes(imei)) {
      updated[index].imeiNumbers = [...updated[index].imeiNumbers, imei];
      updated[index].quantity = updated[index].imeiNumbers.length;
      const total = (parseFloat(updated[index].priceKwd) || 0) * updated[index].quantity;
      updated[index].totalKwd = total.toFixed(3);
      setLineItems(updated);
    }
    setCurrentImei("");
  };

  const removeImeiFromLine = (lineIndex: number, imei: string) => {
    const updated = [...lineItems];
    updated[lineIndex].imeiNumbers = updated[lineIndex].imeiNumbers.filter(i => i !== imei);
    updated[lineIndex].quantity = Math.max(1, updated[lineIndex].imeiNumbers.length);
    const total = (parseFloat(updated[lineIndex].priceKwd) || 0) * updated[lineIndex].quantity;
    updated[lineIndex].totalKwd = total.toFixed(3);
    setLineItems(updated);
  };

  const onSubmit = (data: ReturnFormValues) => {
    createReturnMutation.mutate(data);
  };

  const filteredReturns = returns.filter(r => r.returnType === returnType);

  const grandTotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.totalKwd) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Sale Return</Label>
          <Switch
            checked={returnType === "purchase_return"}
            onCheckedChange={handleTypeToggle}
            data-testid="switch-return-type"
          />
          <Label className="text-sm font-medium">Purchase Return</Label>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-return">
              <Plus className="h-4 w-4 mr-2" />
              New {returnType === "sale_return" ? "Sale" : "Purchase"} Return
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New {returnType === "sale_return" ? "Sale" : "Purchase"} Return</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="returnDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-return-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="returnNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Number</FormLabel>
                        <FormControl>
                          <Input placeholder="RET-001" {...field} data-testid="input-return-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {returnType === "sale_return" ? (
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-customer">
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter reason for return" {...field} data-testid="input-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-sm font-medium">Line Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-line">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Item</TableHead>
                          <TableHead className="w-[80px]">Qty</TableHead>
                          <TableHead className="w-[100px]">Price (KWD)</TableHead>
                          <TableHead className="w-[100px]">Total (KWD)</TableHead>
                          <TableHead>IMEI Numbers</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
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
                                  {items.map((itm) => (
                                    <SelectItem key={itm.id} value={itm.name}>
                                      {itm.name}
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
                                disabled={item.imeiNumbers.length > 0}
                                data-testid={`input-qty-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.priceKwd}
                                onChange={(e) => updateLineItem(index, "priceKwd", e.target.value)}
                                data-testid={`input-price-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.totalKwd}
                                readOnly
                                className="bg-muted"
                                data-testid={`input-total-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex gap-1 flex-wrap">
                                  {item.imeiNumbers.map((imei) => (
                                    <Badge key={imei} variant="secondary" className="text-xs">
                                      {imei}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-3 w-3 ml-1 p-0"
                                        onClick={() => removeImeiFromLine(index, imei)}
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <Input
                                    placeholder="Enter IMEI"
                                    value={activeLineIndex === index ? currentImei : ""}
                                    onFocus={() => setActiveLineIndex(index)}
                                    onChange={(e) => setCurrentImei(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        addImeiToLine(index, currentImei);
                                      }
                                    }}
                                    className="h-7 text-xs"
                                    data-testid={`input-imei-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => addImeiToLine(index, currentImei)}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                                disabled={lineItems.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="text-sm font-medium">
                      Grand Total: <span className="text-lg">{grandTotal.toFixed(3)} KWD</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createReturnMutation.isPending} data-testid="button-submit-return">
                    {createReturnMutation.isPending ? "Creating..." : "Create Return"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {returnType === "sale_return" ? "Sale Returns" : "Purchase Returns"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading returns...</p>
          ) : filteredReturns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {returnType === "sale_return" ? "sale" : "purchase"} returns recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Return No.</TableHead>
                  <TableHead>{returnType === "sale_return" ? "Customer" : "Supplier"}</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((ret) => (
                  <TableRow key={ret.id} data-testid={`row-return-${ret.id}`}>
                    <TableCell>{format(new Date(ret.returnDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{ret.returnNumber}</TableCell>
                    <TableCell>
                      {ret.returnType === "sale_return" 
                        ? ret.customer?.name || "-"
                        : ret.supplier?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {ret.lineItems?.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            {item.itemName} x{item.quantity}
                            {item.imeiNumbers && item.imeiNumbers.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-1">
                                {item.imeiNumbers.map((imei) => (
                                  <Badge key={imei} variant="outline" className="text-xs">
                                    {imei}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ret.reason || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReturnMutation.mutate(ret.id)}
                        disabled={deleteReturnMutation.isPending}
                        data-testid={`button-delete-return-${ret.id}`}
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
    </div>
  );
}

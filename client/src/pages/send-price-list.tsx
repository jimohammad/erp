import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { Send, Search, CheckSquare, Square, Loader2, MessageCircle } from "lucide-react";
import type { Supplier, Item } from "@shared/schema";

interface StockBalanceItem {
  itemName: string;
  totalPurchased: number;
  totalSold: number;
  totalReturned: number;
  balance: number;
}

export default function SendPriceList() {
  const { toast } = useToast();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const { data: parties = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: stockBalance = [] } = useQuery<StockBalanceItem[]>({
    queryKey: ["/api/reports/stock-balance"],
  });

  const customers = parties.filter(p => p.partyType === "customer" && p.phone);

  const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId);

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    stockBalance.forEach(item => {
      map.set(item.itemName, item.balance);
    });
    return map;
  }, [stockBalance]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(term) ||
      (item.code && item.code.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  const toggleItem = (itemId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const sendMutation = useMutation({
    mutationFn: async (data: { customerId: number; itemIds: number[] }) => {
      return apiRequest("POST", "/api/whatsapp/send-price-list", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: `Price list sent to ${selectedCustomer?.name} via WhatsApp`,
      });
      setSelectedItems(new Set());
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!selectedCustomerId || selectedItems.size === 0) {
      toast({
        title: "Selection Required",
        description: "Please select a customer and at least one item",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate({
      customerId: parseInt(selectedCustomerId),
      itemIds: Array.from(selectedItems),
    });
  };

  const getStockStatus = (itemName: string) => {
    const stock = stockMap.get(itemName) ?? 0;
    if (stock <= 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock <= 5) return { label: `Low (${stock})`, variant: "secondary" as const };
    return { label: `In Stock (${stock})`, variant: "default" as const };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5" />
            Send Price List via WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger data-testid="select-customer-pricelist">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} ({customer.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No customers with phone numbers found. Add phone numbers in Party Master.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Search Items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-items"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                <CheckSquare className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                <Square className="h-4 w-4 mr-1" />
                Deselect All
              </Button>
            </div>
            <Badge variant="secondary">
              {selectedItems.size} items selected
            </Badge>
          </div>

          <div className="border rounded-md max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Price (KWD)</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const stockStatus = getStockStatus(item.name);
                  return (
                    <TableRow 
                      key={item.id} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => toggleItem(item.id)}
                      data-testid={`row-item-${item.id}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          data-testid={`checkbox-item-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.code || "-"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.sellingPriceKwd ? parseFloat(item.sellingPriceKwd).toFixed(3) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={stockStatus.variant} className="text-xs">
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={!selectedCustomerId || selectedItems.size === 0 || sendMutation.isPending}
              data-testid="button-send-pricelist"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

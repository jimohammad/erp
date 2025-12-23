import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Send, Search, CheckSquare, Square, MessageCircle, Link2, DollarSign } from "lucide-react";
import type { Supplier, Item } from "@shared/schema";

interface PriceListSettings {
  token: string;
  pin: string;
  url: string;
}

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
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [includeQuantity, setIncludeQuantity] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");

  const { data: parties = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: stockBalance = [] } = useQuery<StockBalanceItem[]>({
    queryKey: ["/api/reports/stock-balance"],
  });

  const { data: priceListSettings } = useQuery<PriceListSettings>({
    queryKey: ["/api/settings/price-list"],
    queryFn: async () => {
      const res = await fetch("/api/settings/price-list");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const customers = parties.filter(p => p.partyType === "customer" && p.phone);
  const allPartiesWithPhone = parties.filter(p => p.phone);

  const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId);

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    stockBalance.forEach(item => {
      map.set(item.itemName, item.balance);
    });
    return map;
  }, [stockBalance]);

  const filteredItems = useMemo(() => {
    let result = items;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(term) ||
        (item.code && item.code.toLowerCase().includes(term))
      );
    }
    
    if (showOnlyAvailable) {
      result = result.filter(item => {
        const stock = stockMap.get(item.name) ?? 0;
        return stock > 0;
      });
    }
    
    return result;
  }, [items, searchTerm, showOnlyAvailable, stockMap]);

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

  const formatPhoneForWhatsApp = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 8 && /^[2569]/.test(cleaned)) {
      cleaned = '965' + cleaned;
    }
    return cleaned;
  };

  const buildPriceListMessage = (): string => {
    const selectedItemsList = items.filter(item => selectedItems.has(item.id));
    const lines: string[] = [];
    
    lines.push(`*Iqbal Electronics Co. WLL*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(``);
    lines.push(`Our Latest Price List`);
    lines.push(``);
    
    // Group items by category
    const itemsByCategory = new Map<string, typeof selectedItemsList>();
    for (const item of selectedItemsList) {
      const cat = item.category || "Other";
      if (!itemsByCategory.has(cat)) {
        itemsByCategory.set(cat, []);
      }
      itemsByCategory.get(cat)!.push(item);
    }
    
    // Sort categories alphabetically, but put "Other" at the end
    const sortedCategories = Array.from(itemsByCategory.keys()).sort((a, b) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    });
    
    for (const category of sortedCategories) {
      const categoryItems = itemsByCategory.get(category)!;
      lines.push(`*${category}*`);
      lines.push(`─────────────`);
      
      for (const item of categoryItems) {
        const price = item.sellingPriceKwd ? parseFloat(item.sellingPriceKwd).toFixed(3) : "N/A";
        const stock = stockMap.get(item.name) ?? 0;
        lines.push(`${item.name}`);
        lines.push(`  Price: ${price} KWD`);
        if (includeQuantity) {
          lines.push(`  Qty: ${stock}`);
        }
        lines.push(``);
      }
    }
    
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`For orders, please contact us.`);
    lines.push(`Thank you!`);
    
    return lines.join('\n');
  };

  const handleSend = () => {
    if (!selectedCustomerId || selectedItems.size === 0 || !selectedCustomer?.phone) {
      toast({
        title: "Selection Required",
        description: "Please select a customer and at least one item",
        variant: "destructive",
      });
      return;
    }
    
    const phone = formatPhoneForWhatsApp(selectedCustomer.phone);
    const message = buildPriceListMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp Opened",
      description: `Price list ready to send to ${selectedCustomer.name}`,
    });
    setSelectedItems(new Set());
  };

  const getStockStatus = (itemName: string) => {
    const stock = stockMap.get(itemName) ?? 0;
    if (stock <= 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock <= 5) return { label: `Low (${stock})`, variant: "secondary" as const };
    return { label: `In Stock (${stock})`, variant: "default" as const };
  };

  const selectedRecipient = allPartiesWithPhone.find(p => p.id.toString() === selectedRecipientId);

  const handleSendPriceListUrl = () => {
    if (!selectedRecipientId || !selectedRecipient?.phone || !priceListSettings?.url) {
      toast({
        title: "Selection Required",
        description: "Please select a recipient with a phone number",
        variant: "destructive",
      });
      return;
    }

    const phone = formatPhoneForWhatsApp(selectedRecipient.phone);
    const message = `*Iqbal Electronics Co. WLL*\n\nView our latest price list:\n${priceListSettings.url}\n\nPIN: ${priceListSettings.pin}\n\nThank you for your business!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    toast({
      title: "WhatsApp Opened",
      description: `Price list URL ready to send to ${selectedRecipient.name}`,
    });
  };

  return (
    <div className="space-y-4">
      {priceListSettings?.url && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" />
              Share Price List URL
            </CardTitle>
            <CardDescription>
              Send the price list link via WhatsApp. Recipients can view all prices online.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-mono truncate">{priceListSettings.url}</span>
              <Badge variant="secondary" className="ml-auto flex-shrink-0">PIN: {priceListSettings.pin}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                <SelectTrigger className="flex-1" data-testid="select-recipient-url">
                  <SelectValue placeholder="Select recipient..." />
                </SelectTrigger>
                <SelectContent>
                  {allPartiesWithPhone.map(party => (
                    <SelectItem key={party.id} value={party.id.toString()}>
                      {party.name} ({party.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendPriceListUrl}
                disabled={!selectedRecipientId}
                data-testid="button-send-url-whatsapp"
              >
                <Send className="h-4 w-4 mr-2" />
                Send URL via WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
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
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={showOnlyAvailable}
                    onCheckedChange={(checked) => setShowOnlyAvailable(checked === true)}
                    data-testid="checkbox-show-available"
                  />
                  <span>Show only available</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeQuantity}
                    onCheckedChange={(checked) => setIncludeQuantity(checked === true)}
                    data-testid="checkbox-include-qty"
                  />
                  <span>Include quantity</span>
                </label>
              </div>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
              disabled={!selectedCustomerId || selectedItems.size === 0}
              data-testid="button-send-pricelist"
            >
              <Send className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

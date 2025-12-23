import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Send, Search, CheckSquare, Square, MessageCircle, Link2, DollarSign, Package, Copy, ExternalLink, Trash2, RefreshCw, Loader2 } from "lucide-react";
import type { Supplier, Item } from "@shared/schema";

interface UrlSettings {
  token: string | null;
  pin: string | null;
  hasAccess: boolean;
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
  const [selectedPriceRecipientId, setSelectedPriceRecipientId] = useState<string>("");
  const [selectedStockRecipientId, setSelectedStockRecipientId] = useState<string>("");
  
  // URL management state
  const [stockListPin, setStockListPin] = useState("");
  const [priceListPin, setPriceListPin] = useState("");
  const [showRevokeStockListDialog, setShowRevokeStockListDialog] = useState(false);
  const [showRevokePriceListDialog, setShowRevokePriceListDialog] = useState(false);

  const { data: parties = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: stockBalance = [] } = useQuery<StockBalanceItem[]>({
    queryKey: ["/api/reports/stock-balance"],
  });

  const { data: priceListSettings, isLoading: priceListLoading } = useQuery<UrlSettings>({
    queryKey: ["/api/settings/price-list"],
  });

  const { data: stockListSettings, isLoading: stockListLoading } = useQuery<UrlSettings>({
    queryKey: ["/api/settings/stock-list"],
  });

  // Stock List mutations
  const generateStockListMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", "/api/settings/stock-list/generate", { pin });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/stock-list"] });
      setStockListPin("");
      toast({
        title: "Stock List Link Generated",
        description: "Share this link with authorized users.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate stock list link.",
        variant: "destructive",
      });
    },
  });

  const revokeStockListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/stock-list");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/stock-list"] });
      setShowRevokeStockListDialog(false);
      toast({
        title: "Access Revoked",
        description: "Stock list link has been disabled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke stock list access.",
        variant: "destructive",
      });
    },
  });

  // Price List mutations
  const generatePriceListMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", "/api/settings/price-list/generate", { pin });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/price-list"] });
      setPriceListPin("");
      toast({
        title: "Price List Link Generated",
        description: "Share this link with salesmen.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate price list link.",
        variant: "destructive",
      });
    },
  });

  const revokePriceListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/price-list");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/price-list"] });
      setShowRevokePriceListDialog(false);
      toast({
        title: "Access Revoked",
        description: "Price list link has been disabled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke price list access.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleGenerateStockList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockListPin || stockListPin.length < 4 || stockListPin.length > 6) {
      toast({
        title: "Error",
        description: "PIN must be 4-6 digits.",
        variant: "destructive",
      });
      return;
    }
    generateStockListMutation.mutate(stockListPin);
  };

  const handleGeneratePriceList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceListPin || priceListPin.length < 4 || priceListPin.length > 6) {
      toast({
        title: "Error",
        description: "PIN must be 4-6 digits.",
        variant: "destructive",
      });
      return;
    }
    generatePriceListMutation.mutate(priceListPin);
  };

  const copyStockListLink = () => {
    if (!stockListSettings?.token) return;
    const url = `${window.location.origin}/s/${stockListSettings.token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Stock list URL copied to clipboard.",
    });
  };

  const copyPriceListLink = () => {
    if (!priceListSettings?.token) return;
    const url = `${window.location.origin}/p/${priceListSettings.token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Price list URL copied to clipboard.",
    });
  };

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

  const selectedPriceRecipient = allPartiesWithPhone.find(p => p.id.toString() === selectedPriceRecipientId);
  const selectedStockRecipient = allPartiesWithPhone.find(p => p.id.toString() === selectedStockRecipientId);

  const handleSendPriceListUrl = () => {
    if (!selectedPriceRecipientId || !selectedPriceRecipient?.phone || !priceListSettings?.token) {
      toast({
        title: "Selection Required",
        description: "Please select a recipient with a phone number",
        variant: "destructive",
      });
      return;
    }

    const phone = formatPhoneForWhatsApp(selectedPriceRecipient.phone);
    const url = `${window.location.origin}/p/${priceListSettings.token}`;
    const message = `*Iqbal Electronics Co. WLL*\n\nView our latest price list:\n${url}\n\nPIN: ${priceListSettings.pin}\n\nThank you for your business!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    toast({
      title: "WhatsApp Opened",
      description: `Price list URL ready to send to ${selectedPriceRecipient.name}`,
    });
  };

  const handleSendStockListUrl = () => {
    if (!selectedStockRecipientId || !selectedStockRecipient?.phone || !stockListSettings?.token) {
      toast({
        title: "Selection Required",
        description: "Please select a recipient with a phone number",
        variant: "destructive",
      });
      return;
    }

    const phone = formatPhoneForWhatsApp(selectedStockRecipient.phone);
    const url = `${window.location.origin}/s/${stockListSettings.token}`;
    const message = `*Iqbal Electronics Co. WLL*\n\nView our current stock & prices:\n${url}\n\nPIN: ${stockListSettings.pin}\n\nThank you for your business!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    toast({
      title: "WhatsApp Opened",
      description: `Stock list URL ready to send to ${selectedStockRecipient.name}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock List URL Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" />
                Stock List URL
              </CardTitle>
              <Badge variant={stockListSettings?.hasAccess ? "default" : "secondary"}>
                {stockListSettings?.hasAccess ? "Active" : "Not Set"}
              </Badge>
            </div>
            <CardDescription>
              Share stock & prices with authorized users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stockListLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : stockListSettings?.hasAccess ? (
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-muted/50 border">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <span className="text-muted-foreground">URL: </span>
                      <code className="bg-background px-1 rounded text-xs">
                        {window.location.origin}/s/{stockListSettings.token?.substring(0, 8)}...
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyStockListLink} data-testid="button-copy-stock-link">
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/s/${stockListSettings.token}`, "_blank")}
                        data-testid="button-open-stock-link"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">PIN: </span>
                    <code className="bg-background px-1 rounded">{stockListSettings.pin}</code>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Select value={selectedStockRecipientId} onValueChange={setSelectedStockRecipientId}>
                    <SelectTrigger data-testid="select-stock-recipient">
                      <SelectValue placeholder="Select recipient to send..." />
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
                    onClick={handleSendStockListUrl}
                    disabled={!selectedStockRecipientId}
                    className="w-full"
                    data-testid="button-send-stock-url"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRevokeStockListDialog(true)}
                    disabled={revokeStockListMutation.isPending}
                    data-testid="button-revoke-stock-list"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                  <form onSubmit={handleGenerateStockList} className="flex gap-2 items-end">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="New PIN"
                      value={stockListPin}
                      onChange={(e) => setStockListPin(e.target.value.replace(/\D/g, ""))}
                      className="w-20"
                      data-testid="input-new-stock-pin"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={generateStockListMutation.isPending || stockListPin.length < 4}
                      data-testid="button-regenerate-stock-link"
                    >
                      {generateStockListMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Regenerate
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateStockList} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stockListPin">Set PIN Code (4-6 digits)</Label>
                  <Input
                    id="stockListPin"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter 4-6 digit PIN"
                    value={stockListPin}
                    onChange={(e) => setStockListPin(e.target.value.replace(/\D/g, ""))}
                    className="max-w-xs"
                    data-testid="input-stock-list-pin"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={generateStockListMutation.isPending || stockListPin.length < 4}
                  data-testid="button-generate-stock-link"
                >
                  {generateStockListMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate Stock List Link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Price List URL Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5" />
                Price List URL
              </CardTitle>
              <Badge variant={priceListSettings?.hasAccess ? "default" : "secondary"}>
                {priceListSettings?.hasAccess ? "Active" : "Not Set"}
              </Badge>
            </div>
            <CardDescription>
              Share prices only with salesmen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {priceListLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : priceListSettings?.hasAccess ? (
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-muted/50 border">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <span className="text-muted-foreground">URL: </span>
                      <code className="bg-background px-1 rounded text-xs">
                        {window.location.origin}/p/{priceListSettings.token?.substring(0, 8)}...
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyPriceListLink} data-testid="button-copy-price-link">
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/p/${priceListSettings.token}`, "_blank")}
                        data-testid="button-open-price-link"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">PIN: </span>
                    <code className="bg-background px-1 rounded">{priceListSettings.pin}</code>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Select value={selectedPriceRecipientId} onValueChange={setSelectedPriceRecipientId}>
                    <SelectTrigger data-testid="select-price-recipient">
                      <SelectValue placeholder="Select recipient to send..." />
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
                    disabled={!selectedPriceRecipientId}
                    className="w-full"
                    data-testid="button-send-price-url"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRevokePriceListDialog(true)}
                    disabled={revokePriceListMutation.isPending}
                    data-testid="button-revoke-price-list"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                  <form onSubmit={handleGeneratePriceList} className="flex gap-2 items-end">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="New PIN"
                      value={priceListPin}
                      onChange={(e) => setPriceListPin(e.target.value.replace(/\D/g, ""))}
                      className="w-20"
                      data-testid="input-new-price-pin"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={generatePriceListMutation.isPending || priceListPin.length < 4}
                      data-testid="button-regenerate-price-link"
                    >
                      {generatePriceListMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Regenerate
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGeneratePriceList} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="priceListPin">Set PIN Code (4-6 digits)</Label>
                  <Input
                    id="priceListPin"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter 4-6 digit PIN"
                    value={priceListPin}
                    onChange={(e) => setPriceListPin(e.target.value.replace(/\D/g, ""))}
                    className="max-w-xs"
                    data-testid="input-price-list-pin"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={generatePriceListMutation.isPending || priceListPin.length < 4}
                  data-testid="button-generate-price-link"
                >
                  {generatePriceListMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate Price List Link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

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

      <AlertDialog open={showRevokeStockListDialog} onOpenChange={setShowRevokeStockListDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Stock List Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable the current stock list link. Anyone with the old link will no longer be able to access it.
              You can generate a new link anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeStockListMutation.mutate()}>
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRevokePriceListDialog} onOpenChange={setShowRevokePriceListDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Price List Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable the current price list link. Anyone with the old link will no longer be able to access it.
              You can generate a new link anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokePriceListMutation.mutate()}>
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

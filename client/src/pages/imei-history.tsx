import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Smartphone, Loader2, Package, ShoppingCart, RotateCcw, Truck, AlertTriangle, History, ArrowRight, User, Building2 } from "lucide-react";
import { format } from "date-fns";

interface ImeiInventory {
  id: number;
  imei: string;
  itemName: string;
  status: string;
  purchaseDate: string | null;
  purchasePriceKwd: string | null;
  saleDate: string | null;
  salePriceKwd: string | null;
  warrantyEndDate: string | null;
  currentBranch?: { id: number; name: string } | null;
  supplier?: { id: number; name: string } | null;
  customer?: { id: number; name: string } | null;
  purchaseOrder?: { id: number; invoiceNumber: string } | null;
  salesOrder?: { id: number; invoiceNumber: string } | null;
  events?: ImeiEvent[];
}

interface ImeiEvent {
  id: number;
  eventType: string;
  eventDate: string;
  referenceType: string | null;
  referenceId: number | null;
  priceKwd: string | null;
  notes: string | null;
  fromBranch?: { id: number; name: string } | null;
  toBranch?: { id: number; name: string } | null;
  customer?: { id: number; name: string } | null;
  supplier?: { id: number; name: string } | null;
}

const statusColors: Record<string, string> = {
  in_stock: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  returned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  transferred: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  defective: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  warranty: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
};

const statusLabels: Record<string, string> = {
  in_stock: "In Stock",
  sold: "Sold",
  returned: "Returned",
  transferred: "Transferred",
  defective: "Defective",
  warranty: "Under Warranty",
};

const eventIcons: Record<string, typeof Package> = {
  purchased: Package,
  stocked: Building2,
  sold: ShoppingCart,
  sale_returned: RotateCcw,
  purchase_returned: RotateCcw,
  transferred_out: Truck,
  transferred_in: Truck,
  warranty_claim: AlertTriangle,
  warranty_received: Package,
  marked_defective: AlertTriangle,
  adjusted: History,
};

const eventLabels: Record<string, string> = {
  purchased: "Purchased from Supplier",
  stocked: "Added to Stock",
  sold: "Sold to Customer",
  sale_returned: "Returned by Customer",
  purchase_returned: "Returned to Supplier",
  transferred_out: "Transferred Out",
  transferred_in: "Transferred In",
  warranty_claim: "Sent for Warranty",
  warranty_received: "Received from Warranty",
  marked_defective: "Marked as Defective",
  adjusted: "Manual Adjustment",
};

export default function ImeiHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImei, setSelectedImei] = useState<string | null>(null);

  const { data: searchResults = [], isLoading: isSearching } = useQuery<ImeiInventory[]>({
    queryKey: ["/api/imei/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await fetch(`/api/imei/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: imeiDetails, isLoading: isLoadingDetails } = useQuery<ImeiInventory>({
    queryKey: ["/api/imei", selectedImei],
    queryFn: async () => {
      if (!selectedImei) return null;
      const res = await fetch(`/api/imei/${encodeURIComponent(selectedImei)}`);
      if (!res.ok) throw new Error("Failed to load IMEI details");
      return res.json();
    },
    enabled: !!selectedImei,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">IMEI History</h1>
      </div>

      <Card className="bg-sky-100 dark:bg-sky-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search IMEI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter IMEI number or item name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-imei-search"
              />
            </div>
            <Button type="submit" disabled={searchQuery.length < 2} data-testid="button-search-imei">
              {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>
          </form>

          {searchQuery.length >= 2 && searchResults.length > 0 && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((item) => (
                    <TableRow key={item.id} data-testid={`row-imei-${item.id}`}>
                      <TableCell className="font-mono text-sm">{item.imei}</TableCell>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.status] || "bg-gray-100 text-gray-800"}>
                          {statusLabels[item.status] || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.currentBranch?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImei(item.imei)}
                          data-testid={`button-view-history-${item.id}`}
                        >
                          <History className="h-4 w-4 mr-1" />
                          View History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="mt-4 text-center py-8 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No IMEI records found matching "{searchQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedImei && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                IMEI Details
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedImei(null)}>
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : imeiDetails ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">IMEI Number</p>
                    <p className="font-mono font-semibold" data-testid="text-imei-number">{imeiDetails.imei}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Item</p>
                    <p className="font-semibold" data-testid="text-item-name">{imeiDetails.itemName}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <Badge className={statusColors[imeiDetails.status] || "bg-gray-100 text-gray-800"} data-testid="badge-status">
                      {statusLabels[imeiDetails.status] || imeiDetails.status}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Current Location</p>
                    <p className="font-semibold" data-testid="text-location">{imeiDetails.currentBranch?.name || "Not in stock"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imeiDetails.purchaseDate && (
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Purchase Info</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Date:</span> {format(new Date(imeiDetails.purchaseDate), "dd MMM yyyy")}</p>
                        {imeiDetails.purchasePriceKwd && (
                          <p><span className="text-muted-foreground">Price:</span> {parseFloat(imeiDetails.purchasePriceKwd).toFixed(3)} KWD</p>
                        )}
                        {imeiDetails.supplier && (
                          <p><span className="text-muted-foreground">Supplier:</span> {imeiDetails.supplier.name}</p>
                        )}
                        {imeiDetails.purchaseOrder?.invoiceNumber && (
                          <p><span className="text-muted-foreground">Invoice:</span> {imeiDetails.purchaseOrder.invoiceNumber}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {imeiDetails.saleDate && (
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Sale Info</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Date:</span> {format(new Date(imeiDetails.saleDate), "dd MMM yyyy")}</p>
                        {imeiDetails.salePriceKwd && (
                          <p><span className="text-muted-foreground">Price:</span> {parseFloat(imeiDetails.salePriceKwd).toFixed(3)} KWD</p>
                        )}
                        {imeiDetails.customer && (
                          <p><span className="text-muted-foreground">Customer:</span> {imeiDetails.customer.name}</p>
                        )}
                        {imeiDetails.salesOrder?.invoiceNumber && (
                          <p><span className="text-muted-foreground">Invoice:</span> {imeiDetails.salesOrder.invoiceNumber}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {imeiDetails.events && imeiDetails.events.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Lifecycle Timeline
                    </h3>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {imeiDetails.events.map((event, idx) => {
                          const Icon = eventIcons[event.eventType] || History;
                          return (
                            <div key={event.id} className="relative pl-10" data-testid={`event-${event.id}`}>
                              <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-medium">{eventLabels[event.eventType] || event.eventType}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(event.eventDate), "dd MMM yyyy, HH:mm")}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm space-y-1">
                                  {event.priceKwd && (
                                    <p className="text-muted-foreground">
                                      Price: <span className="font-medium">{parseFloat(event.priceKwd).toFixed(3)} KWD</span>
                                    </p>
                                  )}
                                  {event.customer && (
                                    <p className="flex items-center gap-1 text-muted-foreground">
                                      <User className="h-3 w-3" /> {event.customer.name}
                                    </p>
                                  )}
                                  {event.supplier && (
                                    <p className="flex items-center gap-1 text-muted-foreground">
                                      <Building2 className="h-3 w-3" /> {event.supplier.name}
                                    </p>
                                  )}
                                  {(event.fromBranch || event.toBranch) && (
                                    <p className="flex items-center gap-1 text-muted-foreground">
                                      {event.fromBranch?.name}
                                      {event.fromBranch && event.toBranch && <ArrowRight className="h-3 w-3" />}
                                      {event.toBranch?.name}
                                    </p>
                                  )}
                                  {event.notes && (
                                    <p className="text-muted-foreground">{event.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>IMEI not found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

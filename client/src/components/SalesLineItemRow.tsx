import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Smartphone, Plus, X } from "lucide-react";
import type { Item } from "@shared/schema";

export interface SalesLineItemData {
  id: string;
  itemName: string;
  quantity: number;
  priceKwd: string;
  totalKwd: string;
  imeiNumbers: string[];
}

interface SalesLineItemRowProps {
  item: SalesLineItemData;
  items: Item[];
  index: number;
  onChange: (id: string, field: keyof SalesLineItemData, value: string | number | string[]) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  allImeiNumbers: string[];
}

export function SalesLineItemRow({
  item,
  items,
  index,
  onChange,
  onRemove,
  canRemove,
  allImeiNumbers,
}: SalesLineItemRowProps) {
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [newImei, setNewImei] = useState("");
  const [imeiError, setImeiError] = useState("");

  const handleQuantityChange = (value: string) => {
    const qty = parseInt(value) || 0;
    onChange(item.id, "quantity", qty);
  };

  const handleItemChange = (itemName: string) => {
    onChange(item.id, "itemName", itemName === "none" ? "" : itemName);
    
    if (itemName && itemName !== "none") {
      const selectedItem = items.find((itm) => itm.name === itemName);
      if (selectedItem?.sellingPriceKwd) {
        onChange(item.id, "priceKwd", selectedItem.sellingPriceKwd);
      } else {
        onChange(item.id, "priceKwd", "");
      }
    } else {
      onChange(item.id, "priceKwd", "");
    }
  };

  const validateImei = (imei: string): string | null => {
    const trimmedImei = imei.trim();
    
    if (!/^\d+$/.test(trimmedImei)) {
      return "IMEI must contain only digits";
    }
    
    if (trimmedImei.length !== 15) {
      return "IMEI must be exactly 15 digits";
    }
    
    if (allImeiNumbers.includes(trimmedImei)) {
      return "This IMEI has already been added";
    }
    
    return null;
  };

  const handleAddImei = () => {
    const trimmedImei = newImei.trim();
    if (!trimmedImei) return;

    const error = validateImei(trimmedImei);
    if (error) {
      setImeiError(error);
      return;
    }

    const updatedImeis = [...item.imeiNumbers, trimmedImei];
    onChange(item.id, "imeiNumbers", updatedImeis);
    setNewImei("");
    setImeiError("");
  };

  const handleRemoveImei = (imeiIndex: number) => {
    const updatedImeis = item.imeiNumbers.filter((_, i) => i !== imeiIndex);
    onChange(item.id, "imeiNumbers", updatedImeis);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddImei();
    }
  };

  return (
    <>
      <div 
        className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-muted/30"
        data-testid={`sales-line-item-row-${index}`}
      >
        <div className="flex-1 min-w-[180px]">
          <Select
            value={item.itemName || "none"}
            onValueChange={handleItemChange}
          >
            <SelectTrigger className="w-full text-sm" data-testid={`select-sales-item-${index}`}>
              <SelectValue placeholder="Select item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Select item --</SelectItem>
              {items.map((itm) => (
                <SelectItem key={itm.id} value={itm.name}>
                  {itm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-20">
          <Input
            type="number"
            min="1"
            step="1"
            value={item.quantity || ""}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="text-center text-sm"
            placeholder="Qty"
            data-testid={`input-sales-qty-${index}`}
          />
        </div>
        
        <div className="w-28">
          <Input
            type="text"
            readOnly
            value={item.priceKwd ? `${item.priceKwd}` : ""}
            className="text-center text-sm bg-muted/50"
            placeholder="KWD"
            data-testid={`input-sales-price-${index}`}
          />
        </div>
        
        <div className="w-28">
          <Input
            type="text"
            readOnly
            value={`${item.totalKwd || "0.000"} KWD`}
            className="text-center text-sm bg-muted/50"
            data-testid={`text-sales-line-total-${index}`}
          />
        </div>
        
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setImeiDialogOpen(true)}
          className="gap-1"
          data-testid={`button-imei-${index}`}
        >
          <Smartphone className="h-4 w-4" />
          IMEI
          {item.imeiNumbers.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {item.imeiNumbers.length}
            </Badge>
          )}
        </Button>
        
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onRemove(item.id)}
          disabled={!canRemove}
          data-testid={`button-remove-sales-item-${index}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <Dialog open={imeiDialogOpen} onOpenChange={setImeiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              IMEI Numbers - {item.itemName || "Item"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newImei}
                  onChange={(e) => {
                    setNewImei(e.target.value);
                    setImeiError("");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter 15-digit IMEI number"
                  className={`flex-1 font-mono ${imeiError ? "border-destructive" : ""}`}
                  maxLength={15}
                  data-testid={`input-new-imei-${index}`}
                />
                <Button
                  type="button"
                  onClick={handleAddImei}
                  disabled={!newImei.trim()}
                  data-testid={`button-add-imei-${index}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {imeiError && (
                <p className="text-sm text-destructive" data-testid={`text-imei-error-${index}`}>
                  {imeiError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                IMEI must be exactly 15 digits. Duplicates are not allowed.
              </p>
            </div>
            
            {item.imeiNumbers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No IMEI numbers added yet
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {item.imeiNumbers.map((imei, imeiIndex) => (
                  <div
                    key={imeiIndex}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    data-testid={`imei-entry-${index}-${imeiIndex}`}
                  >
                    <span className="font-mono text-sm">{imei}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveImei(imeiIndex)}
                      data-testid={`button-remove-imei-${index}-${imeiIndex}`}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Total: {item.imeiNumbers.length} IMEI number(s)
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setImeiDialogOpen(false)}
              data-testid={`button-close-imei-${index}`}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Barcode, Upload, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Item } from "@shared/schema";
import * as XLSX from "xlsx";

export interface LineItemData {
  id: string;
  itemName: string;
  quantity: number;
  priceKwd: string;
  fxPrice: string;
  totalKwd: string;
  imeiNumbers: string[];
}

interface LineItemRowProps {
  item: LineItemData;
  items: Item[];
  index: number;
  onChange: (id: string, field: keyof LineItemData, value: string | number | string[]) => void;
  onRemove: (id: string) => void;
}

export function LineItemRow({
  item,
  items,
  index,
  onChange,
  onRemove,
}: LineItemRowProps) {
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [imeiText, setImeiText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleQuantityChange = (value: string) => {
    const qty = parseInt(value) || 0;
    onChange(item.id, "quantity", qty);
  };

  const handlePriceChange = (value: string) => {
    onChange(item.id, "priceKwd", value);
  };

  const handleFxPriceChange = (value: string) => {
    onChange(item.id, "fxPrice", value);
  };

  const parseImeis = (text: string): string[] => {
    return text
      .split(/[\n,;\t]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const handleImeiSave = () => {
    const imeis = parseImeis(imeiText);
    onChange(item.id, "imeiNumbers", imeis);
    onChange(item.id, "quantity", imeis.length);
    setImeiDialogOpen(false);
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImeiText(prev => prev ? prev + "\n" + content : content);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      
      const imeis: string[] = [];
      jsonData.forEach((row) => {
        row.forEach((cell) => {
          if (cell) {
            const cellStr = String(cell).trim();
            if (cellStr.length > 0) {
              imeis.push(cellStr);
            }
          }
        });
      });
      
      setImeiText(prev => prev ? prev + "\n" + imeis.join("\n") : imeis.join("\n"));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const openImeiDialog = () => {
    setImeiText(item.imeiNumbers?.join("\n") || "");
    setImeiDialogOpen(true);
  };

  const imeiCount = item.imeiNumbers?.length || 0;

  return (
    <tr className="border-t border-border" data-testid={`line-item-row-${index}`}>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Select
            value={item.itemName || "none"}
            onValueChange={(val) => onChange(item.id, "itemName", val === "none" ? "" : val)}
          >
            <SelectTrigger className="w-full text-sm" data-testid={`select-item-${index}`}>
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
          <Dialog open={imeiDialogOpen} onOpenChange={setImeiDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={imeiCount > 0 ? "default" : "outline"}
                onClick={openImeiDialog}
                className="shrink-0"
                data-testid={`button-imei-${index}`}
              >
                <Barcode className="h-4 w-4 mr-1" />
                IMEI
                {imeiCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {imeiCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>IMEI Numbers for {item.itemName || "Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Enter IMEI numbers (one per line, or comma/tab separated)</Label>
                  <Textarea
                    value={imeiText}
                    onChange={(e) => setImeiText(e.target.value)}
                    placeholder="Enter IMEI numbers here...&#10;356789012345678&#10;356789012345679&#10;356789012345680"
                    className="min-h-[200px] font-mono text-sm"
                    data-testid={`textarea-imei-${index}`}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={handleTextFileUpload}
                    data-testid={`input-file-txt-${index}`}
                  />
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleExcelUpload}
                    data-testid={`input-file-excel-${index}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid={`button-import-txt-${index}`}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import TXT/CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => excelInputRef.current?.click()}
                    data-testid={`button-import-excel-${index}`}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Import Excel
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Count: {parseImeis(imeiText).length} IMEI(s)
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleImeiSave} data-testid={`button-save-imei-${index}`}>
                  Save IMEIs
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </td>
      <td className="px-1 py-1.5 text-center">
        <Input
          type="number"
          min="0"
          step="1"
          value={item.quantity || ""}
          onChange={(e) => handleQuantityChange(e.target.value)}
          className="text-center text-sm"
          data-testid={`input-qty-${index}`}
        />
      </td>
      <td className="px-1 py-1.5 text-center">
        <Input
          type="number"
          min="0"
          step="0.001"
          value={item.priceKwd}
          onChange={(e) => handlePriceChange(e.target.value)}
          className="text-center text-sm"
          data-testid={`input-price-${index}`}
        />
      </td>
      <td className="px-1 py-1.5 text-center">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.fxPrice}
          onChange={(e) => handleFxPriceChange(e.target.value)}
          className="text-center text-sm"
          data-testid={`input-fxprice-${index}`}
        />
      </td>
      <td className="px-1 py-1.5 text-center">
        <Input
          type="number"
          readOnly
          value={item.totalKwd || "0.000"}
          className="text-center text-sm bg-muted/50"
          data-testid={`input-total-${index}`}
        />
      </td>
      <td className="px-3 py-1.5 text-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onRemove(item.id)}
          data-testid={`button-remove-item-${index}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, Building2 } from "lucide-react";
import type { Supplier } from "@shared/schema";
import { SUPPLIER_CATEGORIES } from "@shared/schema";

interface SupplierFormData {
  name: string;
  category: string;
  country: string;
  email: string;
  phone: string;
  address: string;
  beneficiaryName: string;
  ibanAccountNumber: string;
  swiftCode: string;
  bankName: string;
  bankAddress: string;
}

const emptyFormData: SupplierFormData = {
  name: "",
  category: "",
  country: "",
  email: "",
  phone: "",
  address: "",
  beneficiaryName: "",
  ibanAccountNumber: "",
  swiftCode: "",
  bankName: "",
  bankAddress: "",
};

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  suppliers: Supplier[];
  onAdd: (data: SupplierFormData) => void;
  onUpdate: (id: number, data: SupplierFormData) => void;
  onDelete: (id: number) => void;
}

export function SupplierDialog({
  open,
  onOpenChange,
  mode,
  suppliers,
  onAdd,
  onUpdate,
  onDelete,
}: SupplierDialogProps) {
  const [formData, setFormData] = useState<SupplierFormData>(emptyFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (!open) {
      setFormData(emptyFormData);
      setEditingId(null);
      setEditingName("");
    }
  }, [open]);

  const handleAdd = () => {
    if (formData.name.trim()) {
      onAdd(formData);
      setFormData(emptyFormData);
      if (mode === "add") {
        onOpenChange(false);
      }
    }
  };

  const handleStartEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setEditingName(supplier.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      const supplier = suppliers.find(s => s.id === editingId);
      onUpdate(editingId, {
        name: editingName.trim(),
        category: supplier?.category || "",
        country: supplier?.country || "",
        email: supplier?.email || "",
        phone: supplier?.phone || "",
        address: supplier?.address || "",
        beneficiaryName: supplier?.beneficiaryName || "",
        ibanAccountNumber: supplier?.ibanAccountNumber || "",
        swiftCode: supplier?.swiftCode || "",
        bankName: supplier?.bankName || "",
        bankAddress: supplier?.bankAddress || "",
      });
      setEditingId(null);
      setEditingName("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const updateField = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-supplier">
            {mode === "add" ? "Add New Supplier" : "Manage Suppliers"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {mode === "add" ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Supplier Name *</Label>
                  <Input
                    id="supplier-name"
                    data-testid="input-supplier-name"
                    placeholder="Enter supplier name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => updateField("category", value)}
                  >
                    <SelectTrigger id="supplier-category" data-testid="select-supplier-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-country">Country</Label>
                  <Input
                    id="supplier-country"
                    data-testid="input-supplier-country"
                    placeholder="Enter country"
                    value={formData.country}
                    onChange={(e) => updateField("country", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Phone</Label>
                  <Input
                    id="supplier-phone"
                    data-testid="input-supplier-phone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-email">Email</Label>
                  <Input
                    id="supplier-email"
                    data-testid="input-supplier-email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-address">Address</Label>
                  <Input
                    id="supplier-address"
                    data-testid="input-supplier-address"
                    placeholder="Enter address"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>
              </div>

              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="beneficiary-name">Beneficiary Name</Label>
                      <Input
                        id="beneficiary-name"
                        data-testid="input-beneficiary-name"
                        placeholder="Enter beneficiary name"
                        value={formData.beneficiaryName}
                        onChange={(e) => updateField("beneficiaryName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iban-account">IBAN/Account Number</Label>
                      <Input
                        id="iban-account"
                        data-testid="input-iban-account"
                        placeholder="Enter IBAN or account number"
                        value={formData.ibanAccountNumber}
                        onChange={(e) => updateField("ibanAccountNumber", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="swift-code">Swift Code</Label>
                      <Input
                        id="swift-code"
                        data-testid="input-swift-code"
                        placeholder="Enter SWIFT/BIC code"
                        value={formData.swiftCode}
                        onChange={(e) => updateField("swiftCode", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Bank Name</Label>
                      <Input
                        id="bank-name"
                        data-testid="input-bank-name"
                        placeholder="Enter bank name"
                        value={formData.bankName}
                        onChange={(e) => updateField("bankName", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-address">Bank Address</Label>
                    <Input
                      id="bank-address"
                      data-testid="input-bank-address"
                      placeholder="Enter bank address"
                      value={formData.bankAddress}
                      onChange={(e) => updateField("bankAddress", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Add New Supplier</Label>
                <div className="flex gap-2">
                  <Input
                    data-testid="input-new-supplier-name"
                    placeholder="Enter supplier name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                  <Button onClick={handleAdd} size="sm" data-testid="button-add-supplier-quick">
                    Add
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Existing Suppliers</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  {suppliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No suppliers yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {suppliers.map((supplier) => (
                        <div
                          key={supplier.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                        >
                          {editingId === supplier.id ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8"
                                data-testid={`input-edit-supplier-${supplier.id}`}
                              />
                              <Button size="sm" onClick={handleSaveEdit} data-testid={`button-save-supplier-${supplier.id}`}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm" data-testid={`text-supplier-${supplier.id}`}>
                                {supplier.name}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleStartEdit(supplier)}
                                  data-testid={`button-edit-supplier-${supplier.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => onDelete(supplier.id)}
                                  data-testid={`button-delete-supplier-${supplier.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          {mode === "add" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} data-testid="button-save-supplier">
                Add Supplier
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

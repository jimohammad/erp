import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Pencil } from "lucide-react";
import type { Customer } from "@shared/schema";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  customers: Customer[];
  onAdd: (name: string) => void;
  onUpdate: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

export function CustomerDialog({
  open,
  onOpenChange,
  mode,
  customers,
  onAdd,
  onUpdate,
  onDelete,
}: CustomerDialogProps) {
  const [newCustomerName, setNewCustomerName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (!open) {
      setNewCustomerName("");
      setEditingId(null);
      setEditingName("");
    }
  }, [open]);

  const handleAdd = () => {
    if (newCustomerName.trim()) {
      onAdd(newCustomerName.trim());
      setNewCustomerName("");
      if (mode === "add") {
        onOpenChange(false);
      }
    }
  };

  const handleStartEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setEditingName(customer.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      onUpdate(editingId, editingName.trim());
      setEditingId(null);
      setEditingName("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-customer">
            {mode === "add" ? "Add New Customer" : "Manage Customers"}
          </DialogTitle>
        </DialogHeader>

        {mode === "add" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                data-testid="input-customer-name"
                placeholder="Enter customer name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Add New Customer</Label>
              <div className="flex gap-2">
                <Input
                  data-testid="input-new-customer-name"
                  placeholder="Enter customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <Button onClick={handleAdd} size="sm" data-testid="button-add-customer-quick">
                  Add
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Existing Customers</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {customers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No customers yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                      >
                        {editingId === customer.id ? (
                          <div className="flex-1 flex gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8"
                              data-testid={`input-edit-customer-${customer.id}`}
                            />
                            <Button size="sm" onClick={handleSaveEdit} data-testid={`button-save-customer-${customer.id}`}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm" data-testid={`text-customer-${customer.id}`}>
                              {customer.name}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleStartEdit(customer)}
                                data-testid={`button-edit-customer-${customer.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onDelete(customer.id)}
                                data-testid={`button-delete-customer-${customer.id}`}
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

        <DialogFooter>
          {mode === "add" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} data-testid="button-save-customer">
                Add Customer
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

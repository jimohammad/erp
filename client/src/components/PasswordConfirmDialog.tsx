import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function PasswordConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Enter Password",
  description = "Please enter the transaction password to continue with this action.",
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { data: passwordStatus } = useQuery<{ isSet: boolean }>({
    queryKey: ["/api/settings/transaction-password-status"],
  });

  const verifyMutation = useMutation({
    mutationFn: async (pwd: string) => {
      return await apiRequest<{ valid: boolean }>("POST", "/api/settings/verify-transaction-password", { password: pwd });
    },
    onSuccess: (data) => {
      if (data.valid) {
        setPassword("");
        setError("");
        onOpenChange(false);
        onConfirm();
      } else {
        setError("Incorrect password");
      }
    },
    onError: () => {
      setError("Failed to verify password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!passwordStatus?.isSet) {
      onOpenChange(false);
      onConfirm();
      return;
    }
    
    verifyMutation.mutate(password);
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  if (!passwordStatus?.isSet) {
    if (open) {
      onOpenChange(false);
      onConfirm();
    }
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter transaction password"
              className="mt-2"
              autoFocus
              data-testid="input-transaction-password"
            />
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={handleClose}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" disabled={verifyMutation.isPending} data-testid="button-confirm-password">
              {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function usePasswordProtection() {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const { data: passwordStatus } = useQuery<{ isSet: boolean }>({
    queryKey: ["/api/settings/transaction-password-status"],
  });

  const requestPasswordConfirmation = (action: () => void) => {
    if (!passwordStatus?.isSet) {
      action();
      return;
    }
    setPendingAction(() => action);
    setShowPasswordDialog(true);
  };

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setPendingAction(null);
    }
    setShowPasswordDialog(open);
  };

  return {
    showPasswordDialog,
    setShowPasswordDialog: handleClose,
    requestPasswordConfirmation,
    handleConfirm,
    PasswordDialog: (
      <PasswordConfirmDialog
        open={showPasswordDialog}
        onOpenChange={handleClose}
        onConfirm={handleConfirm}
      />
    ),
  };
}

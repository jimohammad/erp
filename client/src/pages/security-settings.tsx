import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Shield, Trash2, Package, Copy, ExternalLink, RefreshCw, DollarSign, Smartphone, QrCode } from "lucide-react";
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

interface StockListSettings {
  token: string | null;
  pin: string | null;
  hasAccess: boolean;
}

interface PriceListSettings {
  token: string | null;
  pin: string | null;
  hasAccess: boolean;
}

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [stockListPin, setStockListPin] = useState("");
  const [showRevokeStockListDialog, setShowRevokeStockListDialog] = useState(false);
  const [priceListPin, setPriceListPin] = useState("");
  const [showRevokePriceListDialog, setShowRevokePriceListDialog] = useState(false);
  
  // TOTP (2FA) state
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);

  const { data: passwordStatus, isLoading } = useQuery<{ isSet: boolean }>({
    queryKey: ["/api/settings/transaction-password-status"],
  });

  // TOTP status query
  const { data: totpStatus, isLoading: totpLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/totp/status"],
  });

  const { data: stockListSettings, isLoading: stockListLoading } = useQuery<StockListSettings>({
    queryKey: ["/api/settings/stock-list"],
  });

  const { data: priceListSettings, isLoading: priceListLoading } = useQuery<PriceListSettings>({
    queryKey: ["/api/settings/price-list"],
  });

  const setPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/settings/transaction-password", { password });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/transaction-password-status"] });
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password Set",
        description: "Transaction password has been set successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set transaction password.",
        variant: "destructive",
      });
    },
  });

  const removePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/transaction-password");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/transaction-password-status"] });
      toast({
        title: "Password Removed",
        description: "Transaction password has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove transaction password.",
        variant: "destructive",
      });
    },
  });

  const generateStockListMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", "/api/settings/stock-list/generate", { pin });
      return await res.json();
    },
    onSuccess: (data) => {
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

  const copyStockListLink = () => {
    if (!stockListSettings?.token) return;
    const url = `${window.location.origin}/s/${stockListSettings.token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Stock list URL copied to clipboard.",
    });
  };

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

  // TOTP mutations
  const setupTotpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/totp/setup", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to setup TOTP");
      return await res.json();
    },
    onSuccess: (data) => {
      setTotpSetupData({ secret: data.secret, qrCode: data.qrCode });
      setTotpVerifyCode("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const enableTotpMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/totp/enable", { code });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/totp/status"] });
      setTotpSetupData(null);
      setTotpVerifyCode("");
      toast({
        title: "Two-Factor Authentication Enabled",
        description: "Your account is now protected with Google Authenticator.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error?.message || "The code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disableTotpMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/totp/disable", { code });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/totp/status"] });
      setShowDisable2FADialog(false);
      setTotpDisableCode("");
      toast({
        title: "Two-Factor Authentication Disabled",
        description: "2FA has been removed from your account.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to disable 2FA. Check your code.",
        variant: "destructive",
      });
    },
  });

  const handleEnableTotp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpVerifyCode || totpVerifyCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }
    enableTotpMutation.mutate(totpVerifyCode);
  };

  const handleDisableTotp = () => {
    if (!totpDisableCode || totpDisableCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }
    disableTotpMutation.mutate(totpDisableCode);
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

  const copyPriceListLink = () => {
    if (!priceListSettings?.token) return;
    const url = `${window.location.origin}/p/${priceListSettings.token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Price list URL copied to clipboard.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: "Error",
        description: "Password must be at least 4 characters.",
        variant: "destructive",
      });
      return;
    }

    setPasswordMutation.mutate(newPassword);
  };

  const handleRemovePassword = () => {
    setShowRemoveDialog(false);
    removePasswordMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Security Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage transaction security and password protection
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Transaction Password</CardTitle>
            </div>
            <Badge variant={passwordStatus?.isSet ? "default" : "secondary"}>
              {passwordStatus?.isSet ? "Enabled" : "Not Set"}
            </Badge>
          </div>
          <CardDescription>
            When enabled, users will need to enter this password to delete or edit transactions 
            (sales, purchases, payments, returns, expenses). This adds an extra layer of security 
            to protect against accidental or unauthorized modifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {passwordStatus?.isSet ? "New Password" : "Set Password"}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password"
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="submit"
                disabled={setPasswordMutation.isPending}
                data-testid="button-set-password"
              >
                {setPasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {passwordStatus?.isSet ? "Update Password" : "Set Password"}
              </Button>
              {passwordStatus?.isSet && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRemoveDialog(true)}
                  disabled={removePasswordMutation.isPending}
                  data-testid="button-remove-password"
                >
                  {removePasswordMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Password
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <Badge variant={totpStatus?.enabled ? "default" : "secondary"}>
              {totpStatus?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <CardDescription>
            Add an extra layer of security to your account using Google Authenticator or any TOTP-compatible app.
            When enabled, you'll need to enter a 6-digit code from your phone to log in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totpLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : totpStatus?.enabled ? (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Two-factor authentication is active</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is protected. You'll need your authenticator app to log in.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDisable2FADialog(true)}
                data-testid="button-disable-2fa"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disable Two-Factor Authentication
              </Button>
            </div>
          ) : totpSetupData ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-white rounded-lg">
                    <img 
                      src={totpSetupData.qrCode} 
                      alt="QR Code" 
                      className="w-40 h-40"
                      data-testid="img-totp-qr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan this QR code with Google Authenticator
                  </p>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Or enter this code manually:
                    </Label>
                    <div className="p-2 bg-muted rounded-md">
                      <code className="text-sm font-mono break-all" data-testid="text-totp-secret">
                        {totpSetupData.secret}
                      </code>
                    </div>
                  </div>
                  <form onSubmit={handleEnableTotp} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="totpCode">Enter 6-digit code from app</Label>
                      <Input
                        id="totpCode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={totpVerifyCode}
                        onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        data-testid="input-totp-verify"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        type="submit" 
                        disabled={enableTotpMutation.isPending}
                        data-testid="button-verify-totp"
                      >
                        {enableTotpMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Verify & Enable
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTotpSetupData(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">To set up two-factor authentication:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Download Google Authenticator on your phone</li>
                  <li>Click the button below to generate a QR code</li>
                  <li>Scan the QR code with your authenticator app</li>
                  <li>Enter the 6-digit code to verify</li>
                </ol>
              </div>
              <Button
                onClick={() => setupTotpMutation.mutate()}
                disabled={setupTotpMutation.isPending}
                data-testid="button-setup-2fa"
              >
                {setupTotpMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Set Up Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Stock List URL</CardTitle>
            </div>
            <Badge variant={stockListSettings?.hasAccess ? "default" : "secondary"}>
              {stockListSettings?.hasAccess ? "Active" : "Not Set"}
            </Badge>
          </div>
          <CardDescription>
            Generate a PIN-protected link to share your current stock and prices with authorized users.
            Anyone with the link and PIN can view real-time inventory levels and selling prices.
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
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setShowRevokeStockListDialog(true)}
                  disabled={revokeStockListMutation.isPending}
                  data-testid="button-revoke-stock-list"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke Access
                </Button>
                <form onSubmit={handleGenerateStockList} className="flex gap-2 items-end">
                  <div>
                    <Label htmlFor="newStockPin" className="text-xs">New PIN</Label>
                    <Input
                      id="newStockPin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="4-6 digits"
                      value={stockListPin}
                      onChange={(e) => setStockListPin(e.target.value.replace(/\D/g, ""))}
                      className="w-24"
                      data-testid="input-new-stock-pin"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={generateStockListMutation.isPending || stockListPin.length < 4}
                    data-testid="button-regenerate-stock-link"
                  >
                    {generateStockListMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Price List URL (For Salesmen)</CardTitle>
            </div>
            <Badge variant={priceListSettings?.hasAccess ? "default" : "secondary"}>
              {priceListSettings?.hasAccess ? "Active" : "Not Set"}
            </Badge>
          </div>
          <CardDescription>
            Generate a PIN-protected link to share product prices with salesmen.
            This list shows items and prices only (no stock quantities).
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
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setShowRevokePriceListDialog(true)}
                  disabled={revokePriceListMutation.isPending}
                  data-testid="button-revoke-price-list"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke Access
                </Button>
                <form onSubmit={handleGeneratePriceList} className="flex gap-2 items-end">
                  <div>
                    <Label htmlFor="newPricePin" className="text-xs">New PIN</Label>
                    <Input
                      id="newPricePin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="4-6 digits"
                      value={priceListPin}
                      onChange={(e) => setPriceListPin(e.target.value.replace(/\D/g, ""))}
                      className="w-24"
                      data-testid="input-new-price-pin"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={generatePriceListMutation.isPending || priceListPin.length < 4}
                    data-testid="button-regenerate-price-link"
                  >
                    {generatePriceListMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
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

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Transaction Password?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable password protection for editing and deleting transactions. 
              Anyone with edit access will be able to modify transactions without entering a password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemovePassword}>
              Remove Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the current 6-digit code from your authenticator app to disable two-factor authentication.
              Your account will be less secure without 2FA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="disable2faCode">Authentication Code</Label>
            <Input
              id="disable2faCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpDisableCode}
              onChange={(e) => setTotpDisableCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="mt-2"
              data-testid="input-disable-2fa-code"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTotpDisableCode("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDisableTotp}
              disabled={disableTotpMutation.isPending}
            >
              {disableTotpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

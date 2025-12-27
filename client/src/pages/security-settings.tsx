import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Shield, Trash2, Smartphone, QrCode } from "lucide-react";
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


export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  
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


  const setPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      return await apiRequest("POST", "/api/settings/transaction-password", { password });
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
      return await apiRequest("DELETE", "/api/settings/transaction-password");
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
      return await apiRequest("POST", "/api/totp/enable", { code });
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
      return await apiRequest("POST", "/api/totp/disable", { code });
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

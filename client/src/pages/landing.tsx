import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, Smartphone } from "lucide-react";
import { Label } from "@/components/ui/label";
import logoImage from "@assets/erpLogo_2_1765470830494.png";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Landing() {
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [savedCredentials, setSavedCredentials] = useState<LoginFormData | null>(null);
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData & { totpCode?: string }) => {
      return await apiRequest<{ requiresTOTP?: boolean }>("POST", "/api/login", data);
    },
    onSuccess: (response) => {
      // Check if TOTP is required
      if (response.requiresTOTP) {
        setRequiresTOTP(true);
        setSavedCredentials(loginForm.getValues());
        return;
      }
      // Successful login
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome back!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedCredentials) return;
    
    if (!totpCode || totpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate({
      ...savedCredentials,
      totpCode,
    });
  };

  const handleBackToLogin = () => {
    setRequiresTOTP(false);
    setTotpCode("");
    setSavedCredentials(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-end">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <img 
          src={logoImage} 
          alt="Iqbal Electronics ERP" 
          className="w-48 h-auto object-contain"
          data-testid="img-logo"
        />

        <Card className="w-full max-w-md">
          {requiresTOTP ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <Smartphone className="h-10 w-10 text-primary" />
                </div>
                <CardTitle data-testid="text-auth-title">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTotpSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totpCode">Authentication Code</Label>
                    <Input 
                      id="totpCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      autoFocus
                      className="text-center text-2xl tracking-widest"
                      data-testid="input-totp-code"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-verify-totp"
                  >
                    {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleBackToLogin}
                    data-testid="button-back-login"
                  >
                    Back to Login
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle data-testid="text-auth-title">Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your username"
                              data-testid="input-login-username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                data-testid="input-login-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}

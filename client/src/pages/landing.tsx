import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoImage from "@assets/erpLogo_2_1765470830494.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-end">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        <img 
          src={logoImage} 
          alt="Iqbal Electronics ERP" 
          className="w-64 h-auto object-contain"
          data-testid="img-logo"
        />
        <Button size="lg" onClick={handleLogin} data-testid="button-login">
          Sign In
        </Button>
      </main>
    </div>
  );
}

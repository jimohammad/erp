import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoImage from "@assets/file_00000000aa9c722fa7dc5ef59bfe1aeb_(1)_1765404256747.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold" data-testid="text-company-name">
          Iqbal Electronics Co. WLL
        </h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        <img 
          src={logoImage} 
          alt="ERP Logo" 
          className="w-48 h-48 object-contain"
          data-testid="img-logo"
        />
        <Button size="lg" onClick={handleLogin} data-testid="button-login">
          Sign In
        </Button>
      </main>
    </div>
  );
}

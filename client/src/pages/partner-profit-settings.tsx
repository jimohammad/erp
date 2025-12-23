import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Save } from "lucide-react";
import { ITEM_CATEGORIES } from "@shared/schema";

interface PartnerProfitSetting {
  category: string;
  profitPerUnit: string;
}

export default function PartnerProfitSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});

  const { data: savedSettings, isLoading } = useQuery<{ settings: PartnerProfitSetting[] }>({
    queryKey: ["/api/settings/partner-profit"],
    queryFn: async () => {
      const res = await fetch("/api/settings/partner-profit", { credentials: "include" });
      if (!res.ok) return { settings: [] };
      return res.json();
    },
  });

  useEffect(() => {
    if (savedSettings?.settings) {
      const settingsMap: Record<string, string> = {};
      savedSettings.settings.forEach((s) => {
        settingsMap[s.category] = s.profitPerUnit;
      });
      setSettings(settingsMap);
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: PartnerProfitSetting[]) => {
      return apiRequest("POST", "/api/settings/partner-profit", { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/partner-profit"] });
      toast({
        title: "Settings Saved",
        description: "Partner profit settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save partner profit settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const settingsArray: PartnerProfitSetting[] = Object.entries(settings)
      .filter(([_, value]) => value && parseFloat(value) > 0)
      .map(([category, profitPerUnit]) => ({
        category,
        profitPerUnit,
      }));
    saveMutation.mutate(settingsArray);
  };

  const handleChange = (category: string, value: string) => {
    setSettings((prev) => ({ ...prev, [category]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const mobileCategories = ITEM_CATEGORIES.filter(
    (cat) => !["Buds", "Charger"].includes(cat)
  );
  const accessoryCategories = ["Buds", "Charger"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Partner Profit Settings</h1>
          <p className="text-muted-foreground">
            Configure partner profit per unit for each item category (Faisal's share)
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Mobile Phones
            </CardTitle>
            <CardDescription>
              Partner profit per unit for mobile phone categories (recommended: 0.250 KWD)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mobileCategories.map((category) => (
              <div key={category} className="flex items-center gap-4">
                <Label className="w-32 text-sm">{category}</Label>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.250"
                    value={settings[category] || ""}
                    onChange={(e) => handleChange(category, e.target.value)}
                    className="max-w-32"
                    data-testid={`input-profit-${category.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  <span className="text-sm text-muted-foreground">KWD</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Accessories
            </CardTitle>
            <CardDescription>
              Partner profit per unit for accessory categories (recommended: 0.050 KWD)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessoryCategories.map((category) => (
              <div key={category} className="flex items-center gap-4">
                <Label className="w-32 text-sm">{category}</Label>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.050"
                    value={settings[category] || ""}
                    onChange={(e) => handleChange(category, e.target.value)}
                    className="max-w-32"
                    data-testid={`input-profit-${category.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  <span className="text-sm text-muted-foreground">KWD</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>The partner profit is added to the cost per piece when calculating landed cost:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Cost/Pc</strong> = Item Price + Freight Share</li>
            <li><strong>Landed Cost</strong> = Cost/Pc + Partner Profit</li>
          </ul>
          <p className="mt-4">
            When you create a Purchase Order with freight costs, the system will automatically calculate 
            the landed cost including Faisal's partner profit based on these category settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

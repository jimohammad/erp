import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Database, Shield, Clock, CheckCircle, RefreshCw, CloudDownload, History } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface BackupFile {
  name: string;
  size: number;
  created: string;
}

export default function BackupPage() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const { data: backups = [], isLoading: isLoadingBackups } = useQuery<BackupFile[]>({
    queryKey: ["/api/backup/list"],
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ filename: string }>("POST", "/api/backup/create");
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Created",
        description: `Backup saved as ${data.filename}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backup/list"] });
    },
    onError: () => {
      toast({
        title: "Backup Failed",
        description: "Could not create backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/backup/download");
      
      if (!response.ok) {
        throw new Error("Failed to download backup");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "ERP_Backup.xlsx";
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Backup Downloaded",
        description: `File saved as ${filename}`,
      });
    } catch (error) {
      console.error("Backup error:", error);
      toast({
        title: "Backup Failed",
        description: "Could not download backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadStoredBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backup/stored/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error("Failed to get backup URL");
      }
      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Could not download backup file.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-backup">Database Backup</h1>
        <p className="text-muted-foreground">Automatic daily backups with manual download option</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Auto-Backup Enabled
          </CardTitle>
          <CardDescription>
            Your data is automatically backed up daily at midnight
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Daily Schedule</p>
                <p className="text-xs text-muted-foreground">Runs automatically at midnight</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">30 Day Retention</p>
                <p className="text-xs text-muted-foreground">Keeps last 30 backup files</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Database className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Cloud Storage</p>
                <p className="text-xs text-muted-foreground">Stored securely in object storage</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              variant="outline"
              data-testid="button-create-backup"
            >
              {createBackupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Create Backup Now
                </>
              )}
            </Button>
            <Button
              onClick={handleDownloadBackup}
              disabled={isDownloading}
              data-testid="button-download-backup"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Backup History
          </CardTitle>
          <CardDescription>
            Previously saved backup files (last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No backup history yet</p>
              <p className="text-sm">Backups will appear here after the first automatic or manual backup</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.name}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{backup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(backup.created), "PPP 'at' p")} - {formatFileSize(backup.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownloadStoredBackup(backup.name)}
                    data-testid={`button-download-${backup.name}`}
                  >
                    <CloudDownload className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Included in Backups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "Branches", "Users", "Parties", "Items", "Customers",
              "Purchases", "Sales", "Payments", "Expenses", "Returns",
              "Stock Transfers", "Account Transfers", "Opening Balances", "Discounts"
            ].map((item) => (
              <span key={item} className="px-2 py-1 bg-muted rounded text-xs">
                {item}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

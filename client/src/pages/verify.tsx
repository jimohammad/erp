import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Building2, FileText, Calendar, DollarSign, User } from "lucide-react";

interface VerificationResult {
  valid: boolean;
  error?: string;
  documentType?: string;
  documentNumber?: string;
  amount?: string;
  documentDate?: string;
  partyName?: string;
  partyType?: string;
  verifiedAt?: string;
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SALE: "Sales Invoice",
    PAYMENT_IN: "Payment Receipt (IN)",
    PAYMENT_OUT: "Payment Voucher (OUT)",
    RETURN: "Return Voucher",
    SALE_RETURN: "Sale Return",
    PURCHASE_RETURN: "Purchase Return",
  };
  return labels[type] || type;
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return isNaN(num) ? amount : num.toFixed(3) + " KWD";
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function VerifyPage() {
  const params = useParams();
  const verificationCode = params.code;

  const { data: result, isLoading, error } = useQuery<VerificationResult>({
    queryKey: ["/api/verify", verificationCode],
    queryFn: async () => {
      const response = await fetch(`/api/verify/${verificationCode}`);
      return response.json();
    },
    enabled: !!verificationCode,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
          <h1 className="text-xl font-bold">Iqbal Electronics Co. WLL</h1>
          <p className="text-sm text-muted-foreground">Document Verification System</p>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2">
              <FileText className="h-5 w-5" />
              Document Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Verifying document...</p>
              </div>
            )}

            {!isLoading && result?.valid && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 py-4 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <span className="text-lg font-semibold text-green-700 dark:text-green-400">
                    Document Verified
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Document Type</p>
                      <p className="font-medium">{getDocumentTypeLabel(result.documentType || "")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Document Number</p>
                      <p className="font-medium">{result.documentNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Document Date</p>
                      <p className="font-medium">{formatDate(result.documentDate || "")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                    <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium">{formatAmount(result.amount || "0")}</p>
                    </div>
                  </div>

                  {result.partyName && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                      <User className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {result.partyType === "customer" ? "Customer" : "Supplier"}
                        </p>
                        <p className="font-medium">{result.partyName}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center pt-4 text-xs text-muted-foreground border-t">
                  <p>Verified on {formatDate(result.verifiedAt || new Date().toISOString())}</p>
                  <p className="mt-1">This document is authentic and was issued by</p>
                  <p className="font-medium">Iqbal Electronics Co. WLL</p>
                </div>
              </div>
            )}

            {!isLoading && (!result?.valid || error) && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 py-4 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <span className="text-lg font-semibold text-red-700 dark:text-red-400">
                    Verification Failed
                  </span>
                </div>

                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    {result?.error || "This document could not be verified."}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please contact Iqbal Electronics if you believe this is an error.
                  </p>
                </div>

                <div className="text-center pt-4 text-xs text-muted-foreground border-t">
                  <p className="font-medium">Warning</p>
                  <p className="mt-1">This document may be counterfeit or the verification code is invalid.</p>
                </div>
              </div>
            )}

            {!verificationCode && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No verification code provided.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please scan the QR code on a valid document.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>Iqbal Electronics Co. WLL</p>
          <p>Document Verification System</p>
        </div>
      </div>
    </div>
  );
}

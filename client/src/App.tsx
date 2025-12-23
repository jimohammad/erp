import { Switch, Route, useLocation, Link } from "wouter";
import { Suspense, lazy, useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BranchProvider, useBranch } from "@/contexts/BranchContext";
import { BranchSelector } from "@/components/BranchSelector";
import { Loader2, LogOut, ShoppingCart, TrendingUp, Package, Users, CreditCard, FileBarChart, Receipt, Wallet, Edit3, ChevronDown, RotateCcw, FileText, Settings, Percent, LayoutDashboard, ArrowLeftRight, Building2, Smartphone, MessageCircle, ArrowDownLeft, ArrowUpRight, List } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Home = lazy(() => import("@/pages/home"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const SalesPage = lazy(() => import("@/pages/sales"));
const AllPurchasesPage = lazy(() => import("@/pages/all-purchases"));
const AllSalesPage = lazy(() => import("@/pages/all-sales"));
const PaymentsPage = lazy(() => import("@/pages/payments"));
const PaymentInPage = lazy(() => import("@/pages/payment-in"));
const PaymentOutPage = lazy(() => import("@/pages/payment-out"));
const ReturnsPage = lazy(() => import("@/pages/returns"));
const ItemMaster = lazy(() => import("@/pages/item-master"));
const ItemBulkEdit = lazy(() => import("@/pages/item-bulk-edit"));
const PartyMaster = lazy(() => import("@/pages/party-master"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const PartyStatementPage = lazy(() => import("@/pages/party-statement"));
const AccountStatementPage = lazy(() => import("@/pages/account-statement"));
const ItemReportPage = lazy(() => import("@/pages/item-report"));
const UserRolesPage = lazy(() => import("@/pages/user-roles"));
const ExpensesPage = lazy(() => import("@/pages/expenses"));
const AccountsPage = lazy(() => import("@/pages/accounts"));
const DiscountPage = lazy(() => import("@/pages/discount"));
const ExportImeiPage = lazy(() => import("@/pages/export-imei"));
const CustomerStatementPage = lazy(() => import("@/pages/customer-statement"));
const StockTransfersPage = lazy(() => import("@/pages/stock-transfers"));
const StockTransferNewPage = lazy(() => import("@/pages/stock-transfer-new"));
const BranchesPage = lazy(() => import("@/pages/branches"));
const OpeningBalancesPage = lazy(() => import("@/pages/opening-balances"));
const PurchaseOrdersPage = lazy(() => import("@/pages/purchase-orders"));
const StockLookupPage = lazy(() => import("@/pages/stock-lookup"));
const SecuritySettingsPage = lazy(() => import("@/pages/security-settings"));
const PartnerProfitSettingsPage = lazy(() => import("@/pages/partner-profit-settings"));
const LandedCostPage = lazy(() => import("@/pages/landed-cost"));
const ImeiHistoryPage = lazy(() => import("@/pages/imei-history"));
const BackupPage = lazy(() => import("@/pages/backup"));
const UserManagementPage = lazy(() => import("@/pages/user-management"));
const Landing = lazy(() => import("@/pages/landing"));
const PublicStatementPage = lazy(() => import("@/pages/public-statement"));
const SalesmanStatementPage = lazy(() => import("@/pages/salesman-statement"));
const StockListPage = lazy(() => import("@/pages/stock-list"));
const PriceListPage = lazy(() => import("@/pages/price-list"));
const VerifyPage = lazy(() => import("@/pages/verify"));
const AllTransactionsPage = lazy(() => import("@/pages/all-transactions"));
const CustomerAgingPage = lazy(() => import("@/pages/customer-aging"));
const SendPriceListPage = lazy(() => import("@/pages/send-price-list"));
const InvoicePrintingPage = lazy(() => import("@/pages/invoice-printing"));
const SalesmanAnalysisPage = lazy(() => import("@/pages/salesman-analysis"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

interface MyPermissions {
  role: string;
  modules: string[];
}

function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: permissions, isLoading: permissionsLoading } = useQuery<MyPermissions>({
    queryKey: ["/api/my-permissions"],
    enabled: !!user && !authLoading, // Only fetch after user is authenticated
  });

  const canAccess = (moduleName: string) => {
    if (permissionsLoading || !permissions) return false;
    return permissions.modules.includes(moduleName);
  };

  // Keyboard shortcuts: Alt+S (Sales), Alt+P (Purchase), Alt+I (Payment-In), Alt+O (Payment-Out), Alt+E (Expense)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      
      const target = e.target as HTMLElement;
      const isInputField = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.tagName === "SELECT" ||
        target.isContentEditable;
      
      if (isInputField) return;

      const key = e.key.toLowerCase();
      switch (key) {
        case 's':
          e.preventDefault();
          setLocation('/sales');
          break;
        case 'p':
          e.preventDefault();
          setLocation('/purchases/orders');
          break;
        case 'i':
          e.preventDefault();
          setLocation('/payments/in');
          break;
        case 'o':
          e.preventDefault();
          setLocation('/payments/out');
          break;
        case 'e':
          e.preventDefault();
          setLocation('/expenses');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);
  
  const mainMenuItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      module: "dashboard",
    },
    {
      title: "Returns",
      url: "/returns",
      icon: RotateCcw,
      module: "returns",
    },
    {
      title: "Expenses",
      url: "/expenses",
      icon: Receipt,
      module: "expenses",
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: Wallet,
      module: "accounts",
    },
    {
      title: "Discount",
      url: "/discount",
      icon: Percent,
      module: "discount",
    },
    {
      title: "Stock Transfers",
      url: "/stock-transfers",
      icon: ArrowLeftRight,
      module: "purchases",
    },
    {
      title: "All Transactions",
      url: "/all-transactions",
      icon: List,
      module: "all_transactions",
    },
  ].filter(item => canAccess(item.module));

  const purchasesSubItems = [
    { title: "Purchase Orders", url: "/purchases/orders" },
    { title: "All Purchases", url: "/purchases/all" },
    { title: "Landed Cost", url: "/purchases/landed-cost" },
  ];

  const salesSubItems = [
    { title: "All Sales", url: "/sales/all" },
  ];

  const itemMasterSubItems = [
    { title: "Bulk Edit", url: "/items/bulk-edit" },
  ];

  const reportsSubItems = [
    { title: "General Reports", url: "/reports" },
    { title: "Invoice Printing", url: "/reports/invoice-printing" },
    { title: "Salesman Analysis", url: "/reports/salesman-analysis" },
    { title: "Customer Aging", url: "/reports/customer-aging" },
    { title: "Party Statement", url: "/reports/party-statement" },
    { title: "Account Statement", url: "/reports/account-statement" },
    { title: "Customer Statement", url: "/reports/customer-statement" },
    { title: "Item Report", url: "/reports/item-report" },
    { title: "Export IMEI", url: "/reports/export-imei" },
  ];

  const settingsSubItems = [
    { title: "User Management", url: "/settings/users" },
    { title: "User Roles", url: "/settings/user-roles" },
    { title: "Branches", url: "/settings/branches" },
    { title: "Opening Balances", url: "/settings/opening-balances" },
    { title: "Partner Profit", url: "/settings/partner-profit" },
    { title: "Security", url: "/settings/security" },
    { title: "Backup", url: "/settings/backup" },
  ];

  // Track which menu is expanded (accordion pattern - only one at a time)
  const getInitialExpandedMenu = () => {
    if (location.startsWith("/purchases")) return "purchases";
    if (location.startsWith("/sales")) return "sales";
    if (location.startsWith("/items")) return "items";
    if (location.startsWith("/reports")) return "reports";
    if (location.startsWith("/settings")) return "settings";
    return null;
  };
  
  const [expandedMenu, setExpandedMenu] = useState<string | null>(getInitialExpandedMenu);

  const handleMenuToggle = (menuId: string) => {
    setExpandedMenu(prev => prev === menuId ? null : menuId);
  };

  const handleLogout = async () => {
    // Clear PWA cache before logout
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    }
    // Also clear caches directly
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    window.location.href = "/api/logout";
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div>
          <h2 className="font-bold text-base" data-testid="text-company-name">
            Iqbal Electronics Co. WLL
          </h2>
          <p className="text-xs text-muted-foreground">ERP System</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            {permissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
            <SidebarMenu>
              {/* Dashboard - always first */}
              {canAccess("dashboard") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/"}
                  >
                    <Link href="/" data-testid="link-dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Sales - second after Dashboard */}
              {canAccess("sales") && (
                <Collapsible open={expandedMenu === "sales"} onOpenChange={() => handleMenuToggle("sales")} className="group/collapsible">
                  <SidebarMenuItem>
                    <div className="flex items-center w-full">
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === "/sales"}
                        className="flex-1"
                      >
                        <Link href="/sales" data-testid="link-sales">
                          <TrendingUp className="h-4 w-4" />
                          <span>Sales</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {salesSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === subItem.url}
                            >
                              <Link href={subItem.url} data-testid={`link-${subItem.title.toLowerCase().replace(" ", "-")}`}>
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Payment IN - third after Sales */}
              {canAccess("payments") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/payments/in"}
                  >
                    <Link href="/payments/in" data-testid="link-payment-in">
                      <ArrowDownLeft className="h-4 w-4" />
                      <span>Payment IN</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Items - fourth after Payment IN */}
              {canAccess("items") && (
                <Collapsible open={expandedMenu === "items"} onOpenChange={() => handleMenuToggle("items")} className="group/collapsible">
                  <SidebarMenuItem>
                    <div className="flex items-center w-full">
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === "/items"}
                        className="flex-1"
                      >
                        <Link href="/items" data-testid="link-item-master">
                          <Package className="h-4 w-4" />
                          <span>Items</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {itemMasterSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === subItem.url}
                            >
                              <Link href={subItem.url} data-testid={`link-${subItem.title.toLowerCase().replace(" ", "-")}`}>
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Parties - fifth after Items */}
              {canAccess("parties") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/parties"}
                  >
                    <Link href="/parties" data-testid="link-party-master">
                      <Users className="h-4 w-4" />
                      <span>Parties</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Purchase */}
              {canAccess("purchases") && (
                <Collapsible open={expandedMenu === "purchases"} onOpenChange={() => handleMenuToggle("purchases")} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={location.startsWith("/purchases")}>
                        <ShoppingCart className="h-4 w-4" />
                        <span>Purchase</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {purchasesSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === subItem.url}
                            >
                              <Link href={subItem.url} data-testid={`link-${subItem.title.toLowerCase().replace(/\s+/g, "-")}`}>
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Payment OUT */}
              {canAccess("payments") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/payments/out"}
                  >
                    <Link href="/payments/out" data-testid="link-payment-out">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>Payment OUT</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Stock - quick access */}
              {canAccess("reports") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/stock-lookup"}
                  >
                    <Link href="/stock-lookup" data-testid="link-stock-lookup">
                      <Package className="h-4 w-4" />
                      <span>Stock</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* IMEI History - track device lifecycle */}
              {canAccess("reports") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/imei-history"}
                  >
                    <Link href="/imei-history" data-testid="link-imei-history">
                      <Smartphone className="h-4 w-4" />
                      <span>IMEI History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Send Price List via WhatsApp */}
              {canAccess("sales") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/send-price-list"}
                  >
                    <Link href="/send-price-list" data-testid="link-send-price-list">
                      <List className="h-4 w-4" />
                      <span>Send Price List</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Rest of menu items (excluding Dashboard which is handled above) */}
              {mainMenuItems.filter(item => item.title !== "Dashboard").map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {canAccess("reports") && (
                <Collapsible open={expandedMenu === "reports"} onOpenChange={() => handleMenuToggle("reports")} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={location.startsWith("/reports")}>
                        <FileBarChart className="h-4 w-4" />
                        <span>Reports</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {reportsSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === subItem.url}
                            >
                              <Link href={subItem.url} data-testid={`link-${subItem.title.toLowerCase().replace(" ", "-")}`}>
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {canAccess("settings") && (
                <Collapsible open={expandedMenu === "settings"} onOpenChange={() => handleMenuToggle("settings")} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={location.startsWith("/settings")}>
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {settingsSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === subItem.url}
                            >
                              <Link href={subItem.url} data-testid={`link-${subItem.title.toLowerCase().replace(" ", "-")}`}>
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName || user?.email || "User"}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role || "viewer"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sign out"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function BranchSelectorHeader() {
  const { currentBranchId, setCurrentBranchId, isLockedToBranch } = useBranch();
  return (
    <BranchSelector
      selectedBranchId={currentBranchId}
      onBranchChange={setCurrentBranchId}
      disabled={isLockedToBranch}
    />
  );
}

function AuthenticatedLayout() {
  const [location] = useLocation();
  
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Purchase Order Register";
      case "/sales":
        return "Sales Invoice Register";
      case "/payments":
        return "Payment Register";
      case "/payments/in":
        return "Payment IN (Receive)";
      case "/payments/out":
        return "Payment OUT (Pay)";
      case "/returns":
        return "Returns Register";
      case "/expenses":
        return "Expense Tracker";
      case "/accounts":
        return "Account Management";
      case "/items":
        return "Items";
      case "/items/bulk-edit":
        return "Items - Bulk Edit";
      case "/parties":
        return "Parties";
      case "/reports":
        return "Reports";
      case "/reports/party-statement":
        return "Party Statement";
      case "/reports/account-statement":
        return "Account Statement";
      case "/reports/item-report":
        return "Item Sales Report";
      case "/reports/customer-statement":
        return "Customer Statement";
      case "/reports/export-imei":
        return "Export IMEI";
      case "/all-transactions":
        return "All Transactions";
      case "/settings/users":
        return "User Management";
      case "/settings/user-roles":
        return "User Roles & Permissions";
      case "/settings/branches":
        return "Branch Management";
      case "/stock-transfers":
        return "Stock Transfers";
      case "/stock-transfers/new":
        return "New Stock Transfer";
      case "/stock-lookup":
        return "Stock";
      case "/settings/backup":
        return "Database Backup";
      default:
        return "";
    }
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="no-print flex items-center justify-between gap-4 p-3 border-b bg-background sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="text-lg font-semibold" data-testid="heading-page-title">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <BranchSelectorHeader />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={DashboardPage} />
                <Route path="/purchases" component={Home} />
                <Route path="/purchases/orders" component={PurchaseOrdersPage} />
                <Route path="/purchases/all" component={AllPurchasesPage} />
                <Route path="/purchases/landed-cost" component={LandedCostPage} />
                <Route path="/sales" component={SalesPage} />
                <Route path="/sales/all" component={AllSalesPage} />
                <Route path="/payments" component={PaymentsPage} />
                <Route path="/payments/in" component={PaymentInPage} />
                <Route path="/payments/out" component={PaymentOutPage} />
                <Route path="/returns" component={ReturnsPage} />
                <Route path="/expenses" component={ExpensesPage} />
                <Route path="/accounts" component={AccountsPage} />
                <Route path="/discount" component={DiscountPage} />
                <Route path="/items" component={ItemMaster} />
                <Route path="/items/bulk-edit" component={ItemBulkEdit} />
                <Route path="/parties" component={PartyMaster} />
                <Route path="/reports" component={ReportsPage} />
                <Route path="/reports/party-statement" component={PartyStatementPage} />
                <Route path="/reports/account-statement" component={AccountStatementPage} />
                <Route path="/reports/item-report" component={ItemReportPage} />
                <Route path="/reports/export-imei" component={ExportImeiPage} />
                <Route path="/reports/customer-statement" component={CustomerStatementPage} />
                <Route path="/all-transactions" component={AllTransactionsPage} />
                <Route path="/reports/customer-aging" component={CustomerAgingPage} />
                <Route path="/reports/invoice-printing" component={InvoicePrintingPage} />
                <Route path="/reports/salesman-analysis" component={SalesmanAnalysisPage} />
                <Route path="/send-price-list" component={SendPriceListPage} />
                <Route path="/settings/users" component={UserManagementPage} />
                <Route path="/settings/user-roles" component={UserRolesPage} />
                <Route path="/settings/branches" component={BranchesPage} />
                <Route path="/settings/opening-balances" component={OpeningBalancesPage} />
                <Route path="/settings/security" component={SecuritySettingsPage} />
                <Route path="/settings/partner-profit" component={PartnerProfitSettingsPage} />
                <Route path="/settings/backup" component={BackupPage} />
                <Route path="/stock-transfers/new" component={StockTransferNewPage} />
                <Route path="/stock-transfers" component={StockTransfersPage} />
                <Route path="/stock-lookup" component={StockLookupPage} />
                <Route path="/imei-history" component={ImeiHistoryPage} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Landing />
      </Suspense>
    );
  }

  return (
    <BranchProvider>
      <AuthenticatedLayout />
    </BranchProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/statement/:customerId" component={PublicStatementPage} />
            <Route path="/salesman-statement/:token" component={SalesmanStatementPage} />
            <Route path="/s/:token" component={StockListPage} />
            <Route path="/p/:token" component={PriceListPage} />
            <Route path="/verify/:code" component={VerifyPage} />
            <Route component={Router} />
          </Switch>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

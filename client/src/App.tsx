import { Switch, Route, useLocation, Link } from "wouter";
import { Suspense, lazy, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BranchProvider, useBranch } from "@/contexts/BranchContext";
import { BranchSelector } from "@/components/BranchSelector";
import { Loader2, LogOut, ShoppingCart, TrendingUp, Package, Users, CreditCard, FileBarChart, Receipt, Wallet, Edit3, ChevronDown, RotateCcw, FileText, Settings, Percent, LayoutDashboard, ArrowLeftRight, Building2 } from "lucide-react";
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
const BranchesPage = lazy(() => import("@/pages/branches"));
const Landing = lazy(() => import("@/pages/landing"));
const PublicStatementPage = lazy(() => import("@/pages/public-statement"));
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
  const { user } = useAuth();
  
  const { data: permissions, isLoading: permissionsLoading } = useQuery<MyPermissions>({
    queryKey: ["/api/my-permissions"],
  });

  const canAccess = (moduleName: string) => {
    if (permissionsLoading || !permissions) return false;
    return permissions.modules.includes(moduleName);
  };

  // Alt+S shortcut for new sales invoice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setLocation('/sales');
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
      title: "Payments",
      url: "/payments",
      icon: CreditCard,
      module: "payments",
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
  ].filter(item => canAccess(item.module));

  const purchasesSubItems = [
    { title: "All Purchases", url: "/purchases/all" },
  ];

  const salesSubItems = [
    { title: "All Sales", url: "/sales/all" },
  ];

  const itemMasterSubItems = [
    { title: "View Items", url: "/items" },
    { title: "Bulk Edit", url: "/items/bulk-edit" },
  ];

  const reportsSubItems = [
    { title: "General Reports", url: "/reports" },
    { title: "Party Statement", url: "/reports/party-statement" },
    { title: "Account Statement", url: "/reports/account-statement" },
    { title: "Customer Statement", url: "/reports/customer-statement" },
    { title: "Item Report", url: "/reports/item-report" },
    { title: "Export IMEI", url: "/reports/export-imei" },
  ];

  const settingsSubItems = [
    { title: "User Roles", url: "/settings/user-roles" },
    { title: "Branches", url: "/settings/branches" },
  ];

  const handleLogout = () => {
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

              {/* Purchase - second after Dashboard */}
              {canAccess("purchases") && (
                <Collapsible defaultOpen={location.startsWith("/purchases")} className="group/collapsible">
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
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/purchases"}
                          >
                            <Link href="/purchases" data-testid="link-new-purchase">
                              New
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {purchasesSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === subItem.url}
                            >
                              <Link href={subItem.url} data-testid={`link-${subItem.title.toLowerCase().replace(" ", "-")}`}>
                                All
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Sales - third after Purchase */}
              {canAccess("sales") && (
                <Collapsible defaultOpen={location.startsWith("/sales")} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={location.startsWith("/sales")}>
                        <TrendingUp className="h-4 w-4" />
                        <span>Sales</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/sales"}
                          >
                            <Link href="/sales" data-testid="link-new-sale">
                              New
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {salesSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === subItem.url}
                            >
                              <Link href={subItem.url} data-testid={`link-${subItem.title.toLowerCase().replace(" ", "-")}`}>
                                All
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
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

              {canAccess("items") && (
                <Collapsible defaultOpen={location.startsWith("/items")} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={location.startsWith("/items")}>
                        <Package className="h-4 w-4" />
                        <span>Item Master</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
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

              {canAccess("parties") && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/parties"}
                  >
                    <Link href="/parties" data-testid="link-party-master">
                      <Users className="h-4 w-4" />
                      <span>Party Master</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {canAccess("reports") && (
                <Collapsible defaultOpen={location.startsWith("/reports")} className="group/collapsible">
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
                <Collapsible defaultOpen={location.startsWith("/settings")} className="group/collapsible">
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
      case "/returns":
        return "Returns Register";
      case "/expenses":
        return "Expense Tracker";
      case "/accounts":
        return "Account Management";
      case "/items":
        return "Item Master";
      case "/items/bulk-edit":
        return "Item Master - Bulk Edit";
      case "/parties":
        return "Party Master";
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
      case "/settings/user-roles":
        return "User Roles & Permissions";
      case "/settings/branches":
        return "Branch Management";
      case "/stock-transfers":
        return "Stock Transfers";
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
              <Badge variant="secondary" className="text-xs font-normal">
                Database
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                PDF / JPG / PNG
              </Badge>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={DashboardPage} />
                <Route path="/purchases" component={Home} />
                <Route path="/purchases/all" component={AllPurchasesPage} />
                <Route path="/sales" component={SalesPage} />
                <Route path="/sales/all" component={AllSalesPage} />
                <Route path="/payments" component={PaymentsPage} />
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
                <Route path="/settings/user-roles" component={UserRolesPage} />
                <Route path="/settings/branches" component={BranchesPage} />
                <Route path="/stock-transfers" component={StockTransfersPage} />
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
            <Route component={Router} />
          </Switch>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

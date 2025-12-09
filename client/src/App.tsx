import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import Home from "@/pages/home";
import SalesPage from "@/pages/sales";
import PaymentsPage from "@/pages/payments";
import ReturnsPage from "@/pages/returns";
import ItemMaster from "@/pages/item-master";
import ItemBulkEdit from "@/pages/item-bulk-edit";
import PartyMaster from "@/pages/party-master";
import ReportsPage from "@/pages/reports";
import PartyStatementPage from "@/pages/party-statement";
import AccountStatementPage from "@/pages/account-statement";
import ItemReportPage from "@/pages/item-report";
import UserRolesPage from "@/pages/user-roles";
import ExpensesPage from "@/pages/expenses";
import AccountsPage from "@/pages/accounts";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";
import { Loader2, LogOut, ShoppingCart, TrendingUp, Package, Users, CreditCard, FileBarChart, Receipt, Wallet, Edit3, ChevronDown, RotateCcw, FileText, Settings } from "lucide-react";
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

function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const mainMenuItems = [
    {
      title: "Purchases",
      url: "/",
      icon: ShoppingCart,
    },
    {
      title: "Sales",
      url: "/sales",
      icon: TrendingUp,
    },
    {
      title: "Payments",
      url: "/payments",
      icon: CreditCard,
    },
    {
      title: "Returns",
      url: "/returns",
      icon: RotateCcw,
    },
    {
      title: "Expenses",
      url: "/expenses",
      icon: Receipt,
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: Wallet,
    },
  ];

  const itemMasterSubItems = [
    { title: "View Items", url: "/items" },
    { title: "Bulk Edit", url: "/items/bulk-edit" },
  ];

  const reportsSubItems = [
    { title: "General Reports", url: "/reports" },
    { title: "Party Statement", url: "/reports/party-statement" },
    { title: "Account Statement", url: "/reports/account-statement" },
    { title: "Item Report", url: "/reports/item-report" },
  ];

  const settingsSubItems = [
    { title: "User Roles", url: "/settings/user-roles" },
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
            <SidebarMenu>
              {mainMenuItems.map((item) => (
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
                              {subItem.title === "Bulk Edit" && <Edit3 className="h-3 w-3" />}
                              {subItem.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

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
                              {subItem.title === "Party Statement" && <FileText className="h-3 w-3" />}
                              {subItem.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

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
            </SidebarMenu>
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
      case "/settings/user-roles":
        return "User Roles & Permissions";
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
            <div className="flex items-center gap-2">
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
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/sales" component={SalesPage} />
              <Route path="/payments" component={PaymentsPage} />
              <Route path="/returns" component={ReturnsPage} />
              <Route path="/expenses" component={ExpensesPage} />
              <Route path="/accounts" component={AccountsPage} />
              <Route path="/items" component={ItemMaster} />
              <Route path="/items/bulk-edit" component={ItemBulkEdit} />
              <Route path="/parties" component={PartyMaster} />
              <Route path="/reports" component={ReportsPage} />
              <Route path="/reports/party-statement" component={PartyStatementPage} />
              <Route path="/reports/account-statement" component={AccountStatementPage} />
              <Route path="/reports/item-report" component={ItemReportPage} />
              <Route path="/settings/user-roles" component={UserRolesPage} />
              <Route component={NotFound} />
            </Switch>
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
    return <Landing />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

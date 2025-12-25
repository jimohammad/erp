/**
 * Database Storage Module
 * 
 * This module provides the data access layer for the Purchase Order Register application.
 * It implements the IStorage interface with PostgreSQL using Drizzle ORM.
 * 
 * Organization:
 * - User Management (lines ~300-370)
 * - Suppliers & Items (lines ~370-460)
 * - Purchase Orders (lines ~460-550)
 * - Customers (lines ~550-660)
 * - Sales Orders (lines ~660-750)
 * - Payments (lines ~750-800)
 * - Stock & Reports (lines ~800-1100)
 * - Accounts & Transfers (lines ~1100-1230)
 * - Expenses (lines ~1230-1290)
 * - Returns (lines ~1290-1350)
 * - Role Permissions (lines ~1350-1420)
 * - Discounts (lines ~1420-1680)
 * - Dashboard & Stats (lines ~1680-2020)
 * - Branches (lines ~2020-2160)
 * - Stock Transfers (lines ~2160-2260)
 * - Inventory Adjustments (lines ~2260-2320)
 * - Opening Balances (lines ~2320-2410)
 * - Purchase Order Drafts (lines ~2410-2480)
 * - Settings (lines ~2480-2510)
 * - IMEI Management (lines ~2510-2800)
 * - Stock Aging (lines ~2800-2970)
 * - Backup Helpers (lines ~2970-3000)
 * - All Transactions Report (lines ~3000-3320)
 */

import bcrypt from "bcryptjs";
import { 
  suppliers, 
  items, 
  purchaseOrders, 
  purchaseOrderLineItems,
  customers,
  salesOrders,
  salesOrderLineItems,
  payments,
  paymentSplits,
  users,
  accounts,
  accountTransfers,
  expenseCategories,
  expenses,
  returns,
  returnLineItems,
  rolePermissions,
  userRoleAssignments,
  discounts,
  branches,
  stockTransfers,
  stockTransferLineItems,
  ACCOUNT_NAMES,
  ROLE_TYPES,
  MODULE_NAMES,
  type Supplier, 
  type InsertSupplier,
  type Item,
  type InsertItem,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type LineItem,
  type InsertLineItem,
  type PurchaseOrderWithDetails,
  type Customer,
  type InsertCustomer,
  type SalesOrder,
  type InsertSalesOrder,
  type SalesLineItem,
  type InsertSalesLineItem,
  type SalesOrderWithDetails,
  type Payment,
  type InsertPayment,
  type PaymentWithDetails,
  type PaymentSplit,
  type InsertPaymentSplit,
  type User,
  type UpsertUser,
  type Account,
  type InsertAccount,
  type AccountTransfer,
  type InsertAccountTransfer,
  type AccountTransferWithDetails,
  type ExpenseCategory,
  type InsertExpenseCategory,
  type Expense,
  type InsertExpense,
  type ExpenseWithDetails,
  type Return,
  type InsertReturn,
  type ReturnLineItem,
  type InsertReturnLineItem,
  type ReturnWithDetails,
  type RolePermission,
  type InsertRolePermission,
  type UserRoleAssignment,
  type InsertUserRoleAssignment,
  type UserRoleAssignmentWithBranch,
  type Discount,
  type InsertDiscount,
  type DiscountWithDetails,
  type Branch,
  type InsertBranch,
  type StockTransfer,
  type InsertStockTransfer,
  type StockTransferLineItem,
  type InsertStockTransferLineItem,
  type StockTransferWithDetails,
  inventoryAdjustments,
  openingBalances,
  purchaseOrderDrafts,
  purchaseOrderDraftItems,
  type InventoryAdjustment,
  type InsertInventoryAdjustment,
  type InventoryAdjustmentWithDetails,
  type OpeningBalance,
  type InsertOpeningBalance,
  type OpeningBalanceWithDetails,
  type PurchaseOrderDraft,
  type InsertPurchaseOrderDraft,
  type PODraftItem,
  type InsertPODraftItem,
  type PurchaseOrderDraftWithDetails,
  appSettings,
  type AppSetting,
  imeiInventory,
  imeiEvents,
  type ImeiInventory,
  type InsertImeiInventory,
  type ImeiEvent,
  type InsertImeiEvent,
  type ImeiInventoryWithDetails,
  type ImeiEventWithDetails,
  type AllTransaction,
  documentVerifications,
  type DocumentVerification,
  type InsertDocumentVerification,
  auditTrail,
  type AuditTrail,
  type InsertAuditTrail,
  type AuditTrailWithDetails,
  landedCostVouchers,
  landedCostLineItems,
  landedCostVoucherPurchaseOrders,
  type LandedCostVoucher,
  type InsertLandedCostVoucher,
  type LandedCostLineItem,
  type InsertLandedCostLineItem,
  type LandedCostVoucherWithDetails,
  partySettlements,
  type PartySettlement,
  type InsertPartySettlement,
  type PartySettlementWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, or, isNull, isNotNull, asc, inArray, ne } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPrinterType(id: string, printerType: string): Promise<User | undefined>;
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: InsertSupplier): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<{ deleted: boolean; error?: string }>;

  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: InsertItem): Promise<Item | undefined>;
  deleteItem(id: number): Promise<boolean>;
  getItemLastPricing(itemName: string): Promise<{ priceKwd: string | null; fxCurrency: string | null } | null>;
  bulkUpdateItems(updates: { id: number; item: Partial<InsertItem> }[]): Promise<Item[]>;

  getPurchaseOrders(options?: { limit?: number; offset?: number }): Promise<{ data: PurchaseOrderWithDetails[]; total: number }>;
  getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder, lineItems: Omit<InsertLineItem, 'purchaseOrderId'>[]): Promise<PurchaseOrderWithDetails>;
  updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>, lineItems?: Omit<InsertLineItem, 'purchaseOrderId'>[]): Promise<PurchaseOrderWithDetails | undefined>;
  deletePurchaseOrder(id: number): Promise<boolean>;

  getMonthlyStats(year?: number): Promise<{ month: number; totalKwd: number; totalFx: number }[]>;

  // Sales Module
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: InsertCustomer): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<{ deleted: boolean; error?: string }>;
  syncPartyToCustomer(partyId: number): Promise<Customer | undefined>;
  markCustomerStockChecked(id: number): Promise<Customer | undefined>;
  getCustomersDueForStockCheck(): Promise<Customer[]>;

  getSalesOrders(options?: { limit?: number; offset?: number }): Promise<{ data: SalesOrderWithDetails[]; total: number }>;
  getSalesOrder(id: number): Promise<SalesOrderWithDetails | undefined>;
  createSalesOrder(so: InsertSalesOrder, lineItems: Omit<InsertSalesLineItem, 'salesOrderId'>[]): Promise<SalesOrderWithDetails>;
  updateSalesOrder(id: number, so: Partial<InsertSalesOrder>, lineItems?: Omit<InsertSalesLineItem, 'salesOrderId'>[]): Promise<SalesOrderWithDetails | undefined>;
  deleteSalesOrder(id: number): Promise<boolean>;

  getSalesMonthlyStats(year?: number): Promise<{ month: number; totalKwd: number; totalFx: number }[]>;

  // Payment Module
  getPayments(options?: { limit?: number; offset?: number; direction?: string }): Promise<{ data: PaymentWithDetails[]; total: number }>;
  getPayment(id: number): Promise<PaymentWithDetails | undefined>;
  createPayment(payment: InsertPayment, splits?: Omit<InsertPaymentSplit, 'paymentId'>[]): Promise<PaymentWithDetails>;
  deletePayment(id: number): Promise<boolean>;
  getPaymentSplits(paymentId: number): Promise<PaymentSplit[]>;

  // Reports
  getStockBalance(): Promise<{ itemName: string; purchased: number; sold: number; openingStock: number; balance: number }[]>;
  getLowStockItems(): Promise<{ itemName: string; currentStock: number; minStockLevel: number }[]>;
  getCustomerAging(): Promise<{ customerId: number; customerName: string; current: number; days30: number; days60: number; days90Plus: number; totalBalance: number }[]>;
  getDailyCashFlow(startDate?: string, endDate?: string): Promise<{ date: string; inAmount: number; outAmount: number; net: number; runningBalance: number }[]>;
  getCustomerReport(): Promise<{ customerId: number; customerName: string; totalSales: number; totalPayments: number; balance: number }[]>;
  getPartyStatement(partyId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]>;
  getItemSales(itemId: number, customerId?: number, startDate?: string, endDate?: string): Promise<{ date: string; invoiceNumber: string; customerName: string; quantity: number; unitPrice: number; totalAmount: number }[]>;
  getCustomerStatementEntries(customerId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]>;

  // Accounts Module
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(name: string): Promise<Account>;
  updateAccount(id: number, name: string): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<{ deleted: boolean; error?: string }>;
  addAccountOpeningBalance(accountId: number, amount: string, date: string, notes?: string): Promise<{ success: boolean; balance: string }>;
  addAccountAdjustment(accountId: number, amount: string, direction: "IN" | "OUT", date: string, reason: string): Promise<{ success: boolean; balance: string }>;
  ensureDefaultAccounts(): Promise<void>;
  getAccountTransactions(accountId: number, startDate?: string, endDate?: string): Promise<{ date: string; description: string; type: string; amount: number; balance: number }[]>;
  createAccountTransfer(transfer: InsertAccountTransfer): Promise<AccountTransferWithDetails>;
  getAccountTransfers(): Promise<AccountTransferWithDetails[]>;

  // Expense Module
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: number, category: InsertExpenseCategory): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: number): Promise<{ deleted: boolean; error?: string }>;
  getExpenses(): Promise<ExpenseWithDetails[]>;
  getExpense(id: number): Promise<ExpenseWithDetails | undefined>;
  createExpense(expense: InsertExpense): Promise<ExpenseWithDetails>;
  deleteExpense(id: number): Promise<boolean>;

  // Returns Module
  getReturns(): Promise<ReturnWithDetails[]>;
  getReturn(id: number): Promise<ReturnWithDetails | undefined>;
  createReturn(returnData: InsertReturn, lineItems: Omit<InsertReturnLineItem, 'returnId'>[]): Promise<ReturnWithDetails>;
  deleteReturn(id: number): Promise<boolean>;

  // Role Permissions
  getRolePermissions(): Promise<RolePermission[]>;
  updateRolePermission(role: string, moduleName: string, canAccess: number): Promise<void>;
  ensureDefaultRolePermissions(): Promise<void>;
  getModulesForRole(role: string): Promise<string[]>;

  // User Role Assignments  
  getUserRoleAssignments(): Promise<UserRoleAssignment[]>;
  createUserRoleAssignment(assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment>;
  updateUserRoleAssignment(id: number, assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment | undefined>;
  deleteUserRoleAssignment(id: number): Promise<boolean>;
  getRoleForEmail(email: string): Promise<string>;

  // Discount Module
  getDiscounts(): Promise<DiscountWithDetails[]>;
  getDiscount(id: number): Promise<DiscountWithDetails | undefined>;
  createDiscount(discount: InsertDiscount): Promise<DiscountWithDetails>;
  deleteDiscount(id: number): Promise<boolean>;
  getInvoicesForCustomer(customerId: number): Promise<{ id: number; invoiceNumber: string; totalKwd: string; outstandingBalance: string }[]>;
  getInvoiceOutstandingBalance(salesOrderId: number): Promise<{ invoiceTotal: number; paidAmount: number; discountAmount: number; returnAmount: number; outstandingBalance: number }>;

  // Export IMEI
  getExportImei(filters: { customerId?: number; itemName?: string; invoiceNumber?: string; dateFrom?: string; dateTo?: string }): Promise<{ imei: string; itemName: string; customerName: string; invoiceNumber: string; saleDate: string }[]>;

  // Dashboard
  getDashboardStats(): Promise<{ stockAmount: number; totalCredit: number; totalDebit: number; cashBalance: number; bankAccountsBalance: number; monthlySales: number; lastMonthSales: number; monthlyPurchases: number; salesTrend: number[]; purchasesTrend: number[]; totalExpenses: number }>;
  globalSearch(query: string): Promise<{ type: string; id: number; title: string; subtitle: string; url: string }[]>;
  
  // Profit and Loss
  getProfitAndLoss(startDate: string, endDate: string, branchId?: number): Promise<{
    netSales: number;
    saleReturns: number;
    grossSales: number;
    costOfGoodsSold: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expensesByCategory: { category: string; amount: number }[];
  }>;

  // Branches
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch | undefined>;
  deleteBranch(id: number): Promise<{ deleted: boolean; error?: string }>;
  getDefaultBranch(): Promise<Branch | undefined>;

  // Stock Transfers
  getStockTransfers(): Promise<StockTransferWithDetails[]>;
  getStockTransfer(id: number): Promise<StockTransferWithDetails | undefined>;
  createStockTransfer(transfer: InsertStockTransfer, lineItems: Omit<InsertStockTransferLineItem, 'stockTransferId'>[]): Promise<StockTransferWithDetails>;
  deleteStockTransfer(id: number): Promise<boolean>;

  // Opening Balances Module
  getInventoryAdjustments(branchId?: number): Promise<InventoryAdjustmentWithDetails[]>;
  getInventoryAdjustment(id: number): Promise<InventoryAdjustmentWithDetails | undefined>;
  createInventoryAdjustment(adjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment>;
  updateInventoryAdjustment(id: number, adjustment: Partial<InsertInventoryAdjustment>): Promise<InventoryAdjustment | undefined>;
  deleteInventoryAdjustment(id: number): Promise<boolean>;

  getOpeningBalances(branchId?: number): Promise<OpeningBalanceWithDetails[]>;
  getOpeningBalance(id: number): Promise<OpeningBalance | undefined>;
  createOpeningBalance(balance: InsertOpeningBalance): Promise<OpeningBalance>;
  updateOpeningBalance(id: number, balance: Partial<InsertOpeningBalance>): Promise<OpeningBalance | undefined>;
  deleteOpeningBalance(id: number): Promise<boolean>;

  // Purchase Order Drafts (PO workflow)
  getPurchaseOrderDrafts(options?: { status?: string; branchId?: number }): Promise<PurchaseOrderDraftWithDetails[]>;
  getPurchaseOrderDraft(id: number): Promise<PurchaseOrderDraftWithDetails | undefined>;
  createPurchaseOrderDraft(pod: InsertPurchaseOrderDraft, lineItems: Omit<InsertPODraftItem, 'purchaseOrderDraftId'>[]): Promise<PurchaseOrderDraftWithDetails>;
  updatePurchaseOrderDraft(id: number, pod: Partial<InsertPurchaseOrderDraft>, lineItems?: Omit<InsertPODraftItem, 'purchaseOrderDraftId'>[]): Promise<PurchaseOrderDraftWithDetails | undefined>;
  updatePurchaseOrderDraftStatus(id: number, status: string): Promise<PurchaseOrderDraft | undefined>;
  deletePurchaseOrderDraft(id: number): Promise<boolean>;
  convertPurchaseOrderDraftToBill(id: number, additionalData: { invoiceNumber?: string; grnDate?: string }): Promise<PurchaseOrderWithDetails>;
  getNextPONumber(): Promise<string>;

  // App Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  verifyTransactionPassword(password: string): Promise<boolean>;

  // IMEI Tracking
  searchImei(query: string): Promise<ImeiInventoryWithDetails[]>;
  getImeiByNumber(imei: string): Promise<ImeiInventoryWithDetails | undefined>;
  getImeiHistory(imeiId: number): Promise<ImeiEventWithDetails[]>;
  createImeiRecord(data: InsertImeiInventory): Promise<ImeiInventory>;
  updateImeiRecord(id: number, data: Partial<InsertImeiInventory>): Promise<ImeiInventory | undefined>;
  addImeiEvent(event: InsertImeiEvent): Promise<ImeiEvent>;
  processImeiFromPurchase(imeiNumbers: string[], itemName: string, purchaseOrderId: number, supplierId: number | null, purchaseDate: string, priceKwd: string | null, branchId: number | null, createdBy: string | null): Promise<void>;
  processImeiFromSale(imeiNumbers: string[], itemName: string, salesOrderId: number, customerId: number | null, saleDate: string, priceKwd: string | null, branchId: number | null, createdBy: string | null): Promise<void>;
  processImeiFromReturn(imeiNumbers: string[], returnType: string, returnId: number, customerId: number | null, supplierId: number | null, branchId: number | null, createdBy: string | null): Promise<void>;

  // Backup helpers (full data, no pagination)
  getAllPurchaseLineItems(): Promise<LineItem[]>;
  getAllSalesLineItems(): Promise<SalesLineItem[]>;
  getAllReturnLineItems(): Promise<ReturnLineItem[]>;
  getAllUsers(): Promise<User[]>;
  createUser(data: { username: string; password: string; firstName?: string | null; lastName?: string | null; email?: string | null; role: string }): Promise<User>;
  updateUser(id: string, data: Partial<{ firstName: string | null; lastName: string | null; email: string | null; role: string; password: string }>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getAllSalesOrders(): Promise<SalesOrder[]>;
  getAllPayments(): Promise<Payment[]>;

  // All Transactions - consolidated view
  getAllTransactions(options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    modules?: string[];
    branchId?: number;
    partyId?: number;
    search?: string;
  }): Promise<{ data: AllTransaction[]; total: number }>;

  // Salesman statement access
  getSalesmanByToken(token: string): Promise<Supplier | undefined>;
  
  // Stock list with prices (for public URL)
  getStockListWithPrices(): Promise<{ itemCode: string | null; itemName: string; category: string | null; currentStock: number; sellingPriceKwd: string | null; minStockLevel: number }[]>;
  
  // Price list with stock for low stock indicator (for salesman)
  getPriceListOnly(): Promise<{ itemCode: string | null; itemName: string; category: string | null; sellingPriceKwd: string | null; currentStock: number }[]>;

  // Landed Cost Vouchers (supports multiple purchase orders per voucher)
  getLandedCostVouchers(options?: { branchId?: number }): Promise<LandedCostVoucherWithDetails[]>;
  getLandedCostVoucher(id: number): Promise<LandedCostVoucherWithDetails | undefined>;
  getLandedCostVoucherByPO(purchaseOrderId: number): Promise<LandedCostVoucherWithDetails | undefined>;
  createLandedCostVoucher(voucher: InsertLandedCostVoucher, lineItems: Omit<InsertLandedCostLineItem, 'voucherId'>[], purchaseOrderIds?: number[]): Promise<LandedCostVoucherWithDetails>;
  updateLandedCostVoucher(id: number, voucher: Partial<InsertLandedCostVoucher>, lineItems?: Omit<InsertLandedCostLineItem, 'voucherId'>[], purchaseOrderIds?: number[]): Promise<LandedCostVoucherWithDetails | undefined>;
  deleteLandedCostVoucher(id: number): Promise<boolean>;
  getNextLandedCostVoucherNumber(): Promise<string>;
  getPendingLandedCostPayables(): Promise<LandedCostVoucherWithDetails[]>;
  markLandedCostVoucherPaid(voucherId: number, paymentId: number): Promise<LandedCostVoucherWithDetails | undefined>;
  getPendingPartnerProfitPayables(): Promise<LandedCostVoucherWithDetails[]>;
  markPartnerProfitPaid(voucherId: number, paymentId: number): Promise<LandedCostVoucherWithDetails | undefined>;
  markPackingPaid(voucherId: number, paymentId: number): Promise<LandedCostVoucherWithDetails | undefined>;

  // Party Settlements - Monthly settlement for Partner and Packing Co. payments
  getPartySettlements(options?: { partyType?: string; status?: string }): Promise<PartySettlementWithDetails[]>;
  getPartySettlement(id: number): Promise<PartySettlementWithDetails | undefined>;
  getPendingSettlementsByParty(partyType: string): Promise<{ partyId: number; partyName: string; voucherCount: number; totalAmountKwd: number; vouchers: LandedCostVoucherWithDetails[] }[]>;
  createPartySettlement(settlement: InsertPartySettlement): Promise<PartySettlementWithDetails>;
  finalizePartySettlement(id: number, paymentId: number, expenseId: number): Promise<PartySettlementWithDetails | undefined>;
  getNextSettlementNumber(): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check by ID
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          role: existingUser.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    }
    
    // Also check by email to avoid unique constraint violation
    if (userData.email) {
      const [existingByEmail] = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail) {
        // Update the existing user's ID to match the new OIDC ID
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            id: userData.id,
            role: existingByEmail.role,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }
    
    const [adminCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, "admin"));
    const needsAdmin = adminCount.count === 0;
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        role: needsAdmin ? "admin" : "viewer",
      })
      .returning();
    return user;
  }

  async updateUserPrinterType(id: string, printerType: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ printerType, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  // ============================================================
  // SUPPLIERS
  // ============================================================

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async getSalesmanByToken(token: string): Promise<Supplier | undefined> {
    const [salesman] = await db.select().from(suppliers).where(
      and(
        eq(suppliers.statementToken, token),
        eq(suppliers.partyType, 'salesman')
      )
    );
    return salesman || undefined;
  }

  async getStockListWithPrices(): Promise<{ itemCode: string | null; itemName: string; category: string | null; currentStock: number; sellingPriceKwd: string | null; minStockLevel: number }[]> {
    // Get stock balances and join with items for prices
    const result = await db.execute(sql`
      WITH purchased AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM purchase_order_line_items
        GROUP BY item_name
      ),
      sold AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM sales_order_line_items
        GROUP BY item_name
      ),
      opening_stock AS (
        SELECT i.name as item_name, COALESCE(SUM(ia.quantity), 0) as qty
        FROM inventory_adjustments ia
        JOIN items i ON ia.item_id = i.id
        GROUP BY i.name
      ),
      sale_returns AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'sale_return'
        GROUP BY rl.item_name
      ),
      purchase_returns AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'purchase_return'
        GROUP BY rl.item_name
      )
      SELECT 
        i.code as "itemCode",
        i.name as "itemName",
        i.category as "category",
        (COALESCE(o.qty, 0) + COALESCE(p.qty, 0) + COALESCE(sr.qty, 0) - COALESCE(s.qty, 0) - COALESCE(pr.qty, 0))::integer as "currentStock",
        i.selling_price_kwd as "sellingPriceKwd",
        COALESCE(i.min_stock_level, 0)::integer as "minStockLevel"
      FROM items i
      LEFT JOIN purchased p ON i.name = p.item_name
      LEFT JOIN sold s ON i.name = s.item_name
      LEFT JOIN opening_stock o ON i.name = o.item_name
      LEFT JOIN sale_returns sr ON i.name = sr.item_name
      LEFT JOIN purchase_returns pr ON i.name = pr.item_name
      ORDER BY i.category, i.name
    `);
    
    return (result.rows as any[]).map(row => ({
      itemCode: row.itemCode,
      itemName: row.itemName,
      category: row.category,
      currentStock: row.currentStock || 0,
      sellingPriceKwd: row.sellingPriceKwd,
      minStockLevel: row.minStockLevel || 0,
    }));
  }

  async getPriceListOnly(): Promise<{ itemCode: string | null; itemName: string; category: string | null; sellingPriceKwd: string | null; currentStock: number }[]> {
    // Use raw SQL to calculate current stock for low stock indicator
    const result = await db.execute(sql`
      WITH purchased AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM purchase_order_line_items
        GROUP BY item_name
      ),
      sold AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM sales_order_line_items
        GROUP BY item_name
      ),
      opening_stock AS (
        SELECT i.name as item_name, COALESCE(SUM(ia.quantity), 0) as qty
        FROM inventory_adjustments ia
        JOIN items i ON ia.item_id = i.id
        GROUP BY i.name
      ),
      sale_returns AS (
        SELECT rl.item_name, SUM(rl.quantity) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'sale_return'
        GROUP BY rl.item_name
      ),
      purchase_returns AS (
        SELECT rl.item_name, SUM(rl.quantity) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'purchase_return'
        GROUP BY rl.item_name
      )
      SELECT 
        i.code as "itemCode",
        i.name as "itemName",
        i.category as "category",
        i.selling_price_kwd as "sellingPriceKwd",
        (COALESCE(o.qty, 0) + COALESCE(p.qty, 0) + COALESCE(sr.qty, 0) - COALESCE(s.qty, 0) - COALESCE(pr.qty, 0))::integer as "currentStock"
      FROM items i
      LEFT JOIN purchased p ON i.name = p.item_name
      LEFT JOIN sold s ON i.name = s.item_name
      LEFT JOIN opening_stock o ON i.name = o.item_name
      LEFT JOIN sale_returns sr ON i.name = sr.item_name
      LEFT JOIN purchase_returns pr ON i.name = pr.item_name
      ORDER BY i.category, i.name
    `);
    
    return (result.rows as any[]).map(row => ({
      itemCode: row.itemCode,
      itemName: row.itemName,
      category: row.category,
      sellingPriceKwd: row.sellingPriceKwd,
      currentStock: row.currentStock || 0,
    }));
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: InsertSupplier): Promise<Supplier | undefined> {
    const [updated] = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return updated || undefined;
  }

  async deleteSupplier(id: number): Promise<{ deleted: boolean; error?: string }> {
    const linkedOrders = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.supplierId, id));
    
    if (linkedOrders[0].count > 0) {
      return { 
        deleted: false, 
        error: `Cannot delete supplier: ${linkedOrders[0].count} purchase order(s) are linked to this supplier` 
      };
    }
    
    const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning();
    return { deleted: result.length > 0 };
  }

  // ============================================================
  // ITEMS / PRODUCTS
  // ============================================================

  async getItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(items.name);
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(item: InsertItem): Promise<Item> {
    // Check for duplicate item code (case-insensitive)
    if (item.code && item.code.trim() !== '') {
      const existingItem = await db.select()
        .from(items)
        .where(sql`LOWER(${items.code}) = LOWER(${item.code.trim()})`)
        .limit(1);
      if (existingItem.length > 0) {
        throw new Error(`Item code "${item.code}" already exists. Please use a unique item code.`);
      }
    }
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItem(id: number, item: InsertItem): Promise<Item | undefined> {
    // Check for duplicate item code (case-insensitive), excluding current item
    if (item.code && item.code.trim() !== '') {
      const existingItem = await db.select()
        .from(items)
        .where(and(
          sql`LOWER(${items.code}) = LOWER(${item.code.trim()})`,
          ne(items.id, id)
        ))
        .limit(1);
      if (existingItem.length > 0) {
        throw new Error(`Item code "${item.code}" already exists. Please use a unique item code.`);
      }
    }
    const [updated] = await db.update(items).set(item).where(eq(items.id, id)).returning();
    return updated || undefined;
  }

  async deleteItem(id: number): Promise<boolean> {
    const result = await db.delete(items).where(eq(items.id, id)).returning();
    return result.length > 0;
  }

  async getItemLastPricing(itemName: string): Promise<{ priceKwd: string | null; fxCurrency: string | null } | null> {
    const result = await db
      .select({
        priceKwd: purchaseOrderLineItems.priceKwd,
        fxCurrency: purchaseOrders.fxCurrency,
      })
      .from(purchaseOrderLineItems)
      .innerJoin(purchaseOrders, eq(purchaseOrderLineItems.purchaseOrderId, purchaseOrders.id))
      .where(eq(purchaseOrderLineItems.itemName, itemName))
      .orderBy(desc(purchaseOrders.purchaseDate), desc(purchaseOrders.id))
      .limit(1);
    
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }

  async bulkUpdateItems(updates: { id: number; item: Partial<InsertItem> }[]): Promise<Item[]> {
    const updatedItems: Item[] = [];
    for (const update of updates) {
      const [updated] = await db.update(items).set(update.item).where(eq(items.id, update.id)).returning();
      if (updated) {
        updatedItems.push(updated);
      }
    }
    return updatedItems;
  }

  // ============================================================
  // PURCHASE ORDERS
  // ============================================================

  async getPurchaseOrders(options?: { limit?: number; offset?: number }): Promise<{ data: PurchaseOrderWithDetails[]; total: number }> {
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrders);
    const total = countResult.count;
    
    const pos = await db.query.purchaseOrders.findMany({
      with: {
        supplier: true,
        lineItems: true,
      },
      orderBy: [desc(purchaseOrders.purchaseDate), desc(purchaseOrders.id)],
      limit: options?.limit,
      offset: options?.offset,
    });
    return { data: pos, total };
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails | undefined> {
    const po = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, id),
      with: {
        supplier: true,
        lineItems: true,
      },
    });
    return po || undefined;
  }

  async createPurchaseOrder(
    po: InsertPurchaseOrder, 
    lineItems: Omit<InsertLineItem, 'purchaseOrderId'>[]
  ): Promise<PurchaseOrderWithDetails> {
    const [newPo] = await db.insert(purchaseOrders).values(po).returning();
    
    if (lineItems.length > 0) {
      await db.insert(purchaseOrderLineItems).values(
        lineItems.map(item => ({
          ...item,
          purchaseOrderId: newPo.id,
        }))
      );
    }

    return this.getPurchaseOrder(newPo.id) as Promise<PurchaseOrderWithDetails>;
  }

  async updatePurchaseOrder(
    id: number, 
    po: Partial<InsertPurchaseOrder>, 
    lineItems?: Omit<InsertLineItem, 'purchaseOrderId'>[]
  ): Promise<PurchaseOrderWithDetails | undefined> {
    const [updated] = await db.update(purchaseOrders).set(po).where(eq(purchaseOrders.id, id)).returning();
    
    if (!updated) return undefined;

    if (lineItems !== undefined) {
      await db.delete(purchaseOrderLineItems).where(eq(purchaseOrderLineItems.purchaseOrderId, id));
      
      if (lineItems.length > 0) {
        await db.insert(purchaseOrderLineItems).values(
          lineItems.map(item => ({
            ...item,
            purchaseOrderId: id,
          }))
        );
      }
    }

    return this.getPurchaseOrder(id);
  }

  async deletePurchaseOrder(id: number): Promise<boolean> {
    const result = await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id)).returning();
    return result.length > 0;
  }

  async getMonthlyStats(year?: number): Promise<{ month: number; totalKwd: number; totalFx: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        EXTRACT(MONTH FROM purchase_date)::integer as month,
        COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as "totalKwd",
        COALESCE(SUM(CAST(total_fx AS DECIMAL)), 0)::float as "totalFx"
      FROM purchase_orders
      ${year ? sql`WHERE EXTRACT(YEAR FROM purchase_date) = ${year}` : sql``}
      GROUP BY EXTRACT(MONTH FROM purchase_date)
      ORDER BY month
    `);
    return result.rows as { month: number; totalKwd: number; totalFx: number }[];
  }

  // ============================================================
  // CUSTOMERS & SALES ORDERS
  // ============================================================

  async getCustomers(): Promise<Customer[]> {
    // Get customers from both sources:
    // 1. Original customers table
    // 2. Parties with partyType='customer' or 'salesman' from suppliers table
    
    const existingCustomers = await db.select().from(customers).orderBy(customers.name);
    
    const customerParties = await db.select().from(suppliers)
      .where(or(eq(suppliers.partyType, 'customer'), eq(suppliers.partyType, 'salesman')))
      .orderBy(suppliers.name);
    
    const mappedParties = customerParties.map(party => ({
      id: party.id + 100000, // Offset ID to avoid conflicts
      name: party.name,
      phone: party.phone,
      email: null,
      creditLimit: party.creditLimit,
      branchId: null,
    })) as Customer[];
    
    // Combine both lists and sort by name
    return [...existingCustomers, ...mappedParties].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    // Check if ID is from suppliers table (offset by 100000)
    if (id >= 100000) {
      const actualId = id - 100000;
      const [party] = await db.select().from(suppliers)
        .where(and(eq(suppliers.id, actualId), or(eq(suppliers.partyType, 'customer'), eq(suppliers.partyType, 'salesman'))));
      
      if (!party) return undefined;
      
      return {
        id: party.id + 100000,
        name: party.name,
        phone: party.phone,
        email: null,
        creditLimit: party.creditLimit,
        branchId: null,
      } as Customer;
    }
    
    // Otherwise fetch from customers table
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: InsertCustomer): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated || undefined;
  }

  async syncPartyToCustomer(partyId: number): Promise<Customer | undefined> {
    // Get party from suppliers table
    const [party] = await db.select().from(suppliers)
      .where(and(eq(suppliers.id, partyId), eq(suppliers.partyType, 'customer')));
    
    if (!party) return undefined;
    
    // Check if customer with same name already exists
    const [existingCustomer] = await db.select().from(customers)
      .where(eq(customers.name, party.name));
    
    if (existingCustomer) {
      return existingCustomer;
    }
    
    // Create new customer from party data
    const [newCustomer] = await db.insert(customers).values({
      name: party.name,
      phone: party.phone,
      creditLimit: party.creditLimit,
    }).returning();
    
    return newCustomer;
  }

  async markCustomerStockChecked(id: number): Promise<Customer | undefined> {
    const today = new Date().toISOString().split('T')[0];
    // Update in suppliers table (for customers)
    const [updated] = await db.update(suppliers)
      .set({ lastStockCheckDate: today })
      .where(and(eq(suppliers.id, id), eq(suppliers.partyType, 'customer')))
      .returning();
    
    if (!updated) return undefined;
    
    // Return as Customer type format
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: null,
      creditLimit: updated.creditLimit,
      branchId: null,
      lastStockCheckDate: updated.lastStockCheckDate,
    } as Customer;
  }

  async markSalesmanSettled(id: number): Promise<{ id: number; name: string; lastSettlementDate: string } | undefined> {
    const today = new Date().toISOString().split('T')[0];
    // Update in suppliers table - only for salesmen
    const [updated] = await db.update(suppliers)
      .set({ lastStockCheckDate: today })
      .where(and(eq(suppliers.id, id), eq(suppliers.partyType, 'salesman')))
      .returning();
    
    if (!updated) return undefined;
    
    return {
      id: updated.id,
      name: updated.name,
      lastSettlementDate: updated.lastStockCheckDate || today,
    };
  }

  async getCustomersDueForStockCheck(): Promise<Customer[]> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
    
    // Get from suppliers table where partyType='salesman' (field sales reps who need stock checks)
    const results = await db.select().from(suppliers)
      .where(
        and(
          eq(suppliers.partyType, 'salesman'),
          or(
            isNull(suppliers.lastStockCheckDate),
            sql`${suppliers.lastStockCheckDate} <= ${threeMonthsAgoStr}`
          )
        )
      )
      .orderBy(asc(suppliers.lastStockCheckDate));
    
    // Map to Customer type format
    return results.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: null,
      creditLimit: s.creditLimit,
      branchId: null,
      lastStockCheckDate: s.lastStockCheckDate,
    })) as Customer[];
  }

  async getSalesmenSettlementStatus(): Promise<{
    id: number;
    name: string;
    phone: string | null;
    lastSettlementDate: string | null;
    daysRemaining: number;
    status: 'overdue' | 'due_soon' | 'ok';
  }[]> {
    // Get ALL salesmen for settlement tracking
    const results = await db.select().from(suppliers)
      .where(eq(suppliers.partyType, 'salesman'))
      .orderBy(asc(suppliers.lastStockCheckDate));
    
    const today = new Date();
    const SETTLEMENT_PERIOD_DAYS = 90; // 3 months
    
    return results.map(s => {
      let daysRemaining = SETTLEMENT_PERIOD_DAYS;
      let status: 'overdue' | 'due_soon' | 'ok' = 'ok';
      
      if (s.lastStockCheckDate) {
        const lastDate = new Date(s.lastStockCheckDate);
        const nextDueDate = new Date(lastDate);
        nextDueDate.setDate(nextDueDate.getDate() + SETTLEMENT_PERIOD_DAYS);
        
        const diffTime = nextDueDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysRemaining < 0) {
          status = 'overdue';
        } else if (daysRemaining <= 14) {
          status = 'due_soon';
        } else {
          status = 'ok';
        }
      } else {
        // Never settled - treat as overdue
        daysRemaining = -999;
        status = 'overdue';
      }
      
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        lastSettlementDate: s.lastStockCheckDate,
        daysRemaining,
        status,
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining); // Most urgent first
  }

  async getSalesmanAnalytics(startDate?: string, endDate?: string): Promise<{
    id: number;
    name: string;
    totalSales: number;
    invoiceCount: number;
    avgInvoiceValue: number;
    outstandingCredit: number;
    paymentsCollected: number;
    collectionEfficiency: number;
    lastSettlementDate: string | null;
    settlementStatus: 'overdue' | 'due_soon' | 'ok';
  }[]> {
    // Get all salesmen
    const salesmen = await db.select().from(suppliers)
      .where(eq(suppliers.partyType, 'salesman'));
    
    const today = new Date();
    const SETTLEMENT_PERIOD_DAYS = 90;
    
    const results = await Promise.all(salesmen.map(async (salesman) => {
      // Get sales data for this salesman
      let salesConditions = [eq(salesOrders.salesmanId, salesman.id)];
      if (startDate && endDate) {
        salesConditions.push(gte(salesOrders.saleDate, startDate));
        salesConditions.push(lte(salesOrders.saleDate, endDate));
      }
      
      const [salesData] = await db.select({
        totalSales: sql<number>`COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float`,
        invoiceCount: sql<number>`COUNT(*)::int`,
      }).from(salesOrders).where(and(...salesConditions));
      
      const totalSales = salesData?.totalSales || 0;
      
      // Get unique customer IDs from this salesman's sales orders for outstanding calculation
      const customerOrders = await db.select({
        customerId: salesOrders.customerId,
      }).from(salesOrders)
        .where(and(
          eq(salesOrders.salesmanId, salesman.id),
          sql`customer_id IS NOT NULL`
        ));
      
      // Calculate outstanding credit by summing customer balances
      // This gets the actual current balance of customers served by this salesman
      let outstandingCredit = 0;
      const uniqueCustomerIds = [...new Set(customerOrders.map(o => o.customerId).filter(Boolean))];
      
      if (uniqueCustomerIds.length > 0) {
        for (const custId of uniqueCustomerIds) {
          // Use the existing customer balance calculation  
          const balance = await this.getCustomerBalance(custId as number);
          if (balance && balance.balance > 0) {
            outstandingCredit += balance.balance;
          }
        }
      }
      
      // Payments collected is total sales minus outstanding
      const paymentsCollected = Math.max(0, totalSales - outstandingCredit);
      
      // Calculate collection efficiency
      const collectionEfficiency = totalSales > 0 ? (paymentsCollected / totalSales) * 100 : 0;
      
      // Calculate settlement status
      let settlementStatus: 'overdue' | 'due_soon' | 'ok' = 'overdue';
      if (salesman.lastStockCheckDate) {
        const lastDate = new Date(salesman.lastStockCheckDate);
        const nextDueDate = new Date(lastDate);
        nextDueDate.setDate(nextDueDate.getDate() + SETTLEMENT_PERIOD_DAYS);
        const daysRemaining = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining < 0) settlementStatus = 'overdue';
        else if (daysRemaining <= 14) settlementStatus = 'due_soon';
        else settlementStatus = 'ok';
      }
      
      return {
        id: salesman.id,
        name: salesman.name,
        totalSales,
        invoiceCount: salesData?.invoiceCount || 0,
        avgInvoiceValue: salesData?.invoiceCount > 0 ? totalSales / salesData.invoiceCount : 0,
        outstandingCredit,
        paymentsCollected,
        collectionEfficiency,
        lastSettlementDate: salesman.lastStockCheckDate,
        settlementStatus,
      };
    }));
    
    return results.sort((a, b) => b.totalSales - a.totalSales); // Sort by total sales descending
  }

  async getSalesmanEfficiencyAnalytics(): Promise<{
    id: number;
    name: string;
    // Goods intake metrics
    totalGoodsIssued: number;
    rolling90DayGoods: number;
    creditLimit: number;
    creditUtilization: number;
    avgDaysGoodsHeld: number;
    goodsTurnoverRate: number;
    // Payment velocity metrics
    avgPaymentLagDays: number;
    collection30Days: number;
    collection60Days: number;
    collection90Days: number;
    cashReturnRate: number;
    // Composite score
    efficiencyScore: number;
    rank: number;
    percentile: number;
  }[]> {
    const salesmen = await db.select().from(suppliers)
      .where(eq(suppliers.partyType, 'salesman'));
    
    const today = new Date();
    const ninety_days_ago = new Date(today);
    ninety_days_ago.setDate(ninety_days_ago.getDate() - 90);
    const sixty_days_ago = new Date(today);
    sixty_days_ago.setDate(sixty_days_ago.getDate() - 60);
    const thirty_days_ago = new Date(today);
    thirty_days_ago.setDate(thirty_days_ago.getDate() - 30);
    
    const efficiencyData = await Promise.all(salesmen.map(async (salesman) => {
      // Get all sales orders for this salesman
      const allSalesData = await db.select({
        id: salesOrders.id,
        saleDate: salesOrders.saleDate,
        totalKwd: salesOrders.totalKwd,
        customerId: salesOrders.customerId,
      }).from(salesOrders)
        .where(eq(salesOrders.salesmanId, salesman.id));
      
      // Total goods issued (all time)
      const totalGoodsIssued = allSalesData.reduce((sum, s) => 
        sum + parseFloat(s.totalKwd || '0'), 0);
      
      // Rolling 90-day goods
      const rolling90DayGoods = allSalesData
        .filter(s => new Date(s.saleDate) >= ninety_days_ago)
        .reduce((sum, s) => sum + parseFloat(s.totalKwd || '0'), 0);
      
      // Credit limit and utilization
      const creditLimit = parseFloat(salesman.creditLimit || '0');
      
      // Get outstanding credit (current balance of customers served by this salesman)
      const uniqueCustomerIds = [...new Set(allSalesData.map(o => o.customerId).filter(Boolean))];
      let outstandingCredit = 0;
      for (const custId of uniqueCustomerIds) {
        const balance = await this.getCustomerBalance(custId as number);
        if (balance && balance.balance > 0) {
          outstandingCredit += balance.balance;
        }
      }
      
      const creditUtilization = creditLimit > 0 ? (outstandingCredit / creditLimit) * 100 : 0;
      
      // Calculate avg days goods are held (from sale to payment)
      // Get payments received from customers of this salesman
      const customerPayments = await db.select({
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        customerId: payments.customerId,
      }).from(payments)
        .where(and(
          eq(payments.direction, 'IN'),
          inArray(payments.customerId, uniqueCustomerIds.length > 0 ? uniqueCustomerIds as number[] : [0])
        ));
      
      // Calculate average payment lag (days between sale and payment)
      let totalLagDays = 0;
      let lagCount = 0;
      
      for (const sale of allSalesData) {
        if (!sale.customerId) continue;
        
        // Find payments from this customer after this sale
        const customerPaymentsAfterSale = customerPayments.filter(p => 
          p.customerId === sale.customerId && 
          new Date(p.paymentDate) >= new Date(sale.saleDate)
        );
        
        if (customerPaymentsAfterSale.length > 0) {
          // Use first payment as the settlement
          const firstPayment = customerPaymentsAfterSale.sort((a, b) => 
            new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
          )[0];
          
          const lagDays = Math.ceil(
            (new Date(firstPayment.paymentDate).getTime() - new Date(sale.saleDate).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          totalLagDays += lagDays;
          lagCount++;
        }
      }
      
      const avgPaymentLagDays = lagCount > 0 ? totalLagDays / lagCount : 999; // 999 if no payments
      const avgDaysGoodsHeld = avgPaymentLagDays < 999 ? avgPaymentLagDays : 0;
      
      // Goods turnover rate (goods issued / avg days held)
      const goodsTurnoverRate = avgDaysGoodsHeld > 0 
        ? totalGoodsIssued / avgDaysGoodsHeld 
        : 0;
      
      // Collection rates at different intervals
      const paymentsCollected = Math.max(0, totalGoodsIssued - outstandingCredit);
      
      // For collection curves, calculate what % of goods issued in last N days have been paid
      const goods30Day = allSalesData
        .filter(s => new Date(s.saleDate) >= thirty_days_ago)
        .reduce((sum, s) => sum + parseFloat(s.totalKwd || '0'), 0);
      const goods60Day = allSalesData
        .filter(s => new Date(s.saleDate) >= sixty_days_ago)
        .reduce((sum, s) => sum + parseFloat(s.totalKwd || '0'), 0);
      
      // Calculate payments received within different windows
      const payments30Day = customerPayments
        .filter(p => new Date(p.paymentDate) >= thirty_days_ago)
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const payments60Day = customerPayments
        .filter(p => new Date(p.paymentDate) >= sixty_days_ago)
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const payments90Day = customerPayments
        .filter(p => new Date(p.paymentDate) >= ninety_days_ago)
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      
      const collection30Days = goods30Day > 0 ? Math.min(100, (payments30Day / goods30Day) * 100) : 0;
      const collection60Days = goods60Day > 0 ? Math.min(100, (payments60Day / goods60Day) * 100) : 0;
      const collection90Days = rolling90DayGoods > 0 ? Math.min(100, (payments90Day / rolling90DayGoods) * 100) : 0;
      
      // Cash return rate (payments collected / goods issued in last 90 days)
      const cashReturnRate = rolling90DayGoods > 0 
        ? Math.min(100, (payments90Day / rolling90DayGoods) * 100) 
        : 0;
      
      return {
        id: salesman.id,
        name: salesman.name,
        totalGoodsIssued,
        rolling90DayGoods,
        creditLimit,
        creditUtilization,
        avgDaysGoodsHeld,
        goodsTurnoverRate,
        avgPaymentLagDays: avgPaymentLagDays < 999 ? avgPaymentLagDays : 0,
        collection30Days,
        collection60Days,
        collection90Days,
        cashReturnRate,
        efficiencyScore: 0, // Will be calculated after all data is collected
        rank: 0,
        percentile: 0,
      };
    }));
    
    // Calculate composite efficiency score
    // Normalize metrics and weight them:
    // 40% payment velocity (lower lag = better)
    // 30% goods turnover rate (higher = better)
    // 20% credit utilization (balanced - not too high, not too low)
    // 10% cash return rate (higher = better)
    
    // Find max values for normalization
    const maxTurnover = Math.max(...efficiencyData.map(d => d.goodsTurnoverRate), 1);
    const maxLag = Math.max(...efficiencyData.map(d => d.avgPaymentLagDays), 1);
    
    const scoredData = efficiencyData.map(d => {
      // Payment velocity score (lower lag = higher score)
      const paymentVelocityScore = d.avgPaymentLagDays > 0 
        ? Math.max(0, 100 - (d.avgPaymentLagDays / maxLag) * 100)
        : 50; // Neutral if no data
      
      // Turnover score (higher = better)
      const turnoverScore = maxTurnover > 0 
        ? (d.goodsTurnoverRate / maxTurnover) * 100 
        : 0;
      
      // Credit utilization score (optimal is 40-70%)
      let utilizationScore = 0;
      if (d.creditLimit > 0) {
        if (d.creditUtilization >= 40 && d.creditUtilization <= 70) {
          utilizationScore = 100;
        } else if (d.creditUtilization < 40) {
          utilizationScore = (d.creditUtilization / 40) * 100;
        } else {
          utilizationScore = Math.max(0, 100 - ((d.creditUtilization - 70) / 30) * 100);
        }
      }
      
      // Cash return rate directly usable (0-100)
      const cashReturnScore = d.cashReturnRate;
      
      // Composite score
      const efficiencyScore = 
        (paymentVelocityScore * 0.4) +
        (turnoverScore * 0.3) +
        (utilizationScore * 0.2) +
        (cashReturnScore * 0.1);
      
      return { ...d, efficiencyScore };
    });
    
    // Sort by efficiency score and assign ranks
    const sorted = scoredData.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    const totalCount = sorted.length;
    
    return sorted.map((d, index) => ({
      ...d,
      rank: index + 1,
      percentile: totalCount > 1 ? ((totalCount - index - 1) / (totalCount - 1)) * 100 : 100,
    }));
  }

  async deleteCustomer(id: number): Promise<{ deleted: boolean; error?: string }> {
    const linkedOrders = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(salesOrders)
      .where(eq(salesOrders.customerId, id));
    
    if (linkedOrders[0].count > 0) {
      return { 
        deleted: false, 
        error: `Cannot delete customer: ${linkedOrders[0].count} sales order(s) are linked to this customer` 
      };
    }
    
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return { deleted: result.length > 0 };
  }

  async getSalesOrders(options?: { limit?: number; offset?: number }): Promise<{ data: SalesOrderWithDetails[]; total: number }> {
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(salesOrders);
    const total = countResult.count;
    
    const orders = await db.query.salesOrders.findMany({
      with: {
        customer: true,
        lineItems: true,
      },
      orderBy: [desc(salesOrders.saleDate), desc(salesOrders.id)],
      limit: options?.limit,
      offset: options?.offset,
    });
    return { data: orders, total };
  }

  async getSalesOrder(id: number): Promise<SalesOrderWithDetails | undefined> {
    const order = await db.query.salesOrders.findFirst({
      where: eq(salesOrders.id, id),
      with: {
        customer: true,
        lineItems: true,
      },
    });
    return order || undefined;
  }

  async createSalesOrder(
    so: InsertSalesOrder, 
    lineItems: Omit<InsertSalesLineItem, 'salesOrderId'>[]
  ): Promise<SalesOrderWithDetails> {
    const [newSo] = await db.insert(salesOrders).values(so).returning();
    
    if (lineItems.length > 0) {
      await db.insert(salesOrderLineItems).values(
        lineItems.map(item => ({
          ...item,
          salesOrderId: newSo.id,
        }))
      );
    }

    return this.getSalesOrder(newSo.id) as Promise<SalesOrderWithDetails>;
  }

  async updateSalesOrder(
    id: number,
    so: Partial<InsertSalesOrder>,
    lineItems?: Omit<InsertSalesLineItem, 'salesOrderId'>[]
  ): Promise<SalesOrderWithDetails | undefined> {
    const [updated] = await db.update(salesOrders).set(so).where(eq(salesOrders.id, id)).returning();
    
    if (!updated) return undefined;

    if (lineItems !== undefined) {
      await db.delete(salesOrderLineItems).where(eq(salesOrderLineItems.salesOrderId, id));
      
      if (lineItems.length > 0) {
        await db.insert(salesOrderLineItems).values(
          lineItems.map(item => ({
            ...item,
            salesOrderId: id,
          }))
        );
      }
    }

    return this.getSalesOrder(id);
  }

  async deleteSalesOrder(id: number): Promise<boolean> {
    const result = await db.delete(salesOrders).where(eq(salesOrders.id, id)).returning();
    return result.length > 0;
  }

  async getSalesMonthlyStats(year?: number): Promise<{ month: number; totalKwd: number; totalFx: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        EXTRACT(MONTH FROM sale_date)::integer as month,
        COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as "totalKwd",
        COALESCE(SUM(CAST(total_fx AS DECIMAL)), 0)::float as "totalFx"
      FROM sales_orders
      ${year ? sql`WHERE EXTRACT(YEAR FROM sale_date) = ${year}` : sql``}
      GROUP BY EXTRACT(MONTH FROM sale_date)
      ORDER BY month
    `);
    return result.rows as { month: number; totalKwd: number; totalFx: number }[];
  }

  // ==================== PAYMENT MODULE ====================

  async getPayments(options?: { limit?: number; offset?: number; direction?: string }): Promise<{ data: PaymentWithDetails[]; total: number }> {
    // Build where condition for direction filter
    const whereCondition = options?.direction ? eq(payments.direction, options.direction) : undefined;
    
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(whereCondition);
    const total = countResult.count;
    
    const paymentList = await db.query.payments.findMany({
      where: whereCondition,
      with: {
        customer: true,
        supplier: true,
        purchaseOrder: true,
      },
      orderBy: [desc(payments.paymentDate), desc(payments.id)],
      limit: options?.limit,
      offset: options?.offset,
    });
    return { data: paymentList as PaymentWithDetails[], total };
  }

  async getPayment(id: number): Promise<PaymentWithDetails | undefined> {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, id),
      with: {
        customer: true,
        supplier: true,
        purchaseOrder: true,
      },
    });
    if (!payment) return undefined;
    
    const splits = await this.getPaymentSplits(id);
    return { ...(payment as PaymentWithDetails), splits };
  }

  async getPaymentSplits(paymentId: number): Promise<PaymentSplit[]> {
    return db.select().from(paymentSplits).where(eq(paymentSplits.paymentId, paymentId));
  }

  async createPayment(payment: InsertPayment, splits?: Omit<InsertPaymentSplit, 'paymentId'>[]): Promise<PaymentWithDetails> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    
    if (splits && splits.length > 0) {
      const splitValues = splits.map(split => ({
        ...split,
        paymentId: newPayment.id,
      }));
      await db.insert(paymentSplits).values(splitValues);
    }
    
    return this.getPayment(newPayment.id) as Promise<PaymentWithDetails>;
  }

  async deletePayment(id: number): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id)).returning();
    return result.length > 0;
  }

  // ==================== REPORTS ====================

  async getStockBalance(): Promise<{ itemName: string; purchased: number; sold: number; openingStock: number; balance: number }[]> {
    const result = await db.execute(sql`
      WITH purchased AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM purchase_order_line_items
        GROUP BY item_name
      ),
      sold AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM sales_order_line_items
        GROUP BY item_name
      ),
      opening_stock AS (
        SELECT i.name as item_name, COALESCE(SUM(ia.quantity), 0) as qty
        FROM inventory_adjustments ia
        JOIN items i ON ia.item_id = i.id
        GROUP BY i.name
      ),
      sale_returns AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'sale_return'
        GROUP BY rl.item_name
      ),
      purchase_returns AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'purchase_return'
        GROUP BY rl.item_name
      ),
      all_items AS (
        SELECT item_name FROM purchased
        UNION
        SELECT item_name FROM sold
        UNION
        SELECT item_name FROM opening_stock
        UNION
        SELECT item_name FROM sale_returns
        UNION
        SELECT item_name FROM purchase_returns
      )
      SELECT 
        ai.item_name as "itemName",
        COALESCE(p.qty, 0)::integer as purchased,
        COALESCE(s.qty, 0)::integer as sold,
        COALESCE(o.qty, 0)::integer as "openingStock",
        (COALESCE(o.qty, 0) + COALESCE(p.qty, 0) + COALESCE(sr.qty, 0) - COALESCE(s.qty, 0) - COALESCE(pr.qty, 0))::integer as balance
      FROM all_items ai
      LEFT JOIN purchased p ON ai.item_name = p.item_name
      LEFT JOIN sold s ON ai.item_name = s.item_name
      LEFT JOIN opening_stock o ON ai.item_name = o.item_name
      LEFT JOIN sale_returns sr ON ai.item_name = sr.item_name
      LEFT JOIN purchase_returns pr ON ai.item_name = pr.item_name
      ORDER BY ai.item_name
    `);
    return result.rows as { itemName: string; purchased: number; sold: number; openingStock: number; balance: number }[];
  }

  async getLowStockItems(): Promise<{ itemName: string; currentStock: number; minStockLevel: number }[]> {
    const result = await db.execute(sql`
      WITH stock_balance AS (
        SELECT 
          i.name as item_name,
          COALESCE(i.min_stock_level, 0) as min_level,
          COALESCE((
            SELECT SUM(quantity) FROM inventory_adjustments ia WHERE ia.item_id = i.id
          ), 0) +
          COALESCE((
            SELECT SUM(pli.quantity) FROM purchase_order_line_items pli WHERE pli.item_name = i.name
          ), 0) +
          COALESCE((
            SELECT SUM(rli.quantity) FROM return_line_items rli 
            JOIN returns r ON rli.return_id = r.id 
            WHERE rli.item_name = i.name AND r.return_type = 'sale_return'
          ), 0) -
          COALESCE((
            SELECT SUM(sli.quantity) FROM sales_order_line_items sli WHERE sli.item_name = i.name
          ), 0) -
          COALESCE((
            SELECT SUM(rli.quantity) FROM return_line_items rli 
            JOIN returns r ON rli.return_id = r.id 
            WHERE rli.item_name = i.name AND r.return_type = 'purchase_return'
          ), 0) as current_stock
        FROM items i
        WHERE i.min_stock_level > 0
      )
      SELECT 
        item_name as "itemName",
        current_stock::integer as "currentStock",
        min_level::integer as "minStockLevel"
      FROM stock_balance
      WHERE current_stock <= min_level
      ORDER BY (min_level - current_stock) DESC
    `);
    return result.rows as { itemName: string; currentStock: number; minStockLevel: number }[];
  }

  async getCustomerAging(): Promise<{ customerId: number; customerName: string; current: number; days30: number; days60: number; days90Plus: number; totalBalance: number }[]> {
    const result = await db.execute(sql`
      WITH customer_balances AS (
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          COALESCE(SUM(CASE WHEN so.sale_date >= CURRENT_DATE - INTERVAL '30 days' THEN CAST(so.total_kwd AS DECIMAL) ELSE 0 END), 0) as sales_current,
          COALESCE(SUM(CASE WHEN so.sale_date >= CURRENT_DATE - INTERVAL '60 days' AND so.sale_date < CURRENT_DATE - INTERVAL '30 days' THEN CAST(so.total_kwd AS DECIMAL) ELSE 0 END), 0) as sales_30,
          COALESCE(SUM(CASE WHEN so.sale_date >= CURRENT_DATE - INTERVAL '90 days' AND so.sale_date < CURRENT_DATE - INTERVAL '60 days' THEN CAST(so.total_kwd AS DECIMAL) ELSE 0 END), 0) as sales_60,
          COALESCE(SUM(CASE WHEN so.sale_date < CURRENT_DATE - INTERVAL '90 days' THEN CAST(so.total_kwd AS DECIMAL) ELSE 0 END), 0) as sales_90_plus
        FROM customers c
        LEFT JOIN sales_orders so ON c.id = so.customer_id
        GROUP BY c.id, c.name
      ),
      customer_payments AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CASE WHEN direction = 'IN' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as total_paid
        FROM payments
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ),
      customer_returns AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0) as total_returns
        FROM returns
        WHERE customer_id IS NOT NULL AND return_type = 'sale_return'
        GROUP BY customer_id
      ),
      customer_discounts AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CAST(discount_amount AS DECIMAL)), 0) as total_discounts
        FROM discounts
        GROUP BY customer_id
      )
      SELECT 
        cb.customer_id as "customerId",
        cb.customer_name as "customerName",
        GREATEST(cb.sales_current - COALESCE(cp.total_paid, 0) * (cb.sales_current / NULLIF(cb.sales_current + cb.sales_30 + cb.sales_60 + cb.sales_90_plus, 0)), 0)::float as "current",
        cb.sales_30::float as "days30",
        cb.sales_60::float as "days60",
        cb.sales_90_plus::float as "days90Plus",
        (cb.sales_current + cb.sales_30 + cb.sales_60 + cb.sales_90_plus - COALESCE(cp.total_paid, 0) - COALESCE(cr.total_returns, 0) - COALESCE(cd.total_discounts, 0))::float as "totalBalance"
      FROM customer_balances cb
      LEFT JOIN customer_payments cp ON cb.customer_id = cp.customer_id
      LEFT JOIN customer_returns cr ON cb.customer_id = cr.customer_id
      LEFT JOIN customer_discounts cd ON cb.customer_id = cd.customer_id
      WHERE (cb.sales_current + cb.sales_30 + cb.sales_60 + cb.sales_90_plus - COALESCE(cp.total_paid, 0) - COALESCE(cr.total_returns, 0) - COALESCE(cd.total_discounts, 0)) > 0
      ORDER BY "totalBalance" DESC
    `);
    return result.rows as { customerId: number; customerName: string; current: number; days30: number; days60: number; days90Plus: number; totalBalance: number }[];
  }

  // Get monthly sales and payments trend for a specific customer (last 12 months)
  async getCustomerMonthlyTrends(customerId: number): Promise<{ month: string; sales: number; payments: number; balance: number }[]> {
    const result = await db.execute(sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        )::date as month_start
      ),
      monthly_sales AS (
        SELECT 
          date_trunc('month', sale_date)::date as month_start,
          COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0) as total_sales
        FROM sales_orders
        WHERE customer_id = ${customerId}
          AND sale_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY date_trunc('month', sale_date)
      ),
      monthly_payments AS (
        SELECT 
          date_trunc('month', payment_date)::date as month_start,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_payments
        FROM payments
        WHERE customer_id = ${customerId}
          AND direction = 'IN'
          AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY date_trunc('month', payment_date)
      )
      SELECT 
        to_char(m.month_start, 'YYYY-MM') as month,
        COALESCE(ms.total_sales, 0)::float as sales,
        COALESCE(mp.total_payments, 0)::float as payments,
        (COALESCE(ms.total_sales, 0) - COALESCE(mp.total_payments, 0))::float as balance
      FROM months m
      LEFT JOIN monthly_sales ms ON m.month_start = ms.month_start
      LEFT JOIN monthly_payments mp ON m.month_start = mp.month_start
      ORDER BY m.month_start
    `);
    return result.rows as { month: string; sales: number; payments: number; balance: number }[];
  }

  // Get payment behavior metrics for a specific customer
  async getCustomerPaymentMetrics(customerId: number): Promise<{
    avgDaysToPay: number;
    paymentFrequency: number;
    totalTransactions: number;
    onTimePayments: number;
    latePayments: number;
    totalSalesAmount: number;
    totalPaymentsAmount: number;
    currentBalance: number;
  }> {
    const result = await db.execute(sql`
      WITH customer_sales AS (
        SELECT 
          COUNT(*)::int as total_sales_count,
          COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total_sales_amount,
          MIN(sale_date::date) as first_sale_date
        FROM sales_orders
        WHERE customer_id = ${customerId}
      ),
      customer_payments AS (
        SELECT 
          COUNT(*)::int as total_payments_count,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total_payments_amount,
          MIN(payment_date::date) as first_payment_date
        FROM payments
        WHERE customer_id = ${customerId} AND direction = 'IN'
      ),
      payment_timing AS (
        SELECT 
          AVG(
            CASE 
              WHEN p.payment_date IS NOT NULL AND so.sale_date IS NOT NULL 
              THEN (p.payment_date::date - so.sale_date::date)
              ELSE NULL 
            END
          )::float as avg_days_to_pay,
          COUNT(CASE WHEN p.payment_date::date <= so.sale_date::date + 30 THEN 1 END)::int as on_time_count,
          COUNT(CASE WHEN p.payment_date::date > so.sale_date::date + 30 THEN 1 END)::int as late_count
        FROM sales_orders so
        LEFT JOIN payments p ON p.customer_id = so.customer_id 
          AND p.direction = 'IN'
          AND p.payment_date::date >= so.sale_date::date
        WHERE so.customer_id = ${customerId}
      )
      SELECT 
        COALESCE(pt.avg_days_to_pay, 0)::float as "avgDaysToPay",
        CASE 
          WHEN cs.first_sale_date IS NOT NULL THEN 
            (cp.total_payments_count::float / GREATEST((CURRENT_DATE - cs.first_sale_date) / 30.0, 1))
          ELSE 0 
        END as "paymentFrequency",
        (cs.total_sales_count + cp.total_payments_count)::int as "totalTransactions",
        COALESCE(pt.on_time_count, 0)::int as "onTimePayments",
        COALESCE(pt.late_count, 0)::int as "latePayments",
        cs.total_sales_amount as "totalSalesAmount",
        cp.total_payments_amount as "totalPaymentsAmount",
        (cs.total_sales_amount - cp.total_payments_amount)::float as "currentBalance"
      FROM customer_sales cs, customer_payments cp, payment_timing pt
    `);
    
    const row = result.rows[0] as any;
    return {
      avgDaysToPay: row?.avgDaysToPay || 0,
      paymentFrequency: row?.paymentFrequency || 0,
      totalTransactions: row?.totalTransactions || 0,
      onTimePayments: row?.onTimePayments || 0,
      latePayments: row?.latePayments || 0,
      totalSalesAmount: row?.totalSalesAmount || 0,
      totalPaymentsAmount: row?.totalPaymentsAmount || 0,
      currentBalance: row?.currentBalance || 0,
    };
  }

  async getDailyCashFlow(startDate?: string, endDate?: string): Promise<{ date: string; inAmount: number; outAmount: number; net: number; runningBalance: number }[]> {
    let whereClause = sql``;
    if (startDate && endDate) {
      whereClause = sql`WHERE payment_date >= ${startDate} AND payment_date <= ${endDate}`;
    } else if (startDate) {
      whereClause = sql`WHERE payment_date >= ${startDate}`;
    } else if (endDate) {
      whereClause = sql`WHERE payment_date <= ${endDate}`;
    }

    const result = await db.execute(sql`
      WITH daily_totals AS (
        SELECT 
          payment_date as date,
          COALESCE(SUM(CASE WHEN direction = 'IN' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0)::float as "inAmount",
          COALESCE(SUM(CASE WHEN direction = 'OUT' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0)::float as "outAmount"
        FROM payments
        ${whereClause}
        GROUP BY payment_date
        ORDER BY payment_date
      )
      SELECT 
        date,
        "inAmount",
        "outAmount",
        ("inAmount" - "outAmount")::float as net,
        SUM("inAmount" - "outAmount") OVER (ORDER BY date)::float as "runningBalance"
      FROM daily_totals
      ORDER BY date
    `);
    return result.rows as { date: string; inAmount: number; outAmount: number; net: number; runningBalance: number }[];
  }

  async getCustomerReport(): Promise<{ customerId: number; customerName: string; totalSales: number; totalPayments: number; balance: number }[]> {
    const result = await db.execute(sql`
      WITH customer_sales AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total_sales
        FROM sales_orders
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ),
      customer_payments AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total_payments
        FROM payments
        WHERE customer_id IS NOT NULL AND direction = 'IN'
        GROUP BY customer_id
      ),
      customer_returns AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total_returns
        FROM returns
        WHERE customer_id IS NOT NULL AND return_type = 'sale_return'
        GROUP BY customer_id
      ),
      customer_discounts AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CAST(discount_amount AS DECIMAL)), 0)::float as total_discounts
        FROM discounts
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      )
      SELECT 
        c.id as "customerId",
        c.name as "customerName",
        COALESCE(cs.total_sales, 0)::float as "totalSales",
        COALESCE(cp.total_payments, 0)::float as "totalPayments",
        (COALESCE(cs.total_sales, 0) - COALESCE(cp.total_payments, 0) - COALESCE(cr.total_returns, 0) - COALESCE(cd.total_discounts, 0))::float as balance
      FROM customers c
      LEFT JOIN customer_sales cs ON c.id = cs.customer_id
      LEFT JOIN customer_payments cp ON c.id = cp.customer_id
      LEFT JOIN customer_returns cr ON c.id = cr.customer_id
      LEFT JOIN customer_discounts cd ON c.id = cd.customer_id
      ORDER BY c.name
    `);
    return result.rows as { customerId: number; customerName: string; totalSales: number; totalPayments: number; balance: number }[];
  }

  async getPartyStatement(partyId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]> {
    const party = await db.select().from(suppliers).where(eq(suppliers.id, partyId));
    if (party.length === 0) return [];
    
    const partyData = party[0];
    const isSupplier = partyData.partyType === "supplier";
    const isSalesman = partyData.partyType === "salesman";

    let dateFilter = sql``;
    if (startDate && endDate) {
      dateFilter = sql`AND date >= ${startDate} AND date <= ${endDate}`;
    } else if (startDate) {
      dateFilter = sql`AND date >= ${startDate}`;
    } else if (endDate) {
      dateFilter = sql`AND date <= ${endDate}`;
    }

    let result;
    
    if (isSalesman) {
      // For salesmen: track sales they made and payments received from them
      // Get opening balance
      const openingBalance = parseFloat(partyData.openingBalance || "0");
      
      // Build date filters for each table's date column
      let saleDateFilter = sql``;
      let paymentDateFilter = sql``;
      let returnDateFilter = sql``;
      if (startDate && endDate) {
        saleDateFilter = sql`AND so.sale_date >= ${startDate} AND so.sale_date <= ${endDate}`;
        paymentDateFilter = sql`AND p.payment_date >= ${startDate} AND p.payment_date <= ${endDate}`;
        returnDateFilter = sql`AND r.return_date >= ${startDate} AND r.return_date <= ${endDate}`;
      } else if (startDate) {
        saleDateFilter = sql`AND so.sale_date >= ${startDate}`;
        paymentDateFilter = sql`AND p.payment_date >= ${startDate}`;
        returnDateFilter = sql`AND r.return_date >= ${startDate}`;
      } else if (endDate) {
        saleDateFilter = sql`AND so.sale_date <= ${endDate}`;
        paymentDateFilter = sql`AND p.payment_date <= ${endDate}`;
        returnDateFilter = sql`AND r.return_date <= ${endDate}`;
      }
      
      result = await db.execute(sql`
        WITH all_transactions AS (
          -- Opening Balance (starting point)
          SELECT 
            0 as id,
            '1900-01-01'::date as date,
            'opening' as type,
            'Opening Balance' as reference,
            'Opening Balance' as description,
            ${openingBalance}::float as debit,
            0::float as credit,
            '1900-01-01 00:00:00'::timestamp as created_at
          WHERE ${openingBalance} != 0
          
          UNION ALL
          
          -- Sales made by this salesman (they owe us - debit)
          SELECT 
            so.id,
            so.sale_date as date,
            'sale' as type,
            so.invoice_number as reference,
            'Sales Invoice - ' || COALESCE(c.name, 'Cash') as description,
            COALESCE(CAST(so.total_kwd AS DECIMAL), 0)::float as debit,
            0::float as credit,
            so.created_at
          FROM sales_orders so
          LEFT JOIN customers c ON so.customer_id = c.id
          WHERE so.salesman_id = ${partyId}
          ${saleDateFilter}
          
          UNION ALL
          
          -- Payments from this salesman (they paid us - credit)
          -- Salesmen are stored in suppliers table, so use supplier_id
          SELECT 
            p.id,
            p.payment_date as date,
            'payment_in' as type,
            COALESCE(p.reference, 'Payment') as reference,
            'Payment Received' as description,
            0::float as debit,
            COALESCE(CAST(p.amount AS DECIMAL), 0)::float as credit,
            p.created_at
          FROM payments p
          WHERE p.supplier_id = ${partyId} AND p.direction = 'IN'
          ${paymentDateFilter}
        )
        SELECT 
          id,
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          type,
          reference,
          description,
          debit::float,
          credit::float,
          SUM(debit - credit) OVER (ORDER BY date, created_at)::float as balance
        FROM all_transactions
        ORDER BY date, created_at
      `);
    } else if (isSupplier) {
      result = await db.execute(sql`
        WITH all_transactions AS (
          -- Purchases from this supplier (we owe them - credit)
          SELECT 
            id,
            purchase_date as date,
            'purchase' as type,
            invoice_number as reference,
            'Purchase Order' as description,
            0::float as debit,
            COALESCE(CAST(total_kwd AS DECIMAL), 0)::float as credit,
            created_at
          FROM purchase_orders
          WHERE supplier_id = ${partyId}
          ${dateFilter}
          
          UNION ALL
          
          -- Payments to this supplier (we paid them - debit)
          SELECT 
            id,
            payment_date as date,
            'payment_out' as type,
            receipt_number as reference,
            'Payment' as description,
            COALESCE(CAST(amount AS DECIMAL), 0)::float as debit,
            0::float as credit,
            created_at
          FROM payments
          WHERE supplier_id = ${partyId} AND direction = 'OUT'
          ${dateFilter}
          
          UNION ALL
          
          -- Purchase Returns (we returned goods - reduces what we owe - debit)
          SELECT 
            id,
            return_date as date,
            'return' as type,
            return_number as reference,
            'Purchase Return' as description,
            COALESCE(CAST(total_amount AS DECIMAL), 0)::float as debit,
            0::float as credit,
            created_at
          FROM returns
          WHERE supplier_id = ${partyId} AND return_type = 'purchase_return'
          ${dateFilter}
        )
        SELECT 
          id,
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          type,
          reference,
          description,
          debit::float,
          credit::float,
          SUM(credit - debit) OVER (ORDER BY date, created_at)::float as balance
        FROM all_transactions
        ORDER BY date, created_at
      `);
    } else {
      result = await db.execute(sql`
        WITH all_transactions AS (
          -- Sales to this customer (they owe us - debit)
          SELECT 
            so.id,
            so.invoice_date as date,
            'sale' as type,
            so.invoice_number as reference,
            'Sales Invoice' as description,
            COALESCE(CAST(so.total_kwd AS DECIMAL), 0)::float as debit,
            0::float as credit,
            so.created_at
          FROM sales_orders so
          JOIN customers c ON so.customer_id = c.id
          WHERE c.name = ${partyData.name}
          ${dateFilter}
          
          UNION ALL
          
          -- Payments from this customer (they paid us - credit)
          SELECT 
            p.id,
            p.payment_date as date,
            'payment_in' as type,
            p.receipt_number as reference,
            'Payment Received' as description,
            0::float as debit,
            COALESCE(CAST(p.amount AS DECIMAL), 0)::float as credit,
            p.created_at
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          WHERE c.name = ${partyData.name} AND p.direction = 'IN'
          ${dateFilter}
          
          UNION ALL
          
          -- Sale Returns (customer returned goods - reduces what they owe - credit)
          SELECT 
            id,
            return_date as date,
            'return' as type,
            return_number as reference,
            'Sale Return' as description,
            0::float as debit,
            COALESCE(CAST(total_amount AS DECIMAL), 0)::float as credit,
            created_at
          FROM returns
          WHERE supplier_id = ${partyId} AND return_type = 'sale_return'
          ${dateFilter}
        )
        SELECT 
          id,
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          type,
          reference,
          description,
          debit::float,
          credit::float,
          SUM(debit - credit) OVER (ORDER BY date, created_at)::float as balance
        FROM all_transactions
        ORDER BY date, created_at
      `);
    }
    
    return result.rows as { id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[];
  }

  async getItemSales(itemId: number, customerId?: number, startDate?: string, endDate?: string): Promise<{ date: string; invoiceNumber: string; customerName: string; quantity: number; unitPrice: number; totalAmount: number }[]> {
    const item = await db.select().from(items).where(eq(items.id, itemId));
    if (item.length === 0) return [];
    
    const itemName = item[0].name;

    let dateFilter = sql``;
    if (startDate && endDate) {
      dateFilter = sql`AND so.invoice_date >= ${startDate} AND so.invoice_date <= ${endDate}`;
    } else if (startDate) {
      dateFilter = sql`AND so.invoice_date >= ${startDate}`;
    } else if (endDate) {
      dateFilter = sql`AND so.invoice_date <= ${endDate}`;
    }

    let customerFilter = sql``;
    if (customerId) {
      customerFilter = sql`AND so.customer_id = ${customerId}`;
    }

    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(so.invoice_date, 'YYYY-MM-DD') as date,
        so.invoice_number as "invoiceNumber",
        c.name as "customerName",
        sli.quantity::int as quantity,
        COALESCE(CAST(sli.unit_price AS DECIMAL), 0)::float as "unitPrice",
        (sli.quantity * COALESCE(CAST(sli.unit_price AS DECIMAL), 0))::float as "totalAmount"
      FROM sales_order_line_items sli
      JOIN sales_orders so ON sli.sales_order_id = so.id
      JOIN customers c ON so.customer_id = c.id
      WHERE sli.item_name = ${itemName}
      ${dateFilter}
      ${customerFilter}
      ORDER BY so.invoice_date DESC
    `);
    
    return result.rows as { date: string; invoiceNumber: string; customerName: string; quantity: number; unitPrice: number; totalAmount: number }[];
  }

  // ==================== ACCOUNTS MODULE ====================

  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts).orderBy(accounts.id);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async createAccount(name: string): Promise<Account> {
    const [account] = await db.insert(accounts).values({ name, balance: "0" }).returning();
    return account;
  }

  async updateAccount(id: number, name: string): Promise<Account | undefined> {
    const [updated] = await db.update(accounts).set({ name }).where(eq(accounts.id, id)).returning();
    return updated || undefined;
  }

  async deleteAccount(id: number): Promise<{ deleted: boolean; error?: string }> {
    // Check if account has any transactions
    const account = await this.getAccount(id);
    if (!account) {
      return { deleted: false, error: "Account not found" };
    }

    // Check for transfers using this account
    const transfersFrom = await db.select().from(accountTransfers).where(eq(accountTransfers.fromAccountId, id)).limit(1);
    const transfersTo = await db.select().from(accountTransfers).where(eq(accountTransfers.toAccountId, id)).limit(1);
    
    if (transfersFrom.length > 0 || transfersTo.length > 0) {
      return { deleted: false, error: "Cannot delete account with existing transfers" };
    }

    // Check for payments using this account name as payment type
    const paymentsUsing = await db.select().from(payments).where(eq(payments.paymentType, account.name)).limit(1);
    if (paymentsUsing.length > 0) {
      return { deleted: false, error: "Cannot delete account with existing payments" };
    }

    await db.delete(accounts).where(eq(accounts.id, id));
    return { deleted: true };
  }

  async addAccountOpeningBalance(accountId: number, amount: string, date: string, notes?: string): Promise<{ success: boolean; balance: string }> {
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    // Create an opening balance payment record (IN direction, to this account)
    // We'll use a special payment type "Opening Balance" that the account transactions query will pick up
    await db.insert(payments).values({
      paymentDate: date,
      paymentType: account.name,
      amount: amount,
      direction: "IN",
      reference: `Opening Balance - ${date}`,
      notes: notes || `Opening balance for ${account.name}`,
    });

    // Update account balance
    const currentBalance = parseFloat(account.balance || "0");
    const newBalance = (currentBalance + parseFloat(amount)).toFixed(3);
    await db.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, accountId));

    return { success: true, balance: newBalance };
  }

  async addAccountAdjustment(accountId: number, amount: string, direction: "IN" | "OUT", date: string, reason: string): Promise<{ success: boolean; balance: string }> {
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Invalid amount");
    }

    // Create an adjustment payment record
    await db.insert(payments).values({
      paymentDate: date,
      paymentType: account.name,
      amount: parsedAmount.toFixed(3),
      direction: direction,
      reference: `Adjustment - ${date}`,
      notes: reason || `Cash adjustment for ${account.name}`,
    });

    // Update account balance
    const currentBalance = parseFloat(account.balance || "0");
    const balanceChange = direction === "IN" ? parsedAmount : -parsedAmount;
    const newBalance = (currentBalance + balanceChange).toFixed(3);
    await db.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, accountId));

    return { success: true, balance: newBalance };
  }

  async ensureDefaultAccounts(): Promise<void> {
    for (const name of ACCOUNT_NAMES) {
      const existing = await db.select().from(accounts).where(eq(accounts.name, name));
      if (existing.length === 0) {
        await db.insert(accounts).values({ name, balance: "0" });
      }
    }
  }

  async getAccountTransactions(accountId: number, startDate?: string, endDate?: string): Promise<{ date: string; description: string; type: string; amount: number; balance: number }[]> {
    let dateFilter = sql``;
    if (startDate && endDate) {
      dateFilter = sql`AND date >= ${startDate} AND date <= ${endDate}`;
    } else if (startDate) {
      dateFilter = sql`AND date >= ${startDate}`;
    } else if (endDate) {
      dateFilter = sql`AND date <= ${endDate}`;
    }

    const account = await this.getAccount(accountId);
    if (!account) return [];

    const result = await db.execute(sql`
      WITH all_transactions AS (
        -- Payments IN (money coming into this account)
        SELECT 
          payment_date as date,
          CASE 
            WHEN direction = 'IN' THEN 'Payment received from ' || COALESCE((SELECT name FROM customers WHERE id = customer_id), 'Unknown')
            ELSE 'Payment to ' || COALESCE((SELECT name FROM suppliers WHERE id = supplier_id), 'Unknown')
          END as description,
          CASE WHEN direction = 'IN' THEN 'IN' ELSE 'OUT' END as type,
          CASE WHEN direction = 'IN' THEN CAST(amount AS DECIMAL) ELSE -CAST(amount AS DECIMAL) END as amount,
          created_at
        FROM payments
        WHERE payment_type = ${account.name}
        ${dateFilter}
        
        UNION ALL
        
        -- Expenses (money going out from this account)
        SELECT 
          expense_date as date,
          'Expense: ' || COALESCE(description, 'No description') as description,
          'OUT' as type,
          -CAST(amount AS DECIMAL) as amount,
          created_at
        FROM expenses
        WHERE account_id = ${accountId}
        ${dateFilter}
        
        UNION ALL
        
        -- Transfers OUT (from this account)
        SELECT 
          transfer_date as date,
          'Transfer to ' || (SELECT name FROM accounts WHERE id = to_account_id) as description,
          'TRANSFER_OUT' as type,
          -CAST(amount AS DECIMAL) as amount,
          created_at
        FROM account_transfers
        WHERE from_account_id = ${accountId}
        ${dateFilter}
        
        UNION ALL
        
        -- Transfers IN (to this account)
        SELECT 
          transfer_date as date,
          'Transfer from ' || (SELECT name FROM accounts WHERE id = from_account_id) as description,
          'TRANSFER_IN' as type,
          CAST(amount AS DECIMAL) as amount,
          created_at
        FROM account_transfers
        WHERE to_account_id = ${accountId}
        ${dateFilter}
      )
      SELECT 
        date,
        description,
        type,
        amount::float,
        SUM(amount) OVER (ORDER BY date, created_at)::float as balance
      FROM all_transactions
      ORDER BY date DESC, created_at DESC
    `);
    return result.rows as { date: string; description: string; type: string; amount: number; balance: number }[];
  }

  async createAccountTransfer(transfer: InsertAccountTransfer): Promise<AccountTransferWithDetails> {
    const [newTransfer] = await db.insert(accountTransfers).values(transfer).returning();
    
    const result = await db.query.accountTransfers.findFirst({
      where: eq(accountTransfers.id, newTransfer.id),
      with: {
        fromAccount: true,
        toAccount: true,
      },
    });
    return result as AccountTransferWithDetails;
  }

  async getAccountTransfers(): Promise<AccountTransferWithDetails[]> {
    const transfers = await db.query.accountTransfers.findMany({
      with: {
        fromAccount: true,
        toAccount: true,
      },
      orderBy: [desc(accountTransfers.transferDate), desc(accountTransfers.id)],
    });
    return transfers as AccountTransferWithDetails[];
  }

  // ==================== EXPENSE MODULE ====================

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).orderBy(expenseCategories.name);
  }

  async createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [newCategory] = await db.insert(expenseCategories).values(category).returning();
    return newCategory;
  }

  async updateExpenseCategory(id: number, category: InsertExpenseCategory): Promise<ExpenseCategory | undefined> {
    const [updated] = await db.update(expenseCategories).set(category).where(eq(expenseCategories.id, id)).returning();
    return updated || undefined;
  }

  async deleteExpenseCategory(id: number): Promise<{ deleted: boolean; error?: string }> {
    const linkedExpenses = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(eq(expenses.categoryId, id));
    
    if (linkedExpenses[0].count > 0) {
      return { 
        deleted: false, 
        error: `Cannot delete category: ${linkedExpenses[0].count} expense(s) are linked to this category` 
      };
    }
    
    const result = await db.delete(expenseCategories).where(eq(expenseCategories.id, id)).returning();
    return { deleted: result.length > 0 };
  }

  async getExpenses(): Promise<ExpenseWithDetails[]> {
    const expenseList = await db.query.expenses.findMany({
      with: {
        category: true,
        account: true,
      },
      orderBy: [desc(expenses.expenseDate), desc(expenses.id)],
    });
    return expenseList;
  }

  async getExpense(id: number): Promise<ExpenseWithDetails | undefined> {
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, id),
      with: {
        category: true,
        account: true,
      },
    });
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<ExpenseWithDetails> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return this.getExpense(newExpense.id) as Promise<ExpenseWithDetails>;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  // ==================== RETURNS MODULE ====================

  async getReturns(options?: { limit?: number; offset?: number }): Promise<{ data: ReturnWithDetails[]; total: number }> {
    const { limit, offset } = options || {};
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(returns);
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated data
    const returnList = await db.query.returns.findMany({
      with: {
        customer: true,
        supplier: true,
        lineItems: true,
      },
      orderBy: [desc(returns.returnDate), desc(returns.id)],
      limit: limit || 100,
      offset: offset || 0,
    });
    return { data: returnList as ReturnWithDetails[], total };
  }

  async getReturn(id: number): Promise<ReturnWithDetails | undefined> {
    const returnRecord = await db.query.returns.findFirst({
      where: eq(returns.id, id),
      with: {
        customer: true,
        supplier: true,
        lineItems: true,
      },
    });
    return returnRecord as ReturnWithDetails | undefined;
  }

  async createReturn(returnData: InsertReturn, lineItems: Omit<InsertReturnLineItem, 'returnId'>[]): Promise<ReturnWithDetails> {
    const [newReturn] = await db.insert(returns).values(returnData).returning();
    
    if (lineItems.length > 0) {
      const lineItemsWithReturnId = lineItems.map(item => ({
        ...item,
        returnId: newReturn.id,
      }));
      await db.insert(returnLineItems).values(lineItemsWithReturnId);
    }
    
    return this.getReturn(newReturn.id) as Promise<ReturnWithDetails>;
  }

  async deleteReturn(id: number): Promise<boolean> {
    const result = await db.delete(returns).where(eq(returns.id, id)).returning();
    return result.length > 0;
  }

  // ==================== ROLE PERMISSIONS ====================

  async getRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).orderBy(rolePermissions.role, rolePermissions.moduleName);
  }

  async updateRolePermission(role: string, moduleName: string, canAccess: number): Promise<void> {
    const existing = await db.select().from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.moduleName, moduleName)));
    
    if (existing.length > 0) {
      await db.update(rolePermissions)
        .set({ canAccess })
        .where(and(eq(rolePermissions.role, role), eq(rolePermissions.moduleName, moduleName)));
    } else {
      await db.insert(rolePermissions).values({ role, moduleName, canAccess });
    }
  }

  async ensureDefaultRolePermissions(): Promise<void> {
    const existing = await db.select().from(rolePermissions);
    if (existing.length > 0) return;

    const defaultPermissions: InsertRolePermission[] = [];
    for (const role of ROLE_TYPES) {
      for (const moduleName of MODULE_NAMES) {
        let canAccess = 1;
        if (role === "user") {
          if (moduleName === "settings") canAccess = 0;
        }
        if (role === "admin") {
          if (moduleName === "settings") canAccess = 0;
        }
        defaultPermissions.push({ role, moduleName, canAccess });
      }
    }
    
    await db.insert(rolePermissions).values(defaultPermissions);
  }

  async getModulesForRole(role: string): Promise<string[]> {
    const permissions = await db.select().from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.canAccess, 1)));
    return permissions.map(p => p.moduleName);
  }

  // ==================== USER ROLE ASSIGNMENTS ====================

  async getUserRoleAssignments(): Promise<UserRoleAssignmentWithBranch[]> {
    const result = await db.query.userRoleAssignments.findMany({
      with: {
        branch: true,
      },
      orderBy: [userRoleAssignments.email],
    });
    return result as UserRoleAssignmentWithBranch[];
  }

  async createUserRoleAssignment(assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment> {
    const [newAssignment] = await db.insert(userRoleAssignments).values(assignment).returning();
    return newAssignment;
  }

  async updateUserRoleAssignment(id: number, assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment | undefined> {
    const [updated] = await db.update(userRoleAssignments)
      .set(assignment)
      .where(eq(userRoleAssignments.id, id))
      .returning();
    return updated;
  }

  async deleteUserRoleAssignment(id: number): Promise<boolean> {
    const result = await db.delete(userRoleAssignments).where(eq(userRoleAssignments.id, id)).returning();
    return result.length > 0;
  }

  async getRoleForEmail(email: string): Promise<string> {
    const [assignment] = await db.select().from(userRoleAssignments)
      .where(eq(userRoleAssignments.email, email.toLowerCase()));
    return assignment?.role || "user";
  }

  async getBranchIdForEmail(email: string): Promise<number | null> {
    const [assignment] = await db.select().from(userRoleAssignments)
      .where(eq(userRoleAssignments.email, email.toLowerCase()));
    return assignment?.branchId || null;
  }

  // ==================== DISCOUNT MODULE ====================

  async getDiscounts(): Promise<DiscountWithDetails[]> {
    const result = await db.query.discounts.findMany({
      with: {
        customer: true,
        salesOrder: true,
      },
      orderBy: [desc(discounts.createdAt)],
    });
    return result as DiscountWithDetails[];
  }

  async getDiscount(id: number): Promise<DiscountWithDetails | undefined> {
    const result = await db.query.discounts.findFirst({
      where: eq(discounts.id, id),
      with: {
        customer: true,
        salesOrder: true,
      },
    });
    return result as DiscountWithDetails | undefined;
  }

  async createDiscount(discount: InsertDiscount): Promise<DiscountWithDetails> {
    const [newDiscount] = await db.insert(discounts).values(discount).returning();
    const result = await this.getDiscount(newDiscount.id);
    return result!;
  }

  async deleteDiscount(id: number): Promise<boolean> {
    const result = await db.delete(discounts).where(eq(discounts.id, id)).returning();
    return result.length > 0;
  }

  async getInvoicesForCustomer(customerId: number): Promise<{ id: number; invoiceNumber: string; totalKwd: string; outstandingBalance: string }[]> {
    // Get invoices with outstanding balance calculated
    // Note: Payments and returns are at customer level, not invoice level, so we only calculate discounts per invoice
    const result = await db.execute(sql`
      WITH invoice_discounts AS (
        SELECT 
          d.sales_order_id,
          COALESCE(SUM(CAST(d.discount_amount AS DECIMAL)), 0) as discounted
        FROM discounts d
        WHERE d.sales_order_id IN (SELECT id FROM sales_orders WHERE customer_id = ${customerId})
        GROUP BY d.sales_order_id
      )
      SELECT 
        so.id,
        so.invoice_number as "invoiceNumber",
        so.total_kwd as "totalKwd",
        (COALESCE(CAST(so.total_kwd AS DECIMAL), 0) - 
         COALESCE(id.discounted, 0))::text as "outstandingBalance"
      FROM sales_orders so
      LEFT JOIN invoice_discounts id ON id.sales_order_id = so.id
      WHERE so.customer_id = ${customerId}
      ORDER BY so.sale_date DESC
    `);
    
    return (result.rows as any[]).map(o => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber || `INV-${o.id}`,
      totalKwd: o.totalKwd || "0",
      outstandingBalance: o.outstandingBalance || "0",
    }));
  }

  async getInvoiceOutstandingBalance(salesOrderId: number): Promise<{ invoiceTotal: number; paidAmount: number; discountAmount: number; returnAmount: number; outstandingBalance: number }> {
    // Note: Payments and returns are tracked at customer level, not invoice level
    // paidAmount and returnAmount will be 0 until invoice-level tracking is implemented
    const result = await db.execute(sql`
      WITH invoice_data AS (
        SELECT 
          COALESCE(CAST(total_kwd AS DECIMAL), 0)::float as invoice_total
        FROM sales_orders
        WHERE id = ${salesOrderId}
      ),
      discount_amount AS (
        SELECT COALESCE(SUM(CAST(discount_amount AS DECIMAL)), 0)::float as total
        FROM discounts
        WHERE sales_order_id = ${salesOrderId}
      )
      SELECT 
        COALESCE((SELECT invoice_total FROM invoice_data), 0)::float as "invoiceTotal",
        0::float as "paidAmount",
        COALESCE((SELECT total FROM discount_amount), 0)::float as "discountAmount",
        0::float as "returnAmount",
        (COALESCE((SELECT invoice_total FROM invoice_data), 0) - 
         COALESCE((SELECT total FROM discount_amount), 0))::float as "outstandingBalance"
    `);
    
    const row = result.rows[0] as any;
    return {
      invoiceTotal: row?.invoiceTotal || 0,
      paidAmount: row?.paidAmount || 0,
      discountAmount: row?.discountAmount || 0,
      returnAmount: row?.returnAmount || 0,
      outstandingBalance: row?.outstandingBalance || 0,
    };
  }

  // ==================== CUSTOMER STATEMENT ====================

  async getCustomerStatementEntries(customerId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]> {
    let dateFilter = sql``;
    if (startDate && endDate) {
      dateFilter = sql`AND date >= ${startDate} AND date <= ${endDate}`;
    } else if (startDate) {
      dateFilter = sql`AND date >= ${startDate}`;
    } else if (endDate) {
      dateFilter = sql`AND date <= ${endDate}`;
    }

    const result = await db.execute(sql`
      WITH opening_balance AS (
        -- Opening balance for this customer
        SELECT 
          0 as id,
          COALESCE(effective_date, '2000-01-01'::date) as date,
          'opening' as type,
          'Opening Balance' as reference,
          'Opening Balance' as description,
          CASE 
            WHEN CAST(balance_amount AS DECIMAL) > 0 THEN CAST(balance_amount AS DECIMAL)::float
            ELSE 0::float
          END as debit,
          CASE 
            WHEN CAST(balance_amount AS DECIMAL) < 0 THEN ABS(CAST(balance_amount AS DECIMAL))::float
            ELSE 0::float
          END as credit,
          '2000-01-01 00:00:00'::timestamp as created_at
        FROM opening_balances
        WHERE party_type = 'customer' AND party_id = ${customerId}
      ),
      all_transactions AS (
        -- Opening balance entry (if exists)
        SELECT * FROM opening_balance
        
        UNION ALL
        
        -- Sales to this customer (they owe us - debit)
        SELECT 
          id,
          sale_date as date,
          'sale' as type,
          invoice_number as reference,
          'Sales Invoice' as description,
          COALESCE(CAST(total_kwd AS DECIMAL), 0)::float as debit,
          0::float as credit,
          created_at
        FROM sales_orders
        WHERE customer_id = ${customerId}
        ${dateFilter}
        
        UNION ALL
        
        -- Payments from this customer (they paid us - credit)
        SELECT 
          id,
          payment_date as date,
          'payment' as type,
          reference as reference,
          'Payment Received' as description,
          0::float as debit,
          COALESCE(CAST(amount AS DECIMAL), 0)::float as credit,
          created_at
        FROM payments
        WHERE customer_id = ${customerId} AND direction = 'IN'
        ${dateFilter}
        
        UNION ALL
        
        -- Sale Returns from this customer (reduces what they owe - credit)
        SELECT 
          id,
          return_date as date,
          'return' as type,
          return_number as reference,
          'Sales Return' as description,
          0::float as debit,
          COALESCE(CAST(total_kwd AS DECIMAL), 0)::float as credit,
          created_at
        FROM returns
        WHERE customer_id = ${customerId} AND return_type = 'sale_return'
        ${dateFilter}
        
        UNION ALL
        
        -- Discounts for this customer (reduces what they owe - credit)
        SELECT 
          id,
          created_at::date as date,
          'discount' as type,
          'DIS-' || id::text as reference,
          'Discount Applied' as description,
          0::float as debit,
          COALESCE(CAST(discount_amount AS DECIMAL), 0)::float as credit,
          created_at
        FROM discounts
        WHERE customer_id = ${customerId}
        ${dateFilter}
      )
      SELECT 
        id,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        type,
        COALESCE(reference, '') as reference,
        description,
        debit,
        credit,
        SUM(debit - credit) OVER (ORDER BY date, created_at) as balance
      FROM all_transactions
      ORDER BY date, created_at
    `);

    return result.rows as { id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[];
  }

  // Get customer's current outstanding balance (for credit limit validation before sale creation)
  async getCustomerCurrentBalance(customerId: number): Promise<number> {
    const result = await db.execute(sql`
      WITH opening_balance AS (
        SELECT 
          COALESCE(CAST(balance_amount AS DECIMAL), 0)::float as balance
        FROM opening_balances
        WHERE party_type = 'customer' AND party_id = ${customerId}
        LIMIT 1
      ),
      all_sales AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM sales_orders
        WHERE customer_id = ${customerId}
      ),
      all_payments AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total
        FROM payments
        WHERE customer_id = ${customerId} AND direction = 'IN'
      ),
      all_returns AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM returns
        WHERE customer_id = ${customerId} AND return_type = 'sale_return'
      ),
      all_discounts AS (
        SELECT COALESCE(SUM(CAST(discount_amount AS DECIMAL)), 0)::float as total
        FROM discounts
        WHERE customer_id = ${customerId}
      )
      SELECT 
        (COALESCE((SELECT balance FROM opening_balance), 0) + 
         COALESCE((SELECT total FROM all_sales), 0) - 
         COALESCE((SELECT total FROM all_payments), 0) - 
         COALESCE((SELECT total FROM all_returns), 0) -
         COALESCE((SELECT total FROM all_discounts), 0))::float as balance
    `);
    
    const row = result.rows[0] as { balance: number } | undefined;
    return row?.balance || 0;
  }

  // Get customer credit limit
  async getCustomerCreditLimit(customerId: number): Promise<number | null> {
    const customer = await this.getCustomer(customerId);
    if (!customer?.creditLimit) return null;
    return parseFloat(customer.creditLimit);
  }

  async getCustomerBalanceForSale(customerId: number, saleOrderId: number): Promise<{ previousBalance: number; currentBalance: number }> {
    const result = await db.execute(sql`
      WITH opening_balance AS (
        SELECT 
          COALESCE(CAST(balance_amount AS DECIMAL), 0)::float as balance
        FROM opening_balances
        WHERE party_type = 'customer' AND party_id = ${customerId}
        LIMIT 1
      ),
      target_sale AS (
        SELECT id, sale_date, created_at, COALESCE(CAST(total_kwd AS DECIMAL), 0)::float as amount
        FROM sales_orders 
        WHERE id = ${saleOrderId}
      ),
      sales_before AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM sales_orders
        WHERE customer_id = ${customerId}
          AND (sale_date < (SELECT sale_date FROM target_sale)
               OR (sale_date = (SELECT sale_date FROM target_sale) AND created_at < (SELECT created_at FROM target_sale)))
      ),
      payments_before AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total
        FROM payments
        WHERE customer_id = ${customerId} AND direction = 'IN'
          AND (payment_date < (SELECT sale_date FROM target_sale)
               OR (payment_date = (SELECT sale_date FROM target_sale) AND created_at < (SELECT created_at FROM target_sale)))
      ),
      returns_before AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM returns
        WHERE customer_id = ${customerId} AND return_type = 'sale_return'
          AND (return_date < (SELECT sale_date FROM target_sale)
               OR (return_date = (SELECT sale_date FROM target_sale) AND created_at < (SELECT created_at FROM target_sale)))
      ),
      discounts_before AS (
        SELECT COALESCE(SUM(CAST(discount_amount AS DECIMAL)), 0)::float as total
        FROM discounts
        WHERE customer_id = ${customerId}
          AND created_at < (SELECT created_at FROM target_sale)
      )
      SELECT 
        (COALESCE((SELECT balance FROM opening_balance), 0) + 
         COALESCE((SELECT total FROM sales_before), 0) - 
         COALESCE((SELECT total FROM payments_before), 0) - 
         COALESCE((SELECT total FROM returns_before), 0) -
         COALESCE((SELECT total FROM discounts_before), 0))::float as "previousBalance",
        (COALESCE((SELECT balance FROM opening_balance), 0) + 
         COALESCE((SELECT total FROM sales_before), 0) + 
         COALESCE((SELECT amount FROM target_sale), 0) - 
         COALESCE((SELECT total FROM payments_before), 0) - 
         COALESCE((SELECT total FROM returns_before), 0) -
         COALESCE((SELECT total FROM discounts_before), 0))::float as "currentBalance"
    `);
    
    const row = result.rows[0] as { previousBalance: number; currentBalance: number } | undefined;
    return {
      previousBalance: row?.previousBalance || 0,
      currentBalance: row?.currentBalance || 0,
    };
  }

  async getCustomerBalanceForReturn(customerId: number, returnId: number): Promise<{ previousBalance: number; returnAmount: number; currentBalance: number }> {
    const result = await db.execute(sql`
      WITH opening_balance AS (
        SELECT 
          COALESCE(CAST(balance_amount AS DECIMAL), 0)::float as balance
        FROM opening_balances
        WHERE party_type = 'customer' AND party_id = ${customerId}
        LIMIT 1
      ),
      target_return AS (
        SELECT id, return_date, created_at, COALESCE(CAST(total_kwd AS DECIMAL), 0)::float as amount
        FROM returns 
        WHERE id = ${returnId}
      ),
      sales_before AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM sales_orders
        WHERE customer_id = ${customerId}
          AND (sale_date < (SELECT return_date FROM target_return)
               OR (sale_date = (SELECT return_date FROM target_return) AND created_at < (SELECT created_at FROM target_return)))
      ),
      payments_before AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total
        FROM payments
        WHERE customer_id = ${customerId} AND direction = 'IN'
          AND (payment_date < (SELECT return_date FROM target_return)
               OR (payment_date = (SELECT return_date FROM target_return) AND created_at < (SELECT created_at FROM target_return)))
      ),
      returns_before AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM returns
        WHERE customer_id = ${customerId} AND return_type = 'sale_return'
          AND id != ${returnId}
          AND (return_date < (SELECT return_date FROM target_return)
               OR (return_date = (SELECT return_date FROM target_return) AND created_at < (SELECT created_at FROM target_return)))
      ),
      discounts_before AS (
        SELECT COALESCE(SUM(CAST(discount_amount AS DECIMAL)), 0)::float as total
        FROM discounts
        WHERE customer_id = ${customerId}
          AND created_at < (SELECT created_at FROM target_return)
      )
      SELECT 
        (COALESCE((SELECT balance FROM opening_balance), 0) + 
         COALESCE((SELECT total FROM sales_before), 0) - 
         COALESCE((SELECT total FROM payments_before), 0) - 
         COALESCE((SELECT total FROM returns_before), 0) -
         COALESCE((SELECT total FROM discounts_before), 0))::float as "previousBalance",
        COALESCE((SELECT amount FROM target_return), 0)::float as "returnAmount",
        (COALESCE((SELECT balance FROM opening_balance), 0) + 
         COALESCE((SELECT total FROM sales_before), 0) - 
         COALESCE((SELECT total FROM payments_before), 0) - 
         COALESCE((SELECT total FROM returns_before), 0) -
         COALESCE((SELECT total FROM discounts_before), 0) -
         COALESCE((SELECT amount FROM target_return), 0))::float as "currentBalance"
    `);
    
    const row = result.rows[0] as { previousBalance: number; returnAmount: number; currentBalance: number } | undefined;
    return {
      previousBalance: row?.previousBalance || 0,
      returnAmount: row?.returnAmount || 0,
      currentBalance: row?.currentBalance || 0,
    };
  }

  async getCustomerCurrentBalance(customerId: number): Promise<number> {
    const result = await db.execute(sql`
      WITH opening_balance AS (
        SELECT COALESCE(CAST(balance_amount AS DECIMAL), 0)::float as balance
        FROM opening_balances
        WHERE party_type = 'customer' AND party_id = ${customerId}
        LIMIT 1
      ),
      all_sales AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM sales_orders WHERE customer_id = ${customerId}
      ),
      all_payments AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total
        FROM payments WHERE customer_id = ${customerId} AND direction = 'IN'
      ),
      all_returns AS (
        SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
        FROM returns WHERE customer_id = ${customerId} AND return_type = 'sale_return'
      ),
      all_discounts AS (
        SELECT COALESCE(SUM(CAST(discount_amount AS DECIMAL)), 0)::float as total
        FROM discounts WHERE customer_id = ${customerId}
      )
      SELECT (
        COALESCE((SELECT balance FROM opening_balance), 0) +
        COALESCE((SELECT total FROM all_sales), 0) -
        COALESCE((SELECT total FROM all_payments), 0) -
        COALESCE((SELECT total FROM all_returns), 0) -
        COALESCE((SELECT total FROM all_discounts), 0)
      )::float as balance
    `);
    const row = result.rows[0] as { balance: number } | undefined;
    return row?.balance || 0;
  }

  async getAllCustomerBalances(): Promise<{ customerId: number; balance: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        c.id as "customerId",
        (
          COALESCE((SELECT CAST(balance_amount AS DECIMAL) FROM opening_balances WHERE party_type = 'customer' AND party_id = c.id LIMIT 1), 0) +
          COALESCE((SELECT SUM(CAST(total_kwd AS DECIMAL)) FROM sales_orders WHERE customer_id = c.id), 0) -
          COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM payments WHERE customer_id = c.id AND direction = 'IN'), 0) -
          COALESCE((SELECT SUM(CAST(total_kwd AS DECIMAL)) FROM returns WHERE customer_id = c.id AND return_type = 'sale_return'), 0) -
          COALESCE((SELECT SUM(CAST(discount_amount AS DECIMAL)) FROM discounts WHERE customer_id = c.id), 0)
        )::float as balance
      FROM customers c
      WHERE c.party_type = 'customer'
    `);
    return (result.rows as { customerId: number; balance: number }[]) || [];
  }

  // ==================== EXPORT IMEI ====================

  async getExportImei(filters: { customerId?: number; itemName?: string; invoiceNumber?: string; dateFrom?: string; dateTo?: string }): Promise<{ imei: string; itemName: string; customerName: string; invoiceNumber: string; saleDate: string }[]> {
    const conditions = [];
    
    if (filters.customerId && filters.customerId > 0) {
      conditions.push(eq(salesOrders.customerId, filters.customerId));
    }
    if (filters.itemName) {
      conditions.push(eq(salesOrderLineItems.itemName, filters.itemName));
    }
    if (filters.invoiceNumber) {
      conditions.push(sql`${salesOrders.invoiceNumber} ILIKE ${'%' + filters.invoiceNumber + '%'}`);
    }
    if (filters.dateFrom) {
      conditions.push(gte(salesOrders.invoiceDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(salesOrders.invoiceDate, filters.dateTo));
    }

    const query = db.select({
      imeiNumbers: salesOrderLineItems.imeiNumbers,
      itemName: salesOrderLineItems.itemName,
      customerName: customers.name,
      invoiceNumber: salesOrders.invoiceNumber,
      saleDate: salesOrders.invoiceDate,
    })
    .from(salesOrderLineItems)
    .innerJoin(salesOrders, eq(salesOrderLineItems.salesOrderId, salesOrders.id))
    .innerJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(salesOrders.invoiceDate));

    const results = await query;

    const flattened: { imei: string; itemName: string; customerName: string; invoiceNumber: string; saleDate: string }[] = [];
    
    for (const row of results) {
      if (row.imeiNumbers && row.imeiNumbers.length > 0) {
        for (const imei of row.imeiNumbers) {
          flattened.push({
            imei,
            itemName: row.itemName,
            customerName: row.customerName,
            invoiceNumber: row.invoiceNumber || "",
            saleDate: row.saleDate || "",
          });
        }
      }
    }

    return flattened;
  }

  // ==================== DASHBOARD ====================

  async getDashboardStats(): Promise<{ 
    stockAmount: number; 
    totalCredit: number; 
    totalDebit: number; 
    cashBalance: number; 
    bankAccountsBalance: number;
    monthlySales: number; 
    lastMonthSales: number;
    monthlyPurchases: number;
    salesTrend: number[];
    purchasesTrend: number[];
    totalExpenses: number;
  }> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get total stock amount (value in KWD based on purchase prices + opening stock)
    const stockResult = await db.execute(sql`
      WITH purchased AS (
        SELECT item_name, 
               COALESCE(SUM(quantity), 0) as qty,
               COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0) as amount
        FROM purchase_order_line_items
        GROUP BY item_name
      ),
      sold AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM sales_order_line_items
        GROUP BY item_name
      ),
      sale_returns AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'sale_return'
        GROUP BY rl.item_name
      ),
      purchase_returns AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'purchase_return'
        GROUP BY rl.item_name
      ),
      opening_stock AS (
        SELECT i.name as item_name, 
               COALESCE(SUM(ia.quantity), 0) as qty,
               COALESCE(SUM(ia.quantity * CAST(COALESCE(ia.unit_cost_kwd, '0') AS DECIMAL)), 0) as amount
        FROM inventory_adjustments ia
        JOIN items i ON ia.item_id = i.id
        GROUP BY i.name
      ),
      all_items AS (
        SELECT item_name FROM purchased
        UNION SELECT item_name FROM sold
        UNION SELECT item_name FROM sale_returns
        UNION SELECT item_name FROM purchase_returns
        UNION SELECT item_name FROM opening_stock
      ),
      stock_qty AS (
        SELECT ai.item_name,
               COALESCE(os.qty, 0) + COALESCE(p.qty, 0) - COALESCE(s.qty, 0) + COALESCE(sr.qty, 0) - COALESCE(pr.qty, 0) as net_qty,
               CASE 
                 WHEN COALESCE(os.qty, 0) + COALESCE(p.qty, 0) > 0 
                 THEN (COALESCE(os.amount, 0) + COALESCE(p.amount, 0)) / (COALESCE(os.qty, 0) + COALESCE(p.qty, 0))
                 ELSE 0 
               END as avg_cost
        FROM all_items ai
        LEFT JOIN purchased p ON ai.item_name = p.item_name
        LEFT JOIN sold s ON ai.item_name = s.item_name
        LEFT JOIN sale_returns sr ON ai.item_name = sr.item_name
        LEFT JOIN purchase_returns pr ON ai.item_name = pr.item_name
        LEFT JOIN opening_stock os ON ai.item_name = os.item_name
      )
      SELECT COALESCE(SUM(GREATEST(net_qty, 0) * avg_cost), 0)::float as total
      FROM stock_qty
    `);
    const stockAmount = (stockResult.rows[0] as { total: number })?.total || 0;

    // Get total credit (all IN payments)
    const creditResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total
      FROM payments
      WHERE direction = 'IN'
    `);
    const totalCredit = (creditResult.rows[0] as { total: number })?.total || 0;

    // Get total debit (all OUT payments + expenses)
    const debitResult = await db.execute(sql`
      SELECT 
        COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM payments WHERE direction = 'OUT'), 0) +
        COALESCE((SELECT SUM(CAST(amount AS DECIMAL)) FROM expenses), 0) as total
    `);
    const totalDebit = ((debitResult.rows[0] as { total: number })?.total || 0) as number;

    // Get individual account balances
    const accountsResult = await db.execute(sql`
      WITH payment_totals AS (
        SELECT 
          payment_type,
          SUM(CASE WHEN direction = 'IN' THEN CAST(amount AS DECIMAL) ELSE -CAST(amount AS DECIMAL) END) as net
        FROM payments
        GROUP BY payment_type
      ),
      expense_totals AS (
        SELECT 
          a.name as account_name,
          -SUM(CAST(e.amount AS DECIMAL)) as net
        FROM expenses e
        JOIN accounts a ON e.account_id = a.id
        GROUP BY a.name
      ),
      transfer_in AS (
        SELECT to_account_id as account_id, SUM(CAST(amount AS DECIMAL)) as amount
        FROM account_transfers
        GROUP BY to_account_id
      ),
      transfer_out AS (
        SELECT from_account_id as account_id, SUM(CAST(amount AS DECIMAL)) as amount
        FROM account_transfers
        GROUP BY from_account_id
      )
      SELECT 
        a.name,
        (COALESCE(p.net, 0) + COALESCE(e.net, 0) + COALESCE(ti.amount, 0) - COALESCE(tout.amount, 0))::float as balance
      FROM accounts a
      LEFT JOIN payment_totals p ON a.name = p.payment_type
      LEFT JOIN expense_totals e ON a.name = e.account_name
      LEFT JOIN transfer_in ti ON a.id = ti.account_id
      LEFT JOIN transfer_out tout ON a.id = tout.account_id
      ORDER BY a.id
    `);
    
    let cashBalance = 0;
    let bankAccountsBalance = 0;
    
    for (const row of accountsResult.rows as { name: string; balance: number }[]) {
      if (row.name === 'Cash') {
        cashBalance = row.balance || 0;
      } else {
        bankAccountsBalance += row.balance || 0;
      }
    }

    // Get current month sales
    const salesResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM sales_orders
      WHERE EXTRACT(MONTH FROM sale_date) = ${currentMonth}
      AND EXTRACT(YEAR FROM sale_date) = ${currentYear}
    `);
    const monthlySales = (salesResult.rows[0] as { total: number })?.total || 0;

    // Get last month sales for comparison
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonthSalesResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM sales_orders
      WHERE EXTRACT(MONTH FROM sale_date) = ${lastMonth}
      AND EXTRACT(YEAR FROM sale_date) = ${lastMonthYear}
    `);
    const lastMonthSales = (lastMonthSalesResult.rows[0] as { total: number })?.total || 0;

    // Get current month purchases
    const purchasesResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM purchase_orders
      WHERE EXTRACT(MONTH FROM purchase_date) = ${currentMonth}
      AND EXTRACT(YEAR FROM purchase_date) = ${currentYear}
    `);
    const monthlyPurchases = (purchasesResult.rows[0] as { total: number })?.total || 0;

    // Get 7-day sales trend
    const salesTrendResult = await db.execute(sql`
      SELECT 
        date_trunc('day', sale_date)::date as day,
        COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM sales_orders
      WHERE sale_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY date_trunc('day', sale_date)
      ORDER BY day
    `);
    const salesTrendMap = new Map<string, number>();
    for (const row of salesTrendResult.rows as { day: string; total: number }[]) {
      salesTrendMap.set(row.day, row.total);
    }
    const salesTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      salesTrend.push(salesTrendMap.get(dateStr) || 0);
    }

    // Get 7-day purchases trend
    const purchasesTrendResult = await db.execute(sql`
      SELECT 
        date_trunc('day', purchase_date)::date as day,
        COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM purchase_orders
      WHERE purchase_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY date_trunc('day', purchase_date)
      ORDER BY day
    `);
    const purchasesTrendMap = new Map<string, number>();
    for (const row of purchasesTrendResult.rows as { day: string; total: number }[]) {
      purchasesTrendMap.set(row.day, row.total);
    }
    const purchasesTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      purchasesTrend.push(purchasesTrendMap.get(dateStr) || 0);
    }

    // Get total expenses
    const expensesResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::float as total
      FROM expenses
    `);
    const totalExpenses = (expensesResult.rows[0] as { total: number })?.total || 0;

    return { stockAmount, totalCredit, totalDebit, cashBalance, bankAccountsBalance, monthlySales, lastMonthSales, monthlyPurchases, salesTrend, purchasesTrend, totalExpenses };
  }

  async getTopSellingItems(limit: number = 10): Promise<{ name: string; totalSales: number; quantity: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        sli.item_name as name,
        COALESCE(SUM(CAST(sli.total_kwd AS DECIMAL)), 0)::float as "totalSales",
        COALESCE(SUM(sli.quantity), 0)::int as quantity
      FROM sales_order_line_items sli
      JOIN sales_orders so ON sli.sales_order_id = so.id
      GROUP BY sli.item_name
      ORDER BY "totalSales" DESC
      LIMIT ${limit}
    `);
    return result.rows as { name: string; totalSales: number; quantity: number }[];
  }

  async globalSearch(query: string): Promise<{ type: string; id: number; title: string; subtitle: string; url: string }[]> {
    if (!query || query.trim().length < 2) return [];
    
    const searchPattern = `%${query.trim()}%`;
    const results: { type: string; id: number; title: string; subtitle: string; url: string }[] = [];

    // Search customers
    const customerResults = await db.execute(sql`
      SELECT id, name, phone FROM customers 
      WHERE name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern}
      LIMIT 5
    `);
    for (const row of customerResults.rows as { id: number; name: string; phone: string | null }[]) {
      results.push({ type: 'Customer', id: row.id, title: row.name, subtitle: row.phone || '', url: '/parties' });
    }

    // Search suppliers
    const supplierResults = await db.execute(sql`
      SELECT id, name, phone FROM suppliers 
      WHERE name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern}
      LIMIT 5
    `);
    for (const row of supplierResults.rows as { id: number; name: string; phone: string | null }[]) {
      results.push({ type: 'Supplier', id: row.id, title: row.name, subtitle: row.phone || '', url: '/parties' });
    }

    // Search items
    const itemResults = await db.execute(sql`
      SELECT id, name FROM items 
      WHERE name ILIKE ${searchPattern}
      LIMIT 5
    `);
    for (const row of itemResults.rows as { id: number; name: string }[]) {
      results.push({ type: 'Item', id: row.id, title: row.name, subtitle: '', url: '/items' });
    }

    // Search sales orders by invoice number
    const salesResults = await db.execute(sql`
      SELECT so.id, so.invoice_number, c.name as customer_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.invoice_number ILIKE ${searchPattern}
      LIMIT 5
    `);
    for (const row of salesResults.rows as { id: number; invoice_number: string; customer_name: string | null }[]) {
      results.push({ type: 'Sale', id: row.id, title: `Invoice: ${row.invoice_number}`, subtitle: row.customer_name || '', url: '/sales' });
    }

    // Search purchase orders by invoice number
    const purchaseResults = await db.execute(sql`
      SELECT po.id, po.invoice_number, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.invoice_number ILIKE ${searchPattern}
      LIMIT 5
    `);
    for (const row of purchaseResults.rows as { id: number; invoice_number: string; supplier_name: string | null }[]) {
      results.push({ type: 'Purchase', id: row.id, title: `Invoice: ${row.invoice_number}`, subtitle: row.supplier_name || '', url: '/' });
    }

    // Search payments by reference
    const paymentResults = await db.execute(sql`
      SELECT id, reference, payment_type FROM payments 
      WHERE reference ILIKE ${searchPattern}
      LIMIT 5
    `);
    for (const row of paymentResults.rows as { id: number; reference: string | null; payment_type: string }[]) {
      results.push({ type: 'Payment', id: row.id, title: row.reference || 'Payment', subtitle: row.payment_type, url: '/payments' });
    }

    return results.slice(0, 20);
  }

  // ==================== PROFIT AND LOSS ====================

  async getProfitAndLoss(startDate: string, endDate: string, branchId?: number): Promise<{
    netSales: number;
    saleReturns: number;
    grossSales: number;
    costOfGoodsSold: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expensesByCategory: { category: string; amount: number }[];
  }> {
    const branchFilter = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    
    // Get gross sales (total sales in date range)
    const salesResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM sales_orders
      WHERE sale_date >= ${startDate} AND sale_date <= ${endDate}
      ${branchFilter}
    `);
    const grossSales = (salesResult.rows[0] as { total: number })?.total || 0;

    // Get sale returns in date range
    const saleReturnsResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM returns
      WHERE return_type = 'sale_return' 
      AND return_date >= ${startDate} AND return_date <= ${endDate}
      ${branchFilter}
    `);
    const saleReturns = (saleReturnsResult.rows[0] as { total: number })?.total || 0;

    // Net Sales = Gross Sales - Sale Returns
    const netSales = grossSales - saleReturns;

    // Get purchases in date range (COGS component)
    const purchasesResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM purchase_orders
      WHERE purchase_date >= ${startDate} AND purchase_date <= ${endDate}
      ${branchFilter}
    `);
    const purchases = (purchasesResult.rows[0] as { total: number })?.total || 0;

    // Get purchase returns in date range
    const purchaseReturnsResult = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total_kwd AS DECIMAL)), 0)::float as total
      FROM returns
      WHERE return_type = 'purchase_return' 
      AND return_date >= ${startDate} AND return_date <= ${endDate}
      ${branchFilter}
    `);
    const purchaseReturns = (purchaseReturnsResult.rows[0] as { total: number })?.total || 0;

    // Cost of Goods Sold = Purchases - Purchase Returns
    // Note: For simplicity, we're using purchases method rather than inventory-based COGS
    const costOfGoodsSold = purchases - purchaseReturns;

    // Gross Profit = Net Sales - COGS
    const grossProfit = netSales - costOfGoodsSold;

    // Get total expenses by category in date range
    const expensesResult = await db.execute(sql`
      SELECT 
        COALESCE(ec.name, 'Uncategorized') as category,
        COALESCE(SUM(CAST(e.amount AS DECIMAL)), 0)::float as amount
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.expense_date >= ${startDate} AND e.expense_date <= ${endDate}
      ${branchId ? sql`AND e.branch_id = ${branchId}` : sql``}
      GROUP BY ec.name
      ORDER BY amount DESC
    `);
    const expensesByCategory = expensesResult.rows as { category: string; amount: number }[];

    // Total expenses
    const totalExpenses = expensesByCategory.reduce((sum, e) => sum + e.amount, 0);

    // Net Profit = Gross Profit - Total Expenses
    const netProfit = grossProfit - totalExpenses;

    return {
      netSales,
      saleReturns,
      grossSales,
      costOfGoodsSold,
      grossProfit,
      totalExpenses,
      netProfit,
      expensesByCategory,
    };
  }

  // ==================== BRANCHES ====================

  async getBranches(): Promise<Branch[]> {
    return await db.select().from(branches).orderBy(branches.name);
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch || undefined;
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [newBranch] = await db.insert(branches).values(branch).returning();
    return newBranch;
  }

  async updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch | undefined> {
    const [updated] = await db.update(branches).set(branch).where(eq(branches.id, id)).returning();
    return updated || undefined;
  }

  async deleteBranch(id: number): Promise<{ deleted: boolean; error?: string }> {
    // Check if this is the default branch
    const branchRecord = await this.getBranch(id);
    if (branchRecord?.isDefault) {
      return { deleted: false, error: "Cannot delete the default branch" };
    }

    // Check for linked data
    const linkedCustomers = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.branchId, id));
    if (linkedCustomers[0].count > 0) {
      return { deleted: false, error: `Cannot delete branch: ${linkedCustomers[0].count} customer(s) are linked to this branch` };
    }

    const result = await db.delete(branches).where(eq(branches.id, id)).returning();
    return { deleted: result.length > 0 };
  }

  async getDefaultBranch(): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.isDefault, 1));
    return branch || undefined;
  }

  // ==================== STOCK TRANSFERS ====================

  async getStockTransfers(): Promise<StockTransferWithDetails[]> {
    const transfers = await db.select().from(stockTransfers).orderBy(desc(stockTransfers.transferDate));
    
    const result: StockTransferWithDetails[] = [];
    for (const transfer of transfers) {
      const fromBranch = await this.getBranch(transfer.fromBranchId);
      const toBranch = await this.getBranch(transfer.toBranchId);
      const lineItems = await db.select().from(stockTransferLineItems).where(eq(stockTransferLineItems.stockTransferId, transfer.id));
      
      result.push({
        ...transfer,
        fromBranch: fromBranch!,
        toBranch: toBranch!,
        lineItems,
      });
    }
    return result;
  }

  async getStockTransfer(id: number): Promise<StockTransferWithDetails | undefined> {
    const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, id));
    if (!transfer) return undefined;

    const fromBranch = await this.getBranch(transfer.fromBranchId);
    const toBranch = await this.getBranch(transfer.toBranchId);
    const lineItems = await db.select().from(stockTransferLineItems).where(eq(stockTransferLineItems.stockTransferId, transfer.id));

    return {
      ...transfer,
      fromBranch: fromBranch!,
      toBranch: toBranch!,
      lineItems,
    };
  }

  async createStockTransfer(transfer: InsertStockTransfer, lineItems: Omit<InsertStockTransferLineItem, 'stockTransferId'>[]): Promise<StockTransferWithDetails> {
    const [newTransfer] = await db.insert(stockTransfers).values(transfer).returning();

    const lineItemsWithId = lineItems.map(item => ({
      ...item,
      stockTransferId: newTransfer.id,
    }));

    if (lineItemsWithId.length > 0) {
      await db.insert(stockTransferLineItems).values(lineItemsWithId);
    }

    return (await this.getStockTransfer(newTransfer.id))!;
  }

  async deleteStockTransfer(id: number): Promise<boolean> {
    const result = await db.delete(stockTransfers).where(eq(stockTransfers.id, id)).returning();
    return result.length > 0;
  }

  // Opening Balances Module
  async getInventoryAdjustments(branchId?: number): Promise<InventoryAdjustmentWithDetails[]> {
    const adjustments = branchId 
      ? await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.branchId, branchId)).orderBy(desc(inventoryAdjustments.effectiveDate))
      : await db.select().from(inventoryAdjustments).orderBy(desc(inventoryAdjustments.effectiveDate));
    
    const result: InventoryAdjustmentWithDetails[] = [];
    for (const adjustment of adjustments) {
      const item = await this.getItem(adjustment.itemId);
      const branch = await this.getBranch(adjustment.branchId);
      result.push({
        ...adjustment,
        item: item!,
        branch: branch!,
      });
    }
    return result;
  }

  async getInventoryAdjustment(id: number): Promise<InventoryAdjustmentWithDetails | undefined> {
    const [adjustment] = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.id, id));
    if (!adjustment) return undefined;

    const item = await this.getItem(adjustment.itemId);
    const branch = await this.getBranch(adjustment.branchId);
    
    return {
      ...adjustment,
      item: item!,
      branch: branch!,
    };
  }

  async createInventoryAdjustment(adjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment> {
    const [newAdjustment] = await db.insert(inventoryAdjustments).values(adjustment).returning();
    return newAdjustment;
  }

  async updateInventoryAdjustment(id: number, adjustment: Partial<InsertInventoryAdjustment>): Promise<InventoryAdjustment | undefined> {
    const [updated] = await db.update(inventoryAdjustments).set(adjustment).where(eq(inventoryAdjustments.id, id)).returning();
    return updated || undefined;
  }

  async deleteInventoryAdjustment(id: number): Promise<boolean> {
    const result = await db.delete(inventoryAdjustments).where(eq(inventoryAdjustments.id, id)).returning();
    return result.length > 0;
  }

  async getOpeningBalances(branchId?: number): Promise<OpeningBalanceWithDetails[]> {
    const balances = branchId
      ? await db.select().from(openingBalances).where(eq(openingBalances.branchId, branchId)).orderBy(desc(openingBalances.effectiveDate))
      : await db.select().from(openingBalances).orderBy(desc(openingBalances.effectiveDate));
    
    const result: OpeningBalanceWithDetails[] = [];
    for (const balance of balances) {
      const branch = balance.branchId ? await this.getBranch(balance.branchId) : undefined;
      let partyName = "";
      if (balance.partyType === "customer") {
        const customer = await this.getCustomer(balance.partyId);
        partyName = customer?.name || "Unknown Customer";
      } else if (balance.partyType === "supplier") {
        const supplier = await this.getSupplier(balance.partyId);
        partyName = supplier?.name || "Unknown Supplier";
      }
      result.push({
        ...balance,
        branch,
        partyName,
      });
    }
    return result;
  }

  async getOpeningBalance(id: number): Promise<OpeningBalance | undefined> {
    const [balance] = await db.select().from(openingBalances).where(eq(openingBalances.id, id));
    return balance || undefined;
  }

  async createOpeningBalance(balance: InsertOpeningBalance): Promise<OpeningBalance> {
    const [newBalance] = await db.insert(openingBalances).values(balance).returning();
    return newBalance;
  }

  async updateOpeningBalance(id: number, balance: Partial<InsertOpeningBalance>): Promise<OpeningBalance | undefined> {
    const [updated] = await db.update(openingBalances).set(balance).where(eq(openingBalances.id, id)).returning();
    return updated || undefined;
  }

  async deleteOpeningBalance(id: number): Promise<boolean> {
    const result = await db.delete(openingBalances).where(eq(openingBalances.id, id)).returning();
    return result.length > 0;
  }

  // ==================== PURCHASE ORDER DRAFTS ====================

  async getNextPONumber(): Promise<string> {
    const [result] = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(po_number FROM 4) AS INTEGER)), 0)` })
      .from(purchaseOrderDrafts);
    const nextNum = (result?.maxNum || 0) + 1;
    return `PO-${String(nextNum).padStart(5, '0')}`;
  }

  async getPurchaseOrderDrafts(options?: { status?: string; branchId?: number }): Promise<PurchaseOrderDraftWithDetails[]> {
    let query = db.select().from(purchaseOrderDrafts).orderBy(desc(purchaseOrderDrafts.poDate));
    
    const conditions = [];
    if (options?.status) {
      conditions.push(eq(purchaseOrderDrafts.status, options.status));
    }
    if (options?.branchId) {
      conditions.push(eq(purchaseOrderDrafts.branchId, options.branchId));
    }
    
    const pods = conditions.length > 0
      ? await db.select().from(purchaseOrderDrafts).where(and(...conditions)).orderBy(desc(purchaseOrderDrafts.poDate))
      : await db.select().from(purchaseOrderDrafts).orderBy(desc(purchaseOrderDrafts.poDate));

    const result: PurchaseOrderDraftWithDetails[] = [];
    for (const pod of pods) {
      const supplier = pod.supplierId ? await this.getSupplier(pod.supplierId) : null;
      const lineItems = await db.select().from(purchaseOrderDraftItems).where(eq(purchaseOrderDraftItems.purchaseOrderDraftId, pod.id));
      result.push({
        ...pod,
        supplier,
        lineItems,
      });
    }
    return result;
  }

  async getPurchaseOrderDraft(id: number): Promise<PurchaseOrderDraftWithDetails | undefined> {
    const [pod] = await db.select().from(purchaseOrderDrafts).where(eq(purchaseOrderDrafts.id, id));
    if (!pod) return undefined;

    const supplier = pod.supplierId ? await this.getSupplier(pod.supplierId) : null;
    const lineItems = await db.select().from(purchaseOrderDraftItems).where(eq(purchaseOrderDraftItems.purchaseOrderDraftId, pod.id));

    return {
      ...pod,
      supplier,
      lineItems,
    };
  }

  async createPurchaseOrderDraft(pod: InsertPurchaseOrderDraft, lineItems: Omit<InsertPODraftItem, 'purchaseOrderDraftId'>[]): Promise<PurchaseOrderDraftWithDetails> {
    const [newPod] = await db.insert(purchaseOrderDrafts).values(pod).returning();

    const insertedLineItems: PODraftItem[] = [];
    for (const item of lineItems) {
      const [insertedItem] = await db.insert(purchaseOrderDraftItems).values({
        ...item,
        purchaseOrderDraftId: newPod.id,
      }).returning();
      insertedLineItems.push(insertedItem);
    }

    const supplier = newPod.supplierId ? await this.getSupplier(newPod.supplierId) : null;

    return {
      ...newPod,
      supplier,
      lineItems: insertedLineItems,
    };
  }

  async updatePurchaseOrderDraft(id: number, pod: Partial<InsertPurchaseOrderDraft>, lineItems?: Omit<InsertPODraftItem, 'purchaseOrderDraftId'>[]): Promise<PurchaseOrderDraftWithDetails | undefined> {
    const [updatedPod] = await db.update(purchaseOrderDrafts).set({
      ...pod,
      updatedAt: new Date(),
    }).where(eq(purchaseOrderDrafts.id, id)).returning();

    if (!updatedPod) return undefined;

    if (lineItems) {
      await db.delete(purchaseOrderDraftItems).where(eq(purchaseOrderDraftItems.purchaseOrderDraftId, id));
      for (const item of lineItems) {
        await db.insert(purchaseOrderDraftItems).values({
          ...item,
          purchaseOrderDraftId: id,
        });
      }
    }

    return this.getPurchaseOrderDraft(id);
  }

  async updatePurchaseOrderDraftStatus(id: number, status: string): Promise<PurchaseOrderDraft | undefined> {
    const [updated] = await db.update(purchaseOrderDrafts).set({
      status,
      updatedAt: new Date(),
    }).where(eq(purchaseOrderDrafts.id, id)).returning();
    return updated || undefined;
  }

  async deletePurchaseOrderDraft(id: number): Promise<boolean> {
    const result = await db.delete(purchaseOrderDrafts).where(eq(purchaseOrderDrafts.id, id)).returning();
    return result.length > 0;
  }

  async convertPurchaseOrderDraftToBill(id: number, additionalData: { invoiceNumber?: string; grnDate?: string }): Promise<PurchaseOrderWithDetails> {
    const pod = await this.getPurchaseOrderDraft(id);
    if (!pod) {
      throw new Error("Purchase Order Draft not found");
    }

    if (pod.status === "converted") {
      throw new Error("This PO has already been converted to a bill");
    }

    // Create Purchase Order (bill) from draft
    const purchaseOrder = await this.createPurchaseOrder(
      {
        purchaseDate: pod.poDate,
        invoiceNumber: additionalData.invoiceNumber || pod.poNumber,
        supplierId: pod.supplierId,
        totalKwd: pod.totalKwd,
        fxCurrency: pod.fxCurrency,
        fxRate: pod.fxRate,
        totalFx: pod.totalFx,
        branchId: pod.branchId,
        createdBy: pod.createdBy,
        grnDate: additionalData.grnDate || null,
      },
      pod.lineItems.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        priceKwd: item.priceKwd,
        fxPrice: item.fxPrice,
        totalKwd: item.totalKwd,
      }))
    );

    // Update draft status to converted
    await db.update(purchaseOrderDrafts).set({
      status: "converted",
      convertedToPurchaseId: purchaseOrder.id,
      updatedAt: new Date(),
    }).where(eq(purchaseOrderDrafts.id, id));

    return purchaseOrder;
  }

  // App Settings
  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.settingKey, key));
    return setting?.settingValue ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    let valueToStore = value;
    
    if (key === 'transaction_password' && value) {
      valueToStore = await bcrypt.hash(value, 10);
    }
    
    const existing = await this.getSetting(key);
    if (existing !== null) {
      await db.update(appSettings).set({
        settingValue: valueToStore,
        updatedAt: new Date(),
      }).where(eq(appSettings.settingKey, key));
    } else {
      await db.insert(appSettings).values({
        settingKey: key,
        settingValue: valueToStore,
      });
    }
  }

  async verifyTransactionPassword(password: string): Promise<boolean> {
    const storedHash = await this.getSetting('transaction_password');
    if (!storedHash) {
      return true; // No password set, allow all operations
    }
    if (!password) {
      return false; // Password required but not provided
    }
    return await bcrypt.compare(password, storedHash);
  }

  // IMEI Tracking Module
  async searchImei(query: string): Promise<ImeiInventoryWithDetails[]> {
    const searchPattern = `%${query}%`;
    const results = await db
      .select()
      .from(imeiInventory)
      .leftJoin(items, eq(imeiInventory.itemId, items.id))
      .leftJoin(branches, eq(imeiInventory.currentBranchId, branches.id))
      .leftJoin(suppliers, eq(imeiInventory.supplierId, suppliers.id))
      .leftJoin(customers, eq(imeiInventory.customerId, customers.id))
      .where(
        sql`${imeiInventory.imei} ILIKE ${searchPattern} OR ${imeiInventory.itemName} ILIKE ${searchPattern}`
      )
      .orderBy(desc(imeiInventory.createdAt))
      .limit(50);

    return results.map(r => ({
      ...r.imei_inventory,
      item: r.items || null,
      currentBranch: r.branches || null,
      supplier: r.suppliers || null,
      customer: r.customers || null,
    }));
  }

  async getImeiByNumber(imei: string): Promise<ImeiInventoryWithDetails | undefined> {
    const results = await db
      .select()
      .from(imeiInventory)
      .leftJoin(items, eq(imeiInventory.itemId, items.id))
      .leftJoin(branches, eq(imeiInventory.currentBranchId, branches.id))
      .leftJoin(suppliers, eq(imeiInventory.supplierId, suppliers.id))
      .leftJoin(customers, eq(imeiInventory.customerId, customers.id))
      .leftJoin(purchaseOrders, eq(imeiInventory.purchaseOrderId, purchaseOrders.id))
      .leftJoin(salesOrders, eq(imeiInventory.salesOrderId, salesOrders.id))
      .where(eq(imeiInventory.imei, imei))
      .limit(1);

    if (results.length === 0) return undefined;

    const r = results[0];
    const events = await this.getImeiHistory(r.imei_inventory.id);
    
    return {
      ...r.imei_inventory,
      item: r.items || null,
      currentBranch: r.branches || null,
      supplier: r.suppliers || null,
      customer: r.customers || null,
      purchaseOrder: r.purchase_orders || null,
      salesOrder: r.sales_orders || null,
      events,
    };
  }

  async getImeiHistory(imeiId: number): Promise<ImeiEventWithDetails[]> {
    const results = await db
      .select()
      .from(imeiEvents)
      .leftJoin(branches, eq(imeiEvents.fromBranchId, branches.id))
      .leftJoin(customers, eq(imeiEvents.customerId, customers.id))
      .leftJoin(suppliers, eq(imeiEvents.supplierId, suppliers.id))
      .where(eq(imeiEvents.imeiId, imeiId))
      .orderBy(desc(imeiEvents.eventDate));

    // Need to do a separate join for toBranch
    const eventIds = results.map(r => r.imei_events.id);
    const toBranchResults = eventIds.length > 0 
      ? await db.select().from(imeiEvents).leftJoin(branches, eq(imeiEvents.toBranchId, branches.id)).where(sql`${imeiEvents.id} IN ${eventIds}`)
      : [];
    
    const toBranchMap = new Map(toBranchResults.map(r => [r.imei_events.id, r.branches]));

    return results.map(r => ({
      ...r.imei_events,
      fromBranch: r.branches || null,
      toBranch: toBranchMap.get(r.imei_events.id) || null,
      customer: r.customers || null,
      supplier: r.suppliers || null,
    }));
  }

  async createImeiRecord(data: InsertImeiInventory): Promise<ImeiInventory> {
    const [record] = await db.insert(imeiInventory).values(data).returning();
    return record;
  }

  async updateImeiRecord(id: number, data: Partial<InsertImeiInventory>): Promise<ImeiInventory | undefined> {
    const [updated] = await db.update(imeiInventory).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(imeiInventory.id, id)).returning();
    return updated || undefined;
  }

  async addImeiEvent(event: InsertImeiEvent): Promise<ImeiEvent> {
    const [created] = await db.insert(imeiEvents).values(event).returning();
    return created;
  }

  async processImeiFromPurchase(
    imeiNumbers: string[], 
    itemName: string, 
    purchaseOrderId: number, 
    supplierId: number | null, 
    purchaseDate: string, 
    priceKwd: string | null,
    branchId: number | null,
    createdBy: string | null
  ): Promise<void> {
    // Find item ID by name
    const [item] = await db.select().from(items).where(eq(items.name, itemName)).limit(1);
    const itemId = item?.id || null;

    for (const imei of imeiNumbers) {
      if (!imei || imei.trim() === '') continue;
      
      const trimmedImei = imei.trim();
      
      // Check if IMEI already exists
      const existing = await db.select().from(imeiInventory).where(eq(imeiInventory.imei, trimmedImei)).limit(1);
      
      if (existing.length === 0) {
        // Create new IMEI record
        const [record] = await db.insert(imeiInventory).values({
          imei: trimmedImei,
          itemName,
          itemId,
          status: 'in_stock',
          currentBranchId: branchId,
          purchaseOrderId,
          purchaseDate,
          purchasePriceKwd: priceKwd,
          supplierId,
        }).returning();

        // Add purchase event
        await db.insert(imeiEvents).values({
          imeiId: record.id,
          eventType: 'purchased',
          eventDate: new Date(),
          referenceType: 'purchase_order',
          referenceId: purchaseOrderId,
          toBranchId: branchId,
          supplierId,
          priceKwd,
          notes: `Purchased from supplier`,
          createdBy,
        });
      }
    }
  }

  async processImeiFromSale(
    imeiNumbers: string[], 
    itemName: string, 
    salesOrderId: number, 
    customerId: number | null, 
    saleDate: string, 
    priceKwd: string | null,
    branchId: number | null,
    createdBy: string | null
  ): Promise<void> {
    for (const imei of imeiNumbers) {
      if (!imei || imei.trim() === '') continue;
      
      const trimmedImei = imei.trim();
      
      // Find existing IMEI record
      const [existing] = await db.select().from(imeiInventory).where(eq(imeiInventory.imei, trimmedImei)).limit(1);
      
      if (existing) {
        // Update IMEI record
        await db.update(imeiInventory).set({
          status: 'sold',
          salesOrderId,
          saleDate,
          salePriceKwd: priceKwd,
          customerId,
          updatedAt: new Date(),
        }).where(eq(imeiInventory.id, existing.id));

        // Add sale event
        await db.insert(imeiEvents).values({
          imeiId: existing.id,
          eventType: 'sold',
          eventDate: new Date(),
          referenceType: 'sales_order',
          referenceId: salesOrderId,
          fromBranchId: branchId,
          customerId,
          priceKwd,
          notes: `Sold to customer`,
          createdBy,
        });
      } else {
        // IMEI not in system yet - create it and mark as sold
        const [item] = await db.select().from(items).where(eq(items.name, itemName)).limit(1);
        const itemId = item?.id || null;

        const [record] = await db.insert(imeiInventory).values({
          imei: trimmedImei,
          itemName,
          itemId,
          status: 'sold',
          currentBranchId: branchId,
          salesOrderId,
          saleDate,
          salePriceKwd: priceKwd,
          customerId,
        }).returning();

        await db.insert(imeiEvents).values({
          imeiId: record.id,
          eventType: 'sold',
          eventDate: new Date(),
          referenceType: 'sales_order',
          referenceId: salesOrderId,
          fromBranchId: branchId,
          customerId,
          priceKwd,
          notes: `Sold to customer (IMEI created at sale)`,
          createdBy,
        });
      }
    }
  }

  async processImeiFromReturn(
    imeiNumbers: string[], 
    returnType: string, 
    returnId: number, 
    customerId: number | null, 
    supplierId: number | null,
    branchId: number | null,
    createdBy: string | null
  ): Promise<void> {
    const eventType = returnType === 'sale_return' ? 'sale_returned' : 'purchase_returned';
    const newStatus = returnType === 'sale_return' ? 'returned' : 'returned';

    for (const imei of imeiNumbers) {
      if (!imei || imei.trim() === '') continue;
      
      const trimmedImei = imei.trim();
      
      // Find existing IMEI record
      const [existing] = await db.select().from(imeiInventory).where(eq(imeiInventory.imei, trimmedImei)).limit(1);
      
      if (existing) {
        // Update IMEI status
        await db.update(imeiInventory).set({
          status: newStatus,
          currentBranchId: returnType === 'sale_return' ? branchId : null,
          updatedAt: new Date(),
        }).where(eq(imeiInventory.id, existing.id));

        // Add return event
        await db.insert(imeiEvents).values({
          imeiId: existing.id,
          eventType,
          eventDate: new Date(),
          referenceType: 'return',
          referenceId: returnId,
          toBranchId: returnType === 'sale_return' ? branchId : null,
          customerId: returnType === 'sale_return' ? customerId : null,
          supplierId: returnType === 'purchase_return' ? supplierId : null,
          notes: returnType === 'sale_return' ? 'Returned by customer' : 'Returned to supplier',
          createdBy,
        });
      }
    }
  }

  // ==================== STOCK AGING REPORT ====================

  async getStockAging(filters?: { 
    itemName?: string; 
    supplierId?: number;
    branchId?: number;
  }): Promise<{
    summary: {
      bucket0to30: { quantity: number; value: number };
      bucket31to60: { quantity: number; value: number };
      bucket61to90: { quantity: number; value: number };
      bucket90plus: { quantity: number; value: number };
      total: { quantity: number; value: number };
    };
    details: Array<{
      itemName: string;
      supplierName: string | null;
      totalQty: number;
      totalValue: number;
      qty0to30: number;
      value0to30: number;
      qty31to60: number;
      value31to60: number;
      qty61to90: number;
      value61to90: number;
      qty90plus: number;
      value90plus: number;
      oldestDate: string | null;
    }>;
  }> {
    const today = new Date();
    
    // Build filter conditions
    let itemFilter = '';
    let supplierFilter = '';
    
    if (filters?.itemName) {
      itemFilter = `AND poli.item_name ILIKE '%${filters.itemName}%'`;
    }
    if (filters?.supplierId) {
      supplierFilter = `AND po.supplier_id = ${filters.supplierId}`;
    }

    // Calculate stock aging using FIFO approach
    // Get all purchase lots with their dates and remaining quantities
    const result = await db.execute(sql.raw(`
      WITH purchase_lots AS (
        SELECT 
          poli.item_name,
          po.supplier_id,
          s.name as supplier_name,
          COALESCE(po.grn_date, po.purchase_date) as received_date,
          poli.quantity as purchased_qty,
          COALESCE(CAST(poli.price_kwd AS DECIMAL), 0) as unit_price,
          COALESCE(CAST(poli.total_kwd AS DECIMAL), 0) as total_amount,
          ROW_NUMBER() OVER (PARTITION BY poli.item_name ORDER BY COALESCE(po.grn_date, po.purchase_date)) as lot_order
        FROM purchase_order_line_items poli
        JOIN purchase_orders po ON poli.purchase_order_id = po.id
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE 1=1 ${itemFilter} ${supplierFilter}
      ),
      sold_qty AS (
        SELECT item_name, COALESCE(SUM(quantity), 0) as qty
        FROM sales_order_line_items
        GROUP BY item_name
      ),
      purchase_returns_qty AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'purchase_return'
        GROUP BY rl.item_name
      ),
      sale_returns_qty AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'sale_return'
        GROUP BY rl.item_name
      ),
      net_consumed AS (
        SELECT 
          COALESCE(s.item_name, pr.item_name, sr.item_name) as item_name,
          COALESCE(s.qty, 0) + COALESCE(pr.qty, 0) - COALESCE(sr.qty, 0) as consumed_qty
        FROM sold_qty s
        FULL OUTER JOIN purchase_returns_qty pr ON s.item_name = pr.item_name
        FULL OUTER JOIN sale_returns_qty sr ON COALESCE(s.item_name, pr.item_name) = sr.item_name
      ),
      remaining_stock AS (
        SELECT 
          pl.item_name,
          pl.supplier_name,
          pl.received_date,
          pl.unit_price,
          pl.purchased_qty,
          pl.lot_order,
          COALESCE(nc.consumed_qty, 0) as total_consumed,
          SUM(pl.purchased_qty) OVER (PARTITION BY pl.item_name ORDER BY pl.lot_order) as cumulative_purchased
        FROM purchase_lots pl
        LEFT JOIN net_consumed nc ON pl.item_name = nc.item_name
      ),
      stock_with_remaining AS (
        SELECT 
          item_name,
          supplier_name,
          received_date,
          unit_price,
          purchased_qty,
          total_consumed,
          cumulative_purchased,
          GREATEST(0, LEAST(purchased_qty, cumulative_purchased - total_consumed)) as remaining_qty,
          CASE 
            WHEN cumulative_purchased <= total_consumed THEN 0
            WHEN cumulative_purchased - purchased_qty >= total_consumed THEN purchased_qty
            ELSE cumulative_purchased - total_consumed
          END as fifo_remaining
        FROM remaining_stock
      ),
      aged_stock AS (
        SELECT 
          item_name,
          supplier_name,
          received_date,
          unit_price,
          fifo_remaining as qty,
          fifo_remaining * unit_price as value,
          (CURRENT_DATE - received_date::date) as age_days
        FROM stock_with_remaining
        WHERE fifo_remaining > 0
      )
      SELECT 
        item_name as "itemName",
        supplier_name as "supplierName",
        SUM(qty)::integer as "totalQty",
        COALESCE(SUM(value), 0)::float as "totalValue",
        COALESCE(SUM(CASE WHEN age_days <= 30 THEN qty ELSE 0 END), 0)::integer as "qty0to30",
        COALESCE(SUM(CASE WHEN age_days <= 30 THEN value ELSE 0 END), 0)::float as "value0to30",
        COALESCE(SUM(CASE WHEN age_days > 30 AND age_days <= 60 THEN qty ELSE 0 END), 0)::integer as "qty31to60",
        COALESCE(SUM(CASE WHEN age_days > 30 AND age_days <= 60 THEN value ELSE 0 END), 0)::float as "value31to60",
        COALESCE(SUM(CASE WHEN age_days > 60 AND age_days <= 90 THEN qty ELSE 0 END), 0)::integer as "qty61to90",
        COALESCE(SUM(CASE WHEN age_days > 60 AND age_days <= 90 THEN value ELSE 0 END), 0)::float as "value61to90",
        COALESCE(SUM(CASE WHEN age_days > 90 THEN qty ELSE 0 END), 0)::integer as "qty90plus",
        COALESCE(SUM(CASE WHEN age_days > 90 THEN value ELSE 0 END), 0)::float as "value90plus",
        MIN(received_date) as "oldestDate"
      FROM aged_stock
      GROUP BY item_name, supplier_name
      ORDER BY item_name
    `));

    const details = result.rows as Array<{
      itemName: string;
      supplierName: string | null;
      totalQty: number;
      totalValue: number;
      qty0to30: number;
      value0to30: number;
      qty31to60: number;
      value31to60: number;
      qty61to90: number;
      value61to90: number;
      qty90plus: number;
      value90plus: number;
      oldestDate: string | null;
    }>;

    // Calculate summary totals
    const summary = {
      bucket0to30: { quantity: 0, value: 0 },
      bucket31to60: { quantity: 0, value: 0 },
      bucket61to90: { quantity: 0, value: 0 },
      bucket90plus: { quantity: 0, value: 0 },
      total: { quantity: 0, value: 0 },
    };

    for (const row of details) {
      summary.bucket0to30.quantity += row.qty0to30 || 0;
      summary.bucket0to30.value += row.value0to30 || 0;
      summary.bucket31to60.quantity += row.qty31to60 || 0;
      summary.bucket31to60.value += row.value31to60 || 0;
      summary.bucket61to90.quantity += row.qty61to90 || 0;
      summary.bucket61to90.value += row.value61to90 || 0;
      summary.bucket90plus.quantity += row.qty90plus || 0;
      summary.bucket90plus.value += row.value90plus || 0;
      summary.total.quantity += row.totalQty || 0;
      summary.total.value += row.totalValue || 0;
    }

    return { summary, details };
  }

  // ==================== BACKUP HELPER METHODS ====================

  async getAllPurchaseLineItems(): Promise<LineItem[]> {
    return await db.select().from(purchaseOrderLineItems);
  }

  async getAllSalesLineItems(): Promise<SalesLineItem[]> {
    return await db.select().from(salesOrderLineItems);
  }

  async getAllReturnLineItems(): Promise<ReturnLineItem[]> {
    return await db.select().from(returnLineItems);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(data: { username: string; password: string; firstName?: string | null; lastName?: string | null; email?: string | null; role: string }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        username: data.username,
        password: data.password,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: data.email || null,
        role: data.role,
      })
      .returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<{ firstName: string | null; lastName: string | null; email: string | null; role: string; password: string }>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.purchaseDate));
  }

  async getAllSalesOrders(): Promise<SalesOrder[]> {
    return await db.select().from(salesOrders).orderBy(desc(salesOrders.saleDate));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.paymentDate));
  }

  // ==================== ALL TRANSACTIONS ====================
  
  async getAllTransactions(options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    modules?: string[];
    branchId?: number;
    partyId?: number;
    search?: string;
  }): Promise<{ data: AllTransaction[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    // Build WHERE conditions
    let dateFilter = '';
    let branchFilter = '';
    let partyFilter = '';
    let searchFilter = '';
    let moduleFilter = '';

    if (options?.startDate) {
      dateFilter += ` AND transaction_date >= '${options.startDate}'`;
    }
    if (options?.endDate) {
      dateFilter += ` AND transaction_date <= '${options.endDate}'`;
    }
    if (options?.branchId) {
      branchFilter = ` AND branch_id = ${options.branchId}`;
    }
    if (options?.partyId) {
      partyFilter = ` AND party_id = ${options.partyId}`;
    }
    if (options?.search) {
      const searchTerm = options.search.replace(/'/g, "''");
      searchFilter = ` AND (reference ILIKE '%${searchTerm}%' OR party_name ILIKE '%${searchTerm}%' OR notes ILIKE '%${searchTerm}%')`;
    }
    if (options?.modules && options.modules.length > 0) {
      const moduleList = options.modules.map(m => `'${m}'`).join(',');
      moduleFilter = ` AND module IN (${moduleList})`;
    }

    const whereClause = `WHERE 1=1 ${dateFilter} ${branchFilter} ${partyFilter} ${searchFilter} ${moduleFilter}`;

    // Union query across all transaction types
    const unionQuery = `
      WITH all_transactions AS (
        -- Sales
        SELECT 
          'sales-' || so.id::text as id,
          so.sale_date::text as transaction_date,
          'sales' as module,
          COALESCE(so.invoice_number, 'SO-' || so.id::text) as reference,
          so.customer_id as party_id,
          c.name as party_name,
          'customer' as party_type,
          so.branch_id,
          b.name as branch_name,
          COALESCE(so.total_kwd, '0') as amount_kwd,
          so.total_fx::text as amount_fx,
          so.fx_currency,
          so.fx_rate::text as fx_rate,
          NULL as notes,
          so.created_by,
          so.created_at::text
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN branches b ON so.branch_id = b.id

        UNION ALL

        -- Purchases
        SELECT 
          'purchase-' || po.id::text as id,
          po.purchase_date::text as transaction_date,
          'purchase' as module,
          COALESCE(po.invoice_number, 'PO-' || po.id::text) as reference,
          po.supplier_id as party_id,
          s.name as party_name,
          'supplier' as party_type,
          po.branch_id,
          b.name as branch_name,
          COALESCE(po.total_kwd, '0') as amount_kwd,
          po.total_fx::text as amount_fx,
          po.fx_currency,
          po.fx_rate::text as fx_rate,
          NULL as notes,
          po.created_by,
          po.created_at::text
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN branches b ON po.branch_id = b.id

        UNION ALL

        -- Payment IN (from customers)
        SELECT 
          'payment_in-' || p.id::text as id,
          p.payment_date::text as transaction_date,
          'payment_in' as module,
          COALESCE(p.reference, 'PAY-' || p.id::text) as reference,
          p.customer_id as party_id,
          c.name as party_name,
          'customer' as party_type,
          p.branch_id,
          b.name as branch_name,
          COALESCE(p.amount, '0') as amount_kwd,
          p.fx_amount::text as amount_fx,
          p.fx_currency,
          p.fx_rate::text as fx_rate,
          p.notes,
          p.created_by,
          p.created_at::text
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN branches b ON p.branch_id = b.id
        WHERE p.direction = 'IN'

        UNION ALL

        -- Payment OUT (to suppliers)
        SELECT 
          'payment_out-' || p.id::text as id,
          p.payment_date::text as transaction_date,
          'payment_out' as module,
          COALESCE(p.reference, 'PAY-' || p.id::text) as reference,
          p.supplier_id as party_id,
          s.name as party_name,
          'supplier' as party_type,
          p.branch_id,
          b.name as branch_name,
          COALESCE(p.amount, '0') as amount_kwd,
          p.fx_amount::text as amount_fx,
          p.fx_currency,
          p.fx_rate::text as fx_rate,
          p.notes,
          p.created_by,
          p.created_at::text
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN branches b ON p.branch_id = b.id
        WHERE p.direction = 'OUT'

        UNION ALL

        -- Sale Returns
        SELECT 
          'sale_return-' || r.id::text as id,
          r.return_date::text as transaction_date,
          'sale_return' as module,
          COALESCE(r.return_number, 'RET-' || r.id::text) as reference,
          r.customer_id as party_id,
          c.name as party_name,
          'customer' as party_type,
          r.branch_id,
          b.name as branch_name,
          COALESCE(r.total_kwd, '0') as amount_kwd,
          NULL as amount_fx,
          NULL as fx_currency,
          NULL as fx_rate,
          r.notes,
          r.created_by,
          r.created_at::text
        FROM returns r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN branches b ON r.branch_id = b.id
        WHERE r.return_type = 'sale_return'

        UNION ALL

        -- Purchase Returns
        SELECT 
          'purchase_return-' || r.id::text as id,
          r.return_date::text as transaction_date,
          'purchase_return' as module,
          COALESCE(r.return_number, 'RET-' || r.id::text) as reference,
          r.supplier_id as party_id,
          s.name as party_name,
          'supplier' as party_type,
          r.branch_id,
          b.name as branch_name,
          COALESCE(r.total_kwd, '0') as amount_kwd,
          NULL as amount_fx,
          NULL as fx_currency,
          NULL as fx_rate,
          r.notes,
          r.created_by,
          r.created_at::text
        FROM returns r
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        LEFT JOIN branches b ON r.branch_id = b.id
        WHERE r.return_type = 'purchase_return'

        UNION ALL

        -- Expenses
        SELECT 
          'expense-' || e.id::text as id,
          e.expense_date::text as transaction_date,
          'expense' as module,
          COALESCE(e.reference, 'EXP-' || e.id::text) as reference,
          NULL::integer as party_id,
          NULL as party_name,
          NULL as party_type,
          e.branch_id,
          b.name as branch_name,
          COALESCE(e.amount, '0') as amount_kwd,
          NULL as amount_fx,
          NULL as fx_currency,
          NULL as fx_rate,
          e.description as notes,
          e.created_by,
          e.created_at::text
        FROM expenses e
        LEFT JOIN branches b ON e.branch_id = b.id

        UNION ALL

        -- Discounts
        SELECT 
          'discount-' || d.id::text as id,
          d.created_at::date::text as transaction_date,
          'discount' as module,
          'DIS-' || d.id::text as reference,
          d.customer_id as party_id,
          c.name as party_name,
          'customer' as party_type,
          NULL::integer as branch_id,
          NULL as branch_name,
          COALESCE(d.discount_amount, '0') as amount_kwd,
          NULL as amount_fx,
          NULL as fx_currency,
          NULL as fx_rate,
          d.notes,
          d.created_by,
          d.created_at::text
        FROM discounts d
        LEFT JOIN customers c ON d.customer_id = c.id
      )
      SELECT * FROM all_transactions
      ${whereClause}
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      WITH all_transactions AS (
        SELECT so.sale_date as transaction_date, so.customer_id as party_id, COALESCE(so.invoice_number, 'SO-' || so.id::text) as reference, c.name as party_name, NULL as notes, 'sales' as module, so.branch_id
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id

        UNION ALL

        SELECT po.purchase_date as transaction_date, po.supplier_id as party_id, COALESCE(po.invoice_number, 'PO-' || po.id::text) as reference, s.name as party_name, NULL as notes, 'purchase' as module, po.branch_id
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id

        UNION ALL

        SELECT p.payment_date as transaction_date, p.customer_id as party_id, COALESCE(p.reference, 'PAY-' || p.id::text) as reference, c.name as party_name, p.notes, 'payment_in' as module, p.branch_id
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        WHERE p.direction = 'IN'

        UNION ALL

        SELECT p.payment_date as transaction_date, p.supplier_id as party_id, COALESCE(p.reference, 'PAY-' || p.id::text) as reference, s.name as party_name, p.notes, 'payment_out' as module, p.branch_id
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.direction = 'OUT'

        UNION ALL

        SELECT r.return_date as transaction_date, r.customer_id as party_id, COALESCE(r.return_number, 'RET-' || r.id::text) as reference, c.name as party_name, r.notes, 'sale_return' as module, r.branch_id
        FROM returns r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE r.return_type = 'sale_return'

        UNION ALL

        SELECT r.return_date as transaction_date, r.supplier_id as party_id, COALESCE(r.return_number, 'RET-' || r.id::text) as reference, s.name as party_name, r.notes, 'purchase_return' as module, r.branch_id
        FROM returns r
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        WHERE r.return_type = 'purchase_return'

        UNION ALL

        SELECT e.expense_date as transaction_date, NULL::integer as party_id, COALESCE(e.reference, 'EXP-' || e.id::text) as reference, NULL as party_name, e.description as notes, 'expense' as module, e.branch_id
        FROM expenses e

        UNION ALL

        SELECT d.created_at::date as transaction_date, d.customer_id as party_id, 'DIS-' || d.id::text as reference, c.name as party_name, d.notes, 'discount' as module, NULL::integer as branch_id
        FROM discounts d
        LEFT JOIN customers c ON d.customer_id = c.id
      )
      SELECT COUNT(*) as total FROM all_transactions
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      db.execute(sql.raw(unionQuery)),
      db.execute(sql.raw(countQuery))
    ]);

    const data: AllTransaction[] = (dataResult.rows as any[]).map((row: any) => ({
      id: row.id,
      transactionDate: row.transaction_date,
      module: row.module,
      reference: row.reference,
      partyId: row.party_id,
      partyName: row.party_name,
      partyType: row.party_type,
      branchId: row.branch_id,
      branchName: row.branch_name,
      amountKwd: row.amount_kwd,
      amountFx: row.amount_fx,
      fxCurrency: row.fx_currency,
      fxRate: row.fx_rate,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }));

    const total = Number((countResult.rows as any[])[0]?.total ?? 0);

    return { data, total };
  }

  // ==================== Document Verification ====================

  async createOrGetDocumentVerification(data: Omit<InsertDocumentVerification, 'verificationCode'>): Promise<DocumentVerification> {
    // Check if verification already exists for this document
    const existing = await db.select()
      .from(documentVerifications)
      .where(and(
        eq(documentVerifications.documentType, data.documentType),
        eq(documentVerifications.documentId, data.documentId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Generate a unique verification code
    const verificationCode = this.generateVerificationCode();

    const [verification] = await db.insert(documentVerifications)
      .values({
        ...data,
        verificationCode,
      })
      .returning();

    return verification;
  }

  async getDocumentVerification(code: string): Promise<DocumentVerification | undefined> {
    const [verification] = await db.select()
      .from(documentVerifications)
      .where(eq(documentVerifications.verificationCode, code))
      .limit(1);

    return verification;
  }

  private generateVerificationCode(): string {
    // Generate a secure, URL-safe verification code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ==================== Audit Trail ====================

  async createAuditLog(data: InsertAuditTrail): Promise<AuditTrail> {
    const [audit] = await db.insert(auditTrail)
      .values(data)
      .returning();
    return audit;
  }

  async getAuditLogs(options?: {
    module?: string;
    recordId?: number;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AuditTrailWithDetails[]; total: number }> {
    const conditions = [];
    
    if (options?.module) {
      conditions.push(eq(auditTrail.module, options.module));
    }
    if (options?.recordId) {
      conditions.push(eq(auditTrail.recordId, options.recordId));
    }
    if (options?.userId) {
      conditions.push(eq(auditTrail.userId, options.userId));
    }
    if (options?.fromDate) {
      conditions.push(gte(auditTrail.createdAt, new Date(options.fromDate)));
    }
    if (options?.toDate) {
      conditions.push(lte(auditTrail.createdAt, new Date(options.toDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db.select()
        .from(auditTrail)
        .leftJoin(users, eq(auditTrail.userId, users.id))
        .leftJoin(branches, eq(auditTrail.branchId, branches.id))
        .where(whereClause)
        .orderBy(desc(auditTrail.createdAt))
        .limit(options?.limit ?? 100)
        .offset(options?.offset ?? 0),
      db.select({ count: sql<number>`count(*)` })
        .from(auditTrail)
        .where(whereClause),
    ]);

    const audits: AuditTrailWithDetails[] = data.map(row => ({
      ...row.audit_trail,
      user: row.users || null,
      branch: row.branches || null,
    }));

    return { data: audits, total: Number(countResult[0]?.count ?? 0) };
  }

  async getAuditLogsForRecord(module: string, recordId: number): Promise<AuditTrail[]> {
    return await db.select()
      .from(auditTrail)
      .where(and(
        eq(auditTrail.module, module),
        eq(auditTrail.recordId, recordId)
      ))
      .orderBy(desc(auditTrail.createdAt));
  }

  // Helper to detect changed fields between two objects
  getChangedFields(previousData: any, newData: any): string[] {
    if (!previousData || !newData) return [];
    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(previousData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(previousData[key]) !== JSON.stringify(newData[key])) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }

  // ============================================================
  // LANDED COST VOUCHERS
  // ============================================================

  async getLandedCostVouchers(options?: { branchId?: number }): Promise<LandedCostVoucherWithDetails[]> {
    const conditions = [];
    if (options?.branchId) {
      conditions.push(eq(landedCostVouchers.branchId, options.branchId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const vouchersList = await db.select()
      .from(landedCostVouchers)
      .leftJoin(purchaseOrders, eq(landedCostVouchers.purchaseOrderId, purchaseOrders.id))
      .leftJoin(suppliers, eq(landedCostVouchers.partyId, suppliers.id))
      .leftJoin(payments, eq(landedCostVouchers.paymentId, payments.id))
      .where(whereClause)
      .orderBy(desc(landedCostVouchers.createdAt));

    const result: LandedCostVoucherWithDetails[] = [];
    for (const row of vouchersList) {
      const lineItemsList = await db.select()
        .from(landedCostLineItems)
        .where(eq(landedCostLineItems.voucherId, row.landed_cost_vouchers.id))
        .orderBy(landedCostLineItems.id);

      // Fetch partner party separately if exists
      let partnerParty: Supplier | null = null;
      if (row.landed_cost_vouchers.partnerPartyId) {
        const [pp] = await db.select().from(suppliers).where(eq(suppliers.id, row.landed_cost_vouchers.partnerPartyId));
        partnerParty = pp || null;
      }

      // Fetch DXB→KWI logistics party separately if exists
      let dxbKwiParty: Supplier | null = null;
      if (row.landed_cost_vouchers.dxbKwiPartyId) {
        const [dkp] = await db.select().from(suppliers).where(eq(suppliers.id, row.landed_cost_vouchers.dxbKwiPartyId));
        dxbKwiParty = dkp || null;
      }

      // Fetch packing party separately if exists
      let packingParty: Supplier | null = null;
      if (row.landed_cost_vouchers.packingPartyId) {
        const [pkp] = await db.select().from(suppliers).where(eq(suppliers.id, row.landed_cost_vouchers.packingPartyId));
        packingParty = pkp || null;
      }

      // Fetch partner payment separately if exists
      let partnerPayment: Payment | null = null;
      if (row.landed_cost_vouchers.partnerPaymentId) {
        const [pPmt] = await db.select().from(payments).where(eq(payments.id, row.landed_cost_vouchers.partnerPaymentId));
        partnerPayment = pPmt || null;
      }

      // Fetch packing payment separately if exists
      let packingPayment: Payment | null = null;
      if (row.landed_cost_vouchers.packingPaymentId) {
        const [pkPmt] = await db.select().from(payments).where(eq(payments.id, row.landed_cost_vouchers.packingPaymentId));
        packingPayment = pkPmt || null;
      }

      // Fetch DXB→KWI freight payment separately if exists
      let dxbKwiPayment: Payment | null = null;
      if (row.landed_cost_vouchers.dxbKwiPaymentId) {
        const [dkPmt] = await db.select().from(payments).where(eq(payments.id, row.landed_cost_vouchers.dxbKwiPaymentId));
        dxbKwiPayment = dkPmt || null;
      }

      // Fetch all linked purchase orders from junction table
      const linkedPOs = await db.select()
        .from(landedCostVoucherPurchaseOrders)
        .leftJoin(purchaseOrders, eq(landedCostVoucherPurchaseOrders.purchaseOrderId, purchaseOrders.id))
        .where(eq(landedCostVoucherPurchaseOrders.voucherId, row.landed_cost_vouchers.id))
        .orderBy(landedCostVoucherPurchaseOrders.sortOrder);

      // Build full PO details with line items
      const purchaseOrdersWithDetails: PurchaseOrderWithDetails[] = [];
      for (const linkedPO of linkedPOs) {
        if (linkedPO.purchase_orders) {
          const poLineItems = await db.select()
            .from(purchaseOrderLineItems)
            .where(eq(purchaseOrderLineItems.purchaseOrderId, linkedPO.purchase_orders.id));
          const [supplierRow] = linkedPO.purchase_orders.supplierId 
            ? await db.select().from(suppliers).where(eq(suppliers.id, linkedPO.purchase_orders.supplierId))
            : [null];
          purchaseOrdersWithDetails.push({
            ...linkedPO.purchase_orders,
            supplier: supplierRow || null,
            lineItems: poLineItems,
          });
        }
      }

      result.push({
        ...row.landed_cost_vouchers,
        purchaseOrder: row.purchase_orders || null,
        purchaseOrders: purchaseOrdersWithDetails,
        party: row.suppliers || null,
        dxbKwiParty,
        partnerParty,
        packingParty,
        payment: row.payments || null,
        dxbKwiPayment,
        partnerPayment,
        packingPayment,
        lineItems: lineItemsList,
      });
    }

    return result;
  }

  async getLandedCostVoucher(id: number): Promise<LandedCostVoucherWithDetails | undefined> {
    const [voucherRow] = await db.select()
      .from(landedCostVouchers)
      .leftJoin(purchaseOrders, eq(landedCostVouchers.purchaseOrderId, purchaseOrders.id))
      .leftJoin(suppliers, eq(landedCostVouchers.partyId, suppliers.id))
      .leftJoin(payments, eq(landedCostVouchers.paymentId, payments.id))
      .where(eq(landedCostVouchers.id, id));

    if (!voucherRow) return undefined;

    const lineItemsList = await db.select()
      .from(landedCostLineItems)
      .where(eq(landedCostLineItems.voucherId, id))
      .orderBy(landedCostLineItems.id);

    // Fetch partner party separately if exists
    let partnerParty: Supplier | null = null;
    if (voucherRow.landed_cost_vouchers.partnerPartyId) {
      const [pp] = await db.select().from(suppliers).where(eq(suppliers.id, voucherRow.landed_cost_vouchers.partnerPartyId));
      partnerParty = pp || null;
    }

    // Fetch DXB→KWI logistics party separately if exists
    let dxbKwiParty: Supplier | null = null;
    if (voucherRow.landed_cost_vouchers.dxbKwiPartyId) {
      const [dkp] = await db.select().from(suppliers).where(eq(suppliers.id, voucherRow.landed_cost_vouchers.dxbKwiPartyId));
      dxbKwiParty = dkp || null;
    }

    // Fetch packing party separately if exists
    let packingParty: Supplier | null = null;
    if (voucherRow.landed_cost_vouchers.packingPartyId) {
      const [pkp] = await db.select().from(suppliers).where(eq(suppliers.id, voucherRow.landed_cost_vouchers.packingPartyId));
      packingParty = pkp || null;
    }

    // Fetch partner payment separately if exists
    let partnerPayment: Payment | null = null;
    if (voucherRow.landed_cost_vouchers.partnerPaymentId) {
      const [pPmt] = await db.select().from(payments).where(eq(payments.id, voucherRow.landed_cost_vouchers.partnerPaymentId));
      partnerPayment = pPmt || null;
    }

    // Fetch packing payment separately if exists
    let packingPayment: Payment | null = null;
    if (voucherRow.landed_cost_vouchers.packingPaymentId) {
      const [pkPmt] = await db.select().from(payments).where(eq(payments.id, voucherRow.landed_cost_vouchers.packingPaymentId));
      packingPayment = pkPmt || null;
    }

    // Fetch DXB→KWI freight payment separately if exists
    let dxbKwiPayment: Payment | null = null;
    if (voucherRow.landed_cost_vouchers.dxbKwiPaymentId) {
      const [dkPmt] = await db.select().from(payments).where(eq(payments.id, voucherRow.landed_cost_vouchers.dxbKwiPaymentId));
      dxbKwiPayment = dkPmt || null;
    }

    // Fetch all linked purchase orders from junction table
    const linkedPOs = await db.select()
      .from(landedCostVoucherPurchaseOrders)
      .leftJoin(purchaseOrders, eq(landedCostVoucherPurchaseOrders.purchaseOrderId, purchaseOrders.id))
      .where(eq(landedCostVoucherPurchaseOrders.voucherId, id))
      .orderBy(landedCostVoucherPurchaseOrders.sortOrder);

    // Build full PO details with line items
    const purchaseOrdersWithDetails: PurchaseOrderWithDetails[] = [];
    for (const linkedPO of linkedPOs) {
      if (linkedPO.purchase_orders) {
        const poLineItems = await db.select()
          .from(purchaseOrderLineItems)
          .where(eq(purchaseOrderLineItems.purchaseOrderId, linkedPO.purchase_orders.id));
        const [supplierRow] = linkedPO.purchase_orders.supplierId 
          ? await db.select().from(suppliers).where(eq(suppliers.id, linkedPO.purchase_orders.supplierId))
          : [null];
        purchaseOrdersWithDetails.push({
          ...linkedPO.purchase_orders,
          supplier: supplierRow || null,
          lineItems: poLineItems,
        });
      }
    }

    return {
      ...voucherRow.landed_cost_vouchers,
      purchaseOrder: voucherRow.purchase_orders || null,
      purchaseOrders: purchaseOrdersWithDetails,
      party: voucherRow.suppliers || null,
      dxbKwiParty,
      partnerParty,
      packingParty,
      payment: voucherRow.payments || null,
      dxbKwiPayment,
      partnerPayment,
      packingPayment,
      lineItems: lineItemsList,
    };
  }

  async getLandedCostVoucherByPO(purchaseOrderId: number): Promise<LandedCostVoucherWithDetails | undefined> {
    const [voucherRow] = await db.select()
      .from(landedCostVouchers)
      .leftJoin(purchaseOrders, eq(landedCostVouchers.purchaseOrderId, purchaseOrders.id))
      .leftJoin(suppliers, eq(landedCostVouchers.partyId, suppliers.id))
      .leftJoin(payments, eq(landedCostVouchers.paymentId, payments.id))
      .where(eq(landedCostVouchers.purchaseOrderId, purchaseOrderId));

    if (!voucherRow) return undefined;

    const lineItemsList = await db.select()
      .from(landedCostLineItems)
      .where(eq(landedCostLineItems.voucherId, voucherRow.landed_cost_vouchers.id))
      .orderBy(landedCostLineItems.id);

    // Fetch partner party separately if exists
    let partnerParty: Supplier | null = null;
    if (voucherRow.landed_cost_vouchers.partnerPartyId) {
      const [pp] = await db.select().from(suppliers).where(eq(suppliers.id, voucherRow.landed_cost_vouchers.partnerPartyId));
      partnerParty = pp || null;
    }

    // Fetch DXB→KWI logistics party separately if exists
    let dxbKwiParty: Supplier | null = null;
    if (voucherRow.landed_cost_vouchers.dxbKwiPartyId) {
      const [dkp] = await db.select().from(suppliers).where(eq(suppliers.id, voucherRow.landed_cost_vouchers.dxbKwiPartyId));
      dxbKwiParty = dkp || null;
    }

    // Fetch packing party separately if exists
    let packingParty: Supplier | null = null;
    if (voucherRow.landed_cost_vouchers.packingPartyId) {
      const [pkp] = await db.select().from(suppliers).where(eq(suppliers.id, voucherRow.landed_cost_vouchers.packingPartyId));
      packingParty = pkp || null;
    }

    // Fetch partner payment separately if exists
    let partnerPayment: Payment | null = null;
    if (voucherRow.landed_cost_vouchers.partnerPaymentId) {
      const [pPmt] = await db.select().from(payments).where(eq(payments.id, voucherRow.landed_cost_vouchers.partnerPaymentId));
      partnerPayment = pPmt || null;
    }

    // Fetch packing payment separately if exists
    let packingPayment: Payment | null = null;
    if (voucherRow.landed_cost_vouchers.packingPaymentId) {
      const [pkPmt] = await db.select().from(payments).where(eq(payments.id, voucherRow.landed_cost_vouchers.packingPaymentId));
      packingPayment = pkPmt || null;
    }

    // Fetch DXB→KWI freight payment separately if exists
    let dxbKwiPayment: Payment | null = null;
    if (voucherRow.landed_cost_vouchers.dxbKwiPaymentId) {
      const [dkPmt] = await db.select().from(payments).where(eq(payments.id, voucherRow.landed_cost_vouchers.dxbKwiPaymentId));
      dxbKwiPayment = dkPmt || null;
    }

    return {
      ...voucherRow.landed_cost_vouchers,
      purchaseOrder: voucherRow.purchase_orders || null,
      purchaseOrders: [],
      party: voucherRow.suppliers || null,
      dxbKwiParty,
      partnerParty,
      packingParty,
      payment: voucherRow.payments || null,
      dxbKwiPayment,
      partnerPayment,
      packingPayment,
      lineItems: lineItemsList,
    };
  }

  async createLandedCostVoucher(
    voucher: InsertLandedCostVoucher, 
    lineItems: Omit<InsertLandedCostLineItem, 'voucherId'>[],
    purchaseOrderIds?: number[]
  ): Promise<LandedCostVoucherWithDetails> {
    // Use transaction to ensure atomic operations - voucher, line items, PO links, and item cost updates all succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Generate voucher number atomically inside transaction to avoid duplicates
      const maxNumResult = await tx.execute(sql`
        SELECT MAX(CAST(SUBSTRING(voucher_number FROM 5) AS INTEGER)) as max_num 
        FROM landed_cost_vouchers 
        WHERE voucher_number LIKE 'LCV-%'
        FOR UPDATE
      `);
      const maxNumRows = maxNumResult.rows as { max_num: number | null }[];
      const maxNum = maxNumRows[0]?.max_num || 0;
      const voucherNumber = `LCV-${(maxNum + 1).toString().padStart(4, "0")}`;
      
      const [newVoucher] = await tx.insert(landedCostVouchers).values({
        ...voucher,
        voucherNumber, // Override with transaction-safe generated number
      }).returning();

      // Insert links to purchase orders in junction table
      const poIds = purchaseOrderIds && purchaseOrderIds.length > 0 
        ? purchaseOrderIds 
        : (voucher.purchaseOrderId ? [voucher.purchaseOrderId] : []);
      
      for (let i = 0; i < poIds.length; i++) {
        await tx.insert(landedCostVoucherPurchaseOrders).values({
          voucherId: newVoucher.id,
          purchaseOrderId: poIds[i],
          sortOrder: i,
        });
      }

      const createdLineItems: LandedCostLineItem[] = [];
      for (const li of lineItems) {
        const [newItem] = await tx.insert(landedCostLineItems)
          .values({ ...li, voucherId: newVoucher.id })
          .returning();
        createdLineItems.push(newItem);
        
        // Update item's landed cost (allow zero values)
        if (li.itemName && li.landedCostPerUnitKwd !== undefined && li.landedCostPerUnitKwd !== null) {
          await tx.update(items)
            .set({ landedCostKwd: li.landedCostPerUnitKwd })
            .where(eq(items.name, li.itemName));
        }
      }

      return { newVoucher, poIds, createdLineItems };
    });

    const { newVoucher, poIds, createdLineItems } = result;

    // Fetch related data outside transaction (read-only operations)
    let poRow = null;
    if (newVoucher.purchaseOrderId) {
      const [row] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, newVoucher.purchaseOrderId));
      poRow = row || null;
    }

    let partyRow = null;
    if (newVoucher.partyId) {
      const [row] = await db.select().from(suppliers).where(eq(suppliers.id, newVoucher.partyId));
      partyRow = row || null;
    }

    let partnerPartyRow = null;
    if (newVoucher.partnerPartyId) {
      const [row] = await db.select().from(suppliers).where(eq(suppliers.id, newVoucher.partnerPartyId));
      partnerPartyRow = row || null;
    }

    let packingPartyRow = null;
    if (newVoucher.packingPartyId) {
      const [row] = await db.select().from(suppliers).where(eq(suppliers.id, newVoucher.packingPartyId));
      packingPartyRow = row || null;
    }

    let dxbKwiPartyRow = null;
    if (newVoucher.dxbKwiPartyId) {
      const [row] = await db.select().from(suppliers).where(eq(suppliers.id, newVoucher.dxbKwiPartyId));
      dxbKwiPartyRow = row || null;
    }

    // Fetch all linked POs with details
    const purchaseOrdersWithDetails: PurchaseOrderWithDetails[] = [];
    for (const poId of poIds) {
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
      if (po) {
        const poLineItems = await db.select().from(purchaseOrderLineItems).where(eq(purchaseOrderLineItems.purchaseOrderId, po.id));
        const [supplierRow] = po.supplierId ? await db.select().from(suppliers).where(eq(suppliers.id, po.supplierId)) : [null];
        purchaseOrdersWithDetails.push({ ...po, supplier: supplierRow || null, lineItems: poLineItems });
      }
    }

    return {
      ...newVoucher,
      purchaseOrder: poRow,
      purchaseOrders: purchaseOrdersWithDetails,
      party: partyRow,
      dxbKwiParty: dxbKwiPartyRow,
      partnerParty: partnerPartyRow,
      packingParty: packingPartyRow,
      payment: null,
      dxbKwiPayment: null,
      partnerPayment: null,
      packingPayment: null,
      lineItems: createdLineItems,
    };
  }

  async updateLandedCostVoucher(
    id: number, 
    voucher: Partial<InsertLandedCostVoucher>, 
    lineItems?: Omit<InsertLandedCostLineItem, 'voucherId'>[],
    purchaseOrderIds?: number[]
  ): Promise<LandedCostVoucherWithDetails | undefined> {
    // Use transaction to ensure atomic operations - voucher update, line items, PO links, and item cost updates all succeed or fail together
    const updated = await db.transaction(async (tx) => {
      const [updatedVoucher] = await tx.update(landedCostVouchers)
        .set({ ...voucher, updatedAt: new Date() })
        .where(eq(landedCostVouchers.id, id))
        .returning();

      if (!updatedVoucher) return null;

      // If purchase order IDs provided, replace junction table entries
      if (purchaseOrderIds !== undefined) {
        await tx.delete(landedCostVoucherPurchaseOrders).where(eq(landedCostVoucherPurchaseOrders.voucherId, id));
        for (let i = 0; i < purchaseOrderIds.length; i++) {
          await tx.insert(landedCostVoucherPurchaseOrders).values({
            voucherId: id,
            purchaseOrderId: purchaseOrderIds[i],
            sortOrder: i,
          });
        }
      }

      // If line items provided, replace them and update item costs
      if (lineItems) {
        await tx.delete(landedCostLineItems).where(eq(landedCostLineItems.voucherId, id));
        
        for (const li of lineItems) {
          await tx.insert(landedCostLineItems)
            .values({ ...li, voucherId: id });
          
          // Update item's landed cost (allow zero values)
          if (li.itemName && li.landedCostPerUnitKwd !== undefined && li.landedCostPerUnitKwd !== null) {
            await tx.update(items)
              .set({ landedCostKwd: li.landedCostPerUnitKwd })
              .where(eq(items.name, li.itemName));
          }
        }
      }

      return updatedVoucher;
    });

    if (!updated) return undefined;
    return this.getLandedCostVoucher(id);
  }

  async deleteLandedCostVoucher(id: number): Promise<boolean> {
    const result = await db.delete(landedCostVouchers)
      .where(eq(landedCostVouchers.id, id))
      .returning();
    return result.length > 0;
  }

  async getNextLandedCostVoucherNumber(): Promise<string> {
    const result = await db.execute(sql`
      SELECT MAX(CAST(SUBSTRING(voucher_number FROM 5) AS INTEGER)) as max_num 
      FROM landed_cost_vouchers 
      WHERE voucher_number LIKE 'LCV-%'
    `);
    
    const rows = result.rows as { max_num: number | null }[];
    const maxNum = rows[0]?.max_num || 0;
    const nextNum = (maxNum + 1).toString().padStart(4, "0");
    return `LCV-${nextNum}`;
  }

  async getPendingLandedCostPayables(): Promise<LandedCostVoucherWithDetails[]> {
    const voucherRows = await db.select()
      .from(landedCostVouchers)
      .leftJoin(purchaseOrders, eq(landedCostVouchers.purchaseOrderId, purchaseOrders.id))
      .leftJoin(suppliers, eq(landedCostVouchers.partyId, suppliers.id))
      .where(eq(landedCostVouchers.payableStatus, "pending"))
      .orderBy(desc(landedCostVouchers.voucherDate));

    const result: LandedCostVoucherWithDetails[] = [];
    for (const row of voucherRows) {
      const lineItemsList = await db.select()
        .from(landedCostLineItems)
        .where(eq(landedCostLineItems.voucherId, row.landed_cost_vouchers.id))
        .orderBy(landedCostLineItems.id);

      // Fetch partner party separately if exists
      let partnerParty: Supplier | null = null;
      if (row.landed_cost_vouchers.partnerPartyId) {
        const [pp] = await db.select().from(suppliers).where(eq(suppliers.id, row.landed_cost_vouchers.partnerPartyId));
        partnerParty = pp || null;
      }

      result.push({
        ...row.landed_cost_vouchers,
        purchaseOrder: row.purchase_orders || null,
        party: row.suppliers || null,
        partnerParty,
        payment: null,
        partnerPayment: null,
        lineItems: lineItemsList,
      });
    }
    return result;
  }

  async markLandedCostVoucherPaid(voucherId: number, paymentId: number): Promise<LandedCostVoucherWithDetails | undefined> {
    const [updated] = await db.update(landedCostVouchers)
      .set({ payableStatus: "paid", paymentId, updatedAt: new Date() })
      .where(eq(landedCostVouchers.id, voucherId))
      .returning();

    if (!updated) return undefined;
    return this.getLandedCostVoucher(voucherId);
  }

  async getPendingPartnerProfitPayables(): Promise<LandedCostVoucherWithDetails[]> {
    const voucherRows = await db.select()
      .from(landedCostVouchers)
      .leftJoin(purchaseOrders, eq(landedCostVouchers.purchaseOrderId, purchaseOrders.id))
      .leftJoin(suppliers, eq(landedCostVouchers.partnerPartyId, suppliers.id))
      .where(and(
        eq(landedCostVouchers.partnerPayableStatus, "pending"),
        isNotNull(landedCostVouchers.partnerPartyId)
      ))
      .orderBy(desc(landedCostVouchers.voucherDate));

    const result: LandedCostVoucherWithDetails[] = [];
    for (const row of voucherRows) {
      const lineItemsList = await db.select()
        .from(landedCostLineItems)
        .where(eq(landedCostLineItems.voucherId, row.landed_cost_vouchers.id))
        .orderBy(landedCostLineItems.id);

      // Fetch freight party separately if exists
      let freightParty: Supplier | null = null;
      if (row.landed_cost_vouchers.partyId) {
        const [fp] = await db.select().from(suppliers).where(eq(suppliers.id, row.landed_cost_vouchers.partyId));
        freightParty = fp || null;
      }

      result.push({
        ...row.landed_cost_vouchers,
        purchaseOrder: row.purchase_orders || null,
        party: freightParty,
        partnerParty: row.suppliers || null,
        payment: null,
        partnerPayment: null,
        lineItems: lineItemsList,
      });
    }
    return result;
  }

  async markPartnerProfitPaid(voucherId: number, paymentId: number): Promise<LandedCostVoucherWithDetails | undefined> {
    // Idempotency check: only update if still pending
    const [updated] = await db.update(landedCostVouchers)
      .set({ partnerPayableStatus: "paid", partnerPaymentId: paymentId, updatedAt: new Date() })
      .where(and(
        eq(landedCostVouchers.id, voucherId),
        eq(landedCostVouchers.partnerPayableStatus, "pending")
      ))
      .returning();

    // If no update (already paid or not found), just return current state
    return this.getLandedCostVoucher(voucherId);
  }

  async markPackingPaid(voucherId: number, paymentId: number): Promise<LandedCostVoucherWithDetails | undefined> {
    // Idempotency check: only update if still pending
    const [updated] = await db.update(landedCostVouchers)
      .set({ packingPayableStatus: "paid", packingPaymentId: paymentId, updatedAt: new Date() })
      .where(and(
        eq(landedCostVouchers.id, voucherId),
        eq(landedCostVouchers.packingPayableStatus, "pending")
      ))
      .returning();

    // If no update (already paid or not found), just return current state
    return this.getLandedCostVoucher(voucherId);
  }

  // ============================================================
  // PARTY SETTLEMENTS - Monthly settlement for Partner and Packing Co.
  // ============================================================

  async getPartySettlements(options?: { partyType?: string; status?: string }): Promise<PartySettlementWithDetails[]> {
    let query = db.select()
      .from(partySettlements)
      .leftJoin(suppliers, eq(partySettlements.partyId, suppliers.id))
      .leftJoin(payments, eq(partySettlements.paymentId, payments.id))
      .leftJoin(expenses, eq(partySettlements.expenseId, expenses.id))
      .leftJoin(accounts, eq(partySettlements.accountId, accounts.id))
      .orderBy(desc(partySettlements.settlementDate));

    const rows = await query;
    
    return rows
      .filter(row => {
        if (options?.partyType && row.party_settlements.partyType !== options.partyType) return false;
        if (options?.status && row.party_settlements.status !== options.status) return false;
        return true;
      })
      .map(row => ({
        ...row.party_settlements,
        party: row.suppliers || null,
        payment: row.payments || null,
        expense: row.expenses ? { ...row.expenses, category: null, account: null, branch: null, createdByUser: null } : null,
        account: row.accounts || null,
      }));
  }

  async getPartySettlement(id: number): Promise<PartySettlementWithDetails | undefined> {
    const rows = await db.select()
      .from(partySettlements)
      .leftJoin(suppliers, eq(partySettlements.partyId, suppliers.id))
      .leftJoin(payments, eq(partySettlements.paymentId, payments.id))
      .leftJoin(expenses, eq(partySettlements.expenseId, expenses.id))
      .leftJoin(accounts, eq(partySettlements.accountId, accounts.id))
      .where(eq(partySettlements.id, id));

    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      ...row.party_settlements,
      party: row.suppliers || null,
      payment: row.payments || null,
      expense: row.expenses ? { ...row.expenses, category: null, account: null, branch: null, createdByUser: null } : null,
      account: row.accounts || null,
    };
  }

  async getPendingSettlementsByParty(partyType: string): Promise<{ partyId: number; partyName: string; voucherCount: number; totalAmountKwd: number; vouchers: LandedCostVoucherWithDetails[] }[]> {
    // For logistic type, we need to aggregate both HK→DXB and DXB→KWI freight per logistics company
    if (partyType === "logistic") {
      // Get all vouchers with pending HK→DXB freight (where partyId is the logistic company)
      const hkDxbVouchers = await db.select()
        .from(landedCostVouchers)
        .leftJoin(suppliers, eq(landedCostVouchers.partyId, suppliers.id))
        .where(and(
          eq(landedCostVouchers.payableStatus, "pending"),
          isNotNull(landedCostVouchers.partyId)
        ))
        .orderBy(desc(landedCostVouchers.voucherDate));

      // Get all vouchers with pending DXB→KWI freight (where dxbKwiPartyId is the logistic company)
      const dxbKwiVouchers = await db.select()
        .from(landedCostVouchers)
        .leftJoin(suppliers, eq(landedCostVouchers.dxbKwiPartyId, suppliers.id))
        .where(and(
          eq(landedCostVouchers.dxbKwiPayableStatus, "pending"),
          isNotNull(landedCostVouchers.dxbKwiPartyId)
        ))
        .orderBy(desc(landedCostVouchers.voucherDate));

      // Group by party - track which vouchers and amounts per party
      // Key: partyId, Value: { partyName, voucherId -> { voucher, hkDxbPending, dxbKwiPending, amounts } }
      const groupedMap = new Map<number, { 
        partyName: string; 
        voucherData: Map<number, { voucher: any; hkDxbAmount: number; dxbKwiAmount: number; hkDxbPending: boolean; dxbKwiPending: boolean }>; 
        totalKwd: number 
      }>();

      // Process HK→DXB pending freight
      for (const row of hkDxbVouchers) {
        const partyId = row.landed_cost_vouchers.partyId;
        if (!partyId) continue;
        const amount = parseFloat(row.landed_cost_vouchers.hkToDxbKwd || "0");
        if (amount <= 0) continue;

        if (!groupedMap.has(partyId)) {
          groupedMap.set(partyId, {
            partyName: row.suppliers?.name || "Unknown",
            voucherData: new Map(),
            totalKwd: 0
          });
        }
        const group = groupedMap.get(partyId)!;
        if (!group.voucherData.has(row.landed_cost_vouchers.id)) {
          group.voucherData.set(row.landed_cost_vouchers.id, { 
            voucher: row.landed_cost_vouchers, 
            hkDxbAmount: 0, 
            dxbKwiAmount: 0, 
            hkDxbPending: false, 
            dxbKwiPending: false 
          });
        }
        const vData = group.voucherData.get(row.landed_cost_vouchers.id)!;
        vData.hkDxbAmount = amount;
        vData.hkDxbPending = true;
        group.totalKwd += amount;
      }

      // Process DXB→KWI pending freight
      for (const row of dxbKwiVouchers) {
        const partyId = row.landed_cost_vouchers.dxbKwiPartyId;
        if (!partyId) continue;
        const amount = parseFloat(row.landed_cost_vouchers.dxbToKwiKwd || "0");
        if (amount <= 0) continue;

        if (!groupedMap.has(partyId)) {
          groupedMap.set(partyId, {
            partyName: row.suppliers?.name || "Unknown",
            voucherData: new Map(),
            totalKwd: 0
          });
        }
        const group = groupedMap.get(partyId)!;
        if (!group.voucherData.has(row.landed_cost_vouchers.id)) {
          group.voucherData.set(row.landed_cost_vouchers.id, { 
            voucher: row.landed_cost_vouchers, 
            hkDxbAmount: 0, 
            dxbKwiAmount: 0, 
            hkDxbPending: false, 
            dxbKwiPending: false 
          });
        }
        const vData = group.voucherData.get(row.landed_cost_vouchers.id)!;
        vData.dxbKwiAmount = amount;
        vData.dxbKwiPending = true;
        group.totalKwd += amount;
      }

      // Convert to result format
      const result: { partyId: number; partyName: string; voucherCount: number; totalAmountKwd: number; vouchers: LandedCostVoucherWithDetails[] }[] = [];

      for (const [partyId, group] of groupedMap.entries()) {
        const vouchersWithDetails: LandedCostVoucherWithDetails[] = [];
        for (const [voucherId, data] of group.voucherData.entries()) {
          const lineItemsList = await db.select()
            .from(landedCostLineItems)
            .where(eq(landedCostLineItems.voucherId, voucherId));

          vouchersWithDetails.push({
            ...data.voucher,
            purchaseOrder: null,
            purchaseOrders: [],
            party: null,
            partnerParty: null,
            packingParty: null,
            payment: null,
            partnerPayment: null,
            packingPayment: null,
            lineItems: lineItemsList,
            // Store the freight amounts and pending flags for display and settlement
            _hkDxbAmount: data.hkDxbPending ? data.hkDxbAmount : 0,
            _dxbKwiAmount: data.dxbKwiPending ? data.dxbKwiAmount : 0,
            _hkDxbPending: data.hkDxbPending,
            _dxbKwiPending: data.dxbKwiPending,
          } as any);
        }

        result.push({
          partyId,
          partyName: group.partyName,
          voucherCount: group.voucherData.size,
          totalAmountKwd: group.totalKwd,
          vouchers: vouchersWithDetails,
        });
      }

      return result;
    }

    // Original logic for partner and packing
    const statusField = partyType === "partner" ? landedCostVouchers.partnerPayableStatus : landedCostVouchers.packingPayableStatus;
    const partyIdField = partyType === "partner" ? landedCostVouchers.partnerPartyId : landedCostVouchers.packingPartyId;

    const pendingVouchers = await db.select()
      .from(landedCostVouchers)
      .leftJoin(suppliers, eq(partyIdField, suppliers.id))
      .where(and(
        eq(statusField, "pending"),
        isNotNull(partyIdField)
      ))
      .orderBy(desc(landedCostVouchers.voucherDate));

    // Group by party
    const groupedMap = new Map<number, { partyName: string; vouchers: typeof pendingVouchers; totalKwd: number }>();
    
    for (const row of pendingVouchers) {
      const partyId = partyType === "partner" 
        ? row.landed_cost_vouchers.partnerPartyId 
        : row.landed_cost_vouchers.packingPartyId;
      if (!partyId) continue;

      const amount = parseFloat(
        (partyType === "partner" 
          ? row.landed_cost_vouchers.totalPartnerProfitKwd 
          : row.landed_cost_vouchers.packingChargesKwd) || "0"
      );

      if (!groupedMap.has(partyId)) {
        groupedMap.set(partyId, {
          partyName: row.suppliers?.name || "Unknown",
          vouchers: [],
          totalKwd: 0
        });
      }
      const group = groupedMap.get(partyId)!;
      group.vouchers.push(row);
      group.totalKwd += amount;
    }

    // Convert to result format
    const result: { partyId: number; partyName: string; voucherCount: number; totalAmountKwd: number; vouchers: LandedCostVoucherWithDetails[] }[] = [];
    
    for (const [partyId, group] of groupedMap.entries()) {
      const vouchersWithDetails: LandedCostVoucherWithDetails[] = [];
      for (const v of group.vouchers) {
        const lineItemsList = await db.select()
          .from(landedCostLineItems)
          .where(eq(landedCostLineItems.voucherId, v.landed_cost_vouchers.id));
        
        vouchersWithDetails.push({
          ...v.landed_cost_vouchers,
          purchaseOrder: null,
          purchaseOrders: [],
          party: null,
          partnerParty: partyType === "partner" ? v.suppliers || null : null,
          packingParty: partyType === "packing" ? v.suppliers || null : null,
          payment: null,
          partnerPayment: null,
          packingPayment: null,
          lineItems: lineItemsList,
        });
      }
      
      result.push({
        partyId,
        partyName: group.partyName,
        voucherCount: group.vouchers.length,
        totalAmountKwd: group.totalKwd,
        vouchers: vouchersWithDetails,
      });
    }

    return result;
  }

  async createPartySettlement(settlement: InsertPartySettlement): Promise<PartySettlementWithDetails> {
    const [created] = await db.insert(partySettlements).values(settlement).returning();
    return this.getPartySettlement(created.id) as Promise<PartySettlementWithDetails>;
  }

  async atomicFinalizeSettlement(
    id: number, 
    accountId: number, 
    notes?: string
  ): Promise<{ settlement: PartySettlementWithDetails; payment: Payment; expense: Expense } | undefined> {
    // Get the settlement first
    const settlement = await this.getPartySettlement(id);
    if (!settlement) return undefined;

    // Idempotency check: if already paid, return error state
    if (settlement.status === "paid") {
      console.log(`[Settlement] Settlement ${id} already paid, cannot finalize again`);
      return undefined;
    }

    // Execute all operations in a single transaction
    const result = await db.transaction(async (tx) => {
      // Create outgoing payment
      const [payment] = await tx.insert(payments).values({
        partyId: settlement.partyId,
        amount: settlement.totalAmountKwd,
        direction: "OUT",
        accountId,
        paymentDate: new Date().toISOString().split("T")[0],
        notes: notes || `Monthly settlement ${settlement.settlementNumber} for ${settlement.partyType} - ${settlement.settlementPeriod}`,
        branchId: 1,
      }).returning();

      // Create expense record
      const expenseDescription = settlement.partyType === "partner" 
        ? "Partner Profit" 
        : settlement.partyType === "packing" 
          ? "Packing Charges" 
          : "Freight Charges";
      const [expense] = await tx.insert(expenses).values({
        date: new Date().toISOString().split("T")[0],
        categoryId: null,
        description: `${expenseDescription} Settlement - ${settlement.settlementPeriod}`,
        amount: settlement.totalAmountKwd,
        accountId,
        branchId: 1,
      }).returning();

      // Update settlement status
      await tx.update(partySettlements)
        .set({ 
          status: "paid", 
          paymentId: payment.id, 
          expenseId: expense.id 
        })
        .where(and(
          eq(partySettlements.id, id),
          eq(partySettlements.status, "pending")
        ));

      // Parse voucher IDs
      const voucherIds: number[] = JSON.parse(settlement.voucherIds);

      // Mark vouchers as paid based on party type (with idempotency)
      for (const voucherId of voucherIds) {
        if (settlement.partyType === "partner") {
          await tx.update(landedCostVouchers)
            .set({ partnerPayableStatus: "paid", partnerPaymentId: payment.id })
            .where(and(
              eq(landedCostVouchers.id, voucherId),
              eq(landedCostVouchers.partnerPayableStatus, "pending")
            ));
        } else if (settlement.partyType === "packing") {
          await tx.update(landedCostVouchers)
            .set({ packingPayableStatus: "paid", packingPaymentId: payment.id })
            .where(and(
              eq(landedCostVouchers.id, voucherId),
              eq(landedCostVouchers.packingPayableStatus, "pending")
            ));
        } else if (settlement.partyType === "logistic") {
          // Mark both freight legs if they belong to this party (with idempotency)
          await tx.update(landedCostVouchers)
            .set({ payableStatus: "paid", paymentId: payment.id })
            .where(and(
              eq(landedCostVouchers.id, voucherId),
              eq(landedCostVouchers.partyId, settlement.partyId),
              eq(landedCostVouchers.payableStatus, "pending")
            ));
          await tx.update(landedCostVouchers)
            .set({ dxbKwiPayableStatus: "paid", dxbKwiPaymentId: payment.id })
            .where(and(
              eq(landedCostVouchers.id, voucherId),
              eq(landedCostVouchers.dxbKwiPartyId, settlement.partyId),
              eq(landedCostVouchers.dxbKwiPayableStatus, "pending")
            ));
        }
      }

      return { payment, expense };
    });

    // Return finalized settlement with payment and expense
    const finalizedSettlement = await this.getPartySettlement(id);
    if (!finalizedSettlement) return undefined;

    return { 
      settlement: finalizedSettlement, 
      payment: result.payment, 
      expense: result.expense 
    };
  }

  async finalizePartySettlement(id: number, paymentId: number, expenseId: number): Promise<PartySettlementWithDetails | undefined> {
    // Get the settlement to get voucher IDs
    const settlement = await this.getPartySettlement(id);
    if (!settlement) return undefined;

    // Idempotency check: if already paid, return current state without making changes
    if (settlement.status === "paid") {
      console.log(`[Settlement] Settlement ${id} already paid, skipping finalization`);
      return settlement;
    }

    // Parse the voucher IDs
    const voucherIds: number[] = JSON.parse(settlement.voucherIds);

    // Mark all vouchers as paid based on party type (each function has its own idempotency guards)
    for (const voucherId of voucherIds) {
      if (settlement.partyType === "partner") {
        await this.markPartnerProfitPaid(voucherId, paymentId);
      } else if (settlement.partyType === "packing") {
        await this.markPackingPaid(voucherId, paymentId);
      } else if (settlement.partyType === "logistic") {
        // Mark only the freight legs that belong to this party as paid
        await this.markFreightPaidForParty(voucherId, settlement.partyId, paymentId);
      }
    }

    // Update settlement with payment and expense IDs - only if still pending (idempotency)
    const [updated] = await db.update(partySettlements)
      .set({ 
        status: "paid", 
        paymentId, 
        expenseId 
      })
      .where(and(
        eq(partySettlements.id, id),
        eq(partySettlements.status, "pending")
      ))
      .returning();

    // Return current state regardless of whether update happened
    return this.getPartySettlement(id);
  }

  async markFreightPaidForParty(voucherId: number, partyId: number, paymentId: number): Promise<LandedCostVoucherWithDetails | undefined> {
    // Use transaction with idempotency checks - only update legs that are still pending and belong to this party
    await db.transaction(async (tx) => {
      // Check if HK→DXB leg belongs to this party and is pending - use conditional update
      await tx.update(landedCostVouchers)
        .set({ payableStatus: "paid", paymentId: paymentId })
        .where(and(
          eq(landedCostVouchers.id, voucherId),
          eq(landedCostVouchers.partyId, partyId),
          eq(landedCostVouchers.payableStatus, "pending")
        ));
      
      // Check if DXB→KWI leg belongs to this party and is pending - use conditional update
      await tx.update(landedCostVouchers)
        .set({ dxbKwiPayableStatus: "paid", dxbKwiPaymentId: paymentId })
        .where(and(
          eq(landedCostVouchers.id, voucherId),
          eq(landedCostVouchers.dxbKwiPartyId, partyId),
          eq(landedCostVouchers.dxbKwiPayableStatus, "pending")
        ));
    });
    
    return this.getLandedCostVoucher(voucherId);
  }

  async getNextSettlementNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(partySettlements)
      .where(sql`EXTRACT(YEAR FROM ${partySettlements.createdAt}) = ${year}`);
    
    const count = (result?.count || 0) + 1;
    return `SETTLE-${year}-${count.toString().padStart(5, "0")}`;
  }
}

export const storage = new DatabaseStorage();

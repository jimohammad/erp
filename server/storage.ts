import { 
  suppliers, 
  items, 
  purchaseOrders, 
  purchaseOrderLineItems,
  customers,
  salesOrders,
  salesOrderLineItems,
  payments,
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
  type InventoryAdjustment,
  type InsertInventoryAdjustment,
  type InventoryAdjustmentWithDetails,
  type OpeningBalance,
  type InsertOpeningBalance,
  type OpeningBalanceWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
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

  getSalesOrders(options?: { limit?: number; offset?: number }): Promise<{ data: SalesOrderWithDetails[]; total: number }>;
  getSalesOrder(id: number): Promise<SalesOrderWithDetails | undefined>;
  createSalesOrder(so: InsertSalesOrder, lineItems: Omit<InsertSalesLineItem, 'salesOrderId'>[]): Promise<SalesOrderWithDetails>;
  deleteSalesOrder(id: number): Promise<boolean>;

  getSalesMonthlyStats(year?: number): Promise<{ month: number; totalKwd: number; totalFx: number }[]>;

  // Payment Module
  getPayments(options?: { limit?: number; offset?: number }): Promise<{ data: PaymentWithDetails[]; total: number }>;
  getPayment(id: number): Promise<PaymentWithDetails | undefined>;
  createPayment(payment: InsertPayment): Promise<PaymentWithDetails>;
  deletePayment(id: number): Promise<boolean>;

  // Reports
  getStockBalance(): Promise<{ itemName: string; purchased: number; sold: number; balance: number }[]>;
  getDailyCashFlow(startDate?: string, endDate?: string): Promise<{ date: string; inAmount: number; outAmount: number; net: number; runningBalance: number }[]>;
  getCustomerReport(): Promise<{ customerId: number; customerName: string; totalSales: number; totalPayments: number; balance: number }[]>;
  getPartyStatement(partyId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]>;
  getItemSales(itemId: number, customerId?: number, startDate?: string, endDate?: string): Promise<{ date: string; invoiceNumber: string; customerName: string; quantity: number; unitPrice: number; totalAmount: number }[]>;
  getCustomerStatementEntries(customerId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]>;

  // Accounts Module
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
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
  getInvoicesForCustomer(customerId: number): Promise<{ id: number; invoiceNumber: string; totalKwd: string }[]>;

  // Export IMEI
  getExportImei(filters: { customerId?: number; itemName?: string; invoiceNumber?: string; dateFrom?: string; dateTo?: string }): Promise<{ imei: string; itemName: string; customerName: string; invoiceNumber: string; saleDate: string }[]>;

  // Dashboard
  getDashboardStats(): Promise<{ totalStock: number; totalCash: number; monthlySales: number; monthlyPurchases: number }>;
  globalSearch(query: string): Promise<{ type: string; id: number; title: string; subtitle: string; url: string }[]>;

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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
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

  async getItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(items.name);
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItem(id: number, item: InsertItem): Promise<Item | undefined> {
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

  // ==================== SALES MODULE ====================

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
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

  async getPayments(options?: { limit?: number; offset?: number }): Promise<{ data: PaymentWithDetails[]; total: number }> {
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(payments);
    const total = countResult.count;
    
    const paymentList = await db.query.payments.findMany({
      with: {
        customer: true,
        supplier: true,
      },
      orderBy: [desc(payments.paymentDate), desc(payments.id)],
      limit: options?.limit,
      offset: options?.offset,
    });
    return { data: paymentList, total };
  }

  async getPayment(id: number): Promise<PaymentWithDetails | undefined> {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, id),
      with: {
        customer: true,
        supplier: true,
      },
    });
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<PaymentWithDetails> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return this.getPayment(newPayment.id) as Promise<PaymentWithDetails>;
  }

  async deletePayment(id: number): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id)).returning();
    return result.length > 0;
  }

  // ==================== REPORTS ====================

  async getStockBalance(): Promise<{ itemName: string; purchased: number; sold: number; balance: number }[]> {
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
      all_items AS (
        SELECT item_name FROM purchased
        UNION
        SELECT item_name FROM sold
      )
      SELECT 
        ai.item_name as "itemName",
        COALESCE(p.qty, 0)::integer as purchased,
        COALESCE(s.qty, 0)::integer as sold,
        (COALESCE(p.qty, 0) - COALESCE(s.qty, 0))::integer as balance
      FROM all_items ai
      LEFT JOIN purchased p ON ai.item_name = p.item_name
      LEFT JOIN sold s ON ai.item_name = s.item_name
      ORDER BY ai.item_name
    `);
    return result.rows as { itemName: string; purchased: number; sold: number; balance: number }[];
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
      )
      SELECT 
        c.id as "customerId",
        c.name as "customerName",
        COALESCE(cs.total_sales, 0)::float as "totalSales",
        COALESCE(cp.total_payments, 0)::float as "totalPayments",
        (COALESCE(cs.total_sales, 0) - COALESCE(cp.total_payments, 0))::float as balance
      FROM customers c
      LEFT JOIN customer_sales cs ON c.id = cs.customer_id
      LEFT JOIN customer_payments cp ON c.id = cp.customer_id
      ORDER BY c.name
    `);
    return result.rows as { customerId: number; customerName: string; totalSales: number; totalPayments: number; balance: number }[];
  }

  async getPartyStatement(partyId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]> {
    const party = await db.select().from(suppliers).where(eq(suppliers.id, partyId));
    if (party.length === 0) return [];
    
    const partyData = party[0];
    const isSupplier = partyData.partyType === "supplier";

    let dateFilter = sql``;
    if (startDate && endDate) {
      dateFilter = sql`AND date >= ${startDate} AND date <= ${endDate}`;
    } else if (startDate) {
      dateFilter = sql`AND date >= ${startDate}`;
    } else if (endDate) {
      dateFilter = sql`AND date <= ${endDate}`;
    }

    let result;
    
    if (isSupplier) {
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
          WHERE supplier_id = ${partyId} AND return_type = 'purchase'
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
          WHERE supplier_id = ${partyId} AND return_type = 'sale'
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
      FROM sales_line_items sli
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

  async getReturns(): Promise<ReturnWithDetails[]> {
    const returnList = await db.query.returns.findMany({
      with: {
        customer: true,
        supplier: true,
        lineItems: true,
      },
      orderBy: [desc(returns.returnDate), desc(returns.id)],
    });
    return returnList as ReturnWithDetails[];
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

  async getInvoicesForCustomer(customerId: number): Promise<{ id: number; invoiceNumber: string; totalKwd: string }[]> {
    const orders = await db.select({
      id: salesOrders.id,
      invoiceNumber: salesOrders.invoiceNumber,
      totalKwd: salesOrders.totalKwd,
    }).from(salesOrders)
      .where(eq(salesOrders.customerId, customerId))
      .orderBy(desc(salesOrders.invoiceDate));
    
    return orders.map(o => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber || `INV-${o.id}`,
      totalKwd: o.totalKwd || "0",
    }));
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
      WITH all_transactions AS (
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
          COALESCE(CAST(total_amount AS DECIMAL), 0)::float as credit,
          created_at
        FROM returns
        WHERE customer_id = ${customerId} AND return_type = 'sale'
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
    monthlyPurchases: number 
  }> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get total stock amount (value in KWD based on purchase prices)
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
        WHERE r.return_type = 'sale'
        GROUP BY rl.item_name
      ),
      purchase_returns AS (
        SELECT rl.item_name, COALESCE(SUM(rl.quantity), 0) as qty
        FROM return_line_items rl
        JOIN returns r ON rl.return_id = r.id
        WHERE r.return_type = 'purchase'
        GROUP BY rl.item_name
      ),
      all_items AS (
        SELECT item_name FROM purchased
        UNION SELECT item_name FROM sold
        UNION SELECT item_name FROM sale_returns
        UNION SELECT item_name FROM purchase_returns
      ),
      stock_qty AS (
        SELECT ai.item_name,
               COALESCE(p.qty, 0) - COALESCE(s.qty, 0) + COALESCE(sr.qty, 0) - COALESCE(pr.qty, 0) as net_qty,
               CASE WHEN COALESCE(p.qty, 0) > 0 THEN p.amount / p.qty ELSE 0 END as avg_cost
        FROM all_items ai
        LEFT JOIN purchased p ON ai.item_name = p.item_name
        LEFT JOIN sold s ON ai.item_name = s.item_name
        LEFT JOIN sale_returns sr ON ai.item_name = sr.item_name
        LEFT JOIN purchase_returns pr ON ai.item_name = pr.item_name
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

    return { stockAmount, totalCredit, totalDebit, cashBalance, bankAccountsBalance, monthlySales, lastMonthSales, monthlyPurchases };
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
}

export const storage = new DatabaseStorage();

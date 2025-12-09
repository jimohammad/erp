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
  ACCOUNT_NAMES,
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

  getPurchaseOrders(): Promise<PurchaseOrderWithDetails[]>;
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

  getSalesOrders(): Promise<SalesOrderWithDetails[]>;
  getSalesOrder(id: number): Promise<SalesOrderWithDetails | undefined>;
  createSalesOrder(so: InsertSalesOrder, lineItems: Omit<InsertSalesLineItem, 'salesOrderId'>[]): Promise<SalesOrderWithDetails>;
  deleteSalesOrder(id: number): Promise<boolean>;

  getSalesMonthlyStats(year?: number): Promise<{ month: number; totalKwd: number; totalFx: number }[]>;

  // Payment Module
  getPayments(): Promise<PaymentWithDetails[]>;
  getPayment(id: number): Promise<PaymentWithDetails | undefined>;
  createPayment(payment: InsertPayment): Promise<PaymentWithDetails>;
  deletePayment(id: number): Promise<boolean>;

  // Reports
  getStockBalance(): Promise<{ itemName: string; purchased: number; sold: number; balance: number }[]>;
  getDailyCashFlow(startDate?: string, endDate?: string): Promise<{ date: string; inAmount: number; outAmount: number; net: number; runningBalance: number }[]>;
  getCustomerReport(): Promise<{ customerId: number; customerName: string; totalSales: number; totalPayments: number; balance: number }[]>;
  getPartyStatement(partyId: number, startDate?: string, endDate?: string): Promise<{ id: number; date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[]>;

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

  async getPurchaseOrders(): Promise<PurchaseOrderWithDetails[]> {
    const pos = await db.query.purchaseOrders.findMany({
      with: {
        supplier: true,
        lineItems: true,
      },
      orderBy: [desc(purchaseOrders.purchaseDate), desc(purchaseOrders.id)],
    });
    return pos;
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

  async getSalesOrders(): Promise<SalesOrderWithDetails[]> {
    const orders = await db.query.salesOrders.findMany({
      with: {
        customer: true,
        lineItems: true,
      },
      orderBy: [desc(salesOrders.saleDate), desc(salesOrders.id)],
    });
    return orders;
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

  async getPayments(): Promise<PaymentWithDetails[]> {
    const paymentList = await db.query.payments.findMany({
      with: {
        customer: true,
        supplier: true,
      },
      orderBy: [desc(payments.paymentDate), desc(payments.id)],
    });
    return paymentList;
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
}

export const storage = new DatabaseStorage();

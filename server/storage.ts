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
}

export const storage = new DatabaseStorage();

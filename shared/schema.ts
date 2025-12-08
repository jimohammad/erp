import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, date, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("viewer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const suppliers = pgTable("suppliers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const items = pgTable("items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code"),
  name: text("name").notNull().unique(),
});

export const insertItemSchema = createInsertSchema(items).omit({ id: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;

export const purchaseOrders = pgTable("purchase_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseDate: date("purchase_date").notNull(),
  invoiceNumber: text("invoice_number"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
  fxCurrency: text("fx_currency").default("AED"),
  fxRate: numeric("fx_rate", { precision: 10, scale: 4 }),
  totalFx: numeric("total_fx", { precision: 12, scale: 2 }),
  invoiceFilePath: text("invoice_file_path"),
  deliveryNoteFilePath: text("delivery_note_file_path"),
  ttCopyFilePath: text("tt_copy_file_path"),
  grnDate: date("grn_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  lineItems: many(purchaseOrderLineItems),
}));

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

export const purchaseOrderLineItems = pgTable("purchase_order_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").default(1),
  priceKwd: numeric("price_kwd", { precision: 12, scale: 3 }),
  fxPrice: numeric("fx_price", { precision: 12, scale: 2 }),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
});

export const purchaseOrderLineItemsRelations = relations(purchaseOrderLineItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderLineItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));

export const insertLineItemSchema = createInsertSchema(purchaseOrderLineItems).omit({ id: true });
export type InsertLineItem = z.infer<typeof insertLineItemSchema>;
export type LineItem = typeof purchaseOrderLineItems.$inferSelect;

export type PurchaseOrderWithDetails = PurchaseOrder & {
  supplier: Supplier | null;
  lineItems: LineItem[];
};

// ==================== SALES MODULE ====================

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
});

export const customersRelations = relations(customers, ({ many }) => ({
  salesOrders: many(salesOrders),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const salesOrders = pgTable("sales_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  saleDate: date("sale_date").notNull(),
  invoiceNumber: text("invoice_number"),
  customerId: integer("customer_id").references(() => customers.id),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
  fxCurrency: text("fx_currency").default("AED"),
  fxRate: numeric("fx_rate", { precision: 10, scale: 4 }),
  totalFx: numeric("total_fx", { precision: 12, scale: 2 }),
  invoiceFilePath: text("invoice_file_path"),
  deliveryNoteFilePath: text("delivery_note_file_path"),
  paymentReceiptFilePath: text("payment_receipt_file_path"),
  deliveryDate: date("delivery_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  lineItems: many(salesOrderLineItems),
}));

export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type SalesOrder = typeof salesOrders.$inferSelect;

export const salesOrderLineItems = pgTable("sales_order_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  salesOrderId: integer("sales_order_id").references(() => salesOrders.id, { onDelete: "cascade" }).notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").default(1),
  priceKwd: numeric("price_kwd", { precision: 12, scale: 3 }),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
  imeiNumbers: text("imei_numbers").array(),
});

export const salesOrderLineItemsRelations = relations(salesOrderLineItems, ({ one }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderLineItems.salesOrderId],
    references: [salesOrders.id],
  }),
}));

export const insertSalesLineItemSchema = createInsertSchema(salesOrderLineItems).omit({ id: true });
export type InsertSalesLineItem = z.infer<typeof insertSalesLineItemSchema>;
export type SalesLineItem = typeof salesOrderLineItems.$inferSelect;

export type SalesOrderWithDetails = SalesOrder & {
  customer: Customer | null;
  lineItems: SalesLineItem[];
};

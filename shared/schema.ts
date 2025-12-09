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

// ==================== BRANCHES ====================

export const branches = pgTable("branches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  code: text("code"),
  address: text("address"),
  phone: text("phone"),
  isDefault: integer("is_default").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

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
  partyType: text("party_type").default("supplier").notNull(),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 3 }),
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type PartyType = "supplier" | "customer";

export const items = pgTable("items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code"),
  name: text("name").notNull().unique(),
  purchasePriceKwd: numeric("purchase_price_kwd", { precision: 12, scale: 3 }),
  fxCurrency: text("fx_currency"),
  sellingPriceKwd: numeric("selling_price_kwd", { precision: 12, scale: 3 }),
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
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_po_branch").on(table.branchId),
  index("idx_po_date").on(table.purchaseDate),
  index("idx_po_supplier").on(table.supplierId),
]);

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
}, (table) => [
  index("idx_po_line_item").on(table.itemName),
  index("idx_po_line_order").on(table.purchaseOrderId),
]);

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
  creditLimit: numeric("credit_limit", { precision: 12, scale: 3 }),
  branchId: integer("branch_id").references(() => branches.id),
}, (table) => [
  index("idx_customer_branch").on(table.branchId),
]);

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
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_so_branch").on(table.branchId),
  index("idx_so_date").on(table.saleDate),
  index("idx_so_customer").on(table.customerId),
]);

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
}, (table) => [
  index("idx_so_line_item").on(table.itemName),
  index("idx_so_line_order").on(table.salesOrderId),
]);

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

// ==================== PAYMENT MODULE ====================

export const PAYMENT_TYPES = ["Cash", "NBK Bank", "CBK Bank", "Knet", "Wamd"] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];

export const PAYMENT_DIRECTIONS = ["IN", "OUT"] as const;
export type PaymentDirection = typeof PAYMENT_DIRECTIONS[number];

export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  paymentDate: date("payment_date").notNull(),
  direction: text("direction").notNull().default("IN"),
  customerId: integer("customer_id").references(() => customers.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  paymentType: text("payment_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
  reference: text("reference"),
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payment_branch").on(table.branchId),
  index("idx_payment_date").on(table.paymentDate),
  index("idx_payment_customer").on(table.customerId),
  index("idx_payment_supplier").on(table.supplierId),
]);

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  supplier: one(suppliers, {
    fields: [payments.supplierId],
    references: [suppliers.id],
  }),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type PaymentWithDetails = Payment & {
  customer: Customer | null;
  supplier: Supplier | null;
};

// ==================== ACCOUNTS MODULE ====================

export const ACCOUNT_NAMES = ["Cash", "NBK Bank", "CBK Bank", "Knet", "Wamd"] as const;
export type AccountName = typeof ACCOUNT_NAMES[number];

export const accounts = pgTable("accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  balance: numeric("balance", { precision: 12, scale: 3 }).default("0"),
  branchId: integer("branch_id").references(() => branches.id),
}, (table) => [
  index("idx_account_branch").on(table.branchId),
]);

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export const accountTransfers = pgTable("account_transfers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  transferDate: date("transfer_date").notNull(),
  fromAccountId: integer("from_account_id").references(() => accounts.id).notNull(),
  toAccountId: integer("to_account_id").references(() => accounts.id).notNull(),
  amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accountTransfersRelations = relations(accountTransfers, ({ one }) => ({
  fromAccount: one(accounts, {
    fields: [accountTransfers.fromAccountId],
    references: [accounts.id],
  }),
  toAccount: one(accounts, {
    fields: [accountTransfers.toAccountId],
    references: [accounts.id],
  }),
}));

export const insertAccountTransferSchema = createInsertSchema(accountTransfers).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertAccountTransfer = z.infer<typeof insertAccountTransferSchema>;
export type AccountTransfer = typeof accountTransfers.$inferSelect;

export type AccountTransferWithDetails = AccountTransfer & {
  fromAccount: Account;
  toAccount: Account;
};

// ==================== EXPENSES MODULE ====================

export const expenseCategories = pgTable("expense_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({ id: true });
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  expenseDate: date("expense_date").notNull(),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  accountId: integer("account_id").references(() => accounts.id),
  amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
  description: text("description"),
  reference: text("reference"),
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_expense_branch").on(table.branchId),
  index("idx_expense_date").on(table.expenseDate),
]);

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  account: one(accounts, {
    fields: [expenses.accountId],
    references: [accounts.id],
  }),
}));

export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type ExpenseWithDetails = Expense & {
  category: ExpenseCategory | null;
  account: Account | null;
};

// ==================== RETURNS MODULE ====================

export const RETURN_TYPES = ["sale_return", "purchase_return"] as const;
export type ReturnType = typeof RETURN_TYPES[number];

export const returns = pgTable("returns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  returnDate: date("return_date").notNull(),
  returnNumber: text("return_number"),
  returnType: text("return_type").notNull().default("sale_return"),
  customerId: integer("customer_id").references(() => customers.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
  reason: text("reason"),
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_return_branch").on(table.branchId),
  index("idx_return_date").on(table.returnDate),
  index("idx_return_type").on(table.returnType),
]);

export const returnsRelations = relations(returns, ({ one, many }) => ({
  customer: one(customers, {
    fields: [returns.customerId],
    references: [customers.id],
  }),
  supplier: one(suppliers, {
    fields: [returns.supplierId],
    references: [suppliers.id],
  }),
  lineItems: many(returnLineItems),
}));

export const insertReturnSchema = createInsertSchema(returns).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Return = typeof returns.$inferSelect;

export const returnLineItems = pgTable("return_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  returnId: integer("return_id").references(() => returns.id, { onDelete: "cascade" }).notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").default(1),
  priceKwd: numeric("price_kwd", { precision: 12, scale: 3 }),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
  imeiNumbers: text("imei_numbers").array(),
}, (table) => [
  index("idx_return_line_item").on(table.itemName),
  index("idx_return_line_return").on(table.returnId),
]);

export const returnLineItemsRelations = relations(returnLineItems, ({ one }) => ({
  return: one(returns, {
    fields: [returnLineItems.returnId],
    references: [returns.id],
  }),
}));

export const insertReturnLineItemSchema = createInsertSchema(returnLineItems).omit({ id: true });
export type InsertReturnLineItem = z.infer<typeof insertReturnLineItemSchema>;
export type ReturnLineItem = typeof returnLineItems.$inferSelect;

export type ReturnWithDetails = Return & {
  customer: Customer | null;
  supplier: Supplier | null;
  lineItems: ReturnLineItem[];
};

// ==================== ROLE PERMISSIONS ====================

export const ROLE_TYPES = ["super_user", "admin", "user"] as const;
export type RoleType = typeof ROLE_TYPES[number];

export const MODULE_NAMES = [
  "dashboard",
  "purchases",
  "sales", 
  "payments",
  "returns",
  "expenses",
  "accounts",
  "items",
  "parties",
  "reports",
  "discount",
  "settings"
] as const;
export type ModuleName = typeof MODULE_NAMES[number];

export const rolePermissions = pgTable("role_permissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  role: text("role").notNull(),
  moduleName: text("module_name").notNull(),
  canAccess: integer("can_access").default(1).notNull(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

export const userRoleAssignments = pgTable("user_role_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoleAssignmentsRelations = relations(userRoleAssignments, ({ one }) => ({
  branch: one(branches, {
    fields: [userRoleAssignments.branchId],
    references: [branches.id],
  }),
}));

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({ id: true, createdAt: true });
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type UserRoleAssignmentWithBranch = UserRoleAssignment & { branch?: Branch };

// ==================== DISCOUNT MODULE ====================

export const discounts = pgTable("discounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  salesOrderId: integer("sales_order_id").references(() => salesOrders.id).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 3 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const discountsRelations = relations(discounts, ({ one }) => ({
  customer: one(customers, {
    fields: [discounts.customerId],
    references: [customers.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [discounts.salesOrderId],
    references: [salesOrders.id],
  }),
}));

export const insertDiscountSchema = createInsertSchema(discounts).omit({ id: true, createdAt: true });
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Discount = typeof discounts.$inferSelect;

export type DiscountWithDetails = Discount & {
  customer: Customer;
  salesOrder: SalesOrder;
};

// ==================== STOCK TRANSFERS ====================

export const stockTransfers = pgTable("stock_transfers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  transferDate: date("transfer_date").notNull(),
  transferNumber: text("transfer_number"),
  fromBranchId: integer("from_branch_id").references(() => branches.id).notNull(),
  toBranchId: integer("to_branch_id").references(() => branches.id).notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_transfer_from_branch").on(table.fromBranchId),
  index("idx_transfer_to_branch").on(table.toBranchId),
  index("idx_transfer_date").on(table.transferDate),
]);

export const stockTransfersRelations = relations(stockTransfers, ({ one, many }) => ({
  fromBranch: one(branches, {
    fields: [stockTransfers.fromBranchId],
    references: [branches.id],
  }),
  toBranch: one(branches, {
    fields: [stockTransfers.toBranchId],
    references: [branches.id],
  }),
  lineItems: many(stockTransferLineItems),
}));

export const insertStockTransferSchema = createInsertSchema(stockTransfers).omit({ id: true, createdAt: true });
export type InsertStockTransfer = z.infer<typeof insertStockTransferSchema>;
export type StockTransfer = typeof stockTransfers.$inferSelect;

export const stockTransferLineItems = pgTable("stock_transfer_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stockTransferId: integer("stock_transfer_id").references(() => stockTransfers.id, { onDelete: "cascade" }).notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").default(1),
  priceKwd: numeric("price_kwd", { precision: 12, scale: 3 }),
  imeiNumbers: text("imei_numbers").array(),
}, (table) => [
  index("idx_transfer_line_item").on(table.itemName),
  index("idx_transfer_line_transfer").on(table.stockTransferId),
]);

export const stockTransferLineItemsRelations = relations(stockTransferLineItems, ({ one }) => ({
  stockTransfer: one(stockTransfers, {
    fields: [stockTransferLineItems.stockTransferId],
    references: [stockTransfers.id],
  }),
}));

export const insertStockTransferLineItemSchema = createInsertSchema(stockTransferLineItems).omit({ id: true });
export type InsertStockTransferLineItem = z.infer<typeof insertStockTransferLineItemSchema>;
export type StockTransferLineItem = typeof stockTransferLineItems.$inferSelect;

export type StockTransferWithDetails = StockTransfer & {
  fromBranch: Branch;
  toBranch: Branch;
  lineItems: StockTransferLineItem[];
};

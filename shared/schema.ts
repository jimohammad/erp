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
  username: varchar("username").unique(),
  password: varchar("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("viewer").notNull(),
  printerType: varchar("printer_type").default("a5"),
  totpSecret: varchar("totp_secret"),
  totpEnabled: integer("totp_enabled").default(0),
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
  category: text("category"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 3 }),
  area: text("area"),
  lastStockCheckDate: text("last_stock_check_date"),
  country: text("country"),
  email: text("email"),
  beneficiaryName: text("beneficiary_name"),
  ibanAccountNumber: text("iban_account_number"),
  swiftCode: text("swift_code"),
  bankName: text("bank_name"),
  bankAddress: text("bank_address"),
  statementToken: text("statement_token"),
  statementPin: text("statement_pin"),
  openingBalance: numeric("opening_balance", { precision: 12, scale: 3 }).default("0"),
}, (table) => [
  index("idx_supplier_party_type").on(table.partyType),
  index("idx_supplier_area").on(table.area),
  index("idx_supplier_statement_token").on(table.statementToken),
  index("idx_supplier_category").on(table.category),
]);

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type PartyType = "supplier" | "customer" | "salesman" | "logistic" | "packing" | "partner";

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  supplier: "Supplier",
  customer: "Customer", 
  salesman: "Salesman",
  logistic: "Logistic Co.",
  packing: "Packing Co.",
  partner: "Partner",
};

export const SUPPLIER_CATEGORIES = [
  "Logistic Co.",
  "Packing Co.",
  "Partner",
] as const;

export type SupplierCategory = typeof SUPPLIER_CATEGORIES[number];

export const ITEM_CATEGORIES = [
  "Apple",
  "Honor", 
  "Meizu",
  "Motorola",
  "Redmi",
  "Realme",
  "Samsung",
  "Buds",
  "Charger",
] as const;

export type ItemCategory = typeof ITEM_CATEGORIES[number];

export const items = pgTable("items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code"),
  name: text("name").notNull().unique(),
  category: text("category"),
  purchasePriceKwd: numeric("purchase_price_kwd", { precision: 12, scale: 3 }),
  purchasePriceFx: numeric("purchase_price_fx", { precision: 12, scale: 3 }),
  fxCurrency: text("fx_currency"),
  sellingPriceKwd: numeric("selling_price_kwd", { precision: 12, scale: 3 }),
  landedCostKwd: numeric("landed_cost_kwd", { precision: 12, scale: 3 }),
  minStockLevel: integer("min_stock_level").default(0),
}, (table) => [
  index("idx_item_code").on(table.code),
  index("idx_item_category").on(table.category),
]);

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
  hkToDxbFx: numeric("hk_to_dxb_fx", { precision: 12, scale: 3 }),
  dxbToKwiFx: numeric("dxb_to_kwi_fx", { precision: 12, scale: 3 }),
  freightCurrency: text("freight_currency").default("AED"),
  freightFxRate: numeric("freight_fx_rate", { precision: 10, scale: 4 }),
  totalFreightKwd: numeric("total_freight_kwd", { precision: 12, scale: 3 }),
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
  imeiNumbers: text("imei_numbers").array(),
  freightShareKwd: numeric("freight_share_kwd", { precision: 12, scale: 3 }),
  partnerProfitKwd: numeric("partner_profit_kwd", { precision: 12, scale: 3 }),
  costPerPcKwd: numeric("cost_per_pc_kwd", { precision: 12, scale: 3 }),
  landedCostKwd: numeric("landed_cost_kwd", { precision: 12, scale: 3 }),
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

// ==================== PURCHASE ORDER DRAFTS (PO before conversion to bill) ====================

export const poStatusEnum = ["draft", "sent", "received", "converted"] as const;
export type POStatus = typeof poStatusEnum[number];

export const purchaseOrderDrafts = pgTable("purchase_order_drafts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  poNumber: text("po_number").notNull(),
  poDate: date("po_date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  status: text("status").default("draft").notNull(),
  convertedToPurchaseId: integer("converted_to_purchase_id").references(() => purchaseOrders.id),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
  fxCurrency: text("fx_currency").default("AED"),
  fxRate: numeric("fx_rate", { precision: 10, scale: 4 }),
  totalFx: numeric("total_fx", { precision: 12, scale: 2 }),
  fxTransferred: numeric("fx_transferred", { precision: 12, scale: 2 }),
  kwdTransferred: numeric("kwd_transferred", { precision: 12, scale: 3 }),
  hkToDxbFx: numeric("hk_to_dxb_fx", { precision: 12, scale: 3 }),
  dxbToKwiFx: numeric("dxb_to_kwi_fx", { precision: 12, scale: 3 }),
  freightCurrency: text("freight_currency").default("AED"),
  freightFxRate: numeric("freight_fx_rate", { precision: 10, scale: 4 }),
  totalFreightKwd: numeric("total_freight_kwd", { precision: 12, scale: 3 }),
  invoiceFilePath: text("invoice_file_path"),
  deliveryNoteFilePath: text("delivery_note_file_path"),
  ttCopyFilePath: text("tt_copy_file_path"),
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pod_branch").on(table.branchId),
  index("idx_pod_date").on(table.poDate),
  index("idx_pod_supplier").on(table.supplierId),
  index("idx_pod_status").on(table.status),
]);

export const purchaseOrderDraftsRelations = relations(purchaseOrderDrafts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrderDrafts.supplierId],
    references: [suppliers.id],
  }),
  convertedPurchase: one(purchaseOrders, {
    fields: [purchaseOrderDrafts.convertedToPurchaseId],
    references: [purchaseOrders.id],
  }),
  lineItems: many(purchaseOrderDraftItems),
}));

export const insertPurchaseOrderDraftSchema = createInsertSchema(purchaseOrderDrafts).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  convertedToPurchaseId: true,
});
export type InsertPurchaseOrderDraft = z.infer<typeof insertPurchaseOrderDraftSchema>;
export type PurchaseOrderDraft = typeof purchaseOrderDrafts.$inferSelect;

export const purchaseOrderDraftItems = pgTable("purchase_order_draft_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseOrderDraftId: integer("purchase_order_draft_id").references(() => purchaseOrderDrafts.id, { onDelete: "cascade" }).notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").default(1),
  priceKwd: numeric("price_kwd", { precision: 12, scale: 3 }),
  fxPrice: numeric("fx_price", { precision: 12, scale: 2 }),
  totalKwd: numeric("total_kwd", { precision: 12, scale: 3 }),
  imeiNumbers: text("imei_numbers").array(),
}, (table) => [
  index("idx_pod_line_item").on(table.itemName),
  index("idx_pod_line_order").on(table.purchaseOrderDraftId),
]);

export const purchaseOrderDraftItemsRelations = relations(purchaseOrderDraftItems, ({ one }) => ({
  purchaseOrderDraft: one(purchaseOrderDrafts, {
    fields: [purchaseOrderDraftItems.purchaseOrderDraftId],
    references: [purchaseOrderDrafts.id],
  }),
}));

export const insertPODraftItemSchema = createInsertSchema(purchaseOrderDraftItems).omit({ id: true });
export type InsertPODraftItem = z.infer<typeof insertPODraftItemSchema>;
export type PODraftItem = typeof purchaseOrderDraftItems.$inferSelect;

export type PurchaseOrderDraftWithDetails = PurchaseOrderDraft & {
  supplier: Supplier | null;
  lineItems: PODraftItem[];
};

// ==================== SALES MODULE ====================

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 3 }),
  branchId: integer("branch_id").references(() => branches.id),
  lastStockCheckDate: text("last_stock_check_date"),
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
  salesmanId: integer("salesman_id").references(() => suppliers.id),
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
  index("idx_so_salesman").on(table.salesmanId),
]);

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  salesman: one(suppliers, {
    fields: [salesOrders.salesmanId],
    references: [suppliers.id],
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
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  paymentType: text("payment_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
  fxCurrency: text("fx_currency"),
  fxRate: numeric("fx_rate", { precision: 10, scale: 4 }),
  fxAmount: numeric("fx_amount", { precision: 12, scale: 2 }),
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
  index("idx_payment_direction").on(table.direction),
  index("idx_payment_type").on(table.paymentType),
  index("idx_payment_po").on(table.purchaseOrderId),
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
  purchaseOrder: one(purchaseOrders, {
    fields: [payments.purchaseOrderId],
    references: [purchaseOrders.id],
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
  purchaseOrder: PurchaseOrder | null;
  splits?: PaymentSplit[];
};

// ==================== PAYMENT SPLITS (for split payments) ====================

export const paymentSplits = pgTable("payment_splits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  paymentType: text("payment_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
  fxCurrency: text("fx_currency"),
  fxRate: numeric("fx_rate", { precision: 10, scale: 4 }),
  fxAmount: numeric("fx_amount", { precision: 12, scale: 2 }),
  accountId: integer("account_id").references(() => accounts.id),
}, (table) => [
  index("idx_payment_split_payment").on(table.paymentId),
  index("idx_payment_split_type").on(table.paymentType),
]);

export const paymentSplitsRelations = relations(paymentSplits, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentSplits.paymentId],
    references: [payments.id],
  }),
}));

export const insertPaymentSplitSchema = createInsertSchema(paymentSplits).omit({ id: true });
export type InsertPaymentSplit = z.infer<typeof insertPaymentSplitSchema>;
export type PaymentSplit = typeof paymentSplits.$inferSelect;

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
  index("idx_expense_category").on(table.categoryId),
  index("idx_expense_account").on(table.accountId),
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
  index("idx_return_customer").on(table.customerId),
  index("idx_return_supplier").on(table.supplierId),
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
  "stock",
  "imei_history",
  "stock_transfers",
  "all_transactions",
  "ai_assistant",
  "backup",
  "settings",
  "send_price_list",
  "user_management"
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
}, (table) => [
  index("idx_discount_customer").on(table.customerId),
  index("idx_discount_sales_order").on(table.salesOrderId),
  index("idx_discount_created").on(table.createdAt),
]);

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

// ==================== OPENING BALANCES MODULE ====================

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitCostKwd: numeric("unit_cost_kwd", { precision: 12, scale: 3 }),
  effectiveDate: date("effective_date").notNull(),
  adjustmentType: text("adjustment_type").default("opening").notNull(), // 'opening' | 'manual'
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_inv_adj_item").on(table.itemId),
  index("idx_inv_adj_branch").on(table.branchId),
  index("idx_inv_adj_date").on(table.effectiveDate),
]);

export const inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one }) => ({
  item: one(items, {
    fields: [inventoryAdjustments.itemId],
    references: [items.id],
  }),
  branch: one(branches, {
    fields: [inventoryAdjustments.branchId],
    references: [branches.id],
  }),
}));

export const insertInventoryAdjustmentSchema = createInsertSchema(inventoryAdjustments).omit({ id: true, createdAt: true });
export type InsertInventoryAdjustment = z.infer<typeof insertInventoryAdjustmentSchema>;
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;

export type InventoryAdjustmentWithDetails = InventoryAdjustment & {
  item: Item;
  branch: Branch;
};

export const openingBalances = pgTable("opening_balances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  partyType: text("party_type").notNull(), // 'customer' | 'supplier'
  partyId: integer("party_id").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  balanceAmount: numeric("balance_amount", { precision: 12, scale: 3 }).notNull(), // positive = they owe us, negative = we owe them
  effectiveDate: date("effective_date").notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ob_party_type").on(table.partyType),
  index("idx_ob_party_id").on(table.partyId),
  index("idx_ob_branch").on(table.branchId),
  index("idx_ob_date").on(table.effectiveDate),
]);

export const openingBalancesRelations = relations(openingBalances, ({ one }) => ({
  branch: one(branches, {
    fields: [openingBalances.branchId],
    references: [branches.id],
  }),
}));

export const insertOpeningBalanceSchema = createInsertSchema(openingBalances).omit({ id: true, createdAt: true });
export type InsertOpeningBalance = z.infer<typeof insertOpeningBalanceSchema>;
export type OpeningBalance = typeof openingBalances.$inferSelect;

export type OpeningBalanceWithDetails = OpeningBalance & {
  branch?: Branch;
  partyName?: string;
};

// ==================== APP SETTINGS ====================

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

// ==================== IMEI TRACKING MODULE ====================

export const IMEI_STATUS = ["in_stock", "sold", "returned", "transferred", "defective", "warranty"] as const;
export type ImeiStatus = typeof IMEI_STATUS[number];

export const IMEI_EVENT_TYPES = [
  "purchased",      // IMEI received from supplier
  "stocked",        // Added to inventory
  "sold",           // Sold to customer
  "sale_returned",  // Customer returned the device
  "purchase_returned", // Returned to supplier
  "transferred_out", // Transferred to another branch
  "transferred_in",  // Received from another branch
  "warranty_claim",  // Sent for warranty service
  "warranty_received", // Received back from warranty
  "marked_defective", // Marked as defective
  "adjusted"         // Manual adjustment
] as const;
export type ImeiEventType = typeof IMEI_EVENT_TYPES[number];

// Main IMEI inventory table - tracks current state of each IMEI
export const imeiInventory = pgTable("imei_inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  imei: text("imei").notNull().unique(),
  itemName: text("item_name").notNull(),
  itemId: integer("item_id").references(() => items.id),
  status: text("status").default("in_stock").notNull(),
  currentBranchId: integer("current_branch_id").references(() => branches.id),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  purchaseDate: date("purchase_date"),
  purchasePriceKwd: numeric("purchase_price_kwd", { precision: 12, scale: 3 }),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  salesOrderId: integer("sales_order_id").references(() => salesOrders.id),
  saleDate: date("sale_date"),
  salePriceKwd: numeric("sale_price_kwd", { precision: 12, scale: 3 }),
  customerId: integer("customer_id").references(() => customers.id),
  warrantyEndDate: date("warranty_end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_imei_imei").on(table.imei),
  index("idx_imei_item").on(table.itemName),
  index("idx_imei_status").on(table.status),
  index("idx_imei_branch").on(table.currentBranchId),
  index("idx_imei_po").on(table.purchaseOrderId),
  index("idx_imei_so").on(table.salesOrderId),
]);

export const imeiInventoryRelations = relations(imeiInventory, ({ one, many }) => ({
  item: one(items, {
    fields: [imeiInventory.itemId],
    references: [items.id],
  }),
  currentBranch: one(branches, {
    fields: [imeiInventory.currentBranchId],
    references: [branches.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [imeiInventory.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [imeiInventory.salesOrderId],
    references: [salesOrders.id],
  }),
  supplier: one(suppliers, {
    fields: [imeiInventory.supplierId],
    references: [suppliers.id],
  }),
  customer: one(customers, {
    fields: [imeiInventory.customerId],
    references: [customers.id],
  }),
  events: many(imeiEvents),
}));

export const insertImeiInventorySchema = createInsertSchema(imeiInventory).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertImeiInventory = z.infer<typeof insertImeiInventorySchema>;
export type ImeiInventory = typeof imeiInventory.$inferSelect;

// IMEI events table - tracks full lifecycle/history of each IMEI
export const imeiEvents = pgTable("imei_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  imeiId: integer("imei_id").references(() => imeiInventory.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  eventDate: timestamp("event_date").defaultNow().notNull(),
  referenceType: text("reference_type"), // 'purchase_order' | 'sales_order' | 'return' | 'transfer' | 'manual'
  referenceId: integer("reference_id"),
  fromBranchId: integer("from_branch_id").references(() => branches.id),
  toBranchId: integer("to_branch_id").references(() => branches.id),
  customerId: integer("customer_id").references(() => customers.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  priceKwd: numeric("price_kwd", { precision: 12, scale: 3 }),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_imei_event_imei").on(table.imeiId),
  index("idx_imei_event_type").on(table.eventType),
  index("idx_imei_event_date").on(table.eventDate),
  index("idx_imei_event_ref").on(table.referenceType, table.referenceId),
]);

export const imeiEventsRelations = relations(imeiEvents, ({ one }) => ({
  imei: one(imeiInventory, {
    fields: [imeiEvents.imeiId],
    references: [imeiInventory.id],
  }),
  fromBranch: one(branches, {
    fields: [imeiEvents.fromBranchId],
    references: [branches.id],
  }),
  toBranch: one(branches, {
    fields: [imeiEvents.toBranchId],
    references: [branches.id],
  }),
  customer: one(customers, {
    fields: [imeiEvents.customerId],
    references: [customers.id],
  }),
  supplier: one(suppliers, {
    fields: [imeiEvents.supplierId],
    references: [suppliers.id],
  }),
}));

export const insertImeiEventSchema = createInsertSchema(imeiEvents).omit({ id: true, createdAt: true });
export type InsertImeiEvent = z.infer<typeof insertImeiEventSchema>;
export type ImeiEvent = typeof imeiEvents.$inferSelect;

export type ImeiInventoryWithDetails = ImeiInventory & {
  item?: Item | null;
  currentBranch?: Branch | null;
  purchaseOrder?: PurchaseOrder | null;
  salesOrder?: SalesOrder | null;
  supplier?: Supplier | null;
  customer?: Customer | null;
  events?: ImeiEventWithDetails[];
};

export type ImeiEventWithDetails = ImeiEvent & {
  fromBranch?: Branch | null;
  toBranch?: Branch | null;
  customer?: Customer | null;
  supplier?: Supplier | null;
};

// ==================== DOCUMENT VERIFICATION ====================

export const documentVerifications = pgTable("document_verifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  documentType: text("document_type").notNull(), // SALE, PAYMENT_IN, PAYMENT_OUT, RETURN
  documentId: integer("document_id").notNull(),
  documentNumber: text("document_number").notNull(),
  verificationCode: text("verification_code").notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
  documentDate: text("document_date").notNull(),
  partyName: text("party_name"),
  partyType: text("party_type"), // customer, supplier
  additionalData: jsonb("additional_data"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_verification_code").on(table.verificationCode),
  index("idx_verification_doc").on(table.documentType, table.documentId),
]);

export const insertDocumentVerificationSchema = createInsertSchema(documentVerifications).omit({ id: true, createdAt: true });
export type InsertDocumentVerification = z.infer<typeof insertDocumentVerificationSchema>;
export type DocumentVerification = typeof documentVerifications.$inferSelect;

// ==================== ALL TRANSACTIONS ====================
// Unified view of all financial transactions across modules

export type TransactionModule = 
  | "sales" 
  | "purchase" 
  | "payment_in" 
  | "payment_out" 
  | "sale_return" 
  | "purchase_return" 
  | "expense" 
  | "discount";

export type AllTransaction = {
  id: string;
  transactionDate: string;
  module: TransactionModule;
  reference: string;
  partyId: number | null;
  partyName: string | null;
  partyType: string | null;
  branchId: number | null;
  branchName: string | null;
  amountKwd: string;
  amountFx: string | null;
  fxCurrency: string | null;
  fxRate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};

// ==================== AUDIT TRAIL ====================
// Immutable audit log for all financial transactions

export const AUDIT_ACTIONS = ["create", "update", "delete", "void", "approve", "reject"] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];

export const AUDIT_MODULES = [
  "sales_order",
  "purchase_order", 
  "payment",
  "return",
  "expense",
  "stock_transfer",
  "inventory_adjustment",
  "account_transfer",
  "party",
  "item",
  "discount",
] as const;
export type AuditModule = typeof AUDIT_MODULES[number];

export const auditTrail = pgTable("audit_trail", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  module: text("module").notNull(), // sales_order, purchase_order, payment, etc.
  action: text("action").notNull(), // create, update, delete, void
  recordId: integer("record_id").notNull(), // ID of the affected record
  recordReference: text("record_reference"), // Invoice number, PO number, etc.
  userId: varchar("user_id").references(() => users.id),
  userName: text("user_name"), // Stored for historical reference
  branchId: integer("branch_id").references(() => branches.id),
  branchName: text("branch_name"), // Stored for historical reference
  previousData: jsonb("previous_data"), // Snapshot before change
  newData: jsonb("new_data"), // Snapshot after change
  changedFields: text("changed_fields").array(), // List of fields that changed
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"), // Optional reason for change
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_module").on(table.module),
  index("idx_audit_record").on(table.module, table.recordId),
  index("idx_audit_user").on(table.userId),
  index("idx_audit_date").on(table.createdAt),
]);

export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({ id: true, createdAt: true });
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;
export type AuditTrail = typeof auditTrail.$inferSelect;

export type AuditTrailWithDetails = AuditTrail & {
  user?: User | null;
  branch?: Branch | null;
};

// ==================== SYSTEM SETTINGS ====================
// Global settings including stock list URL token/PIN

export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, updatedAt: true });
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// ==================== LANDED COST VOUCHERS ====================
// ERP-style landed cost tracking for accurate margin analysis

export const landedCostVouchers = pgTable("landed_cost_vouchers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  voucherNumber: text("voucher_number").notNull().unique(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  voucherDate: date("voucher_date").notNull(),
  
  // Freight Leg 1: HK to Dubai
  hkToDxbAmount: numeric("hk_to_dxb_amount", { precision: 12, scale: 3 }),
  hkToDxbCurrency: text("hk_to_dxb_currency").default("USD"),
  hkToDxbFxRate: numeric("hk_to_dxb_fx_rate", { precision: 10, scale: 4 }),
  hkToDxbKwd: numeric("hk_to_dxb_kwd", { precision: 12, scale: 3 }),
  
  // Freight Leg 2: Dubai to Kuwait
  dxbToKwiAmount: numeric("dxb_to_kwi_amount", { precision: 12, scale: 3 }),
  dxbToKwiCurrency: text("dxb_to_kwi_currency").default("AED"),
  dxbToKwiFxRate: numeric("dxb_to_kwi_fx_rate", { precision: 10, scale: 4 }),
  dxbToKwiKwd: numeric("dxb_to_kwi_kwd", { precision: 12, scale: 3 }),
  
  // Partner Profit (total for the PO)
  totalPartnerProfitKwd: numeric("total_partner_profit_kwd", { precision: 12, scale: 3 }),
  
  // Packing Charges (fixed 0.210 KWD per unit, paid to packing party)
  packingChargesKwd: numeric("packing_charges_kwd", { precision: 12, scale: 3 }),
  
  // Totals
  totalFreightKwd: numeric("total_freight_kwd", { precision: 12, scale: 3 }),
  totalChargesKwd: numeric("total_charges_kwd", { precision: 12, scale: 3 }),
  grandTotalKwd: numeric("grand_total_kwd", { precision: 12, scale: 3 }),
  
  // Allocation method: "quantity" or "value"
  allocationMethod: text("allocation_method").default("quantity"),
  
  // Logistics party for HK to DXB (paid per shipment)
  partyId: integer("party_id").references(() => suppliers.id),
  
  // Logistics party for DXB to KWI (paid per shipment)
  dxbKwiPartyId: integer("dxb_kwi_party_id").references(() => suppliers.id),
  
  // Partner party (for partner profit - paid monthly)
  partnerPartyId: integer("partner_party_id").references(() => suppliers.id),
  
  // Packing party (for packing charges - fixed 0.210 KWD per unit)
  packingPartyId: integer("packing_party_id").references(() => suppliers.id),
  
  // Freight payable status (logistics company)
  payableStatus: text("payable_status").default("pending"), // pending, paid
  paymentId: integer("payment_id").references(() => payments.id),
  
  // Partner profit payable status (partner company - monthly settlement)
  partnerPayableStatus: text("partner_payable_status").default("pending"), // pending, paid
  partnerPaymentId: integer("partner_payment_id").references(() => payments.id),
  
  // Packing payable status (packing party)
  packingPayableStatus: text("packing_payable_status").default("pending"), // pending, paid
  packingPaymentId: integer("packing_payment_id").references(() => payments.id),
  
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_lcv_po").on(table.purchaseOrderId),
  index("idx_lcv_date").on(table.voucherDate),
  index("idx_lcv_branch").on(table.branchId),
]);

export const landedCostVouchersRelations = relations(landedCostVouchers, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [landedCostVouchers.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  party: one(suppliers, {
    fields: [landedCostVouchers.partyId],
    references: [suppliers.id],
    relationName: "hkDxbLogisticsParty",
  }),
  dxbKwiParty: one(suppliers, {
    fields: [landedCostVouchers.dxbKwiPartyId],
    references: [suppliers.id],
    relationName: "dxbKwiLogisticsParty",
  }),
  partnerParty: one(suppliers, {
    fields: [landedCostVouchers.partnerPartyId],
    references: [suppliers.id],
    relationName: "partnerParty",
  }),
  packingParty: one(suppliers, {
    fields: [landedCostVouchers.packingPartyId],
    references: [suppliers.id],
    relationName: "packingParty",
  }),
  payment: one(payments, {
    fields: [landedCostVouchers.paymentId],
    references: [payments.id],
    relationName: "freightPayment",
  }),
  partnerPayment: one(payments, {
    fields: [landedCostVouchers.partnerPaymentId],
    references: [payments.id],
    relationName: "partnerPayment",
  }),
  packingPayment: one(payments, {
    fields: [landedCostVouchers.packingPaymentId],
    references: [payments.id],
    relationName: "packingPayment",
  }),
  lineItems: many(landedCostLineItems),
}));

export const insertLandedCostVoucherSchema = createInsertSchema(landedCostVouchers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});
export type InsertLandedCostVoucher = z.infer<typeof insertLandedCostVoucherSchema>;
export type LandedCostVoucher = typeof landedCostVouchers.$inferSelect;

// Per-item cost allocation breakdown
export const landedCostLineItems = pgTable("landed_cost_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  voucherId: integer("voucher_id").references(() => landedCostVouchers.id, { onDelete: "cascade" }).notNull(),
  purchaseOrderLineItemId: integer("purchase_order_line_item_id").references(() => purchaseOrderLineItems.id),
  itemName: text("item_name").notNull(),
  itemCategory: text("item_category"),
  quantity: integer("quantity").default(1),
  
  // Original purchase price
  unitPriceKwd: numeric("unit_price_kwd", { precision: 12, scale: 3 }),
  lineTotalKwd: numeric("line_total_kwd", { precision: 12, scale: 3 }),
  
  // Allocated costs per unit
  freightPerUnitKwd: numeric("freight_per_unit_kwd", { precision: 12, scale: 3 }),
  partnerProfitPerUnitKwd: numeric("partner_profit_per_unit_kwd", { precision: 12, scale: 3 }),
  packingPerUnitKwd: numeric("packing_per_unit_kwd", { precision: 12, scale: 3 }),
  
  // Calculated landed cost
  landedCostPerUnitKwd: numeric("landed_cost_per_unit_kwd", { precision: 12, scale: 3 }),
  totalLandedCostKwd: numeric("total_landed_cost_kwd", { precision: 12, scale: 3 }),
}, (table) => [
  index("idx_lcl_voucher").on(table.voucherId),
  index("idx_lcl_item").on(table.itemName),
]);

export const landedCostLineItemsRelations = relations(landedCostLineItems, ({ one }) => ({
  voucher: one(landedCostVouchers, {
    fields: [landedCostLineItems.voucherId],
    references: [landedCostVouchers.id],
  }),
  purchaseOrderLineItem: one(purchaseOrderLineItems, {
    fields: [landedCostLineItems.purchaseOrderLineItemId],
    references: [purchaseOrderLineItems.id],
  }),
}));

export const insertLandedCostLineItemSchema = createInsertSchema(landedCostLineItems).omit({ id: true });
export type InsertLandedCostLineItem = z.infer<typeof insertLandedCostLineItemSchema>;
export type LandedCostLineItem = typeof landedCostLineItems.$inferSelect;

// Junction table for many-to-many relationship between vouchers and purchase orders
export const landedCostVoucherPurchaseOrders = pgTable("landed_cost_voucher_purchase_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  voucherId: integer("voucher_id").references(() => landedCostVouchers.id, { onDelete: "cascade" }).notNull(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  sortOrder: integer("sort_order").default(0), // For ordering POs in the voucher
}, (table) => [
  index("idx_lcvpo_voucher").on(table.voucherId),
  index("idx_lcvpo_po").on(table.purchaseOrderId),
]);

export const landedCostVoucherPurchaseOrdersRelations = relations(landedCostVoucherPurchaseOrders, ({ one }) => ({
  voucher: one(landedCostVouchers, {
    fields: [landedCostVoucherPurchaseOrders.voucherId],
    references: [landedCostVouchers.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [landedCostVoucherPurchaseOrders.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));

export type LandedCostVoucherPurchaseOrder = typeof landedCostVoucherPurchaseOrders.$inferSelect;

export type LandedCostVoucherWithDetails = LandedCostVoucher & {
  purchaseOrder: PurchaseOrder | null; // Legacy single PO (deprecated, kept for backward compat)
  purchaseOrders: PurchaseOrderWithDetails[]; // New multi-PO support
  party: Supplier | null;
  partnerParty: Supplier | null;
  packingParty: Supplier | null;
  payment: Payment | null;
  partnerPayment: Payment | null;
  packingPayment: Payment | null;
  lineItems: LandedCostLineItem[];
};

// Party Settlements - Monthly settlement for Partner and Packing Co. payments
export const partySettlements = pgTable("party_settlements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  settlementNumber: text("settlement_number").notNull().unique(),
  partyId: integer("party_id").references(() => suppliers.id).notNull(),
  partyType: text("party_type").notNull(), // "partner" or "packing"
  settlementPeriod: text("settlement_period").notNull(), // Format: "YYYY-MM" e.g. "2025-01"
  settlementDate: date("settlement_date").notNull(),
  totalAmountKwd: numeric("total_amount_kwd", { precision: 12, scale: 3 }).notNull(),
  voucherIds: text("voucher_ids").notNull(), // JSON array of voucher IDs included in this settlement
  voucherCount: integer("voucher_count").default(0),
  status: text("status").default("pending"), // pending, paid
  paymentId: integer("payment_id").references(() => payments.id),
  expenseId: integer("expense_id").references(() => expenses.id),
  accountId: integer("account_id").references(() => accounts.id),
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_settlement_party").on(table.partyId),
  index("idx_settlement_period").on(table.settlementPeriod),
  index("idx_settlement_status").on(table.status),
]);

export const partySettlementsRelations = relations(partySettlements, ({ one }) => ({
  party: one(suppliers, {
    fields: [partySettlements.partyId],
    references: [suppliers.id],
  }),
  payment: one(payments, {
    fields: [partySettlements.paymentId],
    references: [payments.id],
  }),
  expense: one(expenses, {
    fields: [partySettlements.expenseId],
    references: [expenses.id],
  }),
  account: one(accounts, {
    fields: [partySettlements.accountId],
    references: [accounts.id],
  }),
  branch: one(branches, {
    fields: [partySettlements.branchId],
    references: [branches.id],
  }),
  createdByUser: one(users, {
    fields: [partySettlements.createdBy],
    references: [users.id],
  }),
}));

export const insertPartySettlementSchema = createInsertSchema(partySettlements).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertPartySettlement = z.infer<typeof insertPartySettlementSchema>;
export type PartySettlement = typeof partySettlements.$inferSelect;

export type PartySettlementWithDetails = PartySettlement & {
  party: Supplier | null;
  payment: Payment | null;
  expense: ExpenseWithDetails | null;
  account: Account | null;
};

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSupplierSchema, insertItemSchema, insertPurchaseOrderSchema, insertLineItemSchema, insertCustomerSchema, insertSalesOrderSchema, insertSalesLineItemSchema, insertPaymentSchema, PAYMENT_TYPES, PAYMENT_DIRECTIONS, insertExpenseCategorySchema, insertExpenseSchema, insertAccountTransferSchema, insertReturnSchema, insertReturnLineItemSchema, insertUserRoleAssignmentSchema, insertDiscountSchema, ROLE_TYPES, MODULE_NAMES } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  
  const objectStorageService = new ObjectStorageService();

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const parsed = insertSupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const supplier = await storage.createSupplier(parsed.data);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  app.put("/api/suppliers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid supplier ID" });
      }
      const parsed = insertSupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const supplier = await storage.updateSupplier(id, parsed.data);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid supplier ID" });
      }
      const result = await storage.deleteSupplier(id);
      if (result.error) {
        return res.status(409).json({ error: result.error });
      }
      if (!result.deleted) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  app.get("/api/items", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/items", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const parsed = insertItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.createItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.put("/api/items/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      const parsed = insertItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.updateItem(id, parsed.data);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }
      const deleted = await storage.deleteItem(id);
      if (!deleted) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.get("/api/items/:itemName/last-pricing", isAuthenticated, async (req, res) => {
    try {
      const itemName = decodeURIComponent(req.params.itemName);
      const pricing = await storage.getItemLastPricing(itemName);
      res.json(pricing || { priceKwd: null, fxCurrency: null });
    } catch (error) {
      console.error("Error fetching last pricing:", error);
      res.status(500).json({ error: "Failed to fetch last pricing" });
    }
  });

  app.put("/api/items/bulk", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: "Updates array is required" });
      }
      const updatedItems = await storage.bulkUpdateItems(updates);
      res.json(updatedItems);
    } catch (error) {
      console.error("Error bulk updating items:", error);
      res.status(500).json({ error: "Failed to bulk update items" });
    }
  });

  app.get("/api/purchase-orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getPurchaseOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ error: "Failed to fetch purchase order" });
    }
  });

  app.post("/api/purchase-orders", isAuthenticated, async (req: any, res) => {
    try {
      const { lineItems, ...orderData } = req.body;
      const userId = req.user?.claims?.sub;
      
      const order = await storage.createPurchaseOrder(
        {
          purchaseDate: orderData.purchaseDate,
          invoiceNumber: orderData.invoiceNumber,
          supplierId: orderData.supplierId,
          totalKwd: orderData.totalKwd,
          fxCurrency: orderData.fxCurrency,
          fxRate: orderData.fxRate,
          totalFx: orderData.totalFx,
          invoiceFilePath: orderData.invoiceFilePath,
          deliveryNoteFilePath: orderData.deliveryNoteFilePath,
          ttCopyFilePath: orderData.ttCopyFilePath,
          grnDate: orderData.grnDate,
          createdBy: userId,
        },
        lineItems || []
      );
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ error: "Failed to create purchase order" });
    }
  });

  app.delete("/api/purchase-orders/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      const deleted = await storage.deletePurchaseOrder(id);
      if (!deleted) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ error: "Failed to delete purchase order" });
    }
  });

  app.get("/api/stats/monthly", isAuthenticated, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const stats = await storage.getMonthlyStats(year);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ error: "Failed to fetch monthly stats" });
    }
  });

  // ==================== SALES MODULE ====================

  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.createCustomer(parsed.data);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.updateCustomer(id, parsed.data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const result = await storage.deleteCustomer(id);
      if (result.error) {
        return res.status(409).json({ error: result.error });
      }
      if (!result.deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  app.get("/api/sales-orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getSalesOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      res.status(500).json({ error: "Failed to fetch sales orders" });
    }
  });

  app.get("/api/sales-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      const order = await storage.getSalesOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Sales order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching sales order:", error);
      res.status(500).json({ error: "Failed to fetch sales order" });
    }
  });

  app.post("/api/sales-orders", isAuthenticated, async (req: any, res) => {
    try {
      const { lineItems, ...orderData } = req.body;
      const userId = req.user?.claims?.sub;
      
      const order = await storage.createSalesOrder(
        {
          saleDate: orderData.saleDate,
          invoiceNumber: orderData.invoiceNumber,
          customerId: orderData.customerId,
          totalKwd: orderData.totalKwd,
          fxCurrency: orderData.fxCurrency,
          fxRate: orderData.fxRate,
          totalFx: orderData.totalFx,
          invoiceFilePath: orderData.invoiceFilePath,
          deliveryNoteFilePath: orderData.deliveryNoteFilePath,
          paymentReceiptFilePath: orderData.paymentReceiptFilePath,
          deliveryDate: orderData.deliveryDate,
          createdBy: userId,
        },
        lineItems || []
      );
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating sales order:", error);
      res.status(500).json({ error: "Failed to create sales order" });
    }
  });

  app.delete("/api/sales-orders/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      const deleted = await storage.deleteSalesOrder(id);
      if (!deleted) {
        return res.status(404).json({ error: "Sales order not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sales order:", error);
      res.status(500).json({ error: "Failed to delete sales order" });
    }
  });

  app.get("/api/sales-stats/monthly", isAuthenticated, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const stats = await storage.getSalesMonthlyStats(year);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching sales monthly stats:", error);
      res.status(500).json({ error: "Failed to fetch sales monthly stats" });
    }
  });

  // ==================== PAYMENT MODULE ====================

  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const paymentList = await storage.getPayments();
      res.json(paymentList);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid payment ID" });
      }
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const paymentData = { ...req.body, createdBy: userId };
      
      if (!PAYMENT_TYPES.includes(paymentData.paymentType)) {
        return res.status(400).json({ error: `Invalid payment type. Must be one of: ${PAYMENT_TYPES.join(", ")}` });
      }
      
      if (paymentData.direction && !PAYMENT_DIRECTIONS.includes(paymentData.direction)) {
        return res.status(400).json({ error: `Invalid payment direction. Must be one of: ${PAYMENT_DIRECTIONS.join(", ")}` });
      }
      
      const parsed = insertPaymentSchema.safeParse(paymentData);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const payment = await storage.createPayment(parsed.data);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid payment ID" });
      }
      const deleted = await storage.deletePayment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/files/uploaded", isAuthenticated, async (req, res) => {
    try {
      const { uploadURL } = req.body;
      if (!uploadURL) {
        return res.status(400).json({ error: "uploadURL is required" });
      }

      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({ objectPath });
    } catch (error) {
      console.error("Error processing uploaded file:", error);
      res.status(500).json({ error: "Failed to process uploaded file" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error fetching object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error fetching public object:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  // ==================== REPORTS API ====================

  app.get("/api/reports/stock-balance", isAuthenticated, async (req, res) => {
    try {
      const stockBalance = await storage.getStockBalance();
      res.json(stockBalance);
    } catch (error) {
      console.error("Error fetching stock balance:", error);
      res.status(500).json({ error: "Failed to fetch stock balance" });
    }
  });

  app.get("/api/reports/daily-cash-flow", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const cashFlow = await storage.getDailyCashFlow(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(cashFlow);
    } catch (error) {
      console.error("Error fetching cash flow:", error);
      res.status(500).json({ error: "Failed to fetch cash flow" });
    }
  });

  app.get("/api/reports/customer-report", isAuthenticated, async (req, res) => {
    try {
      const customerReport = await storage.getCustomerReport();
      res.json(customerReport);
    } catch (error) {
      console.error("Error fetching customer report:", error);
      res.status(500).json({ error: "Failed to fetch customer report" });
    }
  });

  app.get("/api/reports/item-sales", isAuthenticated, async (req, res) => {
    try {
      const { itemId, customerId, startDate, endDate } = req.query;
      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }
      const sales = await storage.getItemSales(
        parseInt(itemId as string),
        customerId && customerId !== "all" ? parseInt(customerId as string) : undefined,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(sales);
    } catch (error) {
      console.error("Error fetching item sales:", error);
      res.status(500).json({ error: "Failed to fetch item sales" });
    }
  });

  app.get("/api/reports/party-statement/:partyId", isAuthenticated, async (req, res) => {
    try {
      const partyId = parseInt(req.params.partyId);
      if (isNaN(partyId)) {
        return res.status(400).json({ error: "Invalid party ID" });
      }
      const { startDate, endDate } = req.query;
      const transactions = await storage.getPartyStatement(
        partyId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching party statement:", error);
      res.status(500).json({ error: "Failed to fetch party statement" });
    }
  });

  // ==================== ACCOUNTS MODULE ====================

  await storage.ensureDefaultAccounts();

  app.get("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const accountList = await storage.getAccounts();
      res.json(accountList);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid account ID" });
      }
      const account = await storage.getAccount(id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.get("/api/accounts/:id/transactions", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid account ID" });
      }
      const { startDate, endDate } = req.query;
      const transactions = await storage.getAccountTransactions(
        id,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      res.status(500).json({ error: "Failed to fetch account transactions" });
    }
  });

  app.get("/api/account-transfers", isAuthenticated, async (req, res) => {
    try {
      const transfers = await storage.getAccountTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching account transfers:", error);
      res.status(500).json({ error: "Failed to fetch account transfers" });
    }
  });

  app.post("/api/account-transfers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const transferData = { ...req.body, createdBy: userId };
      
      if (transferData.fromAccountId === transferData.toAccountId) {
        return res.status(400).json({ error: "Cannot transfer to the same account" });
      }
      
      const parsed = insertAccountTransferSchema.safeParse(transferData);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const transfer = await storage.createAccountTransfer(parsed.data);
      res.status(201).json(transfer);
    } catch (error) {
      console.error("Error creating account transfer:", error);
      res.status(500).json({ error: "Failed to create account transfer" });
    }
  });

  // ==================== EXPENSE MODULE ====================

  app.get("/api/expense-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getExpenseCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({ error: "Failed to fetch expense categories" });
    }
  });

  app.post("/api/expense-categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const parsed = insertExpenseCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const category = await storage.createExpenseCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating expense category:", error);
      res.status(500).json({ error: "Failed to create expense category" });
    }
  });

  app.put("/api/expense-categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      const parsed = insertExpenseCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const category = await storage.updateExpenseCategory(id, parsed.data);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error updating expense category:", error);
      res.status(500).json({ error: "Failed to update expense category" });
    }
  });

  app.delete("/api/expense-categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      const result = await storage.deleteExpenseCategory(id);
      if (result.error) {
        return res.status(409).json({ error: result.error });
      }
      if (!result.deleted) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense category:", error);
      res.status(500).json({ error: "Failed to delete expense category" });
    }
  });

  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const expenseList = await storage.getExpenses();
      res.json(expenseList);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid expense ID" });
      }
      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const expenseData = { ...req.body, createdBy: userId };
      
      console.log("Creating expense with data:", JSON.stringify(expenseData, null, 2));
      
      const parsed = insertExpenseSchema.safeParse(expenseData);
      if (!parsed.success) {
        console.error("Expense validation error:", parsed.error.format());
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const expense = await storage.createExpense(parsed.data);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid expense ID" });
      }
      const deleted = await storage.deleteExpense(id);
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // ==================== RETURNS MODULE ====================

  app.get("/api/returns", isAuthenticated, async (req, res) => {
    try {
      const returns = await storage.getReturns();
      res.json(returns);
    } catch (error) {
      console.error("Error fetching returns:", error);
      res.status(500).json({ error: "Failed to fetch returns" });
    }
  });

  app.get("/api/returns/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid return ID" });
      }
      const returnRecord = await storage.getReturn(id);
      if (!returnRecord) {
        return res.status(404).json({ error: "Return not found" });
      }
      res.json(returnRecord);
    } catch (error) {
      console.error("Error fetching return:", error);
      res.status(500).json({ error: "Failed to fetch return" });
    }
  });

  app.post("/api/returns", isAuthenticated, async (req: any, res) => {
    try {
      const { lineItems, ...returnData } = req.body;
      
      const returnParsed = insertReturnSchema.safeParse({
        ...returnData,
        createdBy: req.user?.claims?.sub,
      });
      
      if (!returnParsed.success) {
        console.error("Return validation error:", returnParsed.error.format());
        return res.status(400).json({ error: returnParsed.error.message });
      }
      
      const parsedLineItems = (lineItems || []).map((item: any) => ({
        itemName: item.itemName,
        quantity: item.quantity || 1,
        priceKwd: item.priceKwd,
        totalKwd: item.totalKwd,
        imeiNumbers: item.imeiNumbers || [],
      }));
      
      const newReturn = await storage.createReturn(returnParsed.data, parsedLineItems);
      res.status(201).json(newReturn);
    } catch (error) {
      console.error("Error creating return:", error);
      res.status(500).json({ error: "Failed to create return" });
    }
  });

  app.delete("/api/returns/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid return ID" });
      }
      const deleted = await storage.deleteReturn(id);
      if (!deleted) {
        return res.status(404).json({ error: "Return not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting return:", error);
      res.status(500).json({ error: "Failed to delete return" });
    }
  });

  // ==================== ROLE & PERMISSIONS ====================

  await storage.ensureDefaultRolePermissions();

  const isSuperUser = async (req: any, res: any, next: any) => {
    const userEmail = req.user?.claims?.email;
    if (!userEmail) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const role = await storage.getRoleForEmail(userEmail);
    if (role !== "super_user") {
      return res.status(403).json({ error: "Super user access required" });
    }
    next();
  };

  app.get("/api/role-permissions", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  app.put("/api/role-permissions", isAuthenticated, isSuperUser, async (req, res) => {
    try {
      const { role, moduleName, canAccess } = req.body;
      if (!role || !moduleName || canAccess === undefined) {
        return res.status(400).json({ error: "Role, moduleName, and canAccess are required" });
      }
      await storage.updateRolePermission(role, moduleName, canAccess ? 1 : 0);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating role permission:", error);
      res.status(500).json({ error: "Failed to update role permission" });
    }
  });

  app.get("/api/user-role-assignments", isAuthenticated, async (req, res) => {
    try {
      const assignments = await storage.getUserRoleAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user role assignments:", error);
      res.status(500).json({ error: "Failed to fetch user role assignments" });
    }
  });

  app.post("/api/user-role-assignments", isAuthenticated, isSuperUser, async (req, res) => {
    try {
      const parsed = insertUserRoleAssignmentSchema.safeParse({
        ...req.body,
        email: req.body.email?.toLowerCase(),
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const assignment = await storage.createUserRoleAssignment(parsed.data);
      res.status(201).json(assignment);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "This email is already assigned a role" });
      }
      console.error("Error creating user role assignment:", error);
      res.status(500).json({ error: "Failed to create user role assignment" });
    }
  });

  app.put("/api/user-role-assignments/:id", isAuthenticated, isSuperUser, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
      }
      const parsed = insertUserRoleAssignmentSchema.safeParse({
        ...req.body,
        email: req.body.email?.toLowerCase(),
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const assignment = await storage.updateUserRoleAssignment(id, parsed.data);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating user role assignment:", error);
      res.status(500).json({ error: "Failed to update user role assignment" });
    }
  });

  app.delete("/api/user-role-assignments/:id", isAuthenticated, isSuperUser, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
      }
      const deleted = await storage.deleteUserRoleAssignment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user role assignment:", error);
      res.status(500).json({ error: "Failed to delete user role assignment" });
    }
  });

  app.get("/api/my-permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      if (!userEmail) {
        return res.json({ role: "user", modules: MODULE_NAMES });
      }
      const role = await storage.getRoleForEmail(userEmail);
      const modules = await storage.getModulesForRole(role);
      res.json({ role, modules });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch user permissions" });
    }
  });

  // ==================== DISCOUNT ROUTES ====================

  app.get("/api/discounts", isAuthenticated, async (req, res) => {
    try {
      const discounts = await storage.getDiscounts();
      res.json(discounts);
    } catch (error) {
      console.error("Error fetching discounts:", error);
      res.status(500).json({ error: "Failed to fetch discounts" });
    }
  });

  app.get("/api/discounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid discount ID" });
      }
      const discount = await storage.getDiscount(id);
      if (!discount) {
        return res.status(404).json({ error: "Discount not found" });
      }
      res.json(discount);
    } catch (error) {
      console.error("Error fetching discount:", error);
      res.status(500).json({ error: "Failed to fetch discount" });
    }
  });

  app.post("/api/discounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = insertDiscountSchema.safeParse({
        ...req.body,
        createdBy: userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const discount = await storage.createDiscount(parsed.data);
      res.status(201).json(discount);
    } catch (error) {
      console.error("Error creating discount:", error);
      res.status(500).json({ error: "Failed to create discount" });
    }
  });

  app.delete("/api/discounts/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid discount ID" });
      }
      const deleted = await storage.deleteDiscount(id);
      if (!deleted) {
        return res.status(404).json({ error: "Discount not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting discount:", error);
      res.status(500).json({ error: "Failed to delete discount" });
    }
  });

  app.get("/api/invoices-for-customer/:customerId", isAuthenticated, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const invoices = await storage.getInvoicesForCustomer(customerId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices for customer:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // ==================== CUSTOMER STATEMENT ROUTE ====================

  app.get("/api/customer-statement", isAuthenticated, async (req, res) => {
    try {
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      if (!customerId || isNaN(customerId)) {
        return res.status(400).json({ error: "Customer ID is required" });
      }
      
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      // Get transactions for customer (sales = debit, payments IN = credit, returns = credit)
      const entries = await storage.getCustomerStatementEntries(customerId, startDate, endDate);
      
      const openingBalance = 0; // Could be calculated from transactions before startDate
      const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

      res.json({
        customer,
        entries,
        openingBalance,
        closingBalance,
      });
    } catch (error) {
      console.error("Error fetching customer statement:", error);
      res.status(500).json({ error: "Failed to fetch customer statement" });
    }
  });

  // Public customer statement (no auth required - for sharing with customers)
  app.get("/api/public/customer-statement/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const entries = await storage.getCustomerStatementEntries(customerId, startDate, endDate);
      
      const openingBalance = 0;
      const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

      res.json({
        customer: { name: customer.name, phone: customer.phone },
        entries,
        openingBalance,
        closingBalance,
      });
    } catch (error) {
      console.error("Error fetching public customer statement:", error);
      res.status(500).json({ error: "Failed to fetch customer statement" });
    }
  });

  // ==================== EXPORT IMEI ROUTE ====================

  app.get("/api/export-imei", isAuthenticated, async (req, res) => {
    try {
      const filters = {
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        itemName: req.query.itemName && req.query.itemName !== "all" ? req.query.itemName as string : undefined,
        invoiceNumber: req.query.invoiceNumber as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };
      const records = await storage.getExportImei(filters);
      res.json(records);
    } catch (error) {
      console.error("Error fetching IMEI records:", error);
      res.status(500).json({ error: "Failed to fetch IMEI records" });
    }
  });

  return httpServer;
}

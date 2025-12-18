import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSupplierSchema, insertItemSchema, insertPurchaseOrderSchema, insertLineItemSchema, insertCustomerSchema, insertSalesOrderSchema, insertSalesLineItemSchema, insertPaymentSchema, PAYMENT_TYPES, PAYMENT_DIRECTIONS, insertExpenseCategorySchema, insertExpenseSchema, insertAccountTransferSchema, insertReturnSchema, insertReturnLineItemSchema, insertUserRoleAssignmentSchema, insertDiscountSchema, insertBranchSchema, insertStockTransferSchema, insertStockTransferLineItemSchema, insertInventoryAdjustmentSchema, insertOpeningBalanceSchema, ROLE_TYPES, MODULE_NAMES } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated, isAdmin } from "./localAuth";
import { listBackups, getBackupDownloadUrl, createBackup } from "./backupScheduler";
import { sendSaleNotification } from "./whatsapp";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint for deployment (no auth required)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  await setupAuth(app);
  
  const objectStorageService = new ObjectStorageService();

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/auth/user/printer-type", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { printerType } = req.body;
      if (!printerType || !["thermal", "a4laser"].includes(printerType)) {
        return res.status(400).json({ error: "Invalid printer type. Must be 'thermal' or 'a4laser'" });
      }
      const user = await storage.updateUserPrinterType(userId, printerType);
      res.json(user);
    } catch (error) {
      console.error("Error updating printer type:", error);
      res.status(500).json({ message: "Failed to update printer type" });
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

  app.put("/api/items/bulk", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: "Updates array is required" });
      }
      const transformedUpdates = updates.map((update: any) => ({
        id: update.id,
        item: {
          purchasePriceKwd: update.purchasePriceKwd || null,
          purchasePriceFx: update.purchasePriceFx || null,
          fxCurrency: update.fxCurrency || null,
          sellingPriceKwd: update.sellingPriceKwd || null,
        }
      }));
      const updatedItems = await storage.bulkUpdateItems(transformedUpdates);
      res.json(updatedItems);
    } catch (error) {
      console.error("Error bulk updating items:", error);
      res.status(500).json({ error: "Failed to bulk update items" });
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

  app.get("/api/purchase-orders", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const result = await storage.getPurchaseOrders({ limit, offset });
      res.json(result);
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

      // Process IMEI events for purchased items
      if (lineItems && lineItems.length > 0) {
        for (const lineItem of lineItems) {
          if (lineItem.imeiNumbers && lineItem.imeiNumbers.length > 0) {
            try {
              await storage.processImeiFromPurchase(
                lineItem.imeiNumbers,
                lineItem.itemName,
                order.id,
                orderData.supplierId,
                orderData.purchaseDate,
                lineItem.priceKwd,
                orderData.branchId || null,
                userId
              );
            } catch (imeiError) {
              console.error("Error processing IMEI for purchase:", imeiError);
            }
          }
        }
      }
      
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

  // Get all customer balances (for credit limit checks in party master)
  app.get("/api/customers/balances/all", isAuthenticated, async (req, res) => {
    try {
      const balances = await storage.getAllCustomerBalances();
      res.json(balances);
    } catch (error) {
      console.error("Error fetching all customer balances:", error);
      res.status(500).json({ error: "Failed to fetch customer balances" });
    }
  });

  // Get customer's current balance
  app.get("/api/customers/:id/balance", isAuthenticated, async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const balance = await storage.getCustomerCurrentBalance(customerId);
      res.json({ balance });
    } catch (error) {
      console.error("Error fetching customer balance:", error);
      res.status(500).json({ error: "Failed to fetch customer balance" });
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

  app.post("/api/customers/:id/stock-check", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const customer = await storage.markCustomerStockChecked(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error marking stock checked:", error);
      res.status(500).json({ error: "Failed to mark stock checked" });
    }
  });

  app.get("/api/customers/due-for-stock-check", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomersDueForStockCheck();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers due for stock check:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/sales-orders/next-invoice-number", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getSalesOrders();
      const orders = result.data;
      const prefix = `SI-2026-`;
      
      // Find the highest invoice number for the current year
      let maxNumber = 10000; // Start from 10001
      orders.forEach(order => {
        if (order.invoiceNumber && order.invoiceNumber.startsWith(prefix)) {
          const numPart = parseInt(order.invoiceNumber.substring(prefix.length));
          if (!isNaN(numPart) && numPart > maxNumber) {
            maxNumber = numPart;
          }
        }
      });
      
      const nextNumber = `${prefix}${maxNumber + 1}`;
      res.json({ invoiceNumber: nextNumber });
    } catch (error) {
      console.error("Error generating invoice number:", error);
      res.status(500).json({ error: "Failed to generate invoice number" });
    }
  });

  app.get("/api/sales-orders", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const result = await storage.getSalesOrders({ limit, offset });
      res.json(result);
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
      
      // Default to Head Office (id: 1) if no branchId provided
      const branchId = orderData.branchId || 1;
      
      // Validate stock availability before creating order
      if (lineItems && lineItems.length > 0) {
        const stockBalance = await storage.getStockBalance();
        const stockMap = new Map<string, number>();
        for (const item of stockBalance) {
          stockMap.set(item.itemName, item.balance);
        }
        
        for (const lineItem of lineItems) {
          if (lineItem.itemName && lineItem.quantity > 0) {
            const available = stockMap.get(lineItem.itemName) ?? 0;
            if (lineItem.quantity > available) {
              return res.status(400).json({ 
                error: `Insufficient stock for "${lineItem.itemName}". Available: ${available}, Requested: ${lineItem.quantity}` 
              });
            }
          }
        }
      }
      
      // Handle customerId - Party Master customers have IDs offset by 100000
      // If ID >= 100000, it's from Party Master (suppliers table)
      // We need to sync this to the customers table first
      let customerId = null;
      if (orderData.customerId && orderData.customerId > 0) {
        if (orderData.customerId >= 100000) {
          // This is a Party Master customer - sync to customers table
          const partyId = orderData.customerId - 100000;
          const syncedCustomer = await storage.syncPartyToCustomer(partyId);
          if (syncedCustomer) {
            customerId = syncedCustomer.id;
          }
        } else {
          customerId = orderData.customerId;
        }
      }
      
      const order = await storage.createSalesOrder(
        {
          saleDate: orderData.saleDate,
          invoiceNumber: orderData.invoiceNumber,
          customerId: customerId,
          totalKwd: orderData.totalKwd,
          fxCurrency: orderData.fxCurrency,
          fxRate: orderData.fxRate,
          totalFx: orderData.totalFx,
          invoiceFilePath: orderData.invoiceFilePath,
          deliveryNoteFilePath: orderData.deliveryNoteFilePath,
          paymentReceiptFilePath: orderData.paymentReceiptFilePath,
          deliveryDate: orderData.deliveryDate,
          branchId: branchId,
          createdBy: userId,
        },
        lineItems || []
      );

      // Process IMEI events for sold items
      if (lineItems && lineItems.length > 0) {
        for (const lineItem of lineItems) {
          if (lineItem.imeiNumbers && lineItem.imeiNumbers.length > 0) {
            try {
              await storage.processImeiFromSale(
                lineItem.imeiNumbers,
                lineItem.itemName,
                order.id,
                orderData.customerId,
                orderData.saleDate,
                lineItem.priceKwd,
                orderData.branchId || null,
                userId
              );
            } catch (imeiError) {
              console.error("Error processing IMEI for sale:", imeiError);
            }
          }
        }
      }
      
      // Send WhatsApp notification to customer
      if (customerId) {
        try {
          // Get customer details including phone
          const customer = await storage.getCustomer(customerId);
          
          // Also check Party Master if customer was synced from there
          let customerPhone = customer?.phone;
          let customerName = customer?.name || "Valued Customer";
          
          // If no phone in customers table, try Party Master
          if (!customerPhone && orderData.customerId >= 100000) {
            const partyId = orderData.customerId - 100000;
            const party = await storage.getSupplier(partyId);
            if (party) {
              customerPhone = party.phone;
              customerName = party.name;
            }
          }
          
          if (customerPhone) {
            const saleDetails = {
              invoiceNumber: orderData.invoiceNumber,
              saleDate: orderData.saleDate,
              totalKwd: orderData.totalKwd,
              customerName: customerName,
              items: (lineItems || []).map((item: any) => ({
                itemName: item.itemName,
                quantity: item.quantity || 1,
                priceKwd: item.priceKwd,
                imeiNumbers: item.imeiNumbers,
              })),
            };
            
            const whatsappResult = await sendSaleNotification(customerPhone, saleDetails);
            if (whatsappResult.success) {
              console.log(`[WhatsApp] SUCCESS: Notification sent for sale order #${order.id} to ${customerPhone} (messageId: ${whatsappResult.messageId})`);
            } else {
              console.warn(`[WhatsApp] FAILED: Sale order #${order.id}, customer: ${customerName}, phone: ${customerPhone}, error: ${whatsappResult.error}`);
            }
          } else {
            console.log(`[WhatsApp] SKIPPED: No phone number for customer ${customerId} (${customerName})`);
          }
        } catch (whatsappError) {
          // Don't fail the sale if WhatsApp fails - just log the error
          console.error(`[WhatsApp] ERROR: Sale order #${order.id}, exception:`, whatsappError);
        }
      }
      
      res.status(201).json(order);
    } catch (error: any) {
      console.error("Error creating sales order:", error);
      const errorMessage = error?.message || "Failed to create sales order";
      res.status(500).json({ error: errorMessage, details: String(error) });
    }
  });

  app.put("/api/sales-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      
      const { lineItems, ...orderData } = req.body;
      
      // Handle customerId - Party Master customers have IDs offset by 100000
      let customerId = null;
      if (orderData.customerId && orderData.customerId > 0) {
        if (orderData.customerId >= 100000) {
          const partyId = orderData.customerId - 100000;
          const syncedCustomer = await storage.syncPartyToCustomer(partyId);
          if (syncedCustomer) {
            customerId = syncedCustomer.id;
          }
        } else {
          customerId = orderData.customerId;
        }
      }
      
      const updatedOrder = await storage.updateSalesOrder(
        id,
        {
          saleDate: orderData.saleDate,
          invoiceNumber: orderData.invoiceNumber,
          customerId: customerId,
          totalKwd: orderData.totalKwd,
        },
        lineItems || []
      );
      
      if (!updatedOrder) {
        return res.status(404).json({ error: "Sales order not found" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating sales order:", error);
      res.status(500).json({ error: "Failed to update sales order" });
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const result = await storage.getPayments({ limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/today-summary", isAuthenticated, async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const allPayments = await storage.getPayments({ limit: 10000, offset: 0 });
      const todayPaymentsIn = allPayments.data.filter(
        (p: any) => p.direction === "IN" && p.paymentDate === today
      );
      
      const total = todayPaymentsIn.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      const byType = {
        Cash: todayPaymentsIn.filter((p: any) => p.paymentType === "Cash").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
        "NBK Bank": todayPaymentsIn.filter((p: any) => p.paymentType === "NBK Bank").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
        "CBK Bank": todayPaymentsIn.filter((p: any) => p.paymentType === "CBK Bank").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
        Knet: todayPaymentsIn.filter((p: any) => p.paymentType === "Knet").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
        Wamd: todayPaymentsIn.filter((p: any) => p.paymentType === "Wamd").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
      };
      
      res.json({ total, byType, date: today });
    } catch (error) {
      console.error("Error fetching today payment summary:", error);
      res.status(500).json({ error: "Failed to fetch today payment summary" });
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
      const { splits, ...paymentBody } = req.body;
      const paymentData = { ...paymentBody, createdBy: userId };
      
      console.log("[Payment] Received payment data:", JSON.stringify(paymentData, null, 2));
      console.log("[Payment] Received splits:", JSON.stringify(splits, null, 2));
      
      if (!PAYMENT_TYPES.includes(paymentData.paymentType)) {
        return res.status(400).json({ error: `Invalid payment type. Must be one of: ${PAYMENT_TYPES.join(", ")}` });
      }
      
      if (paymentData.direction && !PAYMENT_DIRECTIONS.includes(paymentData.direction)) {
        return res.status(400).json({ error: `Invalid payment direction. Must be one of: ${PAYMENT_DIRECTIONS.join(", ")}` });
      }
      
      const parsed = insertPaymentSchema.safeParse(paymentData);
      if (!parsed.success) {
        console.error("[Payment] Validation error:", parsed.error.message);
        return res.status(400).json({ error: parsed.error.message });
      }
      
      console.log("[Payment] Parsed data:", JSON.stringify(parsed.data, null, 2));
      
      // Validate splits if provided
      if (splits && Array.isArray(splits) && splits.length > 0) {
        for (const split of splits) {
          if (!PAYMENT_TYPES.includes(split.paymentType)) {
            return res.status(400).json({ error: `Invalid split payment type: ${split.paymentType}` });
          }
          if (!split.amount || parseFloat(split.amount) <= 0) {
            return res.status(400).json({ error: "Each split must have a positive amount" });
          }
        }
      }
      
      const payment = await storage.createPayment(parsed.data, splits);
      res.status(201).json(payment);
    } catch (error) {
      console.error("[Payment] Error creating payment:", error);
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

  app.get("/api/reports/low-stock", isAuthenticated, async (req, res) => {
    try {
      const lowStock = await storage.getLowStockItems();
      res.json(lowStock);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });

  app.get("/api/reports/customer-aging", isAuthenticated, async (req, res) => {
    try {
      const aging = await storage.getCustomerAging();
      res.json(aging);
    } catch (error) {
      console.error("Error fetching customer aging:", error);
      res.status(500).json({ error: "Failed to fetch customer aging report" });
    }
  });

  app.get("/api/reports/customer-trends/:customerId", isAuthenticated, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const trends = await storage.getCustomerMonthlyTrends(customerId);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching customer trends:", error);
      res.status(500).json({ error: "Failed to fetch customer trends" });
    }
  });

  app.get("/api/reports/customer-metrics/:customerId", isAuthenticated, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const metrics = await storage.getCustomerPaymentMetrics(customerId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching customer metrics:", error);
      res.status(500).json({ error: "Failed to fetch customer metrics" });
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

  app.get("/api/reports/stock-aging", isAuthenticated, async (req, res) => {
    try {
      const { itemName, supplierId, branchId } = req.query;
      const filters: { itemName?: string; supplierId?: number; branchId?: number } = {};
      
      if (itemName && typeof itemName === 'string') {
        filters.itemName = itemName;
      }
      if (supplierId && !isNaN(parseInt(supplierId as string))) {
        filters.supplierId = parseInt(supplierId as string);
      }
      if (branchId && !isNaN(parseInt(branchId as string))) {
        filters.branchId = parseInt(branchId as string);
      }
      
      const stockAging = await storage.getStockAging(filters);
      res.json(stockAging);
    } catch (error) {
      console.error("Error fetching stock aging report:", error);
      res.status(500).json({ error: "Failed to fetch stock aging report" });
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
      const userId = req.user?.claims?.sub;
      
      const returnParsed = insertReturnSchema.safeParse({
        ...returnData,
        createdBy: userId,
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

      // Process IMEI events for returned items
      if (parsedLineItems && parsedLineItems.length > 0) {
        for (const lineItem of parsedLineItems) {
          if (lineItem.imeiNumbers && lineItem.imeiNumbers.length > 0) {
            try {
              await storage.processImeiFromReturn(
                lineItem.imeiNumbers,
                returnData.returnType,
                newReturn.id,
                returnData.customerId || null,
                returnData.supplierId || null,
                returnData.branchId || null,
                userId
              );
            } catch (imeiError) {
              console.error("Error processing IMEI for return:", imeiError);
            }
          }
        }
      }

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
    // Support both Replit auth (claims.email) and local auth (email directly)
    const userEmail = req.user?.claims?.email || req.user?.email;
    const userRole = req.user?.role;
    
    // For local auth, check the role directly from the session
    if (userRole === "super_user" || userRole === "admin") {
      return next();
    }
    
    // For Replit auth or if role not in session, check database
    if (userEmail) {
      const role = await storage.getRoleForEmail(userEmail);
      if (role === "super_user" || role === "admin") {
        return next();
      }
    }
    
    return res.status(403).json({ error: "Admin access required" });
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
      // Check for local auth user first (has role directly on user object)
      const localUser = req.user;
      if (localUser?.role) {
        // For local auth users, use their role directly (admin uses admin permissions, not super_user)
        const role = localUser.role;
        const modules = await storage.getModulesForRole(role);
        const userEmail = localUser.email;
        const assignedBranchId = userEmail ? await storage.getBranchIdForEmail(userEmail) : null;
        return res.json({ role, modules, assignedBranchId });
      }
      
      // Fall back to Replit Auth (claims-based)
      const userEmail = req.user?.claims?.email;
      if (!userEmail) {
        return res.json({ role: "user", modules: MODULE_NAMES, assignedBranchId: null });
      }
      const role = await storage.getRoleForEmail(userEmail);
      const modules = await storage.getModulesForRole(role);
      const assignedBranchId = await storage.getBranchIdForEmail(userEmail);
      res.json({ role, modules, assignedBranchId });
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

  // Get customer balance for a specific sale order (for invoice printing)
  app.get("/api/customer-balance-for-sale/:saleOrderId", isAuthenticated, async (req, res) => {
    try {
      const saleOrderId = parseInt(req.params.saleOrderId);
      if (isNaN(saleOrderId)) {
        return res.status(400).json({ error: "Invalid sale order ID" });
      }

      const saleOrder = await storage.getSalesOrder(saleOrderId);
      if (!saleOrder) {
        return res.status(404).json({ error: "Sale order not found" });
      }

      if (!saleOrder.customerId) {
        return res.json({ previousBalance: 0, currentBalance: 0 });
      }

      const balance = await storage.getCustomerBalanceForSale(saleOrder.customerId, saleOrderId);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching customer balance for sale:", error);
      res.status(500).json({ error: "Failed to fetch customer balance" });
    }
  });

  // Get customer balance for a specific return (for return receipt printing)
  app.get("/api/customer-balance-for-return/:returnId", isAuthenticated, async (req, res) => {
    try {
      const returnId = parseInt(req.params.returnId);
      if (isNaN(returnId)) {
        return res.status(400).json({ error: "Invalid return ID" });
      }

      const returnRecord = await storage.getReturn(returnId);
      if (!returnRecord) {
        return res.status(404).json({ error: "Return not found" });
      }

      if (!returnRecord.customerId || returnRecord.returnType !== 'sale_return') {
        return res.json({ previousBalance: 0, returnAmount: 0, currentBalance: 0 });
      }

      const balance = await storage.getCustomerBalanceForReturn(returnRecord.customerId, returnId);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching customer balance for return:", error);
      res.status(500).json({ error: "Failed to fetch customer balance" });
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

  // ==================== DASHBOARD ROUTES ====================

  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      const results = await storage.globalSearch(query || "");
      res.json(results);
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // ==================== PROFIT AND LOSS ROUTE ====================

  app.get("/api/reports/profit-loss", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const report = await storage.getProfitAndLoss(startDate, endDate, branchId);
      res.json(report);
    } catch (error) {
      console.error("Error fetching P&L report:", error);
      res.status(500).json({ error: "Failed to fetch profit and loss report" });
    }
  });

  // ==================== PURCHASE ORDER DRAFT ROUTES ====================

  app.get("/api/purchase-order-drafts", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const pods = await storage.getPurchaseOrderDrafts({ status, branchId });
      res.json(pods);
    } catch (error) {
      console.error("Error fetching PO drafts:", error);
      res.status(500).json({ error: "Failed to fetch purchase order drafts" });
    }
  });

  app.get("/api/purchase-order-drafts/next-number", isAuthenticated, async (req, res) => {
    try {
      const poNumber = await storage.getNextPONumber();
      res.json({ poNumber });
    } catch (error) {
      console.error("Error getting next PO number:", error);
      res.status(500).json({ error: "Failed to get next PO number" });
    }
  });

  app.get("/api/purchase-order-drafts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pod = await storage.getPurchaseOrderDraft(id);
      if (!pod) {
        return res.status(404).json({ error: "Purchase order draft not found" });
      }
      res.json(pod);
    } catch (error) {
      console.error("Error fetching PO draft:", error);
      res.status(500).json({ error: "Failed to fetch purchase order draft" });
    }
  });

  app.post("/api/purchase-order-drafts", isAuthenticated, async (req, res) => {
    try {
      const { lineItems, ...podData } = req.body;
      const pod = await storage.createPurchaseOrderDraft(podData, lineItems || []);
      res.status(201).json(pod);
    } catch (error) {
      console.error("Error creating PO draft:", error);
      res.status(500).json({ error: "Failed to create purchase order draft" });
    }
  });

  app.put("/api/purchase-order-drafts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { lineItems, ...podData } = req.body;
      const pod = await storage.updatePurchaseOrderDraft(id, podData, lineItems);
      if (!pod) {
        return res.status(404).json({ error: "Purchase order draft not found" });
      }
      res.json(pod);
    } catch (error) {
      console.error("Error updating PO draft:", error);
      res.status(500).json({ error: "Failed to update purchase order draft" });
    }
  });

  app.patch("/api/purchase-order-drafts/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const pod = await storage.updatePurchaseOrderDraftStatus(id, status);
      if (!pod) {
        return res.status(404).json({ error: "Purchase order draft not found" });
      }
      res.json(pod);
    } catch (error) {
      console.error("Error updating PO draft status:", error);
      res.status(500).json({ error: "Failed to update purchase order draft status" });
    }
  });

  app.post("/api/purchase-order-drafts/:id/convert", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { invoiceNumber, grnDate } = req.body;
      const purchaseOrder = await storage.convertPurchaseOrderDraftToBill(id, { invoiceNumber, grnDate });
      res.json(purchaseOrder);
    } catch (error: any) {
      console.error("Error converting PO draft to bill:", error);
      res.status(400).json({ error: error.message || "Failed to convert purchase order draft to bill" });
    }
  });

  app.delete("/api/purchase-order-drafts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePurchaseOrderDraft(id);
      if (!deleted) {
        return res.status(404).json({ error: "Purchase order draft not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting PO draft:", error);
      res.status(500).json({ error: "Failed to delete purchase order draft" });
    }
  });

  // ==================== BRANCH ROUTES ====================

  app.get("/api/branches", isAuthenticated, async (req, res) => {
    try {
      const branchesList = await storage.getBranches();
      res.json(branchesList);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  app.get("/api/branches/default", isAuthenticated, async (req, res) => {
    try {
      const branch = await storage.getDefaultBranch();
      res.json(branch || null);
    } catch (error) {
      console.error("Error fetching default branch:", error);
      res.status(500).json({ error: "Failed to fetch default branch" });
    }
  });

  app.get("/api/branches/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid branch ID" });
      }
      const branch = await storage.getBranch(id);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  app.post("/api/branches", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const parsed = insertBranchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const branch = await storage.createBranch(parsed.data);
      res.status(201).json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  app.put("/api/branches/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid branch ID" });
      }
      const parsed = insertBranchSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const branch = await storage.updateBranch(id, parsed.data);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error updating branch:", error);
      res.status(500).json({ error: "Failed to update branch" });
    }
  });

  app.delete("/api/branches/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid branch ID" });
      }
      const result = await storage.deleteBranch(id);
      if (result.error) {
        return res.status(409).json({ error: result.error });
      }
      if (!result.deleted) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });

  // ==================== STOCK TRANSFER ROUTES ====================

  app.get("/api/stock-transfers/next-transfer-number", isAuthenticated, async (req, res) => {
    try {
      const transfers = await storage.getStockTransfers();
      const prefix = `TR-2026-`;
      
      // Find the highest transfer number
      let maxNumber = 10000; // Start from 10001
      transfers.forEach(transfer => {
        if (transfer.transferNumber && transfer.transferNumber.startsWith(prefix)) {
          const numPart = parseInt(transfer.transferNumber.substring(prefix.length));
          if (!isNaN(numPart) && numPart > maxNumber) {
            maxNumber = numPart;
          }
        }
      });
      
      const nextNumber = `${prefix}${maxNumber + 1}`;
      res.json({ transferNumber: nextNumber });
    } catch (error) {
      console.error("Error generating transfer number:", error);
      res.status(500).json({ error: "Failed to generate transfer number" });
    }
  });

  app.get("/api/stock-transfers", isAuthenticated, async (req, res) => {
    try {
      const transfers = await storage.getStockTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching stock transfers:", error);
      res.status(500).json({ error: "Failed to fetch stock transfers" });
    }
  });

  app.get("/api/stock-transfers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid transfer ID" });
      }
      const transfer = await storage.getStockTransfer(id);
      if (!transfer) {
        return res.status(404).json({ error: "Stock transfer not found" });
      }
      res.json(transfer);
    } catch (error) {
      console.error("Error fetching stock transfer:", error);
      res.status(500).json({ error: "Failed to fetch stock transfer" });
    }
  });

  app.post("/api/stock-transfers", isAuthenticated, async (req: any, res) => {
    try {
      const { lineItems, ...transferData } = req.body;
      console.log("[Stock Transfer] Creating transfer:", JSON.stringify({ transferData, lineItems }, null, 2));
      
      const parsed = insertStockTransferSchema.safeParse({
        ...transferData,
        createdBy: req.user?.claims?.sub,
      });
      if (!parsed.success) {
        console.error("[Stock Transfer] Validation error:", parsed.error);
        return res.status(400).json({ error: parsed.error.message });
      }

      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        return res.status(400).json({ error: "At least one line item is required" });
      }

      console.log("[Stock Transfer] Parsed data:", JSON.stringify(parsed.data, null, 2));
      const transfer = await storage.createStockTransfer(parsed.data, lineItems);
      res.status(201).json(transfer);
    } catch (error: any) {
      console.error("[Stock Transfer] Error creating stock transfer:", error?.message || error);
      console.error("[Stock Transfer] Full error:", error);
      res.status(500).json({ error: "Failed to create stock transfer", details: error?.message });
    }
  });

  app.delete("/api/stock-transfers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid transfer ID" });
      }
      const deleted = await storage.deleteStockTransfer(id);
      if (!deleted) {
        return res.status(404).json({ error: "Stock transfer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stock transfer:", error);
      res.status(500).json({ error: "Failed to delete stock transfer" });
    }
  });

  // ==================== OPENING BALANCES ROUTES ====================

  // Inventory Adjustments (Opening Stock)
  app.get("/api/inventory-adjustments", isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const adjustments = await storage.getInventoryAdjustments(branchId);
      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching inventory adjustments:", error);
      res.status(500).json({ error: "Failed to fetch inventory adjustments" });
    }
  });

  app.get("/api/inventory-adjustments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid adjustment ID" });
      }
      const adjustment = await storage.getInventoryAdjustment(id);
      if (!adjustment) {
        return res.status(404).json({ error: "Inventory adjustment not found" });
      }
      res.json(adjustment);
    } catch (error) {
      console.error("Error fetching inventory adjustment:", error);
      res.status(500).json({ error: "Failed to fetch inventory adjustment" });
    }
  });

  app.post("/api/inventory-adjustments", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = insertInventoryAdjustmentSchema.safeParse({
        ...req.body,
        createdBy: req.user?.claims?.sub,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const adjustment = await storage.createInventoryAdjustment(parsed.data);
      res.status(201).json(adjustment);
    } catch (error) {
      console.error("Error creating inventory adjustment:", error);
      res.status(500).json({ error: "Failed to create inventory adjustment" });
    }
  });

  app.put("/api/inventory-adjustments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid adjustment ID" });
      }
      const adjustment = await storage.updateInventoryAdjustment(id, req.body);
      if (!adjustment) {
        return res.status(404).json({ error: "Inventory adjustment not found" });
      }
      res.json(adjustment);
    } catch (error) {
      console.error("Error updating inventory adjustment:", error);
      res.status(500).json({ error: "Failed to update inventory adjustment" });
    }
  });

  app.delete("/api/inventory-adjustments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid adjustment ID" });
      }
      const deleted = await storage.deleteInventoryAdjustment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Inventory adjustment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory adjustment:", error);
      res.status(500).json({ error: "Failed to delete inventory adjustment" });
    }
  });

  // Opening Balances (Party Balances)
  app.get("/api/opening-balances", isAuthenticated, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const balances = await storage.getOpeningBalances(branchId);
      res.json(balances);
    } catch (error) {
      console.error("Error fetching opening balances:", error);
      res.status(500).json({ error: "Failed to fetch opening balances" });
    }
  });

  app.get("/api/opening-balances/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid balance ID" });
      }
      const balance = await storage.getOpeningBalance(id);
      if (!balance) {
        return res.status(404).json({ error: "Opening balance not found" });
      }
      res.json(balance);
    } catch (error) {
      console.error("Error fetching opening balance:", error);
      res.status(500).json({ error: "Failed to fetch opening balance" });
    }
  });

  app.post("/api/opening-balances", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = insertOpeningBalanceSchema.safeParse({
        ...req.body,
        createdBy: req.user?.claims?.sub,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const balance = await storage.createOpeningBalance(parsed.data);
      res.status(201).json(balance);
    } catch (error) {
      console.error("Error creating opening balance:", error);
      res.status(500).json({ error: "Failed to create opening balance" });
    }
  });

  app.put("/api/opening-balances/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid balance ID" });
      }
      const balance = await storage.updateOpeningBalance(id, req.body);
      if (!balance) {
        return res.status(404).json({ error: "Opening balance not found" });
      }
      res.json(balance);
    } catch (error) {
      console.error("Error updating opening balance:", error);
      res.status(500).json({ error: "Failed to update opening balance" });
    }
  });

  app.delete("/api/opening-balances/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid balance ID" });
      }
      const deleted = await storage.deleteOpeningBalance(id);
      if (!deleted) {
        return res.status(404).json({ error: "Opening balance not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting opening balance:", error);
      res.status(500).json({ error: "Failed to delete opening balance" });
    }
  });

  // ==================== APP SETTINGS ====================
  
  app.get("/api/settings/transaction-password-status", isAuthenticated, async (req, res) => {
    try {
      const password = await storage.getSetting('transaction_password');
      res.json({ isSet: !!password });
    } catch (error) {
      console.error("Error checking transaction password:", error);
      res.status(500).json({ error: "Failed to check password status" });
    }
  });

  app.post("/api/settings/transaction-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: "Password is required" });
      }
      await storage.setSetting('transaction_password', password);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting transaction password:", error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  app.delete("/api/settings/transaction-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.setSetting('transaction_password', '');
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing transaction password:", error);
      res.status(500).json({ error: "Failed to remove password" });
    }
  });

  app.post("/api/settings/verify-transaction-password", isAuthenticated, async (req, res) => {
    try {
      const { password } = req.body;
      const isValid = await storage.verifyTransactionPassword(password || '');
      res.json({ valid: isValid });
    } catch (error) {
      console.error("Error verifying transaction password:", error);
      res.status(500).json({ error: "Failed to verify password" });
    }
  });

  // ==================== IMEI TRACKING ====================

  app.get("/api/imei/search", isAuthenticated, async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const results = await storage.searchImei(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching IMEI:", error);
      res.status(500).json({ error: "Failed to search IMEI" });
    }
  });

  app.get("/api/imei/:imei", isAuthenticated, async (req, res) => {
    try {
      const imei = req.params.imei;
      if (!imei) {
        return res.status(400).json({ error: "IMEI number required" });
      }
      const record = await storage.getImeiByNumber(imei);
      if (!record) {
        return res.status(404).json({ error: "IMEI not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching IMEI:", error);
      res.status(500).json({ error: "Failed to fetch IMEI" });
    }
  });

  app.get("/api/imei/:id/history", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid IMEI ID" });
      }
      const history = await storage.getImeiHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching IMEI history:", error);
      res.status(500).json({ error: "Failed to fetch IMEI history" });
    }
  });

  // ==================== DATABASE BACKUP ====================

  app.get("/api/backup/download", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      
      // Fetch all data from important tables (using full data methods, no pagination)
      const [
        suppliers,
        items,
        customers,
        purchaseOrders,
        purchaseLineItems,
        salesOrders,
        salesLineItems,
        payments,
        expenses,
        expenseCategories,
        returns,
        returnLineItems,
        branches,
        users,
        stockTransfers,
        accountTransfers,
        openingBalances,
        discounts,
      ] = await Promise.all([
        storage.getSuppliers(),
        storage.getItems(),
        storage.getCustomers(),
        storage.getAllPurchaseOrders(),
        storage.getAllPurchaseLineItems(),
        storage.getAllSalesOrders(),
        storage.getAllSalesLineItems(),
        storage.getAllPayments(),
        storage.getExpenses(),
        storage.getExpenseCategories(),
        storage.getReturns(),
        storage.getAllReturnLineItems(),
        storage.getBranches(),
        storage.getAllUsers(),
        storage.getStockTransfers(),
        storage.getAccountTransfers(),
        storage.getOpeningBalances(),
        storage.getDiscounts(),
      ]);

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add sheets for each table
      const addSheet = (data: any[], name: string) => {
        if (data && data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31)); // Excel sheet name limit
        }
      };

      addSheet(branches, "Branches");
      addSheet(users, "Users");
      addSheet(suppliers, "Parties");
      addSheet(items, "Items");
      addSheet(customers, "Customers");
      addSheet(purchaseOrders, "Purchases");
      addSheet(purchaseLineItems, "Purchase_Lines");
      addSheet(salesOrders, "Sales");
      addSheet(salesLineItems, "Sales_Lines");
      addSheet(payments, "Payments");
      addSheet(expenses, "Expenses");
      addSheet(expenseCategories, "Expense_Categories");
      addSheet(returns, "Returns");
      addSheet(returnLineItems, "Return_Lines");
      addSheet(stockTransfers, "Stock_Transfers");
      addSheet(accountTransfers, "Account_Transfers");
      addSheet(openingBalances, "Opening_Balances");
      addSheet(discounts, "Discounts");

      // Generate buffer
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().split("T")[0] + "_" + now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = `ERP_Backup_${timestamp}.xlsx`;

      // Send file
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // List saved backups from object storage
  app.get("/api/backup/list", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const backups = await listBackups();
      res.json(backups);
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  // Download a specific backup from object storage
  app.get("/api/backup/stored/:filename", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { filename } = req.params;
      const url = await getBackupDownloadUrl(filename);
      if (!url) {
        return res.status(404).json({ error: "Backup not found" });
      }
      res.json({ url });
    } catch (error) {
      console.error("Error getting backup URL:", error);
      res.status(500).json({ error: "Failed to get backup URL" });
    }
  });

  // Trigger manual backup (saves to object storage)
  app.post("/api/backup/create", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await createBackup();
      if (result.success) {
        res.json({ success: true, filename: result.filename });
      } else {
        res.status(500).json({ error: result.error || "Failed to create backup" });
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // AI Chat endpoint
  const { processAIQuery, getAvailableQueries } = await import("./aiService");
  
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const response = await processAIQuery(message, {
        userId,
        branchId: undefined,
        userRole: user?.role || "user"
      });
      
      res.json({ response });
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "Failed to process your question" });
    }
  });
  
  app.get("/api/ai/suggestions", isAuthenticated, (req, res) => {
    res.json({ suggestions: getAvailableQueries() });
  });

  // Recommendations PDF download
  const { generateRecommendationsPDF } = await import("./pdfService");
  
  app.get("/api/recommendations/pdf", isAuthenticated, async (req, res) => {
    try {
      const buffer = await generateRecommendationsPDF();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="ERP_Recommendations.pdf"');
      res.send(buffer);
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // WhatsApp Business API Integration
  const { 
    sendWhatsAppMessage, 
    buildSalesInvoiceMessage, 
    buildPaymentReceiptMessage,
    isWhatsAppConfigured 
  } = await import("./whatsappService");

  app.get("/api/whatsapp/status", isAuthenticated, (req, res) => {
    res.json({ configured: isWhatsAppConfigured() });
  });

  app.post("/api/whatsapp/send-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const { salesOrderId, phoneNumber } = req.body;
      
      if (!salesOrderId || !phoneNumber) {
        return res.status(400).json({ error: "Sales order ID and phone number are required" });
      }

      const order = await storage.getSalesOrder(salesOrderId);
      if (!order) {
        return res.status(404).json({ error: "Sales order not found" });
      }

      const message = buildSalesInvoiceMessage(order);
      const result = await sendWhatsAppMessage(phoneNumber, message);

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("WhatsApp invoice send error:", error);
      res.status(500).json({ error: "Failed to send invoice via WhatsApp" });
    }
  });

  // ==================== ALL TRANSACTIONS ====================
  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const {
        limit = "50",
        offset = "0",
        startDate,
        endDate,
        modules,
        branchId,
        partyId,
        search
      } = req.query;

      const options = {
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        modules: modules ? (modules as string).split(',') : undefined,
        branchId: branchId ? parseInt(branchId as string) : undefined,
        partyId: partyId ? parseInt(partyId as string) : undefined,
        search: search as string | undefined,
      };

      const result = await storage.getAllTransactions(options);
      res.json(result);
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/whatsapp/send-payment-receipt", isAuthenticated, async (req: any, res) => {
    try {
      const { paymentId, phoneNumber } = req.body;
      
      if (!paymentId || !phoneNumber) {
        return res.status(400).json({ error: "Payment ID and phone number are required" });
      }

      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const message = buildPaymentReceiptMessage(payment);
      const result = await sendWhatsAppMessage(phoneNumber, message);

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("WhatsApp payment receipt send error:", error);
      res.status(500).json({ error: "Failed to send payment receipt via WhatsApp" });
    }
  });

  app.post("/api/whatsapp/send-price-list", isAuthenticated, async (req: any, res) => {
    try {
      const { customerId, itemIds } = req.body;
      
      if (!customerId || !itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ error: "Customer ID and item IDs are required" });
      }

      const customer = await storage.getSupplier(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      if (!customer.phone) {
        return res.status(400).json({ error: "Customer does not have a phone number" });
      }

      const items = await storage.getItems();
      const selectedItems = items.filter(item => itemIds.includes(item.id));

      if (selectedItems.length === 0) {
        return res.status(400).json({ error: "No valid items found" });
      }

      const stockBalance = await storage.getStockBalance();
      const stockMap = new Map<string, number>();
      stockBalance.forEach((item: any) => {
        stockMap.set(item.itemName, item.balance);
      });

      const lines: string[] = [];
      lines.push(`*Iqbal Electronics Co. WLL*`);
      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push(``);
      lines.push(`Dear ${customer.name},`);
      lines.push(`Here is our latest price list:`);
      lines.push(``);
      
      for (const item of selectedItems) {
        const price = item.sellingPriceKwd ? parseFloat(item.sellingPriceKwd).toFixed(3) : "N/A";
        const stock = stockMap.get(item.name) ?? 0;
        const availability = stock > 0 ? `Available (${stock})` : "Out of Stock";
        lines.push(`*${item.name}*`);
        lines.push(`  Price: ${price} KWD`);
        lines.push(`  ${availability}`);
        lines.push(``);
      }
      
      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`For orders, please contact us.`);
      lines.push(`Thank you!`);

      const message = lines.join('\n');
      const result = await sendWhatsAppMessage(customer.phone, message);

      if (result.success) {
        console.log(`[WhatsApp] Price list sent to ${customer.name} (${customer.phone})`);
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("WhatsApp price list send error:", error);
      res.status(500).json({ error: "Failed to send price list via WhatsApp" });
    }
  });

  // ========== Admin User Management ==========
  
  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      // Exclude password from response
      const safeUsers = allUsers.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create a new user (admin only)
  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { username, password, firstName, lastName, email, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const validRoles = ["admin", "viewer"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'viewer'" });
      }

      // Check if username already exists
      const existingUsers = await storage.getAllUsers();
      if (existingUsers.some(u => u.username === username)) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        role: role || "viewer",
      });

      // Return user without password
      const { password: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update a user (admin only)
  app.put("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role } = req.body;

      const validRoles = ["admin", "viewer"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'viewer'" });
      }

      const updatedUser = await storage.updateUser(id, {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        email: email ?? undefined,
        role: role ?? undefined,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Return user without password
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Reset user password (admin only)
  app.put("/api/admin/users/:id/password", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      const updatedUser = await storage.updateUser(id, {
        password: hashedPassword,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Delete a user (admin only)
  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Prevent self-deletion
      if (currentUser.id === id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  return httpServer;
}

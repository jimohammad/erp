import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface ChatContext {
  userId: string;
  branchId?: number;
  userRole: string;
}

interface DataResolver {
  name: string;
  description: string;
  keywords: string[];
  resolve: (context: ChatContext) => Promise<string>;
}

const dataResolvers: DataResolver[] = [
  {
    name: "total_sales",
    description: "Get total sales amount",
    keywords: ["sales", "revenue", "sold", "income", "total sales"],
    resolve: async (context) => {
      const orders = await storage.getAllSalesOrders();
      const filtered = context.branchId 
        ? orders.filter(o => o.branchId === context.branchId)
        : orders;
      const total = filtered.reduce((sum, o) => sum + Number(o.totalKwd || 0), 0);
      const count = filtered.length;
      const branchNote = context.branchId ? " (your branch)" : " (all branches)";
      return `Total sales${branchNote}: ${count} orders worth KWD ${total.toFixed(3)}`;
    }
  },
  {
    name: "total_purchases",
    description: "Get total purchases amount",
    keywords: ["purchases", "bought", "purchase", "procurement"],
    resolve: async (context) => {
      const orders = await storage.getAllPurchaseOrders();
      const filtered = context.branchId 
        ? orders.filter(o => o.branchId === context.branchId)
        : orders;
      const total = filtered.reduce((sum, o) => sum + Number(o.totalKwd || 0), 0);
      const count = filtered.length;
      const branchNote = context.branchId ? " (your branch)" : " (all branches)";
      return `Total purchases${branchNote}: ${count} orders worth KWD ${total.toFixed(3)}`;
    }
  },
  {
    name: "pending_payments",
    description: "Get pending payments information",
    keywords: ["pending", "payment", "unpaid", "due", "outstanding", "owed"],
    resolve: async (context) => {
      const payments = await storage.getAllPayments();
      const filtered = context.branchId 
        ? payments.filter(p => p.branchId === context.branchId)
        : payments;
      const incoming = filtered.filter(p => p.direction === "IN");
      const outgoing = filtered.filter(p => p.direction === "OUT");
      const totalIn = incoming.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalOut = outgoing.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      return `Payments received: KWD ${totalIn.toFixed(3)} (${incoming.length} transactions)\nPayments made: KWD ${totalOut.toFixed(3)} (${outgoing.length} transactions)`;
    }
  },
  {
    name: "stock_summary",
    description: "Get stock/inventory summary",
    keywords: ["stock", "inventory", "items", "products", "available"],
    resolve: async (context) => {
      const items = await storage.getItems();
      const branches = await storage.getBranches();
      
      // Get purchase orders and filter by branch if needed
      const purchaseOrders = await storage.getAllPurchaseOrders();
      const filteredPurchaseOrders = context.branchId 
        ? purchaseOrders.filter(o => o.branchId === context.branchId)
        : purchaseOrders;
      const purchaseOrderIds = new Set(filteredPurchaseOrders.map(o => o.id));
      const purchaseLineItems = await storage.getAllPurchaseLineItems();
      const filteredPurchaseLineItems = purchaseLineItems.filter(li => purchaseOrderIds.has(li.purchaseOrderId!));
      
      // Get sales orders and filter by branch if needed
      const salesOrders = await storage.getAllSalesOrders();
      const filteredSalesOrders = context.branchId 
        ? salesOrders.filter(o => o.branchId === context.branchId)
        : salesOrders;
      const salesOrderIds = new Set(filteredSalesOrders.map(o => o.id));
      const salesLineItems = await storage.getAllSalesLineItems();
      const filteredSalesLineItems = salesLineItems.filter(li => salesOrderIds.has(li.saleId!));
      
      let summary = `Total items in catalog: ${items.length}\n`;
      
      const purchased = filteredPurchaseLineItems.reduce((sum, li) => sum + (li.quantity || 0), 0);
      const sold = filteredSalesLineItems.reduce((sum, li) => sum + (li.quantity || 0), 0);
      const inStock = purchased - sold;
      
      const branchNote = context.branchId 
        ? `(for ${branches.find(b => b.id === context.branchId)?.name || "selected branch"})` 
        : "(all branches)";
      
      summary += `\nStock Overview ${branchNote}:\n`;
      summary += `- Total units purchased: ${purchased}\n`;
      summary += `- Total units sold: ${sold}\n`;
      summary += `- Estimated units in stock: ${inStock}`;
      
      return summary;
    }
  },
  {
    name: "top_customers",
    description: "Get top customers",
    keywords: ["customer", "clients", "top customer", "best customer", "buyers"],
    resolve: async (context) => {
      const customers = await storage.getCustomers();
      const orders = await storage.getAllSalesOrders();
      const filtered = context.branchId 
        ? orders.filter(o => o.branchId === context.branchId)
        : orders;
      
      const customerSales: Record<number, number> = {};
      filtered.forEach(o => {
        if (o.customerId) {
          customerSales[o.customerId] = (customerSales[o.customerId] || 0) + Number(o.totalKwd || 0);
        }
      });
      
      const sorted = Object.entries(customerSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      let result = "Top 5 customers by sales:\n";
      sorted.forEach(([custId, total], idx) => {
        const customer = customers.find(c => c.id === Number(custId));
        result += `${idx + 1}. ${customer?.name || "Unknown"}: KWD ${total.toFixed(3)}\n`;
      });
      return result || "No customer sales data found.";
    }
  },
  {
    name: "top_suppliers",
    description: "Get top suppliers",
    keywords: ["supplier", "vendor", "top supplier", "procurement"],
    resolve: async (context) => {
      const suppliers = await storage.getSuppliers();
      const orders = await storage.getAllPurchaseOrders();
      const filtered = context.branchId 
        ? orders.filter(o => o.branchId === context.branchId)
        : orders;
      
      const supplierPurchases: Record<number, number> = {};
      filtered.forEach(o => {
        if (o.supplierId) {
          supplierPurchases[o.supplierId] = (supplierPurchases[o.supplierId] || 0) + Number(o.totalKwd || 0);
        }
      });
      
      const sorted = Object.entries(supplierPurchases)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      let result = "Top 5 suppliers by purchase value:\n";
      sorted.forEach(([suppId, total], idx) => {
        const supplier = suppliers.find(s => s.id === Number(suppId));
        result += `${idx + 1}. ${supplier?.name || "Unknown"}: KWD ${total.toFixed(3)}\n`;
      });
      return result || "No supplier purchase data found.";
    }
  },
  {
    name: "expenses_summary",
    description: "Get expenses summary",
    keywords: ["expense", "spending", "cost", "expenditure"],
    resolve: async (context) => {
      const expenses = await storage.getExpenses();
      const filtered = context.branchId 
        ? expenses.filter(e => e.branchId === context.branchId)
        : expenses;
      const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return `Total expenses: ${filtered.length} entries worth KWD ${total.toFixed(3)}`;
    }
  },
  {
    name: "recent_activity",
    description: "Get recent activity",
    keywords: ["recent", "latest", "today", "yesterday", "last", "activity"],
    resolve: async (context) => {
      const sales = await storage.getAllSalesOrders();
      const purchases = await storage.getAllPurchaseOrders();
      const payments = await storage.getAllPayments();
      
      // Filter by branch if needed
      const filteredSales = context.branchId 
        ? sales.filter(s => s.branchId === context.branchId)
        : sales;
      const filteredPurchases = context.branchId 
        ? purchases.filter(p => p.branchId === context.branchId)
        : purchases;
      const filteredPayments = context.branchId 
        ? payments.filter(p => p.branchId === context.branchId)
        : payments;
      
      const today = new Date().toISOString().split("T")[0];
      
      const todaySales = filteredSales.filter(s => s.saleDate === today);
      const todayPurchases = filteredPurchases.filter(p => p.purchaseDate === today);
      const todayPayments = filteredPayments.filter(p => p.paymentDate === today);
      
      const branches = await storage.getBranches();
      const branchNote = context.branchId 
        ? `(for ${branches.find(b => b.id === context.branchId)?.name || "selected branch"})` 
        : "(all branches)";
      
      return `Today's activity ${branchNote}:\n- Sales: ${todaySales.length} orders\n- Purchases: ${todayPurchases.length} orders\n- Payments: ${todayPayments.length} transactions`;
    }
  }
];

function matchResolver(query: string): DataResolver | null {
  const lowerQuery = query.toLowerCase();
  
  for (const resolver of dataResolvers) {
    for (const keyword of resolver.keywords) {
      if (lowerQuery.includes(keyword)) {
        return resolver;
      }
    }
  }
  return null;
}

export async function processAIQuery(
  query: string, 
  context: ChatContext
): Promise<string> {
  try {
    const resolver = matchResolver(query);
    let dataContext = "";
    
    if (resolver) {
      dataContext = await resolver.resolve(context);
    }
    
    const systemPrompt = `You are an AI assistant for Iqbal Electronics Co. WLL, a mobile phone distribution company in Kuwait. 
You help users understand their business data and answer questions about sales, purchases, inventory, payments, and expenses.
Be concise, professional, and helpful. Format numbers nicely and provide actionable insights when possible.
If you don't have specific data, give a helpful response about what information is available.

${dataContext ? `Here is the relevant business data:\n${dataContext}` : ""}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI query error:", error);
    throw new Error("Failed to process your question. Please try again.");
  }
}

export function getAvailableQueries(): string[] {
  return [
    "What are my total sales?",
    "Show me pending payments",
    "What's in stock?",
    "Who are my top customers?",
    "What did I spend on expenses?",
    "Show me today's activity",
    "Who are my top suppliers?",
    "What are my total purchases?"
  ];
}

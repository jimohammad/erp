import { storage } from "./storage";
import { objectStorageClient, ObjectStorageService } from "./objectStorage";

const BACKUP_FOLDER = "backups";
const objectStorageService = new ObjectStorageService();

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/").filter(p => p.length > 0);
  if (pathParts.length < 1) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[0];
  const objectName = pathParts.slice(1).join("/");
  return { bucketName, objectName };
}

function getPrivateObjectDir(): string {
  try {
    return objectStorageService.getPrivateObjectDir();
  } catch {
    return "";
  }
}

export async function createBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    const XLSX = await import("xlsx");
    
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
      returnsResult,
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
      storage.getReturns().then(r => r.data),
      storage.getAllReturnLineItems(),
      storage.getBranches(),
      storage.getAllUsers(),
      storage.getStockTransfers(),
      storage.getAccountTransfers(),
      storage.getOpeningBalances(),
      storage.getDiscounts(),
    ]);

    const wb = XLSX.utils.book_new();

    const addSheet = (data: any[], name: string) => {
      if (data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
      }
    };

    addSheet(suppliers, "Suppliers");
    addSheet(items, "Items");
    addSheet(customers, "Customers");
    addSheet(purchaseOrders, "PurchaseOrders");
    addSheet(purchaseLineItems, "PurchaseLineItems");
    addSheet(salesOrders, "SalesOrders");
    addSheet(salesLineItems, "SalesLineItems");
    addSheet(payments, "Payments");
    addSheet(expenses, "Expenses");
    addSheet(expenseCategories, "ExpenseCategories");
    addSheet(returnsResult.data, "Returns");
    addSheet(returnLineItems, "ReturnLineItems");
    addSheet(branches, "Branches");
    addSheet(users.map(u => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role })), "Users");
    addSheet(stockTransfers, "StockTransfers");
    addSheet(accountTransfers, "AccountTransfers");
    addSheet(openingBalances, "OpeningBalances");
    addSheet(discounts, "Discounts");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const privateDir = getPrivateObjectDir();
    if (!privateDir) {
      console.log("Auto-backup skipped: Object storage not configured");
      return { success: false, error: "Object storage not configured" };
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toISOString().split("T")[1].split(".")[0].replace(/:/g, "-");
    const filename = `backup_${dateStr}_${timeStr}.xlsx`;
    const fullPath = `${privateDir}/${BACKUP_FOLDER}/${filename}`;
    
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.save(buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      metadata: {
        contentDisposition: `attachment; filename="${filename}"`,
      },
    });

    console.log(`Auto-backup created: ${filename}`);
    return { success: true, filename };
  } catch (error) {
    console.error("Auto-backup failed:", error);
    return { success: false, error: String(error) };
  }
}

export async function listBackups(): Promise<{ name: string; size: number; created: Date }[]> {
  try {
    const privateDir = getPrivateObjectDir();
    if (!privateDir) {
      return [];
    }

    const fullPath = `${privateDir}/${BACKUP_FOLDER}/`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    
    const [files] = await bucket.getFiles({ prefix: objectName });
    
    const backups = files
      .filter(f => f.name.endsWith(".xlsx"))
      .map(f => ({
        name: f.name.split("/").pop() || f.name,
        size: parseInt(f.metadata.size as string) || 0,
        created: new Date(f.metadata.timeCreated as string),
      }))
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return backups;
  } catch (error) {
    console.error("Failed to list backups:", error);
    return [];
  }
}

export async function getBackupDownloadUrl(filename: string): Promise<string | null> {
  try {
    const privateDir = getPrivateObjectDir();
    if (!privateDir) {
      return null;
    }

    const fullPath = `${privateDir}/${BACKUP_FOLDER}/${filename}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error("Failed to get backup download URL:", error);
    return null;
  }
}

export async function deleteOldBackups(keepCount: number = 30): Promise<number> {
  try {
    const backups = await listBackups();
    
    if (backups.length <= keepCount) {
      return 0;
    }

    const toDelete = backups.slice(keepCount);
    const privateDir = getPrivateObjectDir();
    
    let deleted = 0;
    for (const backup of toDelete) {
      try {
        const fullPath = `${privateDir}/${BACKUP_FOLDER}/${backup.name}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        await file.delete();
        deleted++;
      } catch (e) {
        console.error(`Failed to delete old backup ${backup.name}:`, e);
      }
    }

    console.log(`Deleted ${deleted} old backups`);
    return deleted;
  } catch (error) {
    console.error("Failed to delete old backups:", error);
    return 0;
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;
let schedulerTimeout: NodeJS.Timeout | null = null;
let schedulerStarted = false;

export function startBackupScheduler(): void {
  if (schedulerStarted) {
    return;
  }
  schedulerStarted = true;

  const runBackup = async () => {
    console.log("Running scheduled backup...");
    const result = await createBackup();
    if (result.success) {
      console.log(`Backup completed: ${result.filename}`);
      await deleteOldBackups(30);
    } else {
      console.error(`Backup failed: ${result.error}`);
    }
  };

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  console.log(`Backup scheduler started. First backup in ${Math.round(msUntilMidnight / 1000 / 60)} minutes at midnight`);

  schedulerTimeout = setTimeout(() => {
    runBackup();
    schedulerInterval = setInterval(runBackup, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

export function stopBackupScheduler(): void {
  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout);
    schedulerTimeout = null;
  }
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  schedulerStarted = false;
  console.log("Backup scheduler stopped");
}

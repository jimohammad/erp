import PDFDocument from "pdfkit";
import path from "path";
import QRCode from "qrcode";

// Set font path for PDFKit - use bundled fonts
const fontPath = path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data');

export function generateRecommendationsPDF(): Buffer {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(24).fillColor("#1a1a2e").text("ERP Modernization Recommendations", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).fillColor("#666").text("Iqbal Electronics Co. WLL", { align: "center" });
      doc.text(new Date().toLocaleDateString(), { align: "center" });
      doc.moveDown(2);

      doc.fontSize(16).fillColor("#1a1a2e").text("High Impact Features (Recommend Now)");
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor("#333").text("1. AI-Powered Insights", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Smart Dashboard: AI-generated daily summary of business performance");
      doc.text("  - Demand Forecasting: Predict which phones will sell next month");
      doc.text("  - Auto-suggestions: Reorder alerts for low stock items");
      doc.moveDown();

      doc.fontSize(12).fillColor("#333").text("2. Conversational Interface (AI Chat)", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text('  - Ask questions like: "What were total sales last week?"');
      doc.text("  - No need to navigate menus - just type naturally");
      doc.moveDown();

      doc.fontSize(12).fillColor("#333").text("3. Mobile App", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Sales reps can create invoices on the go");
      doc.text("  - Real-time stock check from phone");
      doc.text("  - Push notifications for low stock, payment reminders");
      doc.moveDown();

      doc.fontSize(12).fillColor("#333").text("4. WhatsApp Integration", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Send invoices directly to customers");
      doc.text("  - Payment reminders");
      doc.text("  - Delivery confirmations");
      doc.moveDown(2);

      doc.fontSize(16).fillColor("#1a1a2e").text("Medium Priority (Next Phase)");
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor("#333").text("5. Advanced Analytics Dashboard", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Visual charts: Sales trends, profit margins, top products");
      doc.text("  - Compare branches side-by-side");
      doc.text("  - Export reports to PDF/Excel");
      doc.moveDown();

      doc.fontSize(12).fillColor("#333").text("6. Customer Portal", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Customers view their purchase history");
      doc.text("  - Download their own invoices");
      doc.text("  - Check their balance/credit");
      doc.moveDown();

      doc.fontSize(12).fillColor("#333").text("7. Supplier Price Comparison", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Track prices from different suppliers");
      doc.text("  - Alert when a supplier offers better price");
      doc.text("  - Historical price trends");
      doc.moveDown(2);

      doc.fontSize(16).fillColor("#1a1a2e").text("Future Enhancements");
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor("#333").text("8. Barcode/QR Scanning", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Scan IMEI to instantly add to sale");
      doc.text("  - Print barcode labels for inventory");
      doc.moveDown();

      doc.fontSize(12).fillColor("#333").text("9. Multi-Currency Auto-Rates", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Fetch live exchange rates automatically");
      doc.text("  - Auto-convert USD/AED to KWD");
      doc.moveDown();

      doc.fontSize(12).fillColor("#333").text("10. ESG/Sustainability Tracking", { underline: true });
      doc.fontSize(10).fillColor("#555");
      doc.text("  - Track device recycling/returns");
      doc.text("  - Environmental compliance reports");
      doc.moveDown(2);

      doc.fontSize(16).fillColor("#1a1a2e").text("Priority Matrix");
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor("#555");
      doc.text("Priority 1: AI Dashboard Summary - Medium Effort, High Impact");
      doc.text("Priority 2: Mobile-Responsive Design - Low Effort, High Impact");
      doc.text("Priority 3: WhatsApp Integration - Medium Effort, High Impact");
      doc.text("Priority 4: Customer Portal - Medium Effort, Medium Impact");
      doc.moveDown(2);

      doc.fontSize(8).fillColor("#999").text("Generated by Iqbal Electronics ERP System", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  }) as unknown as Buffer;
}


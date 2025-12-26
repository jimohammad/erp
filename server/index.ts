import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

// Environment variable validation for production
function validateEnvironment(): void {
  const requiredVars = ["DATABASE_URL"];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
  
  // SESSION_SECRET is required in production - fail fast if not set
  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error("[FATAL] SESSION_SECRET is required in production - cannot start server");
      process.exit(1);
    } else {
      console.warn("[WARN] SESSION_SECRET not set - using default (development only)");
    }
  }
}

// Run validation on startup
validateEnvironment();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security headers middleware - bank-grade hardening
app.use((req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS filter in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy for privacy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy - restrict resource loading
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' wss: ws:;");
  // Permissions Policy - disable unnecessary browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // HSTS - enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Remove Express fingerprint
  res.removeHeader('X-Powered-By');
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: '10mb', // Limit request body size
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Lightweight request logging - only metadata, no payload serialization
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const contentLength = res.get("Content-Length") || "unknown";
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms (${contentLength} bytes)`);
    }
  });

  next();
});

(async () => {
  try {
    log("Initializing routes...", "startup");
    await registerRoutes(httpServer, app);
    log("Routes initialized successfully", "startup");
    
    // Seed admin user from environment variables if configured
    const { seedAdminUser } = await import("./localAuth");
    await seedAdminUser();
  } catch (error) {
    console.error("[FATAL] Failed to initialize routes:", error);
    process.exit(1);
  }

  // Secure error handler - sanitizes responses in production
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Log full error details for debugging (server-side only)
    console.error(`[ERROR] ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
    
    // In production, never expose internal error details
    const isProduction = process.env.NODE_ENV === 'production';
    const safeMessage = isProduction && status >= 500 
      ? "An internal error occurred. Please try again later."
      : (err.message || "Internal Server Error");
    
    res.status(status).json({ 
      message: safeMessage,
      // Only include error code in production for debugging reference
      ...(isProduction && status >= 500 ? { errorCode: `ERR-${Date.now().toString(36)}` } : {})
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start backup scheduler only if explicitly enabled (disabled by default for VPS performance)
      if (process.env.ENABLE_BACKUPS === 'true') {
        setImmediate(async () => {
          try {
            const { startBackupScheduler } = await import("./backupScheduler");
            startBackupScheduler();
          } catch (error) {
            console.error("[WARN] Failed to start backup scheduler:", error);
          }
        });
      } else {
        log("Backup scheduler disabled (set ENABLE_BACKUPS=true to enable)", "startup");
      }
    },
  );
})();

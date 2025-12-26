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

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[ERROR] ${err.message}`, err.stack);
    res.status(status).json({ message });
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

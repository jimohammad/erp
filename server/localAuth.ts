import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, count } from "drizzle-orm";

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minute window to count attempts

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const now = Date.now();
  const attemptData = loginAttempts.get(ip);
  
  if (attemptData) {
    // Check if currently locked out
    if (attemptData.lockedUntil > now) {
      const remainingMs = attemptData.lockedUntil - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      console.log(`[RateLimit] Blocked login attempt from ${ip} - locked for ${remainingMins} more minutes`);
      return res.status(429).json({ 
        message: `Too many login attempts. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`,
        retryAfter: remainingMs 
      });
    }
    
    // Reset count if outside the attempt window
    if (now - attemptData.lastAttempt > ATTEMPT_WINDOW_MS) {
      attemptData.count = 0;
    }
  }
  
  next();
}

function recordLoginAttempt(ip: string, success: boolean) {
  const now = Date.now();
  let attemptData = loginAttempts.get(ip);
  
  if (!attemptData) {
    attemptData = { count: 0, lastAttempt: now, lockedUntil: 0 };
    loginAttempts.set(ip, attemptData);
  }
  
  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(ip);
    console.log(`[RateLimit] Login success from ${ip} - cleared attempt counter`);
  } else {
    attemptData.count++;
    attemptData.lastAttempt = now;
    
    console.log(`[RateLimit] Failed login attempt ${attemptData.count}/${MAX_LOGIN_ATTEMPTS} from ${ip}`);
    
    if (attemptData.count >= MAX_LOGIN_ATTEMPTS) {
      attemptData.lockedUntil = now + LOCKOUT_DURATION_MS;
      console.log(`[RateLimit] IP ${ip} locked out for 15 minutes after ${attemptData.count} failed attempts`);
    }
  }
}

// Clean up old entries periodically (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    // Remove entries that are unlocked and haven't had activity in 30 minutes
    if (data.lockedUntil < now && now - data.lastAttempt > 30 * 60 * 1000) {
      loginAttempts.delete(ip);
    }
  }
}, 30 * 60 * 1000);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "strict",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        if (!user.password) {
          return done(null, false, { message: "Password not set for this account" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        cb(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      } else {
        cb(null, false);
      }
    } catch (error) {
      cb(error);
    }
  });

  // Login endpoint with rate limiting
  app.post("/api/login", checkRateLimit, (req, res, next) => {
    const ip = getClientIP(req);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        recordLoginAttempt(ip, false);
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        recordLoginAttempt(ip, false);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          return res.status(500).json({ message: "Session error" });
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ message: "Login error" });
          }
          recordLoginAttempt(ip, true);
          return res.json({ user });
        });
      });
    })(req, res, next);
  });

  // Public registration disabled - admins create users via /api/admin/users
  app.post("/api/register", (req, res) => {
    return res.status(403).json({ message: "Public registration is disabled. Please contact an administrator." });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        res.clearCookie("connect.sid", { path: "/", sameSite: "strict" });
        res.redirect("/");
      });
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        res.clearCookie("connect.sid", { path: "/", sameSite: "strict" });
        res.json({ success: true });
      });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Seed initial admin from environment variables at startup
export async function seedAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminUsername || !adminPassword) {
    console.log("[Auth] No ADMIN_USERNAME/ADMIN_PASSWORD environment variables set. Skipping admin seeding.");
    return;
  }
  
  try {
    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, adminUsername))
      .limit(1);
    
    if (existingAdmin) {
      console.log(`[Auth] Admin user '${adminUsername}' already exists.`);
      return;
    }
    
    // Create the admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      username: adminUsername,
      password: hashedPassword,
      role: "admin",
      firstName: "Admin",
      lastName: null,
      email: null,
    });
    
    console.log(`[Auth] Admin user '${adminUsername}' created successfully.`);
  } catch (error) {
    console.error("[Auth] Failed to seed admin user:", error);
  }
}

export const isAdmin: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as any;
  if (!user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const dbUser = await storage.getUser(user.id);
  if (!dbUser) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  if (dbUser.role === "admin") {
    return next();
  }
  
  const email = dbUser.email;
  if (email) {
    const assignedRole = await storage.getRoleForEmail(email);
    if (assignedRole === "super_user" || assignedRole === "admin") {
      return next();
    }
  }
  
  return res.status(403).json({ message: "Forbidden: Admin access required" });
};

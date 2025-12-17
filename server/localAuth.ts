import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, count } from "drizzle-orm";

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

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        return res.json({ user });
      });
    })(req, res, next);
  });

  // Public registration disabled - admins create users via /api/admin/users
  app.post("/api/register", (req, res) => {
    return res.status(403).json({ message: "Public registration is disabled. Please contact an administrator." });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
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

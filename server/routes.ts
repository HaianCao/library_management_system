import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateLocalUser, createLocalAuthSession, createLocalUser } from "./localAuth";
import { insertBookSchema, insertBorrowingSchema, insertActivityLogSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple session setup for local authentication
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.set("trust proxy", 1);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  }));

  // Local authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("Login attempt for username:", username);
      
      if (!username || !password) {
        console.log("Missing username or password");
        return res.status(400).json({ message: "Tên đăng nhập và mật khẩu là bắt buộc" });
      }

      const user = await authenticateLocalUser(username, password);
      if (!user) {
        console.log("Authentication failed for username:", username);
        return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
      }

      console.log("User authenticated successfully:", user.id);

      // Create simple session
      const sessionData = createLocalAuthSession(user);
      (req.session as any).user = sessionData;
      console.log("Session created successfully for user:", user.id);
      res.json({ message: "Đăng nhập thành công", user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error && error.message.includes("Admin credentials not configured")) {
        return res.status(500).json({ message: "Cấu hình quản trị viên không đầy đủ", error: error.message });
      }
      res.status(500).json({ message: "Lỗi server", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Registration route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, confirmPassword, email, firstName, lastName } = req.body;
      console.log("Registration attempt for username:", username);
      
      // Validation
      if (!username || !password || !confirmPassword || !email || !firstName || !lastName) {
        console.log("Missing required fields");
        return res.status(400).json({ message: "Tất cả thông tin là bắt buộc" });
      }

      if (password !== confirmPassword) {
        console.log("Password confirmation mismatch");
        return res.status(400).json({ message: "Mật khẩu xác nhận không khớp" });
      }

      if (password.length < 3) {
        console.log("Password too short");
        return res.status(400).json({ message: "Mật khẩu phải có ít nhất 3 ký tự" });
      }

      // Create user
      const user = await createLocalUser({
        username,
        password,
        email,
        firstName,
        lastName,
        role: 'user'
      });

      console.log("User created successfully:", user.id);

      // Automatically log in the new user
      const sessionData = createLocalAuthSession(user);
      (req.session as any).user = sessionData;
      console.log("User registered and logged in successfully:", user.id);
      res.status(201).json({ 
        message: "Tạo tài khoản thành công", 
        user: { id: user.id, username: user.username, role: user.role } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error && error.message.includes("Tên đăng nhập đã tồn tại")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Lỗi server", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Simple authentication middleware - local auth only
  const requireAuth = async (req: any, res: any, next: any) => {
    if (req.session && (req.session as any).user && (req.session as any).user.claims) {
      req.user = (req.session as any).user;
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Add logout routes
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ message: "Lỗi đăng xuất" });
      }
      res.json({ message: "Đăng xuất thành công" });
    });
  });

  app.get('/api/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.redirect('/login?error=logout-failed');
      }
      res.redirect('/login');
    });
  });

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Book routes
  app.get("/api/books", requireAuth, async (req, res) => {
    try {
      const { search, genre, status, page = "1", limit = "10" } = req.query;
      const result = await storage.getBooks({
        search: search as string,
        genre: genre as string,
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const book = await storage.getBookById(id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  app.post("/api/books", requireAuth, async (req: any, res) => {
    try {
      // Check if user is admin
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "book_added",
        details: `Added book: ${book.title}`,
        entityType: "book",
        entityId: book.id.toString(),
      });

      res.status(201).json(book);
    } catch (error) {
      console.error("Error creating book:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid book data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create book" });
    }
  });

  app.put("/api/books/:id", requireAuth, async (req: any, res) => {
    try {
      // Check if user is admin
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const validatedData = insertBookSchema.partial().parse(req.body);
      const book = await storage.updateBook(id, validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "book_updated",
        details: `Updated book: ${book.title}`,
        entityType: "book",
        entityId: book.id.toString(),
      });

      res.json(book);
    } catch (error) {
      console.error("Error updating book:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid book data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", requireAuth, async (req: any, res) => {
    try {
      // Check if user is admin
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const book = await storage.getBookById(id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      await storage.deleteBook(id);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "book_deleted",
        details: `Deleted book: ${book.title}`,
        entityType: "book",
        entityId: book.id.toString(),
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Borrowing routes
  app.get("/api/borrowings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { status, page = "1", limit = "10" } = req.query;
      
      const result = await storage.getBorrowings({
        userId: user?.role !== 'admin' ? userId : undefined, // Regular users see only their borrowings
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching borrowings:", error);
      res.status(500).json({ message: "Failed to fetch borrowings" });
    }
  });

  app.post("/api/borrowings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bookId, dueDate } = req.body;
      
      // Check if book is available
      const book = await storage.getBookById(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (book.availableQuantity <= 0) {
        return res.status(400).json({ message: "Book is not available" });
      }

      const borrowing = await storage.createBorrowing({
        userId,
        bookId,
        dueDate: new Date(dueDate),
      });
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "book_borrowed",
        details: `Borrowed book: ${book.title}`,
        entityType: "borrowing",
        entityId: borrowing.id.toString(),
      });

      res.status(201).json(borrowing);
    } catch (error) {
      console.error("Error creating borrowing:", error);
      res.status(500).json({ message: "Failed to create borrowing" });
    }
  });

  app.put("/api/borrowings/:id/return", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const borrowing = await storage.getBorrowingById(id);
      if (!borrowing) {
        return res.status(404).json({ message: "Borrowing not found" });
      }
      
      // Check if user can return this book (either the borrower or admin)
      const user = await storage.getUser(userId);
      if (borrowing.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to return this book" });
      }

      const updatedBorrowing = await storage.updateBorrowingStatus(id, 'returned', new Date());
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "book_returned",
        details: `Returned book: ${borrowing.book.title}`,
        entityType: "borrowing",
        entityId: borrowing.id.toString(),
      });

      res.json(updatedBorrowing);
    } catch (error) {
      console.error("Error returning book:", error);
      res.status(500).json({ message: "Failed to return book" });
    }
  });

  // Activity log routes
  app.get("/api/activity-logs", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { page = "1", limit = "20" } = req.query;
      
      const result = await storage.getActivityLogs({
        userId: user?.role !== 'admin' ? userId : undefined, // Regular users see only their activities
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { search, role, page = "1", limit = "10" } = req.query;
      const result = await storage.getAllUsers({
        search: search as string,
        role: role as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:targetUserId/role", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { targetUserId } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(targetUserId, role);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        action: "user_role_updated",
        details: `Updated user role to ${role} for ${updatedUser.email}`,
        entityType: "user",
        entityId: targetUserId,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * ========================================================================
 * API ROUTES CHO HỆ THỐNG QUẢN LÝ THƯ VIỆN
 * LIBRARY MANAGEMENT SYSTEM API ROUTES
 * ========================================================================
 * 
 * File này định nghĩa tất cả API endpoints cho hệ thống quản lý thư viện,
 * bao gồm xác thực, quản lý người dùng, sách, mượn/trả sách và thông báo.
 */
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateLocalUser, createLocalAuthSession, createLocalUser } from "./localAuth";
import { insertBookSchema, insertBorrowingSchema, insertActivityLogSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";

/**
 * Đăng ký tất cả routes và khởi tạo HTTP server
 * Cấu hình session PostgreSQL cho xác thực local
 */
export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * ========================================================================
   * CẤU HÌNH SESSION VÀ XÁC THỰC - SESSION & AUTHENTICATION SETUP
   * ========================================================================
   */
  
  // Cấu hình session store với PostgreSQL (TTL: 7 ngày)
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 tuần
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,  // Bảng sessions đã được tạo trong schema
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Cấu hình middleware session với bảo mật cho production
  app.set("trust proxy", 1);  // Tin tưởng reverse proxy (Replit)
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    store: sessionStore,  // Lưu session trong PostgreSQL
    resave: false,        // Không lưu lại session nếu không thay đổi
    saveUninitialized: false,  // Không lưu session rỗng
    cookie: {
      httpOnly: true,     // Chặn JavaScript truy cập cookie
      secure: process.env.NODE_ENV === "production",  // HTTPS trong production
      sameSite: "lax",    // Bảo vệ CSRF
      maxAge: sessionTtl,
    },
  }));

  /**
   * ========================================================================
   * AUTHENTICATION ROUTES - ROUTE XÁC THỰC
   * ========================================================================
   */
  
  /**
   * POST /api/auth/login - Đăng nhập local
   * Xác thực username/password và tạo session trong PostgreSQL
   * Special case: Kiểm tra admin credentials từ environment variables
   */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("Login attempt for username:", username);
      
      if (!username || !password) {
        console.log("Missing username or password");
        return res.status(400).json({ message: "Tên đăng nhập và mật khẩu là bắt buộc" });
      }

      // Xác thực qua localAuth - có xử lý admin credentials từ env vars
      const user = await authenticateLocalUser(username, password);
      if (!user) {
        console.log("Authentication failed for username:", username);
        return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
      }

      console.log("User authenticated successfully:", user.id);

      // Tạo session data và lưu vào PostgreSQL store
      const sessionData = createLocalAuthSession(user);
      (req.session as any).user = sessionData;  // Tự động persist vào DB
      console.log("Session created successfully for user:", user.id);
      
      // Chỉ trả về thông tin cơ bản, không bao gồm password hash
      res.json({ 
        message: "Đăng nhập thành công", 
        user: { id: user.id, username: user.username, role: user.role } 
      });
    } catch (error) {
      console.error("Login error:", error);
      // Xử lý lỗi đặc biệt khi admin credentials chưa được cấu hình
      if (error instanceof Error && error.message.includes("Admin credentials not configured")) {
        return res.status(500).json({ message: "Cấu hình quản trị viên không đầy đủ", error: error.message });
      }
      res.status(500).json({ message: "Lỗi server", error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/auth/register - Đăng ký tài khoản mới
   * Tạo user với role 'user' và tự động đăng nhập sau khi đăng ký thành công
   * Side effect: Kiểm tra trùng lặp username trong localAuth.createLocalUser
   */
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, confirmPassword, email, firstName, lastName } = req.body;
      console.log("Registration attempt for username:", username);
      
      // Validation tại server-side (ngoài validation ở frontend)
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

      // Tạo user mới - createLocalUser sẽ hash password và kiểm tra duplicate username
      const user = await createLocalUser({
        username,
        password,
        email,
        firstName,
        lastName,
        role: 'user'  // Mặc định tạo user với role 'user', không phải admin
      });

      console.log("User created successfully:", user.id);

      // Tự động đăng nhập người dùng vừa đăng ký (UX improvement)
      const sessionData = createLocalAuthSession(user);
      (req.session as any).user = sessionData;  // Lưu session vào PostgreSQL
      console.log("User registered and logged in successfully:", user.id);
      res.status(201).json({ 
        message: "Tạo tài khoản thành công", 
        user: { id: user.id, username: user.username, role: user.role } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      // Xử lý lỗi duplicate username từ createLocalUser
      if (error instanceof Error && error.message.includes("Tên đăng nhập đã tồn tại")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Lỗi server", error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * Middleware xác thực - Kiểm tra session hợp lệ
   * Chỉ áp dụng cho local authentication (không dùng Replit Auth)
   */
  const requireAuth = async (req: any, res: any, next: any) => {
    if (req.session && (req.session as any).user && (req.session as any).user.claims) {
      req.user = (req.session as any).user;  // Gán user vào request object
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  /**
   * POST /api/auth/logout - Đăng xuất
   * Xóa session khỏi PostgreSQL store và cookie
   */
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ message: "Lỗi đăng xuất" });
      }
      res.json({ message: "Đăng xuất thành công" });
    });
  });

  /**
   * GET /api/logout - Đăng xuất và redirect về trang login
   * Dùng cho browser navigation, khác với POST /api/auth/logout
   */
  app.get('/api/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.redirect('/login?error=logout-failed');
      }
      res.redirect('/login');
    });
  });

  /**
   * ========================================================================
   * USER & DASHBOARD ROUTES - ROUTES NGƯỜI DÙNG VÀ DASHBOARD
   * ========================================================================
   */
   
  /**
   * GET /api/auth/user - Lấy thông tin user hiện tại từ session
   */
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

  /**
   * GET /api/dashboard/stats - Lấy thống kê tổng quan cho dashboard
   * Trả về: tổng số sách, user, borrowings, overdue books
   */
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  /**
   * ========================================================================
   * BOOK MANAGEMENT ROUTES - ROUTES QUẢN LÝ SÁCH
   * ========================================================================
   */
   
  /**
   * GET /api/books - Lấy danh sách sách với search, filter và pagination
   * Query params: search, searchField, genre, status, page, limit
   */
  app.get("/api/books", requireAuth, async (req, res) => {
    try {
      const { search, searchField, genre, status, page = "1", limit = "10" } = req.query;
      const result = await storage.getBooks({
        search: search as string,
        searchField: searchField as string,
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

  /**
   * GET /api/books/:id - Lấy chi tiết sách theo ID
   */
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

  /**
   * POST /api/books - Thêm sách mới
   * Chỉ admin được phép thực hiện
   * Business logic: Nếu ISBN đã tồn tại, tăng quantity thay vì tạo mới
   */
  app.post("/api/books", requireAuth, async (req: any, res) => {
    try {
      // Kiểm tra quyền admin
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate dữ liệu với Zod schema
      const validatedData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(validatedData);  // Smart logic: cộng quantity nếu ISBN tồn tại
      
      // Ghi log activity để audit trail
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

  /**
   * PUT /api/books/:id - Cập nhật thông tin sách
   * Chỉ admin được phép thực hiện
   */
  app.put("/api/books/:id", requireAuth, async (req: any, res) => {
    try {
      // Kiểm tra quyền admin
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const validatedData = insertBookSchema.partial().parse(req.body);  // partial() cho phép update một phần
      const book = await storage.updateBook(id, validatedData);
      
      // Ghi log activity để audit trail
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

  /**
   * DELETE /api/books/:id - Xóa sách
   * Chỉ admin được phép thực hiện
   * Lưu ý: Cần kiểm tra xem sách có đang được mượn không
   */
  app.delete("/api/books/:id", requireAuth, async (req: any, res) => {
    try {
      // Kiểm tra quyền admin
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

      // Lưu ý: Trong thực tế nên kiểm tra xem sách có đang được mượn không
      await storage.deleteBook(id);
      
      // Ghi log activity để audit trail
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

  /**
   * ========================================================================
   * BORROWING MANAGEMENT ROUTES - ROUTES QUẢN LÝ MƯỢN/TRẢ SÁCH
   * ========================================================================
   */
   
  /**
   * GET /api/borrowings - Lấy danh sách giao dịch mượn sách
   * User thường chỉ thấy borrowings của mình, admin thấy tất cả
   */
  app.get("/api/borrowings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { status, page = "1", limit = "10" } = req.query;
      
      const result = await storage.getBorrowings({
        userId: user?.role !== 'admin' ? userId : undefined, // User thường chỉ thấy của mình
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

  /**
   * POST /api/borrowings - Tạo giao dịch mượn sách mới
   * Kiểm tra sách có sẵn và tự động giảm availableQuantity
   */
  app.post("/api/borrowings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bookId, dueDate } = req.body;
      
      // Kiểm tra sách có tồn tại và còn sẵn không
      const book = await storage.getBookById(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (book.availableQuantity <= 0) {
        return res.status(400).json({ message: "Book is not available" });
      }

      // Tạo giao dịch mượn sách - tự động giảm availableQuantity
      const borrowing = await storage.createBorrowing({
        userId,
        bookId,
        dueDate: new Date(dueDate),
      });
      
      // Ghi log activity để audit trail
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

  /**
   * PUT /api/borrowings/:id/return - Trả sách
   * Người mượn hoặc admin có thể thực hiện
   * Side effect: Tự động tăng availableQuantity
   */
  app.put("/api/borrowings/:id/return", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const borrowing = await storage.getBorrowingById(id);
      if (!borrowing) {
        return res.status(404).json({ message: "Borrowing not found" });
      }
      
      // Kiểm tra quyền: chỉ người mượn hoặc admin mới được trả sách
      const user = await storage.getUser(userId);
      if (borrowing.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to return this book" });
      }

      // Cập nhật trạng thái và tự động tăng availableQuantity
      const updatedBorrowing = await storage.updateBorrowingStatus(id, 'returned', new Date());
      
      // Ghi log activity để audit trail
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

  /**
   * ========================================================================
   * ACTIVITY LOG ROUTES - ROUTES NHẬT KÝ HOẠT ĐỘNG
   * ========================================================================
   */
   
  /**
   * GET /api/activity-logs - Lấy danh sách nhật ký hoạt động
   * User thường chỉ thấy activities của mình, admin thấy tất cả
   */
  app.get("/api/activity-logs", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { page = "1", limit = "20" } = req.query;
      
      const result = await storage.getActivityLogs({
        userId: user?.role !== 'admin' ? userId : undefined, // User thường chỉ thấy của mình
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  /**
   * ========================================================================
   * ADMIN MANAGEMENT ROUTES - ROUTES QUẢN LÝ ADMIN
   * ========================================================================
   */
   
  /**
   * POST /api/auth/create-admin - Tạo tài khoản admin mới
   * Chỉ admin hiện tại mới có thể tạo admin khác
   */
  app.post('/api/auth/create-admin', requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      // Kiểm tra quyền admin
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { username, password, email, firstName, lastName } = req.body;
      console.log("Admin creation attempt for username:", username);
      
      // Validation
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (password.length < 3) {
        return res.status(400).json({ message: "Password must be at least 3 characters" });
      }

      // Tạo user với role 'admin'
      const adminUser = await createLocalUser({
        username,
        password,
        email: email || `${username}@admin.local`,  // Default email nếu không có
        firstName: firstName || "Admin",
        lastName: lastName || "User",
        role: 'admin'  // Khác với registration thường là 'user'
      });

      console.log("Admin created successfully:", adminUser.id);
      
      // Ghi log activity để audit trail
      await storage.createActivityLog({
        userId: currentUserId,
        action: "admin_created",
        details: `Created admin account: ${adminUser.username}`,
        entityType: "user",
        entityId: adminUser.id,
      });

      res.status(201).json({ 
        message: "Admin account created successfully", 
        user: { id: adminUser.id, username: adminUser.username, role: adminUser.role } 
      });
    } catch (error) {
      console.error("Admin creation error:", error);
      if (error instanceof Error && error.message.includes("đã tồn tại")) {
        return res.status(400).json({ message: "Username already exists" });
      }
      res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * ========================================================================
   * USER MANAGEMENT ROUTES - ROUTES QUẢN LÝ NGƯỜI DÙNG
   * ========================================================================
   */
   
  /**
   * GET /api/users - Lấy danh sách người dùng (chỉ admin)
   * Hỗ trợ search và filter theo role
   */
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

  /**
   * PUT /api/users/:targetUserId/role - Cập nhật role của người dùng (chỉ admin)
   * Admin có thể thay đổi role của user thành admin hoặc ngược lại
   */
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
      
      // Ghi log activity để audit trail
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

  /**
   * ========================================================================
   * NOTIFICATION ROUTES - ROUTES THÔNG BÁO
   * ========================================================================
   */
   
  /**
   * GET /api/notifications - Lấy thông báo của người dùng hiện tại
   */
  app.get("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.getUserNotifications(userId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  /**
   * POST /api/notifications/announcement - Tạo thông báo cho toàn bộ users (chỉ admin)
   * Special case: userId = null nghĩa là thông báo cho tất cả users
   * Side effect: Ghi log activity để audit trail
   */
  app.post("/api/notifications/announcement", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate dữ liệu với Zod schema
      const validatedData = insertNotificationSchema.parse({
        title: req.body.title,
        content: req.body.content,
        type: 'announcement',
        createdById: userId,
        userId: null, // null nghĩa là thông báo cho tất cả users
      });
      
      const notification = await storage.createAnnouncement(validatedData);
      
      // Ghi log activity để audit trail
      await storage.createActivityLog({
        userId,
        action: "announcement_created",
        details: `Created announcement: ${notification.title}`,
        entityType: "notification",
        entityId: notification.id.toString(),
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating announcement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid announcement data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  /**
   * GET /api/notifications/all - Lấy tất cả thông báo trong hệ thống (chỉ admin)
   * Dùng để admin quản lý và xem toàn bộ notifications
   */
  app.get("/api/notifications/all", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching all notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  /**
   * DELETE /api/notifications/:id - Xóa thông báo (chỉ admin)  
   * Side effect: Ghi log activity để audit trail
   */
  app.delete("/api/notifications/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const notificationId = parseInt(req.params.id);
      await storage.deleteNotification(notificationId);
      
      // Ghi log activity để audit trail
      await storage.createActivityLog({
        userId,
        action: "notification_deleted",
        details: `Deleted notification with ID: ${notificationId}`,
        entityType: "notification",
        entityId: notificationId.toString(),
      });

      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  /**
   * DELETE /api/users/:targetUserId - Xóa tài khoản người dùng (chỉ admin)
   * Business rules: 
   * - Không thể tự xóa chính mình
   * - Không thể xóa admin khác
   * Side effect: Ghi log activity để audit trail
   */
  app.delete("/api/users/:targetUserId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { targetUserId } = req.params;
      
      // Ngăn chặn tự xóa chính mình (bảo vệ admin khỏi khóa mình ra khỏi hệ thống)
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Lấy thông tin user cần xóa để kiểm tra role
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Ngăn chặn xóa admin khác (chỉ được xóa user thường)
      if (targetUser.role === 'admin') {
        return res.status(403).json({ message: "Cannot delete admin accounts" });
      }

      // Xóa user và cascade các dữ liệu liên quan
      await storage.deleteUser(targetUserId);
      
      // Ghi log activity để audit trail
      await storage.createActivityLog({
        userId,
        action: "user_deleted",
        details: `Deleted user account: ${targetUser.email}`,
        entityType: "user",
        entityId: targetUserId,
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  /**
   * ========================================================================
   * HTTP SERVER SETUP - THIẾT LẬP HTTP SERVER
   * ========================================================================
   * 
   * Tạo HTTP server từ Express app và trả về để có thể start/stop từ bên ngoài
   * Server sẽ handle tất cả routes đã được đăng ký ở trên
   */
  const httpServer = createServer(app);
  return httpServer;
}

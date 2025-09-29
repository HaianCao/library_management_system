/**
 * ============================================================================
 * LỚP TRUY CẬP DỮ LIỆU - DATABASE STORAGE LAYER
 * ============================================================================
 * 
 * File này định nghĩa interface và implementation cho tất cả các thao tác
 * với cơ sở dữ liệu trong hệ thống quản lý thư viện
 * 
 * Các nhóm chức năng chính:
 * - Quản lý người dùng và xác thực
 * - Quản lý sách và danh mục
 * - Quản lý mượn/trả sách
 * - Nhật ký hoạt động hệ thống
 * - Thống kê dashboard
 * - Quản lý thông báo
 */

import {
  users,
  books,
  borrowings,
  activityLogs,
  notifications,
  type User,
  type UpsertUser,
  type Book,
  type InsertBook,
  type Borrowing,
  type InsertBorrowing,
  type ActivityLog,
  type InsertActivityLog,
  type Notification,
  type InsertNotification,
  type BorrowingWithDetails,
  type BookWithAvailability,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, like, or, count, isNull } from "drizzle-orm";

/**
 * ============================================================================
 * INTERFACE ĐỊNH NGHĨA CÁC THAO TÁC DỮ LIỆU
 * ============================================================================
 * 
 * Interface này định nghĩa tất cả các phương thức cần thiết để thao tác
 * với cơ sở dữ liệu. Đảm bảo tính nhất quán và dễ dàng thay đổi storage backend
 */
export interface IStorage {
  
  /**
   * ========================================================================
   * THAO TÁC NGƯỜI DÙNG - USER OPERATIONS
   * ========================================================================
   * Các phương thức bắt buộc cho hệ thống xác thực Replit Auth
   */
  getUser(id: string): Promise<User | undefined>;              // Lấy thông tin người dùng theo ID
  upsertUser(user: UpsertUser): Promise<User>;                 // Tạo mới hoặc cập nhật người dùng
  
  /**
   * ========================================================================
   * XÁC THỰC CỤC BỘ - LOCAL AUTHENTICATION
   * ========================================================================
   * Các phương thức hỗ trợ đăng nhập bằng username/password
   */
  getUserByUsername(username: string): Promise<User | undefined>; // Tìm người dùng theo tên đăng nhập
  createLocalUser(userData: {                                   // Tạo tài khoản đăng nhập cục bộ
    username: string;
    hashedPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'user';
  }): Promise<User>;
  
  /**
   * ========================================================================
   * QUẢN LÝ SÁCH - BOOK MANAGEMENT
   * ========================================================================
   * Các thao tác CRUD với danh mục sách trong thư viện
   */
  getBooks(params: {                                           // Lấy danh sách sách với bộ lọc
    search?: string;        // Từ khóa tìm kiếm
    searchField?: string;   // Trường tìm kiếm (title, author, isbn, genre)
    genre?: string;         // Lọc theo thể loại
    status?: string;        // Lọc theo trạng thái (available/borrowed)
    page?: number;          // Trang hiện tại (phân trang)
    limit?: number;         // Số items mỗi trang
  }): Promise<{ books: BookWithAvailability[]; total: number }>;
  getBookById(id: number): Promise<Book | undefined>;          // Lấy thông tin sách theo ID
  getBookByIsbn(isbn: string): Promise<Book | undefined>;      // Lấy thông tin sách theo mã ISBN
  createBook(book: InsertBook): Promise<Book>;                 // Thêm sách mới vào thư viện
  updateBook(id: number, book: Partial<InsertBook>): Promise<Book>; // Cập nhật thông tin sách
  deleteBook(id: number): Promise<void>;                       // Xóa sách khỏi thư viện
  
  /**
   * ========================================================================
   * QUẢN LÝ MƯỢN/TRẢ SÁCH - BORROWING MANAGEMENT
   * ========================================================================
   * Các thao tác liên quan đến việc mượn và trả sách
   */
  getBorrowings(params: {                                      // Lấy danh sách giao dịch mượn sách
    userId?: string;        // Lọc theo người dùng cụ thể
    status?: string;        // Lọc theo trạng thái (active/returned/overdue)
    page?: number;          // Trang hiện tại
    limit?: number;         // Số items mỗi trang
  }): Promise<{ borrowings: BorrowingWithDetails[]; total: number }>;
  getBorrowingById(id: number): Promise<BorrowingWithDetails | undefined>; // Lấy chi tiết giao dịch mượn
  createBorrowing(borrowing: InsertBorrowing): Promise<Borrowing>;         // Tạo giao dịch mượn sách mới
  updateBorrowingStatus(id: number, status: 'returned' | 'overdue', returnDate?: Date): Promise<Borrowing>; // Cập nhật trạng thái mượn
  
  /**
   * ========================================================================
   * NHẬT KÝ HOẠT ĐỘNG - ACTIVITY LOGGING
   * ========================================================================
   * Theo dõi và ghi lại các hoạt động của người dùng
   */
  getActivityLogs(params: {                                    // Lấy danh sách nhật ký hoạt động
    userId?: string;        // Lọc theo người dùng cụ thể
    page?: number;          // Trang hiện tại
    limit?: number;         // Số items mỗi trang
  }): Promise<{ logs: (ActivityLog & { user: User })[]; total: number }>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>; // Tạo bản ghi nhật ký mới
  
  /**
   * ========================================================================
   * THỐNG KÊ DASHBOARD - DASHBOARD STATISTICS
   * ========================================================================
   * Tính toán và cung cấp các số liệu thống kê tổng quan
   */
  getDashboardStats(): Promise<{                               // Lấy thống kê tổng quan cho dashboard
    totalBooks: number;          // Tổng số sách
    totalUsers: number;          // Tổng số người dùng
    activeBorrowings: number;    // Số sách đang được mượn
    overdueBorrowings: number;   // Số sách quá hạn
    popularBooks: { book: Book; borrowCount: number }[]; // Top sách được mượn nhiều nhất
  }>;
  
  /**
   * ========================================================================
   * QUẢN LÝ NGƯỜI DÙNG - USER MANAGEMENT (ADMIN)
   * ========================================================================
   * Các chức năng quản lý người dùng dành cho admin
   */
  getAllUsers(params: {                                        // Lấy danh sách tất cả người dùng
    search?: string;        // Tìm kiếm theo tên, email
    role?: string;          // Lọc theo vai trò (admin/user)
    page?: number;          // Trang hiện tại
    limit?: number;         // Số items mỗi trang
  }): Promise<{ users: User[]; total: number }>;
  updateUserRole(id: string, role: 'admin' | 'user'): Promise<User>; // Thay đổi vai trò người dùng
  deleteUser(id: string): Promise<void>;                       // Xóa tài khoản người dùng
  
  /**
   * ========================================================================
   * QUẢN LÝ THÔNG BÁO - NOTIFICATION MANAGEMENT
   * ========================================================================
   * Tạo và quản lý thông báo cho người dùng
   */
  getUserNotifications(userId: string): Promise<{ notifications: Notification[] }>; // Lấy thông báo của người dùng
  createAnnouncement(notification: InsertNotification): Promise<Notification>;      // Tạo thông báo mới
  getAllNotifications(): Promise<Notification[]>;              // Lấy tất cả thông báo (admin)
  deleteNotification(notificationId: number): Promise<void>;   // Xóa thông báo
}

/**
 * ============================================================================
 * TRIỂN KHAI LỚP TRUY CẬP DỮ LIỆU - DATABASE STORAGE IMPLEMENTATION
 * ============================================================================
 * 
 * Class này triển khai tất cả các phương thức trong interface IStorage
 * Sử dụng Drizzle ORM để thao tác với PostgreSQL database
 */
export class DatabaseStorage implements IStorage {
  
  /**
   * ========================================================================
   * THAO TÁC NGƯỜI DÙNG - USER OPERATIONS
   * ========================================================================
   */
  
  /**
   * Lấy thông tin người dùng theo ID
   * Bắt buộc cho hệ thống xác thực Replit Auth
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Tạo mới hoặc cập nhật thông tin người dùng
   * Sử dụng onConflictDoUpdate để xử lý trường hợp người dùng đã tồn tại
   */
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  /**
   * ========================================================================
   * XÁC THỰC CỤC BỘ - LOCAL AUTHENTICATION
   * ========================================================================
   */
  
  /**
   * Tìm người dùng theo tên đăng nhập (chuyển về lowercase để đảm bảo tính nhất quán)
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }

  /**
   * Tạo tài khoản đăng nhập cục bộ mới
   * Tự động tạo userId với prefix "local_" và chuyển username về lowercase
   */
  async createLocalUser(userData: {
    username: string;
    hashedPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'user';
  }): Promise<User> {
    const userId = `local_${userData.username.toLowerCase()}`;  // Tạo ID với prefix "local_"
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        username: userData.username.toLowerCase(),  // Đảm bảo username luôn là lowercase
        hashedPassword: userData.hashedPassword,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',              // Mặc định là 'user' nếu không chỉ định
        profileImageUrl: null,
      })
      .returning();
    return user;
  }

  /**
   * ========================================================================
   * QUẢN LÝ SÁCH - BOOK MANAGEMENT
   * ========================================================================
   */
  
  /**
   * Lấy danh sách sách với các bộ lọc và phân trang
   * Hỗ trợ tìm kiếm theo nhiều trường và lọc theo thể loại, trạng thái
   */
  async getBooks(params: {
    search?: string;
    searchField?: string;
    genre?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ books: BookWithAvailability[]; total: number }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;  // Tính offset cho phân trang
    
    let whereConditions = [];
    
    // Xử lý tìm kiếm theo từ khóa
    if (params.search) {
      const searchValue = `%${params.search}%`;  // Thêm wildcard cho LIKE search
      
      // Tìm kiếm theo trường cụ thể
      if (params.searchField === 'id') {
        whereConditions.push(like(books.isbn, searchValue));  // Tìm theo ISBN
      } else if (params.searchField === 'title') {
        whereConditions.push(like(books.title, searchValue)); // Tìm theo tên sách
      } else if (params.searchField === 'author') {
        whereConditions.push(like(books.author, searchValue)); // Tìm theo tác giả
      } else if (params.searchField === 'genre') {
        whereConditions.push(like(books.genre, searchValue)); // Tìm theo thể loại
      } else {
        // Tìm kiếm mặc định trên tất cả các trường
        whereConditions.push(
          or(
            like(books.title, searchValue),
            like(books.author, searchValue),
            like(books.isbn, searchValue),
            like(books.genre, searchValue)
          )
        );
      }
    }
    
    // Lọc theo thể loại
    if (params.genre && params.genre !== 'all') {
      whereConditions.push(eq(books.genre, params.genre));
    }
    
    // Kết hợp tất cả điều kiện WHERE
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Thực hiện query song song để lấy dữ liệu và đếm tổng
    const [booksResult, totalResult] = await Promise.all([
      db
        .select({
          id: books.id,
          title: books.title,
          author: books.author,
          isbn: books.isbn,
          genre: books.genre,
          quantity: books.quantity,
          availableQuantity: books.availableQuantity,
          description: books.description,
          createdAt: books.createdAt,
          updatedAt: books.updatedAt,
        })
        .from(books)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(books.createdAt)),  // Sắp xếp theo ngày tạo mới nhất
      
      db
        .select({ count: count() })
        .from(books)
        .where(whereClause)  // Đếm tổng số sách thỏa mãn điều kiện
    ]);
    
    // Thêm thông tin trạng thái có sẵn cho mỗi cuốn sách
    const booksWithAvailability: BookWithAvailability[] = booksResult.map(book => ({
      ...book,
      isAvailable: book.availableQuantity > 0,           // Còn sách để mượn
      totalBorrowed: book.quantity - book.availableQuantity, // Số sách đang được mượn
    }));
    
    // Áp dụng bộ lọc trạng thái nếu cần (available/borrowed)
    const filteredBooks = params.status && params.status !== 'all' 
      ? booksWithAvailability.filter(book => {
          if (params.status === 'available') return book.isAvailable;   // Chỉ sách có sẵn
          if (params.status === 'borrowed') return !book.isAvailable;   // Chỉ sách đã hết
          return true;
        })
      : booksWithAvailability;
    
    return {
      books: filteredBooks,
      total: totalResult[0].count,
    };
  }

  /**
   * Lấy thông tin sách theo ID
   */
  async getBookById(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  /**
   * Lấy thông tin sách theo mã ISBN (dùng để kiểm tra trùng lặp)
   */
  async getBookByIsbn(isbn: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn));
    return book;
  }

  /**
   * Thêm sách mới vào thư viện
   * Logic thông minh: Nếu ISBN đã tồn tại, cộng thêm số lượng thay vì tạo mới
   */
  async createBook(book: InsertBook): Promise<Book> {
    // Kiểm tra xem sách với ISBN này đã tồn tại chưa
    const existingBook = await this.getBookByIsbn(book.isbn);
    
    if (existingBook) {
      // Nếu sách đã tồn tại, cộng thêm số lượng thay vì tạo bản ghi mới
      const addQuantity = book.quantity || 1;
      const newQuantity = existingBook.quantity + addQuantity;
      const newAvailableQuantity = existingBook.availableQuantity + addQuantity;
      
      const [updatedBook] = await db
        .update(books)
        .set({
          quantity: newQuantity,                   // Cập nhật tổng số lượng
          availableQuantity: newAvailableQuantity, // Cập nhật số lượng có sẵn
          updatedAt: new Date(),
        })
        .where(eq(books.id, existingBook.id))
        .returning();
      
      return updatedBook;
    } else {
      // Nếu sách chưa tồn tại, tạo bản ghi mới
      const [newBook] = await db
        .insert(books)
        .values({
          ...book,
          availableQuantity: book.quantity,  // availableQuantity bằng quantity ban đầu
        })
        .returning();
      return newBook;
    }
  }

  /**
   * Cập nhật thông tin sách
   */
  async updateBook(id: number, bookData: Partial<InsertBook>): Promise<Book> {
    const [updatedBook] = await db
      .update(books)
      .set({
        ...bookData,
        updatedAt: new Date(),
      })
      .where(eq(books.id, id))
      .returning();
    return updatedBook;
  }

  /**
   * Xóa sách khỏi thư viện
   */
  async deleteBook(id: number): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
  }

  /**
   * ========================================================================
   * QUẢN LÝ MƯỢN/TRẢ SÁCH - BORROWING MANAGEMENT
   * ========================================================================
   */
  
  /**
   * Lấy danh sách giao dịch mượn sách với các bộ lọc
   * Join với bảng users và books để lấy thông tin chi tiết
   */
  async getBorrowings(params: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ borrowings: BorrowingWithDetails[]; total: number }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;  // Tính offset cho phân trang
    
    let whereConditions = [];
    
    // Lọc theo người dùng cụ thể
    if (params.userId) {
      whereConditions.push(eq(borrowings.userId, params.userId));
    }
    
    // Lọc theo trạng thái (active/returned/overdue)
    if (params.status && params.status !== 'all') {
      whereConditions.push(eq(borrowings.status, params.status as any));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Thực hiện query song song để lấy danh sách và đếm tổng
    const [borrowingsResult, totalResult] = await Promise.all([
      db
        .select()
        .from(borrowings)
        .leftJoin(users, eq(borrowings.userId, users.id))     // Join thông tin người mượn
        .leftJoin(books, eq(borrowings.bookId, books.id))     // Join thông tin sách
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(borrowings.createdAt)),  // Sắp xếp theo ngày mượn mới nhất
      
      db
        .select({ count: count() })
        .from(borrowings)
        .where(whereClause)  // Đếm tổng số giao dịch thỏa mãn điều kiện
    ]);
    
    // Kết hợp dữ liệu từ các bảng thành đối tượng BorrowingWithDetails
    const borrowingsWithDetails: BorrowingWithDetails[] = borrowingsResult.map(result => ({
      ...result.borrowings,
      user: result.users!,   // Thông tin người mượn
      book: result.books!,   // Thông tin sách được mượn
    }));
    
    return {
      borrowings: borrowingsWithDetails,
      total: totalResult[0].count,
    };
  }

  /**
   * Lấy chi tiết giao dịch mượn sách theo ID
   * Bao gồm thông tin đầy đủ người mượn và sách
   */
  async getBorrowingById(id: number): Promise<BorrowingWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(borrowings)
      .leftJoin(users, eq(borrowings.userId, users.id))     // Join thông tin người mượn
      .leftJoin(books, eq(borrowings.bookId, books.id))     // Join thông tin sách
      .where(eq(borrowings.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.borrowings,
      user: result.users!,   // Thông tin người mượn
      book: result.books!,   // Thông tin sách được mượn
    };
  }

  /**
   * Tạo giao dịch mượn sách mới
   * Tự động giảm số lượng sách có sẵn trong kho
   */
  async createBorrowing(borrowing: InsertBorrowing): Promise<Borrowing> {
    const [newBorrowing] = await db
      .insert(borrowings)
      .values(borrowing)
      .returning();
    
    // Cập nhật số lượng sách có sẵn (giảm 1)
    await db
      .update(books)
      .set({
        availableQuantity: sql`${books.availableQuantity} - 1`,  // Sử dụng SQL raw để atomic update
        updatedAt: new Date(),
      })
      .where(eq(books.id, borrowing.bookId));
    
    return newBorrowing;
  }

  /**
   * Cập nhật trạng thái giao dịch mượn sách (trả sách hoặc quá hạn)
   * Nếu trả sách, tự động tăng số lượng sách có sẵn
   */
  async updateBorrowingStatus(id: number, status: 'returned' | 'overdue', returnDate?: Date): Promise<Borrowing> {
    const borrowing = await this.getBorrowingById(id);
    if (!borrowing) throw new Error('Borrowing not found');
    
    const [updatedBorrowing] = await db
      .update(borrowings)
      .set({
        status,
        returnDate,
        updatedAt: new Date(),
      })
      .where(eq(borrowings.id, id))
      .returning();
    
    // Nếu trả sách, cập nhật số lượng có sẵn (tăng 1)
    if (status === 'returned') {
      await db
        .update(books)
        .set({
          availableQuantity: sql`${books.availableQuantity} + 1`,  // Sử dụng SQL raw để atomic update
          updatedAt: new Date(),
        })
        .where(eq(books.id, borrowing.bookId));
    }
    
    return updatedBorrowing;
  }

  /**
   * ========================================================================
   * NHẬT KÝ HOẠT ĐỘNG - ACTIVITY LOGGING
   * ========================================================================
   */
  
  /**
   * Lấy danh sách nhật ký hoạt động với phân trang
   * Join với bảng users để lấy thông tin người thực hiện
   */
  async getActivityLogs(params: {
    userId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ logs: (ActivityLog & { user: User })[]; total: number }> {
    const { page = 1, limit = 20 } = params;  // Mặc định 20 items mỗi trang cho activity logs
    const offset = (page - 1) * limit;
    
    // Lọc theo người dùng cụ thể nếu có
    const whereClause = params.userId ? eq(activityLogs.userId, params.userId) : undefined;
    
    const [logsResult, totalResult] = await Promise.all([
      db
        .select()
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(activityLogs.timestamp)),
      
      db
        .select({ count: count() })
        .from(activityLogs)
        .where(whereClause)
    ]);
    
    const logsWithUser = logsResult.map(result => ({
      ...result.activity_logs,
      user: result.users!,
    }));
    
    return {
      logs: logsWithUser,
      total: totalResult[0].count,
    };
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return newLog;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalBooks: number;
    totalUsers: number;
    activeBorrowings: number;
    overdueBorrowings: number;
    popularBooks: { book: Book; borrowCount: number }[];
  }> {
    const [
      totalBooksResult,
      totalUsersResult,
      activeBorrowingsResult,
      overdueBorrowingsResult,
      popularBooksResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(books),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(borrowings).where(eq(borrowings.status, 'active')),
      db.select({ count: count() }).from(borrowings).where(eq(borrowings.status, 'overdue')),
      db
        .select({
          book: books,
          borrowCount: count(borrowings.id),
        })
        .from(books)
        .leftJoin(borrowings, eq(books.id, borrowings.bookId))
        .groupBy(books.id)
        .orderBy(desc(count(borrowings.id)))
        .limit(5),
    ]);
    
    return {
      totalBooks: totalBooksResult[0].count,
      totalUsers: totalUsersResult[0].count,
      activeBorrowings: activeBorrowingsResult[0].count,
      overdueBorrowings: overdueBorrowingsResult[0].count,
      popularBooks: popularBooksResult.map(result => ({
        book: result.book,
        borrowCount: result.borrowCount,
      })),
    };
  }

  // User management
  async getAllUsers(params: {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (params.search) {
      whereConditions.push(
        or(
          like(users.email, `%${params.search}%`),
          like(users.firstName, `%${params.search}%`),
          like(users.lastName, `%${params.search}%`)
        )
      );
    }
    
    if (params.role && params.role !== 'all') {
      whereConditions.push(eq(users.role, params.role as any));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const [usersResult, totalResult] = await Promise.all([
      db
        .select()
        .from(users)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(users.createdAt)),
      
      db
        .select({ count: count() })
        .from(users)
        .where(whereClause)
    ]);
    
    return {
      users: usersResult,
      total: totalResult[0].count,
    };
  }

  async updateUserRole(id: string, role: 'admin' | 'user'): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<{ notifications: Notification[] }> {
    // Get notifications for this user (both global announcements and user-specific)
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(
        or(
          eq(notifications.userId, userId), // User-specific notifications
          isNull(notifications.userId)   // Global announcements (userId is null)
        )
      )
      .orderBy(desc(notifications.createdAt));

    return {
      notifications: userNotifications,
    };
  }

  async createAnnouncement(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getAllNotifications(): Promise<Notification[]> {
    // Get all notifications for admin management
    const allNotifications = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));
    return allNotifications;
  }

  async deleteNotification(notificationId: number): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));
  }
}

export const storage = new DatabaseStorage();

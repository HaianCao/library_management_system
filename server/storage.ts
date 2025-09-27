import {
  users,
  books,
  borrowings,
  activityLogs,
  type User,
  type UpsertUser,
  type Book,
  type InsertBook,
  type Borrowing,
  type InsertBorrowing,
  type ActivityLog,
  type InsertActivityLog,
  type BorrowingWithDetails,
  type BookWithAvailability,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, like, or, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Local user authentication operations
  getUserByUsername(username: string): Promise<User | undefined>;
  createLocalUser(userData: {
    username: string;
    hashedPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'user';
  }): Promise<User>;
  
  // Book operations
  getBooks(params: {
    search?: string;
    searchField?: string;
    genre?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ books: BookWithAvailability[]; total: number }>;
  getBookById(id: number): Promise<Book | undefined>;
  getBookByIsbn(isbn: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, book: Partial<InsertBook>): Promise<Book>;
  deleteBook(id: number): Promise<void>;
  
  // Borrowing operations
  getBorrowings(params: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ borrowings: BorrowingWithDetails[]; total: number }>;
  getBorrowingById(id: number): Promise<BorrowingWithDetails | undefined>;
  createBorrowing(borrowing: InsertBorrowing): Promise<Borrowing>;
  updateBorrowingStatus(id: number, status: 'returned' | 'overdue', returnDate?: Date): Promise<Borrowing>;
  
  // Activity log operations
  getActivityLogs(params: {
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: (ActivityLog & { user: User })[]; total: number }>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalBooks: number;
    totalUsers: number;
    activeBorrowings: number;
    overdueBorrowings: number;
    popularBooks: { book: Book; borrowCount: number }[];
  }>;
  
  // User management
  getAllUsers(params: {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number }>;
  updateUserRole(id: string, role: 'admin' | 'user'): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

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

  // Local user authentication operations
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }

  async createLocalUser(userData: {
    username: string;
    hashedPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'user';
  }): Promise<User> {
    const userId = `local_${userData.username.toLowerCase()}`;
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        username: userData.username.toLowerCase(),
        hashedPassword: userData.hashedPassword,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',
        profileImageUrl: null,
      })
      .returning();
    return user;
  }

  // Book operations
  async getBooks(params: {
    search?: string;
    searchField?: string;
    genre?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ books: BookWithAvailability[]; total: number }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (params.search) {
      const searchValue = `%${params.search}%`;
      
      if (params.searchField === 'id') {
        whereConditions.push(like(books.isbn, searchValue));
      } else if (params.searchField === 'title') {
        whereConditions.push(like(books.title, searchValue));
      } else if (params.searchField === 'author') {
        whereConditions.push(like(books.author, searchValue));
      } else if (params.searchField === 'genre') {
        whereConditions.push(like(books.genre, searchValue));
      } else {
        // Default search all fields
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
    
    if (params.genre && params.genre !== 'all') {
      whereConditions.push(eq(books.genre, params.genre));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
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
        .orderBy(desc(books.createdAt)),
      
      db
        .select({ count: count() })
        .from(books)
        .where(whereClause)
    ]);
    
    const booksWithAvailability: BookWithAvailability[] = booksResult.map(book => ({
      ...book,
      isAvailable: book.availableQuantity > 0,
      totalBorrowed: book.quantity - book.availableQuantity,
    }));
    
    // Apply status filter if needed
    const filteredBooks = params.status && params.status !== 'all' 
      ? booksWithAvailability.filter(book => {
          if (params.status === 'available') return book.isAvailable;
          if (params.status === 'borrowed') return !book.isAvailable;
          return true;
        })
      : booksWithAvailability;
    
    return {
      books: filteredBooks,
      total: totalResult[0].count,
    };
  }

  async getBookById(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async getBookByIsbn(isbn: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn));
    return book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    // Check if book with this ISBN already exists
    const existingBook = await this.getBookByIsbn(book.isbn);
    
    if (existingBook) {
      // If book exists, add to the quantity instead of creating new
      const addQuantity = book.quantity || 1;
      const newQuantity = existingBook.quantity + addQuantity;
      const newAvailableQuantity = existingBook.availableQuantity + addQuantity;
      
      const [updatedBook] = await db
        .update(books)
        .set({
          quantity: newQuantity,
          availableQuantity: newAvailableQuantity,
          updatedAt: new Date(),
        })
        .where(eq(books.id, existingBook.id))
        .returning();
      
      return updatedBook;
    } else {
      // If book doesn't exist, create new book
      const [newBook] = await db
        .insert(books)
        .values({
          ...book,
          availableQuantity: book.quantity,
        })
        .returning();
      return newBook;
    }
  }

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

  async deleteBook(id: number): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
  }

  // Borrowing operations
  async getBorrowings(params: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ borrowings: BorrowingWithDetails[]; total: number }> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (params.userId) {
      whereConditions.push(eq(borrowings.userId, params.userId));
    }
    
    if (params.status && params.status !== 'all') {
      whereConditions.push(eq(borrowings.status, params.status as any));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    const [borrowingsResult, totalResult] = await Promise.all([
      db
        .select()
        .from(borrowings)
        .leftJoin(users, eq(borrowings.userId, users.id))
        .leftJoin(books, eq(borrowings.bookId, books.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(borrowings.createdAt)),
      
      db
        .select({ count: count() })
        .from(borrowings)
        .where(whereClause)
    ]);
    
    const borrowingsWithDetails: BorrowingWithDetails[] = borrowingsResult.map(result => ({
      ...result.borrowings,
      user: result.users!,
      book: result.books!,
    }));
    
    return {
      borrowings: borrowingsWithDetails,
      total: totalResult[0].count,
    };
  }

  async getBorrowingById(id: number): Promise<BorrowingWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(borrowings)
      .leftJoin(users, eq(borrowings.userId, users.id))
      .leftJoin(books, eq(borrowings.bookId, books.id))
      .where(eq(borrowings.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.borrowings,
      user: result.users!,
      book: result.books!,
    };
  }

  async createBorrowing(borrowing: InsertBorrowing): Promise<Borrowing> {
    const [newBorrowing] = await db
      .insert(borrowings)
      .values(borrowing)
      .returning();
    
    // Update book availability
    await db
      .update(books)
      .set({
        availableQuantity: sql`${books.availableQuantity} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(books.id, borrowing.bookId));
    
    return newBorrowing;
  }

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
    
    // If returning a book, update availability
    if (status === 'returned') {
      await db
        .update(books)
        .set({
          availableQuantity: sql`${books.availableQuantity} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(books.id, borrowing.bookId));
    }
    
    return updatedBorrowing;
  }

  // Activity log operations
  async getActivityLogs(params: {
    userId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ logs: (ActivityLog & { user: User })[]; total: number }> {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;
    
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
}

export const storage = new DatabaseStorage();

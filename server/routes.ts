import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBookSchema, insertBorrowingSchema, insertActivityLogSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
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
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Book routes
  app.get("/api/books", isAuthenticated, async (req, res) => {
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

  app.get("/api/books/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/books", isAuthenticated, async (req: any, res) => {
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

  app.put("/api/books/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/books/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/borrowings", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/borrowings", isAuthenticated, async (req: any, res) => {
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

  app.put("/api/borrowings/:id/return", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/activity-logs", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
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

  app.put("/api/users/:targetUserId/role", isAuthenticated, async (req: any, res) => {
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

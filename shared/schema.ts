import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('user').notNull(),
  username: varchar("username").unique(),
  hashedPassword: varchar("hashed_password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Books table
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  isbn: varchar("isbn", { length: 20 }).unique().notNull(),
  genre: varchar("genre", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  availableQuantity: integer("available_quantity").notNull().default(1),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Borrowing status enum
export const borrowingStatusEnum = pgEnum('borrowing_status', ['active', 'returned', 'overdue']);

// Borrowings table
export const borrowings = pgTable("borrowings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  bookId: integer("book_id").notNull().references(() => books.id),
  borrowDate: timestamp("borrow_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  returnDate: timestamp("return_date"),
  status: borrowingStatusEnum("status").default('active').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details").notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 50 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  borrowings: many(borrowings),
  activityLogs: many(activityLogs),
}));

export const booksRelations = relations(books, ({ many }) => ({
  borrowings: many(borrowings),
}));

export const borrowingsRelations = relations(borrowings, ({ one }) => ({
  user: one(users, {
    fields: [borrowings.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [borrowings.bookId],
    references: [books.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  availableQuantity: true,
});

export const insertBorrowingSchema = createInsertSchema(borrowings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  borrowDate: true,
  status: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type Borrowing = typeof borrowings.$inferSelect;
export type InsertBorrowing = z.infer<typeof insertBorrowingSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Extended types with relations
export type BorrowingWithDetails = Borrowing & {
  user: User;
  book: Book;
};

export type BookWithAvailability = Book & {
  isAvailable: boolean;
  totalBorrowed: number;
};

/**
 * ============================================================================
 * LƯỢC ĐỒ CƠ SỞ DỮ LIỆU - LIBRARY MANAGEMENT SYSTEM
 * ============================================================================
 * 
 * File này định nghĩa toàn bộ cấu trúc cơ sở dữ liệu cho hệ thống quản lý thư viện
 * Bao gồm: Bảng dữ liệu, quan hệ, schema xác thực và các kiểu dữ liệu TypeScript
 * 
 * Các bảng chính:
 * - sessions: Quản lý phiên đăng nhập người dùng
 * - users: Thông tin người dùng và phân quyền
 * - books: Danh mục sách trong thư viện
 * - borrowings: Lịch sử mượn/trả sách
 * - activityLogs: Nhật ký hoạt động hệ thống
 * - notifications: Thông báo và thông điệp
 */

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

/**
 * ============================================================================
 * BẢNG SESSIONS - QUẢN LÝ PHIÊN ĐĂNG NHẬP
 * ============================================================================
 * 
 * Bảng này lưu trữ thông tin phiên đăng nhập của người dùng
 * Bắt buộc phải có cho hệ thống xác thực Replit Auth
 */
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),              // Mã định danh phiên đăng nhập duy nhất
    sess: jsonb("sess").notNull(),                 // Dữ liệu phiên đăng nhập (JSON)
    expire: timestamp("expire").notNull(),         // Thời gian hết hạn phiên đăng nhập
  },
  (table) => [index("IDX_session_expire").on(table.expire)], // Chỉ mục để tối ưu truy vấn theo thời gian hết hạn
);

/**
 * ============================================================================
 * ENUM VÀI TRÒ NGƯỜI DÙNG
 * ============================================================================
 */
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']); // admin: Quản trị viên, user: Người dùng thường

/**
 * ============================================================================
 * BẢNG USERS - THÔNG TIN NGƯỜI DÙNG
 * ============================================================================
 * 
 * Bảng này chứa thông tin chi tiết của tất cả người dùng trong hệ thống
 * Hỗ trợ cả xác thực Replit Auth và xác thực cục bộ
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Mã định danh người dùng (UUID tự động tạo)
  email: varchar("email").unique(),                               // Địa chỉ email (duy nhất)
  firstName: varchar("first_name"),                               // Tên
  lastName: varchar("last_name"),                                 // Họ và tên đệm
  profileImageUrl: varchar("profile_image_url"),                  // URL ảnh đại diện
  role: userRoleEnum("role").default('user').notNull(),           // Vai trò: admin hoặc user
  username: varchar("username").unique(),                         // Tên đăng nhập (cho xác thực cục bộ)
  hashedPassword: varchar("hashed_password"),                     // Mật khẩu đã mã hóa (cho xác thực cục bộ)
  createdAt: timestamp("created_at").defaultNow(),                // Thời gian tạo tài khoản
  updatedAt: timestamp("updated_at").defaultNow(),                // Thời gian cập nhật cuối cùng
});

/**
 * ============================================================================
 * BẢNG BOOKS - DANH MỤC SÁCH THƯ VIỆN
 * ============================================================================
 * 
 * Bảng này chứa thông tin về tất cả sách trong thư viện
 * Theo dõi số lượng sách có sẵn và đã mượn
 */
export const books = pgTable("books", {
  id: serial("id").primaryKey(),                                 // Mã định danh sách (tự động tăng)
  title: varchar("title", { length: 255 }).notNull(),            // Tên sách
  author: varchar("author", { length: 255 }).notNull(),          // Tác giả
  isbn: varchar("isbn", { length: 20 }).unique().notNull(),      // Mã ISBN duy nhất
  genre: varchar("genre", { length: 100 }).notNull(),            // Thể loại sách
  quantity: integer("quantity").notNull().default(1),            // Tổng số lượng sách
  availableQuantity: integer("available_quantity").notNull().default(1), // Số lượng sách có sẵn để mượn
  description: text("description"),                              // Mô tả chi tiết sách
  createdAt: timestamp("created_at").defaultNow(),               // Thời gian thêm sách vào hệ thống
  updatedAt: timestamp("updated_at").defaultNow(),               // Thời gian cập nhật cuối cùng
});

/**
 * ============================================================================
 * ENUM TRẠNG THÁI MƯỢN SÁCH
 * ============================================================================
 */
export const borrowingStatusEnum = pgEnum('borrowing_status', [
  'active',   // Đang mượn
  'returned', // Đã trả
  'overdue'   // Quá hạn
]);

/**
 * ============================================================================
 * BẢNG BORROWINGS - LỊCH SỬ MƯỢN/TRẢ SÁCH
 * ============================================================================
 * 
 * Bảng này ghi lại tất cả các giao dịch mượn sách trong hệ thống
 * Theo dõi người mượn, sách được mượn, thời gian và trạng thái
 */
export const borrowings = pgTable("borrowings", {
  id: serial("id").primaryKey(),                                 // Mã định danh giao dịch mượn sách
  userId: varchar("user_id").notNull().references(() => users.id), // Mã người dùng mượn sách
  bookId: integer("book_id").notNull().references(() => books.id), // Mã sách được mượn
  borrowDate: timestamp("borrow_date").defaultNow().notNull(),   // Ngày mượn sách
  dueDate: timestamp("due_date").notNull(),                      // Ngày hạn trả sách
  returnDate: timestamp("return_date"),                          // Ngày trả sách thực tế (null nếu chưa trả)
  status: borrowingStatusEnum("status").default('active').notNull(), // Trạng thái mượn sách
  createdAt: timestamp("created_at").defaultNow(),               // Thời gian tạo bản ghi
  updatedAt: timestamp("updated_at").defaultNow(),               // Thời gian cập nhật cuối cùng
});

/**
 * ============================================================================
 * BẢNG ACTIVITY_LOGS - NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG
 * ============================================================================
 * 
 * Bảng này ghi lại tất cả hoạt động của người dùng trong hệ thống
 * Dùng để theo dõi, audit và phân tích hành vi người dùng
 */
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),                                 // Mã định danh nhật ký
  userId: varchar("user_id").notNull().references(() => users.id), // Người dùng thực hiện hành động
  action: varchar("action", { length: 100 }).notNull(),          // Loại hành động (VD: "BORROW_BOOK", "RETURN_BOOK")
  details: text("details").notNull(),                            // Chi tiết mô tả hành động
  entityType: varchar("entity_type", { length: 50 }),           // Loại đối tượng bị tác động (VD: "book", "user")
  entityId: varchar("entity_id", { length: 50 }),               // Mã đối tượng bị tác động
  timestamp: timestamp("timestamp").defaultNow().notNull(),      // Thời gian thực hiện hành động
});

/**
 * ============================================================================
 * BẢNG NOTIFICATIONS - THÔNG BÁO VÀ THÔNG ĐIỆP
 * ============================================================================
 * 
 * Bảng này quản lý các thông báo gửi đến người dùng
 * Hỗ trợ cả thông báo cá nhân và thông báo toàn hệ thống
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),                                 // Mã định danh thông báo
  title: varchar("title", { length: 255 }).notNull(),            // Tiêu đề thông báo
  content: text("content").notNull(),                            // Nội dung thông báo
  type: varchar("type", { length: 50 }).default('announcement').notNull(), // Loại thông báo
  createdById: varchar("created_by_id").notNull().references(() => users.id), // Người tạo thông báo (admin)
  userId: varchar("user_id").references(() => users.id),        // Người nhận (null = thông báo toàn hệ thống)
  createdAt: timestamp("created_at").defaultNow().notNull(),     // Thời gian tạo thông báo
  updatedAt: timestamp("updated_at").defaultNow(),               // Thời gian cập nhật cuối cùng
});

/**
 * ============================================================================
 * QUAN HỆ GIỮA CÁC BẢNG (FOREIGN KEY RELATIONSHIPS)
 * ============================================================================
 * 
 * Các định nghĩa này thiết lập mối quan hệ giữa các bảng trong cơ sở dữ liệu
 * Cho phép Drizzle ORM tự động join và lấy dữ liệu liên quan
 */

// Quan hệ từ bảng Users: Một người dùng có thể có nhiều...
export const usersRelations = relations(users, ({ many }) => ({
  borrowings: many(borrowings),              // Nhiều lần mượn sách
  activityLogs: many(activityLogs),          // Nhiều hoạt động được ghi log
  notifications: many(notifications),        // Nhiều thông báo nhận được
  createdNotifications: many(notifications, { relationName: "creator" }), // Nhiều thông báo đã tạo (với vai trò admin)
}));

// Quan hệ từ bảng Books: Một cuốn sách có thể có nhiều...
export const booksRelations = relations(books, ({ many }) => ({
  borrowings: many(borrowings),              // Nhiều lần được mượn
}));

// Quan hệ từ bảng Borrowings: Mỗi giao dịch mượn sách thuộc về...
export const borrowingsRelations = relations(borrowings, ({ one }) => ({
  user: one(users, {                        // Một người dùng cụ thể
    fields: [borrowings.userId],
    references: [users.id],
  }),
  book: one(books, {                        // Một cuốn sách cụ thể
    fields: [borrowings.bookId],
    references: [books.id],
  }),
}));

// Quan hệ từ bảng Activity Logs: Mỗi nhật ký hoạt động thuộc về...
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {                        // Một người dùng cụ thể (người thực hiện hành động)
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Quan hệ từ bảng Notifications: Mỗi thông báo có...
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {                        // Người nhận thông báo (null nếu là thông báo toàn hệ thống)
    fields: [notifications.userId],
    references: [users.id],
  }),
  createdBy: one(users, {                   // Người tạo thông báo (thường là admin)
    fields: [notifications.createdById],
    references: [users.id],
    relationName: "creator",
  }),
}));

/**
 * ============================================================================
 * ZOD SCHEMAS CHO XÁC THỰC DỮ LIỆU INPUT
 * ============================================================================
 * 
 * Các schema này được sử dụng để xác thực dữ liệu đầu vào từ frontend
 * Loại bỏ các trường tự động sinh (id, timestamps) khỏi validation
 */

// Schema cho việc tạo/cập nhật người dùng (loại bỏ các trường tự động sinh)
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,              // ID được tự động sinh bằng UUID
  createdAt: true,       // Timestamp tự động khi tạo
  updatedAt: true,       // Timestamp tự động khi cập nhật
});

// Schema cho việc tạo sách mới (availableQuantity được tính tự động)
export const insertBookSchema = createInsertSchema(books).omit({
  id: true,              // ID được tự động tăng
  createdAt: true,       // Timestamp tự động khi tạo
  updatedAt: true,       // Timestamp tự động khi cập nhật
  availableQuantity: true, // Được set bằng quantity khi tạo mới
});

// Schema cho việc tạo giao dịch mượn sách mới
export const insertBorrowingSchema = createInsertSchema(borrowings).omit({
  id: true,              // ID được tự động tăng
  createdAt: true,       // Timestamp tự động khi tạo
  updatedAt: true,       // Timestamp tự động khi cập nhật
  borrowDate: true,      // Được set tự động khi tạo
  status: true,          // Mặc định là 'active'
});

// Schema cho việc tạo nhật ký hoạt động
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,              // ID được tự động tăng
  timestamp: true,       // Timestamp tự động khi tạo
});

// Schema cho việc tạo thông báo mới
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,              // ID được tự động tăng
  createdAt: true,       // Timestamp tự động khi tạo
  updatedAt: true,       // Timestamp tự động khi cập nhật
});

/**
 * ============================================================================
 * TYPESCRIPT TYPES - ĐỊNH NGHĨA KIỂU DỮ LIỆU
 * ============================================================================
 * 
 * Các kiểu dữ liệu TypeScript được tự động sinh từ schema Drizzle
 * Đảm bảo type safety trong toàn bộ ứng dụng
 */

// Kiểu dữ liệu cho bảng Users
export type UpsertUser = typeof users.$inferInsert;    // Dữ liệu để insert/update user
export type User = typeof users.$inferSelect;          // Dữ liệu user đầy đủ từ DB
export type InsertUser = z.infer<typeof insertUserSchema>; // Dữ liệu user từ form (đã validate)

// Kiểu dữ liệu cho bảng Books
export type Book = typeof books.$inferSelect;          // Dữ liệu sách đầy đủ từ DB
export type InsertBook = z.infer<typeof insertBookSchema>; // Dữ liệu sách từ form (đã validate)

// Kiểu dữ liệu cho bảng Borrowings
export type Borrowing = typeof borrowings.$inferSelect; // Dữ liệu giao dịch mượn từ DB
export type InsertBorrowing = z.infer<typeof insertBorrowingSchema>; // Dữ liệu tạo giao dịch mới

// Kiểu dữ liệu cho bảng Activity Logs
export type ActivityLog = typeof activityLogs.$inferSelect; // Dữ liệu nhật ký từ DB
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>; // Dữ liệu tạo log mới

// Kiểu dữ liệu cho bảng Notifications
export type Notification = typeof notifications.$inferSelect; // Dữ liệu thông báo từ DB
export type InsertNotification = z.infer<typeof insertNotificationSchema>; // Dữ liệu tạo thông báo mới

/**
 * ============================================================================
 * KIỂU DỮ LIỆU MỞ RỘNG - TÍCH HỢP THÔNG TIN LIÊN QUAN
 * ============================================================================
 * 
 * Các kiểu dữ liệu này kết hợp thông tin từ nhiều bảng
 * Dùng cho API responses và hiển thị trên giao diện
 */

// Giao dịch mượn sách với thông tin chi tiết người dùng và sách
export type BorrowingWithDetails = Borrowing & {
  user: User;            // Thông tin đầy đủ người mượn
  book: Book;            // Thông tin đầy đủ sách được mượn
};

// Thông tin sách với trạng thái có sẵn để mượn
export type BookWithAvailability = Book & {
  isAvailable: boolean;  // true nếu còn sách để mượn
  totalBorrowed: number; // Số lượng sách đang được mượn
};

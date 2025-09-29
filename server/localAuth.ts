/**
 * ========================================================================
 * LOCAL AUTHENTICATION - XÁC THỰC LOCAL
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Module xử lý xác thực local với bcrypt password hashing.
 * Hỗ trợ cả admin account từ environment variables và user accounts trong database.
 */
import bcrypt from "bcrypt";
import { storage } from "./storage";

/**
 * Interface định nghĩa structure của LocalUser
 * Khác với User trong database, LocalUser bao gồm username và password fields
 */
export interface LocalUser {
  id: string;
  username: string;
  password: string;      // Luôn empty string khi trả về (bảo mật)
  role: 'admin' | 'user';
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * ========================================================================
 * PASSWORD HASHING - MÃ HÓA MẬT KHẨU
 * ========================================================================
 */

// Số rounds cho bcrypt salt (12 rounds = cân bằng security vs performance)
const SALT_ROUNDS = 12;

/**
 * Hash password với bcrypt
 * Sử dụng 12 salt rounds để cân bằng bảo mật và hiệu năng
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password với hash đã lưu
 * Dùng bcrypt.compare để so sánh an toàn
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * ========================================================================
 * USER MANAGEMENT - QUẢN LÝ NGƯỜI DÙNG
 * ========================================================================
 * 
 * Tất cả user data được lưu trong PostgreSQL, không còn in-memory storage
 */

/**
 * Tạo user local mới với username/password
 * 
 * Business logic:
 * - Username được convert thành lowercase để tránh duplicate
 * - Password được hash với bcrypt trước khi lưu DB
 * - Default role là 'user' nếu không specify
 * - Throws error nếu username đã tồn tại
 */
export async function createLocalUser(userData: { username: string; password: string; email: string; firstName: string; lastName: string; role?: 'admin' | 'user' }): Promise<LocalUser> {
  const username = userData.username.toLowerCase();  // Normalize username
  
  // Kiểm tra username đã tồn tại chưa (case-insensitive)
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) {
    throw new Error('Tên đăng nhập đã tồn tại');
  }

  // Hash password với bcrypt trước khi lưu database
  const hashedPassword = await hashPassword(userData.password);
  
  // Tạo user trong database với password đã được hash
  const user = await storage.createLocalUser({
    username,
    hashedPassword,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role || 'user',  // Default role là 'user'
  });

  // Return user object nhưng không bao gồm password (bảo mật)
  return {
    id: user.id,
    username: user.username!,
    password: "",                                    // Không trả về password
    role: user.role as 'admin' | 'user',
    email: user.email!,
    firstName: user.firstName!,
    lastName: user.lastName!,
  };
}

/**
 * ========================================================================
 * AUTHENTICATION LOGIC - LOGIC XÁC THỰC
 * ========================================================================
 */

/**
 * Xác thực user với username/password
 * 
 * Dual authentication system:
 * 1. Admin account: Xác thực qua environment variables (ADMIN_USERNAME, ADMIN_PASSWORD)
 * 2. Regular users: Xác thực qua database với bcrypt password hash
 * 
 * Side effects:
 * - Tự động tạo/update admin user trong database nếu auth thành công
 * - Admin user có ID cố định "local_admin"
 */
export async function authenticateLocalUser(username: string, password: string): Promise<LocalUser | null> {
  const usernameKey = username.toLowerCase();  // Normalize username
  
  /**
   * ADMIN AUTHENTICATION - XÁC THỰC ADMIN
   * Admin credentials được lưu trong environment variables
   */
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  // Kiểm tra admin credentials đã được cấu hình chưa
  if (!adminUsername || !adminPassword) {
    throw new Error("Admin credentials not configured. Please set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.");
  }
  
  // Nếu username match với admin username từ env vars
  if (usernameKey === adminUsername.toLowerCase()) {
    // Xác thực admin bằng plain text password từ environment
    if (password === adminPassword) {
      const adminUserId = "local_admin";  // ID cố định cho admin
      
      // Đảm bảo admin user tồn tại trong database (upsert)
      await storage.upsertUser({
        id: adminUserId,
        email: process.env.ADMIN_EMAIL || "admin@library.local",
        firstName: "Quản trị viên",
        lastName: "Hệ thống",
        profileImageUrl: null,
        role: 'admin',
      });

      return {
        id: adminUserId,
        username: adminUsername,
        password: "",                                                       // Không trả về password
        role: 'admin',
        email: process.env.ADMIN_EMAIL || "admin@library.local",
        firstName: "Quản trị viên",
        lastName: "Hệ thống",
      };
    }
  }

  /**
   * REGULAR USER AUTHENTICATION - XÁC THỰC USER THƯỜNG
   * User credentials được lưu trong database với bcrypt hash
   */
  const userRecord = await storage.getUserByUsername(usernameKey);
  if (userRecord && userRecord.hashedPassword) {
    // Verify password với bcrypt hash stored trong database
    const isValid = await verifyPassword(password, userRecord.hashedPassword);
    if (isValid) {
      return {
        id: userRecord.id,
        username: userRecord.username!,
        password: "",                                                       // Không trả về password
        role: userRecord.role as 'admin' | 'user',
        email: userRecord.email!,
        firstName: userRecord.firstName!,
        lastName: userRecord.lastName!,
      };
    }
  }
  
  // Không tìm thấy user hoặc password sai
  return null;
}

/**
 * ========================================================================
 * SESSION MANAGEMENT - QUẢN LÝ SESSION
 * ========================================================================
 */

/**
 * Tạo session data cho authentication local
 * 
 * Structure tương thích với format session trong PostgreSQL store.
 * Session có thời hạn 7 ngày và chứa user claims cần thiết.
 */
export function createLocalAuthSession(user: LocalUser) {
  return {
    claims: {
      sub: user.id,                    // Subject - user ID
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,                 // Admin hoặc user role
    },
    expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 ngày tính bằng seconds
  };
}
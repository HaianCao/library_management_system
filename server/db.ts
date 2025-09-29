/**
 * ========================================================================
 * DATABASE CONNECTION - KẾT NỐI DATABASE
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Module thiết lập kết nối PostgreSQL với Neon serverless database.
 * Sử dụng Drizzle ORM để type-safe database operations.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

/**
 * Kiểm tra DATABASE_URL environment variable
 * Replit tự động provision và set DATABASE_URL khi tạo PostgreSQL database
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * ========================================================================
 * DATABASE SETUP - THIẾT LẬP DATABASE
 * ========================================================================
 */

// Tạo Neon HTTP client với serverless connection
const sql = neon(process.env.DATABASE_URL!);

// Export Drizzle instance với schema để type-safe operations
export const db = drizzle(sql, { schema });
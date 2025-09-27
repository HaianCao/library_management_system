import bcrypt from "bcrypt";
import { storage } from "./storage";

export interface LocalUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  email: string;
  firstName: string;
  lastName: string;
}

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Database storage for local users
// No more in-memory storage - everything persists in PostgreSQL

export async function createLocalUser(userData: { username: string; password: string; email: string; firstName: string; lastName: string; role?: 'admin' | 'user' }): Promise<LocalUser> {
  const username = userData.username.toLowerCase();
  
  // Check if username already exists
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) {
    throw new Error('Tên đăng nhập đã tồn tại');
  }

  const hashedPassword = await hashPassword(userData.password);
  
  // Create user in database with hashed password
  const user = await storage.createLocalUser({
    username,
    hashedPassword,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role || 'user',
  });

  return {
    id: user.id,
    username: user.username!,
    password: "", // Don't return password
    role: user.role as 'admin' | 'user',
    email: user.email!,
    firstName: user.firstName!,
    lastName: user.lastName!,
  };
}

export async function authenticateLocalUser(username: string, password: string): Promise<LocalUser | null> {
  const usernameKey = username.toLowerCase();
  
  // Check if this is the admin account
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminUsername || !adminPassword) {
    throw new Error("Admin credentials not configured. Please set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.");
  }
  
  if (usernameKey === adminUsername.toLowerCase()) {
    // For admin, verify against environment variable
    if (password === adminPassword) {
      const adminUserId = "local_admin";
      
      // Ensure admin user exists in database
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
        password: "", // Don't return password
        role: 'admin',
        email: process.env.ADMIN_EMAIL || "admin@library.local",
        firstName: "Quản trị viên",
        lastName: "Hệ thống",
      };
    }
  }

  // Check regular users stored in database
  const userRecord = await storage.getUserByUsername(usernameKey);
  if (userRecord && userRecord.hashedPassword) {
    const isValid = await verifyPassword(password, userRecord.hashedPassword);
    if (isValid) {
      return {
        id: userRecord.id,
        username: userRecord.username!,
        password: "", // Don't return password
        role: userRecord.role as 'admin' | 'user',
        email: userRecord.email!,
        firstName: userRecord.firstName!,
        lastName: userRecord.lastName!,
      };
    }
  }
  
  return null;
}

export function createLocalAuthSession(user: LocalUser) {
  return {
    claims: {
      sub: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
    },
    expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };
}
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

// Simple in-memory storage for local users (for demo purposes)
// In production, this should be stored in a proper database table
const localUsers = new Map<string, {
  username: string;
  hashedPassword: string;
  userData: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user';
  };
}>();

export async function createLocalUser(userData: { username: string; password: string; email: string; firstName: string; lastName: string; role?: 'admin' | 'user' }): Promise<LocalUser> {
  const username = userData.username.toLowerCase();
  
  // Check if username already exists
  if (localUsers.has(username)) {
    throw new Error('Tên đăng nhập đã tồn tại');
  }

  const hashedPassword = await hashPassword(userData.password);
  const userId = `local_${username}`;
  
  const userRecord = {
    username,
    hashedPassword,
    userData: {
      id: userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'user' as 'user',
    }
  };

  // Store in memory
  localUsers.set(username, userRecord);
  
  // Create user in main users table
  await storage.upsertUser({
    id: userId,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    profileImageUrl: null,
    role: userData.role || 'user',
  });

  return {
    id: userId,
    username,
    password: "", // Don't return password
    role: userData.role || 'user',
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
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

  // Check regular users stored in memory
  const userRecord = localUsers.get(usernameKey);
  if (userRecord) {
    const isValid = await verifyPassword(password, userRecord.hashedPassword);
    if (isValid) {
      return {
        id: userRecord.userData.id,
        username: userRecord.username,
        password: "", // Don't return password
        role: userRecord.userData.role,
        email: userRecord.userData.email,
        firstName: userRecord.userData.firstName,
        lastName: userRecord.userData.lastName,
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
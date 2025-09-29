/**
 * ========================================================================
 * AUTHENTICATION HOOK - HOOK XÁC THỰC
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Hook chính để quản lý authentication state trong toàn bộ ứng dụng.
 * Sử dụng TanStack Query để fetch và cache user data.
 */
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

/**
 * Hook quản lý authentication state
 * 
 * Features:
 * - Fetch current user từ /api/auth/user endpoint
 * - Cache user data với TanStack Query
 * - Tự động refetch khi cần thiết
 * - No retry cho authentication để tránh spam API calls
 * 
 * State flow:
 * 1. isLoading: true khi đang fetch user data
 * 2. user: User object nếu authenticated, null nếu không
 * 3. isAuthenticated: boolean derived từ user data
 * 
 * @returns Object chứa user data, loading state, và authentication status
 */
export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,                         // Không retry cho auth calls
  });

  return {
    user,                                 // User object hoặc null
    isLoading,                           // Loading state từ query
    isAuthenticated: !!user && user !== null,  // Derived authentication status
  };
}

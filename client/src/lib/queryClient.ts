/**
 * ========================================================================
 * TANSTACK QUERY CLIENT CONFIGURATION - CẤU HÌNH QUERY CLIENT
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Module thiết lập TanStack Query client cho server state management.
 * Bao gồm custom fetch functions, error handling, và caching configuration.
 */
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * ========================================================================
 * ERROR HANDLING - XỬ LÝ ERRORS
 * ========================================================================
 */

/**
 * Utility function để throw error nếu HTTP response không thành công
 * 
 * @param res - Fetch Response object
 * @throws Error với format "{status}: {errorMessage}"
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * ========================================================================
 * API REQUEST FUNCTIONS - HÀM GỌI API
 * ========================================================================
 */

/**
 * Generic API request function cho mutations (POST, PUT, DELETE)
 * 
 * Features:
 * - Tự động set Content-Type header khi có data
 * - Include cookies cho authentication
 * - Throw error nếu response không thành công
 * - Return raw Response object để caller xử lý JSON/text
 * 
 * @param method - HTTP method (POST, PUT, DELETE, etc.)
 * @param url - API endpoint URL
 * @param data - Request body data (optional)
 * @returns Promise<Response> - Raw fetch Response object
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",               // Include cookies cho authentication
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * ========================================================================
 * QUERY FUNCTION FACTORY - FACTORY HÀM QUERY
 * ========================================================================
 */

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Tạo custom QueryFunction cho TanStack Query với error handling
 * 
 * Features:
 * - Smart URL building từ queryKey array
 * - Object params → query string conversion
 * - Configurable 401 handling (return null hoặc throw)
 * - Automatic JSON parsing
 * - Include cookies cho authentication
 * 
 * QueryKey format examples:
 * - ["/api/books"] → GET /api/books
 * - ["/api/books", "123"] → GET /api/books/123
 * - ["/api/books", { page: 1, limit: 10 }] → GET /api/books?page=1&limit=10
 * 
 * @param options - Configuration object
 * @returns TanStack Query function
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Extract base URL và params từ queryKey array
    const [baseUrl, ...params] = queryKey;
    let url = baseUrl as string;
    
    // Xử lý params để build URL
    if (params.length > 0) {
      const lastParam = params[params.length - 1];
      
      // Nếu param cuối là object → convert thành query string
      if (typeof lastParam === 'object' && lastParam !== null) {
        const searchParams = new URLSearchParams();
        Object.entries(lastParam).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
          }
        });
        if (searchParams.toString()) {
          url += `?${searchParams.toString()}`;
        }
      } else {
        // Cho non-object params, join với "/"
        url = queryKey.join("/") as string;
      }
    }
    
    // Gọi API với credentials để include authentication cookies
    const res = await fetch(url, {
      credentials: "include",
    });

    // Xử lý 401 Unauthorized theo config
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;                        // Return null thay vì throw (cho auth queries)
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * ========================================================================
 * QUERY CLIENT INSTANCE - INSTANCE QUERY CLIENT
 * ========================================================================
 */

/**
 * TanStack Query client instance với custom configuration
 * 
 * Query Configuration:
 * - Custom queryFn với smart URL building và 401 handling
 * - Disable auto refetch để tránh unnecessary API calls
 * - 5 minutes stale time cho reasonable caching
 * - Smart retry logic: no retry cho 401, max 3 retries cho other errors
 * 
 * Mutation Configuration:
 * - No retry cho mutations để tránh duplicate API calls
 * 
 * Used globally trong App component qua QueryClientProvider
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Return null thay vì throw cho 401
      refetchInterval: false,                       // Disable auto polling
      refetchOnWindowFocus: false,                  // Disable refetch on focus
      staleTime: 5 * 60 * 1000,                    // 5 phút cache time
      retry: (failureCount, error: any) => {
        // Không retry cho 401 unauthorized errors
        if (error?.message?.includes('401')) {
          return false;
        }
        return failureCount < 3;                    // Max 3 retries cho errors khác
      },
    },
    mutations: {
      retry: false,                                 // Không retry mutations
    },
  },
});

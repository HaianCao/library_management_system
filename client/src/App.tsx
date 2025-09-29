/**
 * ========================================================================
 * MAIN APPLICATION COMPONENT - COMPONENT ỨNG DỤNG CHÍNH
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Entry point chính của React application. Xử lý:
 * - Authentication routing (login/dashboard flow)
 * - Layout structure với sidebar và header
 * - Global providers cho TanStack Query, Tooltips, Toasts
 * - Client-side routing với wouter
 */
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Books from "@/pages/books";
import Borrowings from "@/pages/borrowings";
import Users from "@/pages/users";
import Activity from "@/pages/activity";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

/**
 * ========================================================================
 * ROUTER COMPONENT - COMPONENT ĐIỀU HƯỚNG
 * ========================================================================
 */

/**
 * Main routing component xử lý authentication flow và page navigation
 * 
 * Logic flow:
 * 1. Kiểm tra authentication status qua useAuth hook
 * 2. Loading state → hiển thị loading spinner
 * 3. Không authenticate → redirect đến login page
 * 4. Đã authenticate → hiển thị main app layout với sidebar + content
 * 
 * Layout structure:
 * - Sidebar: Navigation menu ở bên trái
 * - Header: Top bar với user info và logout
 * - Main content: Page content dựa trên route
 */
function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Loading state trong quá trình kiểm tra authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Chưa đăng nhập → hiển thị login page cho tất cả routes
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route component={Login} />              {/* Catch-all fallback */}
      </Switch>
    );
  }

  // Đã đăng nhập → hiển thị main application layout
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />                                {/* Left sidebar navigation */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />                               {/* Top header bar */}
        <main className="flex-1 overflow-auto p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/books" component={Books} />
            <Route path="/borrowings" component={Borrowings} />
            <Route path="/users" component={Users} />
            <Route path="/activity" component={Activity} />
            <Route component={NotFound} />       {/* 404 fallback */}
          </Switch>
        </main>
      </div>
    </div>
  );
}

/**
 * ========================================================================
 * ROOT APP COMPONENT - COMPONENT GỐC ỨNG DỤNG
 * ========================================================================
 */

/**
 * Root component của toàn bộ ứng dụng, thiết lập các global providers
 * 
 * Provider hierarchy (từ ngoài vào trong):
 * 1. QueryClientProvider: TanStack Query cho server state management
 * 2. TooltipProvider: Shadcn UI tooltip functionality
 * 3. Toaster: Toast notifications từ shadcn/ui
 * 4. Router: Main application routing và authentication
 * 
 * Các provider này được share xuống tất cả child components
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />                               {/* Global toast container */}
        <Router />                                {/* Main routing component */}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

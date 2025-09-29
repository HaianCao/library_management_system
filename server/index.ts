/**
 * ========================================================================
 * SERVER ENTRY POINT - ĐIỂM KHỞI ĐỘNG SERVER  
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * File chính khởi động Express server cho hệ thống quản lý thư viện.
 * Xử lý cấu hình middleware, routing, và serving static files.
 */

// Cấu hình SSL cho môi trường development (bỏ qua SSL verification)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

/**
 * ========================================================================
 * EXPRESS APP SETUP - THIẾT LẬP EXPRESS APP
 * ========================================================================
 */

const app = express();

// Middleware cơ bản để parse request body
app.use(express.json());                                    // Parse JSON payloads
app.use(express.urlencoded({ extended: false }));          // Parse URL-encoded payloads

/**
 * Request Logging Middleware - Middleware ghi log request
 * Chỉ log các API calls (/api/*) với thời gian thực thi và response
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Intercept res.json để capture response data
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log sau khi response hoàn tất
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncate log nếu quá dài để tránh spam console
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * ========================================================================
 * SERVER STARTUP - KHỞI ĐỘNG SERVER
 * ========================================================================
 */
(async () => {
  // Đăng ký tất cả API routes và trả về HTTP server instance
  const server = await registerRoutes(app);

  /**
   * Global Error Handler - Middleware xử lý lỗi toàn cục
   * Catch mọi lỗi không được handle ở routes và trả về JSON response
   */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;  // Re-throw để log trong console
  });

  /**
   * Frontend Setup - Thiết lập phục vụ frontend
   * Development: Sử dụng Vite dev server với HMR
   * Production: Serve static files đã được build
   * 
   * QUAN TRỌNG: Setup Vite sau khi đăng ký routes để tránh catch-all route
   * của Vite can thiệp vào API routes
   */
  if (app.get("env") === "development") {
    await setupVite(app, server);  // Vite dev server với HMR
  } else {
    serveStatic(app);              // Serve static files từ dist/
  }

  /**
   * Server Listening - Khởi động server nghe connections
   * 
   * QUAN TRỌNG: Chỉ sử dụng port 5000 trong Replit environment
   * - Các ports khác bị firewall chặn
   * - Port 5000 phục vụ cả API và client
   * - Đây là port duy nhất không bị firewall
   */
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",    // Lắng nghe tất cả network interfaces
    reusePort: true,    // Cho phép restart server mà không bị "port in use"
  }, () => {
    log(`serving on port ${port}`);
  });
})();

/**
 * ========================================================================
 * VITE CONFIGURATION - CẤU HÌNH VITE  
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Module xử lý cấu hình Vite dev server cho development và static file serving
 * cho production. Đảm bảo hot module replacement (HMR) hoạt động tốt.
 */
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

// Logger của Vite cho console output
const viteLogger = createLogger();

/**
 * ========================================================================
 * LOGGING UTILITIES - TIỆN ÍCH LOGGING
 * ========================================================================
 */

/**
 * Utility function để log với timestamp và source
 * Sử dụng trong cả development và production
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * ========================================================================
 * DEVELOPMENT SERVER SETUP - THIẾT LẬP DEV SERVER
 * ========================================================================
 */

/**
 * Setup Vite dev server với Hot Module Replacement (HMR)
 * Chỉ sử dụng trong development environment
 * 
 * Features:
 * - HMR cho fast refresh khi code thay đổi
 * - Transform TypeScript và React JSX on-the-fly
 * - Cache busting cho index.html với nanoid
 */
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,        // Sử dụng Vite như middleware trong Express
    hmr: { server },             // Enable HMR sử dụng existing HTTP server
    allowedHosts: true as const, // Cho phép tất cả hosts (cần thiết cho Replit)
  };

  // Tạo Vite dev server với config tùy chỉnh
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,           // Sử dụng inline config thay vì file
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);         // Exit on critical errors
      },
    },
    server: serverOptions,
    appType: "custom",           // Custom app thay vì SPA standard
  });

  // Đăng ký Vite middlewares để xử lý assets và HMR
  app.use(vite.middlewares);
  
  // Catch-all route để serve React app cho tất cả non-API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // Luôn đọc index.html từ disk để catch changes ngay lập tức
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Cache busting cho main.tsx để đảm bảo browser load version mới
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      // Transform HTML qua Vite để inject HMR client code
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      // Fix stack trace để hiển thị đúng source location
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * ========================================================================
 * PRODUCTION STATIC SERVING - PHỤC VỤ STATIC FILES PRODUCTION
 * ========================================================================
 */

/**
 * Serve static files đã được build cho production
 * Fallback về index.html cho SPA routing (client-side routing)
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  // Kiểm tra thư mục build có tồn tại không
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets (CSS, JS, images, etc.)
  app.use(express.static(distPath));

  // SPA fallback: serve index.html cho tất cả routes không match files
  // Cần thiết cho client-side routing (React Router)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

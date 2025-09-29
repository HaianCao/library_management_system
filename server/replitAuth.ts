/**
 * ========================================================================
 * REPLIT AUTHENTICATION - XÁC THỰC REPLIT
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Module xử lý xác thực qua Replit OpenID Connect (OIDC).
 * LưU ý: File này có thể không được sử dụng trong setup hiện tại
 * vì hệ thống đang dùng local authentication.
 */
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

/**
 * Kiểm tra REPLIT_DOMAINS environment variable
 * Cần thiết cho multi-domain Replit authentication
 */
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

/**
 * ========================================================================
 * OIDC CONFIGURATION - CẤU HÌNH OIDC
 * ========================================================================
 */

/**
 * Memoized OIDC configuration discovery
 * Cache 1 giờ để tránh gọi discovery endpoint liên tục
 */
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }  // Cache 1 giờ
);

/**
 * ========================================================================
 * SESSION MANAGEMENT - QUẢN LÝ SESSION
 * ========================================================================
 */

/**
 * Tạo session configuration cho Replit authentication
 * Tương tự như local auth nhưng dành cho OIDC flows
 */
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 tuần
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Chỉ HTTPS trong production
      sameSite: "lax",                               // Cho phép cross-site cho Replit
      maxAge: sessionTtl,
    },
  });
}

/**
 * ========================================================================
 * USER SESSION HELPERS - TIỆN ÍCH USER SESSION
 * ========================================================================
 */

/**
 * Cập nhật session với tokens mới từ OIDC response
 */
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

/**
 * Upsert user từ OIDC claims vào database
 * Tương tự như local auth nhưng dữ liệu từ Replit profile
 */
async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],                              // Subject từ OIDC
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],   // Avatar từ Replit
  });
}

/**
 * ========================================================================
 * AUTHENTICATION SETUP - THIẾT LẬP XÁC THỰC
 * ========================================================================
 */

/**
 * Setup complete Replit OIDC authentication cho Express app
 * 
 * Flow chính:
 * 1. User click login → redirect đến Replit OAuth
 * 2. User đăng nhập ở Replit → callback về app
 * 3. App exchange code → tokens, tạo user session
 * 4. Subsequent requests sử dụng session + refresh tokens
 */
export async function setupAuth(app: Express) {
  // Trust proxy cần thiết cho Replit environment
  app.set("trust proxy", 1);
  
  // Setup session và passport middlewares
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Load OIDC configuration từ Replit discovery endpoint
  const config = await getOidcConfig();

  /**
   * Verify function được gọi sau khi OIDC flow thành công
   * Nhiệm vụ: upsert user vào database và setup session
   */
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);          // Set tokens vào session
    await upsertUser(tokens.claims());        // Lưu user info vào database
    verified(null, user);                     // Signal thành công cho passport
  };

  /**
   * Đăng ký Passport strategy cho từng domain trong REPLIT_DOMAINS
   * Multi-domain support cho các repl deployments khác nhau
   */
  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,         // Unique strategy name per domain
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,  // Domain-specific callback
      },
      verify,
    );
    passport.use(strategy);
  }

  // Passport serialization - store/retrieve user từ session
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  /**
   * ========================================================================
   * AUTHENTICATION ROUTES - ROUTES XÁC THỰC
   * ========================================================================
   */

  /**
   * GET /api/login - Khởi tạo OIDC authentication flow
   * Redirect user đến Replit OAuth với prompt để re-consent
   */
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",              // Force user re-authenticate
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  /**
   * GET /api/callback - OIDC callback route
   * Replit redirect về đây sau khi user đăng nhập thành công
   * Success: redirect về home, Failure: back to login
   */
  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",       // Về trang chủ nếu thành công
      failureRedirect: "/api/login",        // Back to login nếu failed
    })(req, res, next);
  });

  /**
   * GET /api/logout - Logout và clear session
   * Redirect đến Replit logout để end session ở provider side
   */
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

/**
 * ========================================================================
 * AUTHENTICATION MIDDLEWARE - MIDDLEWARE XÁC THỰC
 * ========================================================================
 */

/**
 * Middleware bảo vệ protected routes với Replit OIDC authentication
 * 
 * Logic xử lý:
 * 1. Kiểm tra user đã authenticate và có expires_at
 * 2. Nếu token chưa hết hạn → next()
 * 3. Nếu hết hạn → thử refresh với refresh_token
 * 4. Refresh thành công → update session, next()
 * 5. Refresh thất bại → return 401 Unauthorized
 * 
 * Side effects:
 * - Update user session với tokens mới khi refresh
 * - Return JSON error response cho API calls
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Kiểm tra basic authentication status và token metadata
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Token còn hạn sử dụng → cho phép tiếp tục
  if (now <= user.expires_at) {
    return next();
  }

  // Token hết hạn → thử refresh bằng refresh_token
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    // Gọi OIDC token refresh endpoint
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    
    // Update session với tokens mới và expiry time mới
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    // Refresh thất bại → force re-authentication
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

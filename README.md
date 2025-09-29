# 📚 Hệ Thống Quản Lý Thư Viện

Hệ thống quản lý thư viện đơn giản và hiệu quả được xây dựng với React + Node.js, tối ưu cho tốc độ và dễ sử dụng.

## ⚡ Tính Năng Chính

- **📖 Quản lý sách**: Thêm, sửa, xóa, tìm kiếm sách theo ID/tên/tác giả/thể loại
- **🔄 Mượn/trả sách**: Hệ thống theo dõi mượn sách với thời hạn
- **👤 Quản lý người dùng**: Phân quyền admin/user
- **📊 Dashboard**: Thống kê tổng quan hoạt động
- **📝 Nhật ký**: Theo dõi tất cả hoạt động hệ thống

## 🚀 Cách Chạy Dự Án

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình Database

Tạo file `.env` trong thư mục root:

```env
DATABASE_URL=postgresql://username:password@host:port/database
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SESSION_SECRET=your-secret-key
PORT=5000
```

### 3. Setup Database Schema

```bash
npm run db:push
```

### 4. Khởi động ứng dụng

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

**Truy cập**: http://localhost:5000  
**Đăng nhập**: `admin` / `admin123`

## 🛠️ Công Nghệ Sử Dụng

### Frontend

- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** - State management
- **React Hook Form** + Zod validation

### Backend

- **Node.js** + Express.js
- **Drizzle ORM** + PostgreSQL
- **bcrypt** - Password hashing
- **Express Sessions** - Authentication

## 📁 Cấu Trúc Dự Án

```
ThuVienSo/
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── .replit                # Replit configuration
├── README.md              # Project documentation
├── package.json           # Dependencies & scripts
├── package-lock.json      # Lock file for dependencies
├── components.json        # shadcn/ui configuration
├── drizzle.config.ts      # Database ORM configuration
├── postcss.config.js      # PostCSS configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
│
├── client/                # 🎨 React Frontend
│   ├── index.html         # HTML entry point
│   └── src/
│       ├── App.tsx        # Main React component
│       ├── main.tsx       # React DOM entry
│       ├── index.css      # Global styles
│       │
│       ├── components/    # 🧩 React Components
│       │   ├── header.tsx           # Main header
│       │   ├── sidebar.tsx          # Navigation sidebar
│       │   ├── quick-actions.tsx    # Dashboard quick actions
│       │   ├── recent-activity.tsx  # Activity feed
│       │   ├── stats-cards.tsx      # Statistics cards
│       │   │
│       │   ├── layout/              # Layout components
│       │   │   ├── header.tsx
│       │   │   └── sidebar.tsx
│       │   │
│       │   ├── modals/              # Dialog modals
│       │   │   ├── add-admin-modal.tsx
│       │   │   ├── add-book-modal.tsx
│       │   │   ├── add-user-modal.tsx
│       │   │   └── borrow-book-modal.tsx
│       │   │
│       │   └── ui/                  # 🎨 shadcn/ui Components
│       │       ├── accordion.tsx    ├── alert-dialog.tsx
│       │       ├── alert.tsx        ├── aspect-ratio.tsx
│       │       ├── avatar.tsx       ├── badge.tsx
│       │       ├── breadcrumb.tsx   ├── button.tsx
│       │       ├── calendar.tsx     ├── card.tsx
│       │       ├── carousel.tsx     ├── chart.tsx
│       │       ├── checkbox.tsx     ├── collapsible.tsx
│       │       ├── command.tsx      ├── context-menu.tsx
│       │       ├── dialog.tsx       ├── drawer.tsx
│       │       ├── dropdown-menu.tsx├── form.tsx
│       │       ├── hover-card.tsx   ├── input-otp.tsx
│       │       ├── input.tsx        ├── label.tsx
│       │       ├── menubar.tsx      ├── navigation-menu.tsx
│       │       ├── pagination.tsx   ├── popover.tsx
│       │       ├── progress.tsx     ├── radio-group.tsx
│       │       ├── resizable.tsx    ├── scroll-area.tsx
│       │       ├── select.tsx       ├── separator.tsx
│       │       ├── sheet.tsx        ├── sidebar.tsx
│       │       ├── skeleton.tsx     ├── slider.tsx
│       │       ├── switch.tsx       ├── table.tsx
│       │       ├── tabs.tsx         ├── textarea.tsx
│       │       ├── toast.tsx        ├── toaster.tsx
│       │       ├── toggle-group.tsx ├── toggle.tsx
│       │       └── tooltip.tsx
│       │
│       ├── pages/         # 📄 Application Pages
│       │   ├── dashboard.tsx        # Main dashboard
│       │   ├── books.tsx           # Books management
│       │   ├── borrowing.tsx       # Single borrowing view
│       │   ├── borrowings.tsx      # Borrowings list
│       │   ├── users.tsx           # User management (admin)
│       │   ├── activity.tsx        # Activity logs
│       │   ├── login.tsx           # Login page
│       │   ├── landing.tsx         # Landing page
│       │   └── not-found.tsx       # 404 page
│       │
│       ├── hooks/         # 🪝 Custom React Hooks
│       │   ├── useAuth.ts           # Authentication hook
│       │   ├── use-mobile.tsx       # Mobile detection
│       │   └── use-toast.ts         # Toast notifications
│       │
│       └── lib/           # 🛠️ Utilities & Libraries
│           ├── utils.ts             # Common utilities
│           ├── authUtils.ts         # Auth helpers
│           └── queryClient.ts       # TanStack Query client
│
├── server/                # ⚙️ Express Backend
│   ├── index.ts           # Server entry point
│   ├── db.ts              # Database connection (Neon/PostgreSQL)
│   ├── routes.ts          # API routes definition
│   ├── storage.ts         # Data access layer
│   ├── localAuth.ts       # Local authentication logic
│   ├── replitAuth.ts      # Replit auth integration
│   └── vite.ts            # Vite development server setup
│
├── shared/                # 🔗 Shared Code
│   └── schema.ts          # Database schema & TypeScript types
│
└── node_modules/          # 📦 Dependencies (auto-generated)
```

## 🗄️ Database Schema

### Bảng chính:

- **users**: Thông tin người dùng (id, username, email, role, hashedPassword)
- **books**: Catalog sách (id, title, author, isbn, genre, quantity, availableQuantity)
- **borrowings**: Lịch sử mượn/trả (id, userId, bookId, borrowDate, dueDate, returnDate, status)
- **activity_logs**: Nhật ký hoạt động (id, userId, action, details, timestamp)
- **sessions**: Quản lý phiên đăng nhập

## 🌐 Deploy Production

### Option 1: Railway.app (Khuyến nghị)

1. Push code lên GitHub
2. Đăng ký Railway.app
3. Connect GitHub repository
4. Cấu hình environment variables
5. Auto deploy!

### Option 2: Render.com

1. Connect GitHub repository
2. Cấu hình build commands:
   - Build: `npm run build`
   - Start: `npm start`
3. Thêm PostgreSQL database service
4. Cấu hình environment variables

### Database Options:

- **Neon.tech**: PostgreSQL miễn phí
- **Railway**: Database tích hợp
- **Render**: PostgreSQL service

## 🔧 NPM Scripts

```bash
npm run dev      # Chạy development server
npm run build    # Build cho production
npm start        # Chạy production server
npm run db:push  # Sync database schema
npm run check    # TypeScript type checking
```

## 🔐 Authentication & Authorization

- **Local Authentication**: Username/password với bcrypt hashing
- **Session Management**: HTTP-only cookies với PostgreSQL store
- **Role-based Access**:
  - **Admin**: Full quyền (quản lý users, books, borrowings)
  - **User**: Chỉ xem và mượn sách
- **Default Admin Account**: `admin` / `admin123`

## 📋 API Documentation

### Authentication

```
POST /api/auth/login      # Đăng nhập
POST /api/auth/logout     # Đăng xuất
GET  /api/auth/user       # Thông tin user hiện tại
```

### Books Management

```
GET    /api/books         # Danh sách sách (có pagination & search)
POST   /api/books         # Thêm sách mới (admin only)
PUT    /api/books/:id     # Cập nhật sách (admin only)
DELETE /api/books/:id     # Xóa sách (admin only)
```

### Borrowings

```
GET  /api/borrowings              # Lịch sử mượn sách
POST /api/borrowings              # Mượn sách
PUT  /api/borrowings/:id/return   # Trả sách
```

### Dashboard & Reports

```
GET /api/dashboard/stats  # Thống kê tổng quan
GET /api/activity-logs    # Nhật ký hoạt động
```

### User Management (Admin only)

```
GET /api/users            # Danh sách users
PUT /api/users/:id/role   # Thay đổi role user
```

## 🚨 Troubleshooting

### Lỗi Database Connection

```bash
# Kiểm tra DATABASE_URL
echo $env:DATABASE_URL  # Windows
echo $DATABASE_URL      # Linux/Mac

# Test kết nối
npm run db:push
```

### Lỗi Port Conflict

```bash
# Windows - Kill process trên port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Environment Variables Issues

- Đảm bảo file `.env` có format đúng (không có spaces xung quanh `=`)
- Kiểm tra DATABASE_URL có format: `postgresql://user:pass@host:port/db`
- Restart server sau khi thay đổi `.env`

---

**© 2024 Library Management System**  
_Built with ❤️ using React + Node.js + PostgreSQL_

**Simple • Fast • Reliable**

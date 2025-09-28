# Hệ Thống Quản Lý Thư Viện

Một hệ thống quản lý thư viện toàn diện được xây dựng với công nghệ web hiện đại, cung cấp nền tảng thư viện số đầy đủ tính năng để quản lý sách, theo dõi mượn sách, quản lý người dùng và giám sát hoạt động.

## 🚀 Tính Năng Chính

- **Quản lý Sách**: Thêm, sửa, xóa và tìm kiếm sách trong thư viện
- **Hệ thống Mượn/Trả**:## 💡 **Quick Start Commands**Theo dõi việc mượn## 📞 **Support & Help**và trả sách với ngày hết hạn
- **Quản lý Người dùng**: Phân quyền admin/user và quản lý tài khoản
- **Thống kê Dashboard**: Hiển thị thống kê tổng quan và hoạt động thời gian thực
- **Nhật ký Hoạt động**: Theo dõi tất cả các hoạt động trong hệ thống
- **Giao diện Responsive**: Thiết kế mobile-first với layouts thích ứng

## 🛠️ Công Nghệ Sử Dụng

### Frontend

- **React 18+** với TypeScript cho type safety
- **Vite** - Build tool thế hệ mới cho development nhanh
- **TanStack Query** - Quản lý state server và caching
- **Wouter** - Router nhẹ cho client-side routing
- **Radix UI + shadcn/ui** - Component library hiện đại
- **Tailwind CSS** - Framework CSS utility-first
- **React Hook Form + Zod** - Xử lý form và validation

### Backend

- **Node.js + Express.js** - Web application framework
- **TypeScript** - Type safety toàn stack
- **Drizzle ORM** - ORM an toàn kiểu cho PostgreSQL
- **PostgreSQL** - Database chính với Neon serverless driver
- **Passport.js** - Authentication middleware
- **Express Sessions** - Quản lý session bảo mật

## 📋 Yêu Cầu Hệ Thống

- Node.js 18+
- PostgreSQL database
- npm hoặc yarn

## 🚀 Hướng Dẫn Cài Đặt & Triển Khai

### 📋 **BƯỚC 1: Cài Đặt Dependencies**

```bash
# Clone repository (nếu cần)
git clone <repository-url>
cd ThuVienSo

# Cài đặt packages
npm install
```

### 🗄️ **BƯỚC 2: Thiết Lập Database**

#### **Option A: Sử Dụng Neon.tech (Khuyến nghị - Miễn phí)**

1. **Đăng ký tài khoản:**

   - Truy cập: https://neon.tech
   - Đăng ký với GitHub/Google
   - Tạo project mới

2. **Tạo database:**
   - Chọn region gần nhất (Singapore cho VN)
   - Database name: `library_db`
   - Copy connection string

#### **Option B: PostgreSQL Local**

```bash
# Windows (với Chocolatey)
choco install postgresql

# macOS (với Homebrew)
brew install postgresql

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# Tạo database
createdb library_db
```

### ⚙️ **BƯỚC 3: Cấu Hình Environment Variables**

Tạo file `.env` trong thư mục root:

```env
# ===========================================
# DATABASE CONFIGURATION
# ===========================================
# Neon.tech example:
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/database?sslmode=require

# Local PostgreSQL example:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/library_db

# ===========================================
# ADMIN ACCOUNT
# ===========================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@library.local

# ===========================================
# SESSION SECURITY
# ===========================================
SESSION_SECRET=your-super-secret-session-key-change-in-production

# ===========================================
# SERVER CONFIG
# ===========================================
PORT=5000
NODE_ENV=development
```

### 🏗️ **BƯỚC 4: Thiết Lập Database Schema**

```bash
# Push database schema
npm run db:push

# Kiểm tra kết nối
npm run check
```

### 🚀 **BƯỚC 5: Chạy Ứng Dụng**

#### **Development Mode**

```bash
npm run dev
```

➡️ Truy cập: `http://localhost:5000`  
➡️ Login: `admin` / `admin123`

#### **Production Mode**

```bash
npm run build
npm start
```

## 📱 Sử Dụng Hệ Thống

### Đăng nhập Admin

1. Truy cập `http://localhost:5000`
2. Sử dụng tài khoản admin đã cấu hình:
   - Username: `admin` (hoặc ADMIN_USERNAME đã set)
   - Password: Mật khẩu đã cấu hình trong ADMIN_PASSWORD

### Các Chức Năng Chính

#### 🏠 Dashboard

- Xem thống kê tổng quan (tổng số sách, người dùng, mượn sách)
- Theo dõi sách phổ biến
- Xem hoạt động gần đây

#### 📚 Quản Lý Sách

- **Thêm sách mới**: Điền thông tin (tiêu đề, tác giả, ISBN, thể loại, số lượng)
- **Tìm kiếm**: Theo tiêu đề, tác giả hoặc ISBN
- **Lọc**: Theo thể loại và trạng thái (có sẵn/đã mượn)
- **Cập nhật**: Sửa thông tin sách
- **Xóa**: Xóa sách khỏi hệ thống

#### 👥 Quản Lý Người Dùng (Admin)

- Xem danh sách tất cả người dùng
- Thêm người dùng mới
- Phân quyền admin/user
- Tìm kiếm người dùng

#### 📖 Hệ Thống Mượn/Trả

- **Mượn sách**: Chọn sách và người mượn, set ngày hết hạn
- **Trả sách**: Cập nhật trạng thái trả sách
- **Theo dõi**: Xem danh sách sách đã mượn, quá hạn
- **Lọc**: Theo trạng thái (đang mượn, đã trả, quá hạn)

#### 📊 Nhật Ký Hoạt Động

- Theo dõi tất cả hoạt động của người dùng
- Lọc theo người dùng cụ thể
- Xem lịch sử chi tiết

## 🗄️ Database Schema

### Bảng Chính

#### `users` - Người dùng

- `id` - User ID
- `username` - Tên đăng nhập (cho local auth)
- `email` - Email
- `firstName`, `lastName` - Tên
- `role` - Vai trò (admin/user)
- `hashedPassword` - Mật khẩu đã mã hóa

#### `books` - Sách

- `id` - Book ID
- `title` - Tiêu đề
- `author` - Tác giả
- `isbn` - Mã ISBN
- `genre` - Thể loại
- `quantity` - Số lượng tổng
- `availableQuantity` - Số lượng có sẵn

#### `borrowings` - Mượn sách

- `id` - Borrowing ID
- `userId` - ID người mượn
- `bookId` - ID sách
- `borrowDate` - Ngày mượn
- `dueDate` - Ngày hết hạn
- `returnDate` - Ngày trả (nullable)
- `status` - Trạng thái (active/returned/overdue)

#### `activity_logs` - Nhật ký hoạt động

- `id` - Log ID
- `userId` - ID người dùng
- `action` - Hành động
- `details` - Chi tiết
- `timestamp` - Thời gian

## 🔐 Bảo Mật

- **Authentication**: Hệ thống đăng nhập an toàn với bcrypt password hashing
- **Session Management**: HTTP-only cookies với CSRF protection
- **Role-based Access**: Phân quyền admin/user
- **Input Validation**: Zod schema validation cho tất cả inputs
- **SQL Injection Prevention**: Drizzle ORM với prepared statements

## 🚨 **Troubleshooting**

### **❌ Lỗi Database Connection**

```bash
# Windows
echo $env:DATABASE_URL

# Linux/macOS
echo $DATABASE_URL

# Test connection
npm run db:push

# Kiểm tra format connection string
# Đúng: postgresql://user:pass@host:port/db?sslmode=require
# Sai: postgres://... (thiếu 'ql')
```

### Lỗi Authentication

```bash
# Kiểm tra admin credentials
echo $ADMIN_USERNAME
echo $ADMIN_PASSWORD
```

### Port Conflicts

- Frontend server mặc định chạy port 5000
- Đảm bảo port không bị sử dụng bởi ứng dụng khác

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs trong console
2. Verify environment variables
3. Đảm bảo database connection
4. Restart application server

## 🎯 Roadmap

- [ ] Export/Import data
- [ ] Email notifications
- [ ] Advanced reporting
- [ ] Multi-language support
- [ ] Mobile app

---

**© 2024 Library Management System - Built with ❤️ using React + Express**

/**
 * ========================================================================
 * AUTHENTICATION UTILITIES - TIỆN ÍCH XÁC THỰC
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Module chứa các utility functions để xử lý authentication errors.
 */

/**
 * Kiểm tra xem error có phải là lỗi 401 Unauthorized không
 * 
 * Sử dụng để detect khi user session hết hạn hoặc không có quyền truy cập.
 * Error message format: "401: Unauthorized" hoặc "401: <custom message>"
 * 
 * @param error - Error object từ fetch hoặc API calls
 * @returns true nếu error là 401 Unauthorized
 */
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
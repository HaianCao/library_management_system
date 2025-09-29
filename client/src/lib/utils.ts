/**
 * ========================================================================
 * UTILITY FUNCTIONS - HÀM TIỆN ÍCH
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Module chứa các utility functions tái sử dụng trong toàn bộ ứng dụng.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine và merge CSS class names một cách thông minh
 * 
 * Sử dụng:
 * - clsx: Conditional class names với object/array syntax
 * - tailwind-merge: Merge conflicting Tailwind classes (overrides)
 * 
 * VD: cn("p-4", "p-2") → "p-2" (p-2 overrides p-4)
 *     cn("bg-red-500", isActive && "bg-blue-500") → conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

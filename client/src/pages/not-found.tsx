/**
 * ========================================================================
 * NOT FOUND PAGE - TRANG KHÔNG TÌM THẤY
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Trang 404 hiển thị khi user navigate đến route không tồn tại.
 * 
 * Features:
 * - Simple card layout với error icon
 * - Clear 404 message với development hint
 * - Responsive design với mobile-friendly layout
 * - Consistent với overall app styling
 * 
 * Usage:
 * - Automatically shown cho unmatched routes
 * - Development helper message cho developers
 * - Centered layout để focus attention
 */
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * Not Found Page component
 * 
 * Responsibilities:
 * - Display 404 error message
 * - Provide helpful context cho users
 * - Maintain consistent visual design
 * 
 * Note: Simple component cho error state handling
 */
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

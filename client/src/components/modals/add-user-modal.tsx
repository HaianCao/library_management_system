/**
 * ========================================================================
 * ADD USER MODAL - MODAL THÊM NGƯỜI DÙNG
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Modal placeholder cho user management features.
 * Hiện tại chỉ hiển thị thông báo "Coming Soon".
 * 
 * Status: PLACEHOLDER - Under Development
 * 
 * Planned Features:
 * - User registration form
 * - Role assignment (admin/user)
 * - Profile information setup
 * - Email validation
 * 
 * Current State:
 * - Authentication được handle bởi login system
 * - User management via existing auth flow
 * - Direct user creation chưa implement
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Add User Modal component - PLACEHOLDER
 * 
 * Responsibilities:
 * - Show development status cho user management
 * - Provide info về current authentication system
 * - Placeholder cho future user creation features
 * 
 * Note: Actual user management được handle through auth system
 */
export default function AddUserModal({ open, onOpenChange }: AddUserModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-add-user">
        <DialogHeader>
          <DialogTitle>User Management</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <i className="fas fa-users text-muted-foreground text-xl"></i>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground">Coming Soon</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  User registration is handled through the authentication system. 
                  Direct user management features are currently under development.
                </p>
              </div>
              
              <div className="text-left space-y-2 text-sm text-muted-foreground">
                <p>Current user management features:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Users authenticate via the login system</li>
                  <li>• Role assignment (admin/user)</li>
                  <li>• Profile information sync</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ========================================================================
 * NOTIFICATIONS MODAL - MODAL THÔNG BÁO
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Modal complex cho notification/announcement system.
 * 
 * Features:
 * - Tab-based interface (View / Create)
 * - Announcement creation cho admin
 * - Notification viewing cho all users
 * - Real-time notification list
 * - Delete notifications
 * 
 * Tabs:
 * - View: Hiển thị all notifications/announcements
 * - Create: Form để admin tạo announcements mới
 * 
 * Permissions:
 * - All users: View notifications
 * - Admin: View + Create announcements + Delete
 * 
 * Flow:
 * 1. Modal mở với default tab theo role
 * 2. Users có thể view notifications
 * 3. Admin có thể create announcements
 * 4. Real-time updates cho notification list
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Send, Megaphone, Bell, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Zod schema validation cho announcement creation
 */
const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  content: z.string().min(1, "Content is required"),
});

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Notifications Modal component
 * 
 * Responsibilities:
 * - Provide notification viewing interface
 * - Handle announcement creation (admin only)
 * - Manage tab switching và role-based features
 * - Real-time notification updates
 * 
 * UX Features:
 * - Tab interface với role-based defaults
 * - Scrollable notification list
 * - Form validation cho announcements
 * - Delete functionality với confirmations
 */
export default function NotificationsModal({ open, onOpenChange }: NotificationsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  /**
   * Tab state management với role-based defaults
   * Admin default: "create" tab, Regular users: "view" tab
   */
  const [activeTab, setActiveTab] = useState<"view" | "create">(user?.role === "admin" ? "create" : "view");
  
  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  // Fetch notifications for current user
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  // Fetch all notifications for admin
  const { data: allNotifications, refetch: refetchAllNotifications } = useQuery({
    queryKey: ["/api/notifications/all"],
    enabled: open && user?.role === "admin" && activeTab === "view",
  });

  // Create announcement mutation (admin only)
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: z.infer<typeof announcementSchema>) => {
      await apiRequest("POST", "/api/notifications/announcement", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "Announcement sent to all users",
      });
      form.reset();
      setActiveTab("view");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive",
      });
    },
  });

  // Delete notification (admin only)
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      refetchNotifications();
      if (user?.role === "admin") {
        refetchAllNotifications();
      }
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof announcementSchema>) => {
    createAnnouncementMutation.mutate(data);
  };

  const handleDeleteNotification = (notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  // Get the notifications to display based on user role
  const displayNotifications = user?.role === "admin" ? 
    (allNotifications as any) || (notifications as any)?.notifications || [] :
    (notifications as any)?.notifications || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col" data-testid="modal-notifications">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </DialogTitle>
          <DialogDescription>
            View and manage your notifications and announcements.
          </DialogDescription>
          
          {user?.role === "admin" && (
            <div className="flex gap-2 mt-4">
              <Button
                variant={activeTab === "view" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("view")}
                data-testid="button-tab-view"
              >
                <Bell className="w-4 h-4 mr-2" />
                View Notifications
              </Button>
              <Button
                variant={activeTab === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("create")}
                data-testid="button-tab-create"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {activeTab === "create" && user?.role === "admin" && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Create an announcement that will be sent to all users in the system.
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Announcement Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter announcement title"
                              {...field}
                              data-testid="input-announcement-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Announcement Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter announcement content (supports all languages)"
                              rows={6}
                              {...field}
                              data-testid="textarea-announcement-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setActiveTab("view")}
                        data-testid="button-cancel-announcement"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createAnnouncementMutation.isPending}
                        data-testid="button-send-announcement"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {createAnnouncementMutation.isPending ? "Sending..." : "Send Announcement"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </ScrollArea>
          )}

          {activeTab === "view" && (
            <ScrollArea className="h-[400px] pr-4">
              {displayNotifications.length > 0 ? (
                <div className="space-y-3">
                  {displayNotifications.map((notification: any) => (
                    <div 
                      key={notification.id} 
                      className="p-4 rounded-lg border bg-card"
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-foreground truncate">
                              {notification.title}
                            </h4>
                            {notification.type === "announcement" && (
                              <Badge variant="secondary" className="text-xs">
                                <Megaphone className="w-3 h-3 mr-1" />
                                Announcement
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 break-words">
                            {notification.content}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
                          </div>
                        </div>
                        {user?.role === "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            data-testid={`button-delete-${notification.id}`}
                            className="flex-shrink-0 ml-2 text-destructive hover:text-destructive"
                            disabled={deleteNotificationMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
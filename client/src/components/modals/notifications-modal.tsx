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
import { X, Send, Megaphone, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  content: z.string().min(1, "Content is required"),
});

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotificationsModal({ open, onOpenChange }: NotificationsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
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

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PUT", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      refetchNotifications();
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
    },
  });

  const onSubmit = (data: z.infer<typeof announcementSchema>) => {
    createAnnouncementMutation.mutate(data);
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[70vh]" data-testid="modal-notifications">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-notifications"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
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

        <div className="flex-1 mt-4">
          {activeTab === "create" && user?.role === "admin" && (
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
                            rows={8}
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
          )}

          {activeTab === "view" && (
            <div className="h-full">
              <ScrollArea className="h-[400px] pr-4">
                {(notifications as any)?.notifications?.length > 0 ? (
                  <div className="space-y-3">
                    {(notifications as any).notifications.map((notification: any) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 rounded-lg border ${
                          notification.isRead ? 'bg-muted/30' : 'bg-card border-primary/20'
                        }`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-foreground">
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <Badge variant="destructive" className="text-xs">New</Badge>
                              )}
                              {notification.type === "announcement" && (
                                <Badge variant="secondary" className="text-xs">
                                  <Megaphone className="w-3 h-3 mr-1" />
                                  Announcement
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.content}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
                            </div>
                          </div>
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              Mark as read
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
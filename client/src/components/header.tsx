import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import NotificationsModal from "@/components/modals/notifications-modal";

export function Header() {
  const [location] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/books":
        return "Books Management";
      case "/borrowings":
        return "Borrowing Management";
      case "/users":
        return "User Management";
      case "/activity":
        return "Activity Log";
      default:
        return "Library Management";
    }
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-page-title">
            {getPageTitle()}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            data-testid="button-notifications"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <NotificationsModal 
        open={showNotifications} 
        onOpenChange={setShowNotifications} 
      />
    </header>
  );
}

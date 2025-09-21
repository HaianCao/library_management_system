import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BarChart3, Users, HandHeart, History, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: BarChart3,
      current: location === "/",
    },
    {
      name: "Books",
      href: "/books",
      icon: BookOpen,
      current: location === "/books",
    },
    {
      name: "Borrowing",
      href: "/borrowing",
      icon: HandHeart,
      current: location === "/borrowing",
    },
    ...(user?.role === 'admin' ? [{
      name: "Users",
      href: "/users",
      icon: Users,
      current: location === "/users",
    }] : []),
    {
      name: "Activity Log",
      href: "/activity",
      icon: History,
      current: location === "/activity",
    },
  ];

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobile}
          data-testid="button-mobile-menu"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:relative w-64 bg-card shadow-lg border-r border-border z-50 h-full transition-transform duration-300",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )} data-testid="sidebar">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
                LibraryMS
              </h1>
              <p className="text-sm text-muted-foreground">v1.0</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center overflow-hidden">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-8 h-8 object-cover"
                />
              ) : (
                <BookOpen className="w-4 h-4 text-accent-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
                {user?.firstName || user?.lastName ? 
                  `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                  user?.email || 'User'
                }
              </p>
              <Badge 
                variant={user?.role === 'admin' ? "default" : "secondary"}
                className="text-xs"
                data-testid="badge-user-role"
              >
                {user?.role === 'admin' ? 'Admin' : 'User'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1">
          {navigation.map((item) => (
            <Button
              key={item.name}
              variant={item.current ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                item.current && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => {
                setLocation(item.href);
                setIsMobileOpen(false);
              }}
              data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.name}
            </Button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}

import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Bell } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

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
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search books, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 focus:w-80 transition-all duration-200"
              data-testid="input-global-search"
            />
          </div>
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
            <Bell className="w-5 h-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
            >
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}

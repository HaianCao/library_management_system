import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Clock, AlertTriangle, TrendingUp, Plus, UserPlus, FileText, HandHeart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { AddBookModal } from "@/components/modals/add-book-modal";
import BorrowBookModal from "@/components/modals/borrow-book-modal";
import { AddAdminModal } from "@/components/modals/add-admin-modal";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: activityLogs, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
    enabled: !!user,
  });

  if (statsLoading || activityLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Books</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-books">
                  {stats?.totalBooks || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-accent mr-1" />
              <span className="text-muted-foreground">in collection</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently Borrowed</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-borrowings">
                  {stats?.activeBorrowings || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <HandHeart className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-accent">Active</span>
              <span className="text-muted-foreground ml-1">borrowings</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive" data-testid="text-overdue-borrowings">
                  {stats?.overdueBorrowings || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-destructive">Needs attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-users">
                  {stats?.totalUsers || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-accent">Registered</span>
              <span className="text-muted-foreground ml-1">members</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation('/activity')}
                  data-testid="button-view-all-activity"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs?.logs?.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center space-x-4 p-4 hover:bg-muted rounded-lg transition-colors" data-testid={`activity-${log.id}`}>
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                      {log.action.includes('borrowed') && <HandHeart className="w-4 h-4 text-accent-foreground" />}
                      {log.action.includes('returned') && <BookOpen className="w-4 h-4 text-accent-foreground" />}
                      {log.action.includes('added') && <Plus className="w-4 h-4 text-accent-foreground" />}
                      {log.action.includes('updated') && <FileText className="w-4 h-4 text-accent-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground" data-testid={`text-activity-details-${log.id}`}>
                        {log.details}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-activity-time-${log.id}`}>
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={
                      log.action.includes('borrowed') ? 'default' :
                      log.action.includes('returned') ? 'secondary' :
                      log.action.includes('added') ? 'outline' : 'destructive'
                    } data-testid={`badge-activity-action-${log.id}`}>
                      {log.action.replace('_', ' ')}
                    </Badge>
                  </div>
                )) || []}
                
                {(!activityLogs?.logs || activityLogs.logs.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-activity">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user?.role === 'admin' && (
                  <Button 
                    className="w-full justify-start" 
                    onClick={() => setShowAddBookModal(true)}
                    data-testid="button-add-book"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Book
                  </Button>
                )}
                
                {user?.role === 'admin' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => setShowAddAdminModal(true)}
                    data-testid="button-add-admin"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Modals */}
      <AddBookModal 
        open={showAddBookModal} 
        onOpenChange={setShowAddBookModal} 
      />
      <BorrowBookModal 
        open={showBorrowModal} 
        onOpenChange={setShowBorrowModal} 
      />
      <AddAdminModal 
        open={showAddAdminModal} 
        onOpenChange={setShowAddAdminModal} 
      />
    </div>
  );
}

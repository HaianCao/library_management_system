import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Plus, HandHeart, RotateCcw, UserPlus, Edit, Trash2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Activity() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: activityData, isLoading } = useQuery({
    queryKey: ["/api/activity-logs", { page }],
  });

  const getActionIcon = (action: string) => {
    if (action.includes('borrowed')) return <HandHeart className="w-4 h-4" />;
    if (action.includes('returned')) return <RotateCcw className="w-4 h-4" />;
    if (action.includes('added')) return <Plus className="w-4 h-4" />;
    if (action.includes('updated')) return <Edit className="w-4 h-4" />;
    if (action.includes('deleted')) return <Trash2 className="w-4 h-4" />;
    if (action.includes('user')) return <UserPlus className="w-4 h-4" />;
    return <History className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('borrowed')) return 'default';
    if (action.includes('returned')) return 'secondary';
    if (action.includes('added')) return 'outline';
    if (action.includes('updated')) return 'secondary';
    if (action.includes('deleted')) return 'destructive';
    if (action.includes('user')) return 'outline';
    return 'default';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Activity Log
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {user?.role === 'admin' 
              ? 'View all system activities and user actions'
              : 'View your library activities and transactions'
            }
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {(activityData as any)?.logs?.map((log: any) => (
              <div 
                key={log.id} 
                className="flex items-start space-x-4 p-4 hover:bg-muted rounded-lg transition-colors border border-border"
                data-testid={`activity-${log.id}`}
              >
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1" data-testid={`text-activity-details-${log.id}`}>
                        {log.details}
                      </p>
                      
                      {user?.role === 'admin' && log.user && (
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <span className="text-xs text-muted-foreground" data-testid={`text-activity-user-${log.id}`}>
                            {log.user.firstName} {log.user.lastName} ({log.user.email})
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={getActionColor(log.action) as any}
                          className="text-xs"
                          data-testid={`badge-activity-action-${log.id}`}
                        >
                          <div className="flex items-center gap-1">
                            {getActionIcon(log.action)}
                            {log.action.replace('_', ' ').toUpperCase()}
                          </div>
                        </Badge>
                        
                        {log.entityType && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-activity-entity-${log.id}`}>
                            {log.entityType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xs text-muted-foreground" data-testid={`text-activity-time-${log.id}`}>
                        {formatTimestamp(log.timestamp)}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-activity-date-${log.id}`}>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )) || []}
            
            {(!(activityData as any)?.logs || (activityData as any).logs.length === 0) && (
              <div className="text-center py-12" data-testid="text-no-activity">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Activity Yet</h3>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'admin' 
                    ? 'System activities will appear here as users interact with the library'
                    : 'Your library activities will appear here as you borrow and return books'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {(activityData as any)?.logs && (activityData as any).logs.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing page {page} - {(activityData as any).logs?.length || 0} activities
                {(activityData as any).total && ` of ${(activityData as any).total} total`}
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Page {page}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={
                    (activityData as any).total 
                      ? page * 20 >= (activityData as any).total 
                      : (activityData as any).logs?.length < 20
                  }
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityProps {
  activities: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
  isLoading: boolean;
}

export default function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'borrow':
        return { icon: 'fas fa-arrow-right', color: 'bg-accent text-accent-foreground' };
      case 'return':
        return { icon: 'fas fa-arrow-left', color: 'bg-primary text-primary-foreground' };
      case 'add_book':
        return { icon: 'fas fa-plus', color: 'bg-secondary text-secondary-foreground' };
      case 'overdue':
        return { icon: 'fas fa-exclamation', color: 'bg-destructive text-destructive-foreground' };
      default:
        return { icon: 'fas fa-info', color: 'bg-muted text-muted-foreground' };
    }
  };

  const getActivityBadge = (action: string) => {
    switch (action) {
      case 'borrow':
        return { text: 'Borrowed', color: 'bg-accent text-accent-foreground' };
      case 'return':
        return { text: 'Returned', color: 'bg-primary text-primary-foreground' };
      case 'add_book':
        return { text: 'Added', color: 'bg-secondary text-secondary-foreground' };
      case 'overdue':
        return { text: 'Overdue', color: 'bg-destructive text-destructive-foreground' };
      default:
        return { text: action, color: 'bg-muted text-muted-foreground' };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="recent-activity">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const iconConfig = getActivityIcon(activity.action);
            const badgeConfig = getActivityBadge(activity.action);
            
            return (
              <div 
                key={activity.id} 
                className="flex items-center space-x-4 p-4 hover:bg-muted rounded-lg transition-colors"
                data-testid={`activity-${activity.id}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconConfig.color}`}>
                  <i className={`${iconConfig.icon} text-sm`}></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {activity.details}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${badgeConfig.color}`}>
                  {badgeConfig.text}
                </span>
              </div>
            );
          })}
          
          {activities.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-history text-muted-foreground"></i>
              </div>
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

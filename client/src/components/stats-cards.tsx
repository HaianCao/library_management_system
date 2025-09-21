import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  stats?: {
    totalBooks: number;
    totalBorrowed: number;
    totalOverdue: number;
    totalUsers: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Books",
      value: stats.totalBooks,
      icon: "fas fa-book",
      color: "bg-primary",
      textColor: "text-primary-foreground",
      change: "+12 added this month",
      changeColor: "text-accent"
    },
    {
      title: "Currently Borrowed",
      value: stats.totalBorrowed,
      icon: "fas fa-handshake",
      color: "bg-accent",
      textColor: "text-accent-foreground",
      change: "87% availability rate",
      changeColor: "text-accent"
    },
    {
      title: "Overdue",
      value: stats.totalOverdue,
      icon: "fas fa-exclamation-triangle",
      color: "bg-destructive",
      textColor: "text-destructive-foreground",
      change: "-5 from last week",
      changeColor: "text-destructive"
    },
    {
      title: "Active Users",
      value: stats.totalUsers,
      icon: "fas fa-users",
      color: "bg-secondary",
      textColor: "text-secondary-foreground",
      change: "+47 new this month",
      changeColor: "text-accent"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-cards">
      {cards.map((card, index) => (
        <Card key={index} data-testid={`card-stat-${index}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className={`text-2xl font-bold ${index === 2 ? 'text-destructive' : 'text-foreground'}`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                <i className={`${card.icon} ${card.textColor}`}></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={card.changeColor}>{card.change.split(' ')[0]}</span>
              <span className="text-muted-foreground ml-1">{card.change.split(' ').slice(1).join(' ')}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

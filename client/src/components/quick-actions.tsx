import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AddBookModal from "@/components/modals/add-book-modal";
import BorrowBookModal from "@/components/modals/borrow-book-modal";
import AddUserModal from "@/components/modals/add-user-modal";
import { useAuth } from "@/hooks/useAuth";

interface QuickActionsProps {
  popularBooks: Array<{
    id: string;
    title: string;
    author: string;
    borrowCount: number;
  }>;
  isLoading: boolean;
}

export default function QuickActions({ popularBooks, isLoading }: QuickActionsProps) {
  const { user } = useAuth();
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const handleGenerateReport = () => {
    // Placeholder for report generation
    console.log("Generate report clicked");
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card data-testid="quick-actions">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user?.role === "admin" && (
              <Button
                className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setShowAddBookModal(true)}
                data-testid="button-quick-add-book"
              >
                <i className="fas fa-plus mr-3"></i>
                Add New Book
              </Button>
            )}
            
            <Button
              className="w-full justify-start bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setShowBorrowModal(true)}
              data-testid="button-quick-process-borrowing"
            >
              <i className="fas fa-handshake mr-3"></i>
              Process Borrowing
            </Button>
            
            {user?.role === "admin" && (
              <Button
                className="w-full justify-start bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={() => setShowUserModal(true)}
                data-testid="button-quick-add-user"
              >
                <i className="fas fa-user-plus mr-3"></i>
                Add User
              </Button>
            )}
            
            <Button
              className="w-full justify-start bg-muted text-muted-foreground hover:bg-muted/90"
              onClick={handleGenerateReport}
              data-testid="button-quick-generate-report"
            >
              <i className="fas fa-file-alt mr-3"></i>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Popular Books */}
      <Card data-testid="popular-books">
        <CardHeader>
          <CardTitle>Popular Books</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {popularBooks.map((book, index) => (
                <div 
                  key={book.id} 
                  className="flex items-center space-x-3"
                  data-testid={`popular-book-${index}`}
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                    index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-muted'
                  }`}>
                    <span className={`text-xs font-bold ${
                      index === 0 ? 'text-primary-foreground' : 
                      index === 1 ? 'text-secondary-foreground' : 'text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{book.title}</p>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                  </div>
                  <span className="text-xs text-accent">
                    {book.borrowCount} borrows
                  </span>
                </div>
              ))}
              
              {popularBooks.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No popular books yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddBookModal open={showAddBookModal} onOpenChange={setShowAddBookModal} />
      <BorrowBookModal open={showBorrowModal} onOpenChange={setShowBorrowModal} />
      <AddUserModal open={showUserModal} onOpenChange={setShowUserModal} />
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandHeart, Plus, RotateCcw, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import BorrowBookModal from "@/components/modals/borrow-book-modal";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Borrowings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [showBorrowModal, setShowBorrowModal] = useState(false);

  const { data: borrowingsData, isLoading } = useQuery({
    queryKey: ["/api/borrowings", { status, page }],
  });

  const returnMutation = useMutation({
    mutationFn: async (borrowingId: number) => {
      await apiRequest("PUT", `/api/borrowings/${borrowingId}/return`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrowings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Book returned successfully",
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
        description: "Failed to return book",
        variant: "destructive",
      });
    },
  });

  const handleReturn = (borrowingId: number, bookTitle: string) => {
    if (confirm(`Are you sure you want to return "${bookTitle}"?`)) {
      returnMutation.mutate(borrowingId);
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const statuses = ["all", "active", "returned", "overdue"];

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle className="flex items-center gap-2">
              <HandHeart className="w-5 h-5" />
              Borrowing Management
            </CardTitle>
            <Button 
              onClick={() => setShowBorrowModal(true)}
              data-testid="button-borrow-book"
            >
              <Plus className="w-4 h-4 mr-2" />
              Borrow Book
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Borrowings Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  {user?.role === 'admin' && <TableHead>Borrower</TableHead>}
                  <TableHead>Borrow Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowingsData?.borrowings?.map((borrowing: any) => (
                  <TableRow key={borrowing.id} data-testid={`row-borrowing-${borrowing.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-10 bg-primary rounded flex items-center justify-center">
                          <HandHeart className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-book-title-${borrowing.id}`}>
                            {borrowing.book?.title}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-book-author-${borrowing.id}`}>
                            by {borrowing.book?.author}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    {user?.role === 'admin' && (
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-borrower-name-${borrowing.id}`}>
                            {borrowing.user?.firstName} {borrowing.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-borrower-email-${borrowing.id}`}>
                            {borrowing.user?.email}
                          </p>
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell className="text-foreground" data-testid={`text-borrow-date-${borrowing.id}`}>
                      {formatDate(borrowing.borrowDate)}
                    </TableCell>
                    
                    <TableCell data-testid={`text-due-date-${borrowing.id}`}>
                      <span className={isOverdue(borrowing.dueDate) && borrowing.status === 'active' ? 'text-destructive font-medium' : 'text-foreground'}>
                        {formatDate(borrowing.dueDate)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-foreground" data-testid={`text-return-date-${borrowing.id}`}>
                      {borrowing.returnDate ? formatDate(borrowing.returnDate) : '-'}
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant={
                          borrowing.status === 'active' ? (isOverdue(borrowing.dueDate) ? "destructive" : "default") :
                          borrowing.status === 'returned' ? "secondary" : "destructive"
                        }
                        data-testid={`badge-status-${borrowing.id}`}
                      >
                        <div className="flex items-center gap-1">
                          {borrowing.status === 'active' && !isOverdue(borrowing.dueDate) && <Clock className="w-3 h-3" />}
                          {borrowing.status === 'active' && isOverdue(borrowing.dueDate) && <Clock className="w-3 h-3" />}
                          {borrowing.status === 'returned' && <CheckCircle className="w-3 h-3" />}
                          {borrowing.status === 'active' && isOverdue(borrowing.dueDate) ? 'Overdue' : 
                           borrowing.status.charAt(0).toUpperCase() + borrowing.status.slice(1)}
                        </div>
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {borrowing.status === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReturn(borrowing.id, borrowing.book?.title)}
                          disabled={returnMutation.isPending}
                          data-testid={`button-return-${borrowing.id}`}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Return
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )) || []}
              </TableBody>
            </Table>
            
            {(!borrowingsData?.borrowings || borrowingsData.borrowings.length === 0) && (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-borrowings">
                No borrowings found
              </div>
            )}
          </div>

          {/* Pagination */}
          {borrowingsData?.total && borrowingsData.total > 10 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {Math.min(10, borrowingsData.borrowings?.length || 0)} of {borrowingsData.total} borrowings
              </p>
              <div className="flex space-x-2">
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
                  disabled={page * 10 >= borrowingsData.total}
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

      <BorrowBookModal 
        open={showBorrowModal} 
        onOpenChange={setShowBorrowModal} 
      />
    </div>
  );
}

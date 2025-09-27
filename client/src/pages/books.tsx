import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AddBookModal } from "@/components/modals/add-book-modal";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { BookWithAvailability } from "@shared/schema";

interface BooksResponse {
  books: BookWithAvailability[];
  total: number;
}

export default function Books() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [genre, setGenre] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: booksData, isLoading } = useQuery<BooksResponse>({
    queryKey: ["/api/books", search, searchField, genre, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
        if (searchField && searchField !== 'all') params.append('searchField', searchField);
      }
      if (genre && genre !== 'all') params.append('genre', genre);
      if (status && status !== 'all') params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', '10');
      
      const response = await fetch(`/api/books?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      await apiRequest("DELETE", `/api/books/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Success",
        description: "Book deleted successfully",
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
        description: "Failed to delete book",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (bookId: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate(bookId);
    }
  };

  const searchFields = [
    { value: "all", label: "All Fields" },
    { value: "id", label: "Book ID" },
    { value: "title", label: "Title" },
    { value: "author", label: "Author" },
    { value: "genre", label: "Genre" },
  ];
  
  const genres = ["all", "fiction", "non-fiction", "science", "history", "biography", "mystery", "romance", "fantasy", "thriller", "self-help", "technology", "art", "business", "health", "travel", "cooking", "other"];
  const statuses = ["all", "available", "borrowed"];

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
              <BookOpen className="w-5 h-5" />
              Books Management
            </CardTitle>
            {user?.role === 'admin' && (
              <Button 
                onClick={() => setShowAddModal(true)}
                data-testid="button-add-new-book"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Book
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2 flex-1">
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="w-40" data-testid="select-search-field">
                  <SelectValue placeholder="Search by" />
                </SelectTrigger>
                <SelectContent>
                  {searchFields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={`Search by ${searchFields.find(f => f.value === searchField)?.label.toLowerCase() || 'all fields'}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-books"
                />
              </div>
            </div>
            
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-genre-filter">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g === 'all' ? 'All Genres' : g.charAt(0).toUpperCase() + g.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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

          {/* Books Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book ID</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock</TableHead>
                  {user?.role === 'admin' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {booksData?.books?.map((book: any) => (
                  <TableRow key={book.id} data-testid={`row-book-${book.id}`}>
                    <TableCell>
                      <p className="font-mono text-sm" data-testid={`text-book-id-${book.id}`}>
                        {book.isbn}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-12 bg-primary rounded flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-book-title-${book.id}`}>
                            {book.title}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-book-description-${book.id}`}>
                            {book.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground" data-testid={`text-book-author-${book.id}`}>
                      {book.author}
                    </TableCell>
                    <TableCell className="text-foreground" data-testid={`text-book-genre-${book.id}`}>
                      {book.genre}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={book.isAvailable ? "default" : "destructive"}
                        data-testid={`badge-book-status-${book.id}`}
                      >
                        {book.isAvailable ? "Available" : "Borrowed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground" data-testid={`text-book-stock-${book.id}`}>
                      {book.availableQuantity}/{book.quantity}
                    </TableCell>
                    {user?.role === 'admin' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-book-${book.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-book-${book.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(book.id, book.title)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-book-${book.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )) || []}
              </TableBody>
            </Table>
            
            {(!booksData?.books || booksData.books.length === 0) && (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-books">
                No books found
              </div>
            )}
          </div>

          {/* Pagination */}
          {booksData?.total && booksData.total > 10 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {Math.min(10, booksData.books?.length || 0)} of {booksData.total} books
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
                  disabled={page * 10 >= booksData.total}
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

      <AddBookModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
      />
    </div>
  );
}

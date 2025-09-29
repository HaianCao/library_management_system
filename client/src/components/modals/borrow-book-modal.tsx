/**
 * ========================================================================
 * BORROW BOOK MODAL - MODAL MƯỢN SÁCH
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Modal form để users mượn sách từ thư viện.
 * 
 * Features:
 * - Book search với real-time filtering
 * - Book selection với availability check
 * - Due date picker (default 2 weeks)
 * - Search dropdown với book suggestions
 * - Form validation và error handling
 * 
 * Flow:
 * 1. User search book bằng title/author
 * 2. Select book từ dropdown suggestions
 * 3. Set due date (default hoặc custom)
 * 4. Submit borrowing request
 * 5. Update book availability và borrowing records
 */
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { addDays, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Book } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Zod schema validation cho borrow book form
 */
const borrowBookSchema = z.object({
  bookId: z.string().min(1, "Book selection is required"),     // ID của sách được chọn
  dueDate: z.string().min(1, "Due date is required"),          // Ngày hạn trả sách
});

interface BorrowBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Borrow Book Modal component
 * 
 * Responsibilities:
 * - Provide book search và selection interface
 * - Handle due date calculation và validation
 * - Submit borrowing request với proper data
 * - Update cache để reflect availability changes
 * 
 * UX Features:
 * - Auto-complete search dropdown
 * - Default due date (2 weeks from now)
 * - Real-time book availability filtering
 * - Outside click handling cho dropdown
 */
export default function BorrowBookModal({ open, onOpenChange }: BorrowBookModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  /**
   * State management cho book search và selection
   */
  const [searchQuery, setSearchQuery] = useState("");         // Search input value
  const [showDropdown, setShowDropdown] = useState(false);    // Dropdown visibility
  const [selectedBook, setSelectedBook] = useState<any>(null); // Selected book object
  const searchAreaRef = useRef<HTMLDivElement>(null);         // Ref cho outside click detection
  
  const form = useForm<z.infer<typeof borrowBookSchema>>({
    resolver: zodResolver(borrowBookSchema),
    defaultValues: {
      bookId: "",
      dueDate: format(addDays(new Date(), 14), "yyyy-MM-dd"), // Default 2 weeks from now
    },
  });

  const { data: books } = useQuery({
    queryKey: ["/api/books", { status: "available" }],
    enabled: open,
  });

  const borrowBookMutation = useMutation({
    mutationFn: async (data: z.infer<typeof borrowBookSchema>) => {
      await apiRequest("POST", "/api/borrowings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrowings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: "Success",
        description: "Book borrowed successfully",
      });
      form.reset({
        bookId: "",
        dueDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
      });
      onOpenChange(false);
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
        description: "Failed to process borrowing",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof borrowBookSchema>) => {
    borrowBookMutation.mutate(data);
  };

  const availableBooks = (books as any)?.books?.filter((book: any) => book.availableQuantity > 0) || [];
  
  const filteredBooks = availableBooks.filter((book: any) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBookSelect = (book: any) => {
    setSelectedBook(book);
    setSearchQuery(`${book.title} by ${book.author}`);
    form.setValue("bookId", book.id.toString());
    setShowDropdown(false);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(value.length > 0);
    if (value === "") {
      setSelectedBook(null);
      form.setValue("bookId", "");
    }
  };

  // Reset search when modal opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedBook(null);
      setShowDropdown(false);
      form.reset({
        bookId: "",
        dueDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
      });
    }
  }, [open, form]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && searchAreaRef.current && !searchAreaRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-borrow-book">
        <DialogHeader>
          <DialogTitle>Process Book Borrowing</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bookId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book</FormLabel>
                  <FormControl>
                    <div className="relative" ref={searchAreaRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search for a book by title, author, or ISBN..."
                          value={searchQuery}
                          onChange={(e) => handleSearchInputChange(e.target.value)}
                          onFocus={() => setShowDropdown(searchQuery.length > 0)}
                          className="pl-10"
                          data-testid="input-search-book"
                        />
                      </div>
                      
                      {showDropdown && filteredBooks.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-hidden">
                          <ScrollArea className="max-h-60">
                            <div className="p-1">
                              {filteredBooks.map((book: any) => (
                                <div
                                  key={book.id}
                                  className="flex items-center p-3 hover:bg-accent rounded-sm cursor-pointer"
                                  onMouseDown={() => handleBookSelect(book)}
                                  data-testid={`option-book-${book.id}`}
                                >
                                  <Book className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {book.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      by {book.author} • {book.availableQuantity} available
                                    </div>
                                    {book.isbn && (
                                      <div className="text-xs text-muted-foreground">
                                        ISBN: {book.isbn}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                      
                      {showDropdown && searchQuery.length > 0 && filteredBooks.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-3">
                          <div className="text-sm text-muted-foreground text-center">
                            No books found matching "{searchQuery}"
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  {selectedBook && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: {selectedBook.title} by {selectedBook.author} ({selectedBook.availableQuantity} available)
                    </div>
                  )}
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      min={format(new Date(), "yyyy-MM-dd")}
                      data-testid="input-due-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={borrowBookMutation.isPending || availableBooks.length === 0}
                data-testid="button-submit"
              >
                {borrowBookMutation.isPending ? "Processing..." : "Process Borrowing"}
              </Button>
            </div>
          </form>
        </Form>
        
        {availableBooks.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">
            No books are currently available for borrowing.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * ========================================================================
 * EDIT BOOK MODAL - MODAL CHỈNH SỬA SÁCH
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Modal form để admin chỉnh sửa thông tin sách đã có.
 * 
 * Features:
 * - Form pre-population với existing book data
 * - Field validation với Zod schema
 * - Update book information
 * - Quantity management
 * - Genre và description updates
 * 
 * Flow:
 * 1. Modal nhận book object để edit
 * 2. Form được populate với current book data
 * 3. Admin modify các fields cần thiết
 * 4. Submit PUT /api/books/:id với updated data
 * 5. Refresh book lists và dashboard stats
 */
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Book } from "@shared/schema";

/**
 * Zod schema validation cho edit book form
 * Tương tự add book nhưng cho editing existing records
 */
const editBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().min(1, "Book ID is required"),
  genre: z.string().min(1, "Genre is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  description: z.string().optional(),
});

type EditBookFormData = z.infer<typeof editBookSchema>;

interface EditBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book | null;                                // Book object to edit
}

/**
 * Edit Book Modal component - CHỈ ADMIN
 * 
 * Responsibilities:
 * - Pre-populate form với existing book data
 * - Handle form updates và validation
 * - Submit PUT request với updated information
 * - Manage loading states và error handling
 * 
 * Permissions: Admin only (controlled by parent component)
 */
export function EditBookModal({ open, onOpenChange, book }: EditBookModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditBookFormData>({
    resolver: zodResolver(editBookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      genre: "",
      quantity: 1,
      description: "",
    },
  });

  // Update form values when book changes
  useEffect(() => {
    if (book) {
      form.reset({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        genre: book.genre,
        quantity: book.quantity,
        description: book.description || "",
      });
    }
  }, [book, form]);

  const mutation = useMutation({
    mutationFn: async (data: EditBookFormData) => {
      if (!book) throw new Error("No book selected");
      await apiRequest("PUT", `/api/books/${book.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Book updated successfully",
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
        description: "Failed to update book",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditBookFormData) => {
    mutation.mutate(data);
  };

  const genres = [
    "fiction",
    "non-fiction",
    "science",
    "history",
    "biography",
    "mystery",
    "romance",
    "fantasy",
    "thriller",
    "self-help",
    "technology",
    "art",
    "business",
    "health",
    "travel",
    "cooking",
    "other",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-edit-book">
        <DialogHeader>
          <DialogTitle>Edit Book</DialogTitle>
          <DialogDescription>
            Update the book information. The Book ID cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter book title" 
                      {...field} 
                      data-testid="input-edit-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter author name" 
                      {...field} 
                      data-testid="input-edit-author"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter book ID" 
                      {...field} 
                      disabled={true}
                      className="bg-muted cursor-not-allowed"
                      data-testid="input-edit-isbn"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-genre">
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre.charAt(0).toUpperCase() + genre.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="Enter quantity" 
                      {...field} 
                      data-testid="input-edit-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter book description" 
                      rows={3}
                      {...field} 
                      data-testid="textarea-edit-description"
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
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="flex-1"
                data-testid="button-save-edit"
              >
                {mutation.isPending ? "Updating..." : "Update Book"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
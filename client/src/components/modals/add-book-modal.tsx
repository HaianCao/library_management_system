/**
 * ========================================================================
 * ADD BOOK MODAL - MODAL THÊM SÁCH
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Modal form để admin thêm sách mới vào hệ thống.
 * 
 * Features:
 * - Form validation với Zod schema
 * - Genre selection với predefined options
 * - Quantity management
 * - Book ID (ISBN) validation
 * - Description field (optional)
 * 
 * Flow:
 * 1. Admin điền form với book details
 * 2. Validation check các required fields
 * 3. Submit POST /api/books
 * 4. Invalidate queries để refresh book lists
 * 5. Show success message và close modal
 */
import { useState } from "react";
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

/**
 * Zod schema validation cho add book form
 * Đảm bảo all required fields được provide và valid
 */
const addBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().min(1, "Book ID is required"),         // Book identifier (ISBN hoặc custom ID)
  genre: z.string().min(1, "Genre is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"), // Số lượng sách có sẵn
  description: z.string().optional(),                     // Mô tả sách (không bắt buộc)
});

type AddBookFormData = z.infer<typeof addBookSchema>;

interface AddBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Add Book Modal component - CHỈ ADMIN
 * 
 * Responsibilities:
 * - Provide form để admin add new books
 * - Validate book data trước khi submit
 * - Handle API call và error states
 * - Update query cache sau khi success
 * 
 * Permissions: Admin only (controlled by parent component)
 */
export function AddBookModal({ open, onOpenChange }: AddBookModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddBookFormData>({
    resolver: zodResolver(addBookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      genre: "",
      quantity: 1,
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddBookFormData) => {
      await apiRequest("POST", "/api/books", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Book added successfully",
      });
      form.reset();
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
        description: "Failed to add book",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddBookFormData) => {
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
      <DialogContent className="sm:max-w-md" data-testid="modal-add-book">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
          <DialogDescription>
            Add a new book to the library. If the Book ID already exists, the quantity will be added to the existing book. If it's a new Book ID, a new book will be created.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter book title" 
                      {...field} 
                      data-testid="input-book-title"
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
                      data-testid="input-book-author"
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
                      placeholder="Enter unique book ID" 
                      {...field} 
                      data-testid="input-book-id"
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-book-genre">
                        <SelectValue placeholder="Select genre" />
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
                      data-testid="input-book-quantity"
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
                      {...field} 
                      data-testid="textarea-book-description"
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
                data-testid="button-cancel-add-book"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={mutation.isPending}
                data-testid="button-submit-add-book"
              >
                {mutation.isPending ? "Adding..." : "Add Book"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

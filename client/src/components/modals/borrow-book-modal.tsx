import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

const borrowBookSchema = z.object({
  userId: z.string().min(1, "User selection is required"),
  bookId: z.string().min(1, "Book selection is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

interface BorrowBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BorrowBookModal({ open, onOpenChange }: BorrowBookModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof borrowBookSchema>>({
    resolver: zodResolver(borrowBookSchema),
    defaultValues: {
      userId: "",
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
        userId: "",
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

  const availableBooks = books?.filter((book: any) => book.availableQuantity > 0) || [];

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
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter user ID or use current user" 
                      {...field} 
                      data-testid="input-user-id"
                    />
                  </FormControl>
                  <FormMessage />
                  {user && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setValue("userId", user.id)}
                      data-testid="button-use-current-user"
                    >
                      Use Current User ({user.firstName} {user.lastName})
                    </Button>
                  )}
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bookId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-book">
                        <SelectValue placeholder="Select a book" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBooks.map((book: any) => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} by {book.author} ({book.availableQuantity} available)
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

/**
 * ========================================================================
 * ADD ADMIN MODAL - MODAL THÊM ADMIN
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Modal form để admin tạo admin accounts mới.
 * 
 * Features:
 * - Username/password input với validation
 * - Auto-generate email từ username
 * - Create admin với proper role assignment
 * - Form validation và error handling
 * 
 * Flow:
 * 1. Admin điền username và password
 * 2. System auto-generate email (username@admin.local)
 * 3. Submit POST /api/auth/create-admin
 * 4. New admin được tạo với admin role
 * 5. Success feedback và close modal
 * 
 * Security:
 * - CHỈ existing admin có thể tạo admin mới
 * - Password validation requirements
 * - Controlled admin creation process
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

/**
 * Zod schema validation cho admin creation
 */
const addAdminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(3, "Password must be at least 3 characters"),
});

type AddAdminFormData = z.infer<typeof addAdminSchema>;

interface AddAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Add Admin Modal component - CHỈ ADMIN
 * 
 * Responsibilities:
 * - Provide form để create new admin users
 * - Validate admin credentials trước khi submit
 * - Handle admin creation API call
 * - Manage success/error states
 * 
 * Permissions: CHỈ existing admin có thể access
 */
export function AddAdminModal({ open, onOpenChange }: AddAdminModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddAdminFormData>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddAdminFormData) => {
      const response = await apiRequest("POST", "/api/auth/create-admin", {
        username: data.username,
        password: data.password,
        email: `${data.username}@admin.local`,
        firstName: "Admin",
        lastName: "User",
        role: 'admin'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Admin account created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddAdminFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-add-admin">
        <DialogHeader>
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogDescription>
            Create a new admin account with username and password. The admin will have full access to the system.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter username" 
                      {...field} 
                      data-testid="input-admin-username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Enter password" 
                      {...field} 
                      data-testid="input-admin-password"
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
                data-testid="button-cancel-add-admin"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={mutation.isPending}
                data-testid="button-submit-add-admin"
              >
                {mutation.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
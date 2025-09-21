import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Clock, Search } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                Mini Library
                <span className="text-primary"> Management</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                A comprehensive digital library system for managing books, borrowings, and user activities with real-time tracking and analytics.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Library Management Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage a modern library efficiently and effectively.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Book Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Add, edit, and organize your book collection with detailed information including genres, authors, and availability status.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage library members with role-based access control for admins and regular users with complete activity tracking.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-secondary-foreground" />
                </div>
                <CardTitle>Borrowing System</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track book borrowings and returns with due dates, overdue notifications, and real-time availability updates.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-muted/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <CardTitle>Smart Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Find books quickly with advanced search and filtering by title, author, genre, and availability status.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2" data-testid="text-stat-books">
                2,847+
              </div>
              <div className="text-lg text-muted-foreground">Books Managed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2" data-testid="text-stat-users">
                1,156+
              </div>
              <div className="text-lg text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary-foreground mb-2" data-testid="text-stat-transactions">
                15,420+
              </div>
              <div className="text-lg text-muted-foreground">Transactions</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Library?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of libraries already using our system to streamline their operations.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started-cta"
          >
            Get Started Today
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">LibraryMS</span>
          </div>
          <p className="text-muted-foreground">
            © 2025 Mini Library Management System. Built with modern technology for efficient library operations.
          </p>
        </div>
      </footer>
    </div>
  );
}

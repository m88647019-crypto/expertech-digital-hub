import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if an admin already exists
  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data, error }) => {
      if (error) {
        console.error("Failed to check admin status:", error);
        setAdminExists(true); // Assume admin exists on error (block registration)
      } else {
        setAdminExists(!!data);
      }
    });
  }, []);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "cashier") navigate("/dashboard", { replace: true });
      else navigate("/", { replace: true });
    }
  }, [user, role, navigate]);

  // If admin already exists, block registration
  if (adminExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              EXPERTECH<span className="text-accent">.</span>
            </CardTitle>
            <CardDescription>Registration is closed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShieldCheck className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              An administrator has already been set up. New accounts can only be created by the admin.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      return;
    }

    // Auto-assign admin role to the first user (works without session - anon granted)
    if (data.user) {
      const { error: roleError } = await supabase.rpc("auto_assign_first_admin", {
        _user_id: data.user.id,
      } as any);
      if (roleError) {
        console.error("Failed to assign admin role:", roleError);
      }
    }

    toast({
      title: "Admin account created!",
      description: "Check your email to verify your account, then log in.",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            EXPERTECH<span className="text-accent">.</span>
          </CardTitle>
          <CardDescription>Set up the administrator account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">First-time setup:</strong> This account will be the system administrator with full access to manage staff, orders, and settings.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@expertech.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Create Admin Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already set up?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;

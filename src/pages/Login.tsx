import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const { signIn, user, role, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page user was trying to access before being redirected to login
  const from = (location.state as any)?.from?.pathname || null;

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data, error }) => {
      if (error) setAdminExists(true);
      else setAdminExists(!!data);
    });
  }, []);

  // If already logged in, redirect once role is loaded
  useEffect(() => {
    if (!loading && !roleLoading && user) {
      const destination = from || (role === "cashier" ? "/dashboard" : "/admin");
      toast.success(`Welcome back! Redirecting...`);
      navigate(destination, { replace: true });
    }
  }, [user, role, loading, roleLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      toast.error("Login failed", { description: error });
      return;
    }

    toast.success("Login successful! Loading your workspace...");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            EXPERTECH<span className="text-accent">.</span>
          </CardTitle>
          <CardDescription>Sign in to your staff account</CardDescription>
        </CardHeader>
        <CardContent>
          {from && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
              <p className="text-xs text-muted-foreground">
                Please sign in to access <strong className="text-foreground">{from}</strong>
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          {adminExists === false && (
            <p className="text-sm text-muted-foreground">
              No admin yet?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Set up admin account
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;

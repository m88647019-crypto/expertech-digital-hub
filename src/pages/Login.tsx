import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const { signIn, user, role, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if admin exists (to show/hide register link)
  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data, error }) => {
      if (error) {
        setAdminExists(true);
      } else {
        setAdminExists(!!data);
      }
    });
  }, []);

  // If already logged in, redirect once role is loaded
  useEffect(() => {
    if (!loading && !roleLoading && user) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "cashier") navigate("/dashboard", { replace: true });
      else navigate("/admin", { replace: true });
    }
  }, [user, role, loading, roleLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Login failed", description: error, variant: "destructive" });
      return;
    }

    toast({ title: "Login successful" });
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

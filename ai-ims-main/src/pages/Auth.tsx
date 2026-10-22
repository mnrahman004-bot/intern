import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package, Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { loginSchema, signupSchema } from "@/utils/validation";
import { getZodErrors, FieldErrors } from "@/utils/errorHandler";
import FormError from "@/components/FormError";
import { sanitize } from "@/utils/validation";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

    if (score <= 2) return { score: score * 15, label: "Weak", color: "text-destructive" };
    if (score <= 3) return { score: 50, label: "Fair", color: "text-[hsl(var(--warning))]" };
    if (score <= 4) return { score: 70, label: "Good", color: "text-primary" };
    if (score <= 5) return { score: 85, label: "Strong", color: "text-[hsl(var(--success))]" };
    return { score: 100, label: "Very Strong", color: "text-[hsl(var(--success))]" };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (isLogin) {
        const data = loginSchema.parse({ email, password });
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitize(data.email),
          password: data.password,
        });
        if (error) {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        } else {
          navigate("/");
        }
      } else {
        const data = signupSchema.parse({ displayName, email, password, confirmPassword });
        setLoading(true);
        const { error } = await supabase.auth.signUp({
          email: sanitize(data.email),
          password: data.password,
          options: { data: { display_name: sanitize(data.displayName) } },
        });
        if (error) {
          toast({ title: "Signup failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Account created!", description: "Please check your email to verify your account." });
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      if (err.issues) {
        setErrors(getZodErrors(err));
      } else {
        toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Package className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your inventory dashboard" : "Set up your inventory system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={errors.displayName ? "border-destructive" : ""}
                />
                <FormError message={errors.displayName} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shop.com"
                className={errors.email ? "border-destructive" : ""}
              />
              <FormError message={errors.email} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormError message={errors.password} />
              {!isLogin && password && (
                <div className="space-y-1.5">
                  <Progress value={passwordStrength.score} className="h-1.5" />
                  <p className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </p>
                  <ul className="space-y-0.5">
                    {[
                      { met: password.length >= 8, label: "At least 8 characters" },
                      { met: /[A-Z]/.test(password), label: "One uppercase letter" },
                      { met: /[a-z]/.test(password), label: "One lowercase letter" },
                      { met: /[0-9]/.test(password), label: "One number" },
                      { met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), label: "One special character (!@#$...)" },
                    ].map((req) => (
                      <li key={req.label} className="flex items-center gap-1.5 text-xs">
                        {req.met ? (
                          <Check className="h-3 w-3 text-[hsl(var(--success,142_71%_45%))]" />
                        ) : (
                          <X className="h-3 w-3 text-destructive" />
                        )}
                        <span className={req.met ? "text-muted-foreground" : "text-destructive"}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {isLogin && password && (
                <div className="space-y-1">
                  <Progress value={passwordStrength.score} className="h-1.5" />
                  <p className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>
            {!isLogin && (
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormError message={errors.confirmPassword} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={switchMode} className="text-primary underline-offset-4 hover:underline">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

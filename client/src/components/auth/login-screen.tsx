// Login screen for JWT authentication
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/My_Life_Assistant_Logo_1767679972274.png";

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);

  const handleLogin = async () => {
    try {
      setIsAttemptingLogin(true);
      await login();
    } catch (error) {
      // Error is already handled by useAuth hook
    } finally {
      setIsAttemptingLogin(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,11%)] p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,15%)] via-[hsl(222,47%,11%)] to-[hsl(222,50%,8%)]" />
      <Card className="w-full max-w-md relative z-10 bg-white/95 dark:bg-[hsl(222,45%,12%)] shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="My Life Assistant" className="h-24 w-24 rounded-xl shadow-xl" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[hsl(43,67%,45%)] to-[hsl(43,67%,55%)] bg-clip-text text-transparent">
            My Life Assistant
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Your personal AI-powered productivity companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-center text-sm text-muted-foreground">
            Welcome! Click below to access your personal assistant.
          </div>
          
          <Button 
            onClick={handleLogin}
            disabled={isLoading || isAttemptingLogin}
            className="w-full btn-gold text-lg py-6 rounded-xl"
            size="lg"
          >
            {(isLoading || isAttemptingLogin) ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Access My Assistant"
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center">
            Personal single-user application with automatic authentication
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
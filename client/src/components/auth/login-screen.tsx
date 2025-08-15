// Login screen for JWT authentication
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/My Life Assistant_1755255862503.png";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="My Life Assistant" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl font-bold">My Life Assistant</CardTitle>
          <CardDescription>
            Your personal AI-powered productivity companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-center text-sm text-gray-600 mb-4">
            Welcome! Click below to access your personal assistant.
          </div>
          
          <Button 
            onClick={handleLogin}
            disabled={isLoading || isAttemptingLogin}
            className="w-full"
            size="lg"
          >
            {(isLoading || isAttemptingLogin) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Access My Assistant"
            )}
          </Button>
          
          <div className="text-xs text-gray-500 text-center mt-4">
            This is a personal single-user application with automatic authentication.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
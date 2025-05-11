import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();
  
  // Don't render anything if we're on a valid route
  // This prevents the component from rendering at the bottom of every page when used as a catch-all
  const validRoutes = [
    "/campaigns", 
    "/urls", 
    "/gmail-settings", 
    "/system-settings", 
    "/trafficstar", 
    "/redirect-test", 
    "/test-spent-value", 
    "/original-url-records", 
    "/campaign-click-records", 
    "/url-click-records", 
    "/url-budget-logs",
    "/youtube-url-records", 
    "/youtube-api-logs", 
    "/blacklisted-urls", 
    "/api-tester",
    "/login"
  ];
  
  // Check if current location starts with any valid route
  const isValidRoute = validRoutes.some(route => {
    return location === route || 
           (route !== "/" && location.startsWith(route + "/")) ||
           location.startsWith("/r/") ||
           location.startsWith("/r/bridge/") ||
           location.startsWith("/views/") ||
           location.startsWith("/c/");
  });
  
  if (isValidRoute) {
    return null;
  }
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist or you don't have access to it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

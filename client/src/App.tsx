import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import RedirectPage from "@/pages/redirect";
import LoginPage from "@/pages/login-page";
import AppLayout from "@/components/layout/app-layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { getAppRoutes } from "./routes";
import NotFound from "@/pages/not-found";

// Authentication is now enabled - set to false to require login
const BYPASS_LOGIN = true; // Temporarily bypass login to fix critical tracking issues

function Router() {
  const [location] = useLocation();
  
  // Check if current location is a redirect route
  const isRedirectRoute = 
    location.startsWith("/r/") || 
    location.startsWith("/views/") || 
    location.startsWith("/c/");
  
  // Render different route sets based on the current location
  if (isRedirectRoute) {
    // Standalone routes without layout/navbar
    return (
      <Switch>
        <Route path="/r/:campaignId/:urlId" component={RedirectPage} />
        <Route path="/r/bridge/:campaignId/:urlId" component={RedirectPage} />
        <Route path="/views/:customPath" component={RedirectPage} />
        <Route path="/c/:campaignId" component={RedirectPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  // TEMPORARY FOR DEVELOPMENT: Bypass authentication completely
  if (BYPASS_LOGIN) {
    return (
      <AppLayout>
        <Switch>
          {getAppRoutes()}
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    );
  }
  
  // Normal production mode with authentication
  if (location === "/login") {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  return (
    <ProtectedRoute>
      <AppLayout>
        <Switch>
          {getAppRoutes()}
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
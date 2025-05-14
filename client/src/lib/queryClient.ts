import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: Record<string, string> }
): Promise<T> {
  console.log(`🔍 DEBUG: API Request - ${url} ${data ? JSON.stringify(data) : ''}`);
  
  try {
    // Prepare headers
    const headers: Record<string, string> = {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {})
    };
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // This ensures cookies are sent with the request
    });

    console.log(`🔍 DEBUG: API Response status: ${res.status}`);
    
    await throwIfResNotOk(res);
    
    // Parse and return the JSON response
    const jsonData = await res.json();
    return jsonData as T;
  } catch (error) {
    console.error(`🔴 ERROR: API Request failed - ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Make the fetch request with credentials included (cookies)
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

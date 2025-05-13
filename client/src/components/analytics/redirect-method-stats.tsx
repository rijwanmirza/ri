import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

// Properly typed interface for redirect analytics data
interface UrlRedirectAnalytics {
  id: number;
  urlId: number;
  directRedirects: number;
  linkedinRedirects: number;
  facebookRedirects: number;
  whatsappRedirects: number;
  googleMeetRedirects: number;
  googleSearchRedirects: number;
  googlePlayRedirects: number;
  createdAt?: string;
  updatedAt?: string;
}

interface RedirectMethodStatsProps {
  urlId: number;
}

export const RedirectMethodStats: React.FC<RedirectMethodStatsProps> = ({ urlId }) => {
  // Fetch redirect analytics data for this URL
  const { data: stats, isLoading, error } = useQuery({
    queryKey: [`/api/urls/${urlId}/redirect-analytics`],
    queryFn: async () => {
      const response = await fetch(`/api/urls/${urlId}/redirect-analytics`);
      if (!response.ok) {
        throw new Error('Failed to fetch redirect analytics');
      }
      return response.json() as Promise<UrlRedirectAnalytics>;
    },
    retry: 1,
  });

  // Format data for the chart
  const chartData = React.useMemo(() => {
    if (!stats) return [];

    return [
      { name: 'Direct', value: stats.directRedirects || 0, color: '#4338ca' },
      { name: 'LinkedIn', value: stats.linkedinRedirects || 0, color: '#0077b5' },
      { name: 'Facebook', value: stats.facebookRedirects || 0, color: '#3b5998' },
      { name: 'WhatsApp', value: stats.whatsappRedirects || 0, color: '#25d366' },
      { name: 'Google Meet', value: stats.googleMeetRedirects || 0, color: '#00897b' },
      { name: 'Google Search', value: stats.googleSearchRedirects || 0, color: '#4285f4' },
      { name: 'Google Play', value: stats.googlePlayRedirects || 0, color: '#3bccff' },
    ].filter(item => item.value > 0); // Only show methods that have clicks
  }, [stats]);

  // Calculate total redirects
  const totalRedirects = React.useMemo(() => {
    if (!stats) return 0;
    return (
      (stats.directRedirects || 0) +
      (stats.linkedinRedirects || 0) +
      (stats.facebookRedirects || 0) +
      (stats.whatsappRedirects || 0) +
      (stats.googleMeetRedirects || 0) +
      (stats.googleSearchRedirects || 0) +
      (stats.googlePlayRedirects || 0)
    );
  }, [stats]);

  // If we're loading, show a loading spinner
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redirect Method Analytics</CardTitle>
          <CardDescription>
            Loading redirect stats...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If we have an error, show the error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redirect Method Analytics</CardTitle>
          <CardDescription>
            Failed to load redirect analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }

  // If we have no data or no redirects, show a message
  if (!stats || totalRedirects === 0) {
    // For debugging and testing purposes
    const resetAnalytics = async () => {
      try {
        const response = await fetch(`/api/urls/${urlId}/redirect-analytics`, {
          method: 'DELETE'
        });
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to reset analytics:', error);
      }
    };
    
    // For testing purposes - trigger a real redirect with specific method
    const testRedirect = async (method: string) => {
      try {
        console.log(`Testing redirect for URL ID ${urlId} with method ${method}`);
        // Get the URL details to get the campaign ID
        const response = await fetch(`/api/urls/${urlId}`);
        const urlData = await response.json();
        
        if (urlData && urlData.campaignId) {
          console.log(`Got URL data:`, urlData);
          
          // First use a direct API call to test/force incrementing for a specific method
          const analyticsResponse = await fetch(`/api/urls/${urlId}/test-redirect-method`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method })
          });
          
          if (analyticsResponse.ok) {
            console.log(`Successfully called test-redirect-method API`);
          } else {
            console.error(`Failed to call test-redirect-method API:`, await analyticsResponse.text());
          }
          
          // Then also open the actual redirect URL in a new tab for real testing
          window.open(`/r/${urlData.campaignId}/${urlId}`, '_blank');
          
          // Wait a moment before reloading to see updated data
          console.log(`Waiting 2 seconds before reload to see updated data...`);
          setTimeout(() => {
            console.log(`Reloading page to see updated analytics...`);
            window.location.reload();
          }, 2000);
        } else {
          console.error(`Invalid URL data returned:`, urlData);
        }
      } catch (error) {
        console.error('Failed to test redirect:', error);
      }
    };
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redirect Method Analytics</CardTitle>
          <CardDescription>
            No redirect data available yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">There are no recorded redirects for this URL.</p>
          
          {/* Debug controls */}
          <div className="border p-4 rounded-md bg-muted/20">
            <h4 className="font-medium mb-2">Debug Controls</h4>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => testRedirect('direct')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
              >
                Test Redirect
              </button>
              <button 
                onClick={resetAnalytics}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
              >
                Reset Analytics
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we have data and redirects, show the chart
  return (
    <Card>
      <CardHeader>
        <CardTitle>Redirect Method Analytics</CardTitle>
        <CardDescription>
          {totalRedirects} total redirects through different platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value} clicks`, 'Redirects']}
                labelFormatter={(label) => `${label} Redirects`}
              />
              <Bar dataKey="value" name="Redirects" label={{ position: 'top' }}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Debug controls */}
        <div className="border p-4 rounded-md bg-muted/20 mt-4">
          <h4 className="font-medium mb-2">Debug Controls</h4>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={async () => {
                try {
                  // Get the URL to visit to trigger a redirect
                  const response = await fetch(`/api/urls/${urlId}`);
                  const urlData = await response.json();
                  if (urlData && urlData.campaignId) {
                    // Open the redirect URL in a new tab
                    window.open(`/r/${urlData.campaignId}/${urlId}`, '_blank');
                    // Wait a moment before reloading
                    setTimeout(() => window.location.reload(), 1500);
                  }
                } catch (error) {
                  console.error('Failed to test redirect:', error);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
            >
              Test Redirect
            </button>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch(`/api/urls/${urlId}/redirect-analytics`, {
                    method: 'DELETE'
                  });
                  if (response.ok) {
                    window.location.reload();
                  }
                } catch (error) {
                  console.error('Failed to reset analytics:', error);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
            >
              Reset Analytics
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
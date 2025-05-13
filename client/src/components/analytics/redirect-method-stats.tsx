import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

// Properly typed interface for redirect analytics data
interface UrlRedirectAnalytics {
  id: number;
  url_id: number;
  direct_redirects: number;
  linkedin_redirects: number;
  facebook_redirects: number;
  whatsapp_redirects: number;
  google_meet_redirects: number;
  google_search_redirects: number;
  google_play_redirects: number;
  created_at?: string;
  updated_at?: string;
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
      { name: 'Direct', value: stats.direct_redirects || 0, color: '#4338ca' },
      { name: 'LinkedIn', value: stats.linkedin_redirects || 0, color: '#0077b5' },
      { name: 'Facebook', value: stats.facebook_redirects || 0, color: '#3b5998' },
      { name: 'WhatsApp', value: stats.whatsapp_redirects || 0, color: '#25d366' },
      { name: 'Google Meet', value: stats.google_meet_redirects || 0, color: '#00897b' },
      { name: 'Google Search', value: stats.google_search_redirects || 0, color: '#4285f4' },
      { name: 'Google Play', value: stats.google_play_redirects || 0, color: '#3bccff' },
    ].filter(item => item.value > 0); // Only show methods that have clicks
  }, [stats]);

  // Calculate total redirects
  const totalRedirects = React.useMemo(() => {
    if (!stats) return 0;
    return (
      (stats.direct_redirects || 0) +
      (stats.linkedin_redirects || 0) +
      (stats.facebook_redirects || 0) +
      (stats.whatsapp_redirects || 0) +
      (stats.google_meet_redirects || 0) +
      (stats.google_search_redirects || 0) +
      (stats.google_play_redirects || 0)
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
    return (
      <Card>
        <CardHeader>
          <CardTitle>Redirect Method Analytics</CardTitle>
          <CardDescription>
            No redirect data available yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">There are no recorded redirects for this URL.</p>
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
      </CardContent>
    </Card>
  );
};
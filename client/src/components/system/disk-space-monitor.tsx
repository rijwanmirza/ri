import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

type DiskSpace = {
  overall: {
    total: number;
    used: number;
    free: number;
    usedPercent: number;
    totalFormatted: string;
    usedFormatted: string;
    freeFormatted: string;
    usedPercentFormatted: string;
  };
  filesystems: Array<{
    filesystem: string;
    mount: string;
    size: number;
    used: number;
    free: number;
    usedPercent: number;
    sizeFormatted: string;
    usedFormatted: string;
    freeFormatted: string;
    usedPercentFormatted: string;
  }>;
  timestamp: string;
};

export default function DiskSpaceMonitor() {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: DiskSpace }>({
    queryKey: ['/api/system/disk-space'],
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Auto-refresh every minute
  });
  
  const diskSpace = data?.data;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !diskSpace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Failed to load disk space information. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Sort filesystems by usage percentage (highest first)
  const sortedFilesystems = [...diskSpace.filesystems]
    .sort((a, b) => b.usedPercent - a.usedPercent);
  
  // Function to determine color based on usage percent
  const getProgressColor = (percent: number) => {
    if (percent > 90) return "bg-red-500";
    if (percent > 75) return "bg-orange-500";
    if (percent > 50) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall disk usage */}
          <div>
            <div className="flex justify-between mb-2">
              <h3 className="font-medium">Overall Storage Usage</h3>
              <span className="text-sm text-muted-foreground">
                {diskSpace.overall.usedFormatted} / {diskSpace.overall.totalFormatted} ({diskSpace.overall.usedPercentFormatted})
              </span>
            </div>
            <Progress 
              value={diskSpace.overall.usedPercent} 
              className="h-2" 
              indicatorClassName={getProgressColor(diskSpace.overall.usedPercent)}
            />
            <div className="mt-2 text-sm text-muted-foreground">
              Free: {diskSpace.overall.freeFormatted}
            </div>
          </div>
          
          <Separator />
          
          {/* Individual filesystems */}
          <div className="space-y-4">
            <h3 className="font-medium">Filesystem Details</h3>
            
            {sortedFilesystems.map((fs, index) => (
              <div key={`${fs.filesystem}-${index}`} className="space-y-2">
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">{fs.mount}</span>
                    <span className="text-sm text-muted-foreground ml-2">({fs.filesystem})</span>
                  </div>
                  <span className="text-sm">
                    {fs.usedFormatted} / {fs.sizeFormatted} ({fs.usedPercentFormatted})
                  </span>
                </div>
                <Progress 
                  value={fs.usedPercent} 
                  className="h-1.5" 
                  indicatorClassName={getProgressColor(fs.usedPercent)}
                />
                <div className="text-xs text-muted-foreground">
                  Free: {fs.freeFormatted}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground text-right">
            Last updated: {new Date(diskSpace.timestamp).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
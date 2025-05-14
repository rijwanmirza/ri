import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Campaign, CampaignPath } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Loader2, X, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface CampaignPathsProps {
  campaign: Campaign;
}

export function CampaignPaths({ campaign }: CampaignPathsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPathValue, setNewPathValue] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch campaign paths
  const { data: paths, isLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaign.id}/paths`],
    enabled: !!campaign.id,
  });

  // Add path mutation
  const addPathMutation = useMutation({
    mutationFn: async (path: string) => {
      // Getting the API key from cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = decodeURIComponent(value);
        return acc;
      }, {} as Record<string, string>);
      
      const apiKey = cookies.apiKey;

      const response = await fetch(`/api/campaigns/${campaign.id}/paths`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey || ""
        },
        body: JSON.stringify({ path }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add custom path");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Path added",
        description: "The custom path was successfully added"
      });
      setNewPathValue("");
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}/paths`] });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding path",
        description: error.message || "Failed to add custom path",
        variant: "destructive"
      });
    }
  });

  // Delete path mutation
  const deletePathMutation = useMutation({
    mutationFn: async (pathId: number) => {
      // Getting the API key from cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = decodeURIComponent(value);
        return acc;
      }, {} as Record<string, string>);
      
      const apiKey = cookies.apiKey;

      const response = await fetch(`/api/campaign-paths/${pathId}`, {
        method: "DELETE",
        headers: {
          "X-API-Key": apiKey || ""
        },
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete custom path");
      }

      return { message: "Path deleted successfully" };
    },
    onSuccess: () => {
      toast({
        title: "Path deleted",
        description: "The custom path was successfully removed"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}/paths`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting path",
        description: error.message || "Failed to delete custom path",
        variant: "destructive"
      });
    }
  });

  const handleAddPath = () => {
    if (!newPathValue.trim()) {
      toast({
        title: "Invalid path",
        description: "Please enter a valid path",
        variant: "destructive"
      });
      return;
    }
    addPathMutation.mutate(newPathValue);
  };

  const handleDeletePath = (pathId: number) => {
    deletePathMutation.mutate(pathId);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Custom Paths</CardTitle>
        <CardDescription>
          Create custom paths for this campaign. Each path provides a unique URL to share.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Legacy custom path */}
            {campaign.customPath && (
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <span className="font-medium">{campaign.customPath}</span>
                  <span className="ml-2 text-xs text-muted-foreground">(Legacy Path)</span>
                </div>
                <div className="text-muted-foreground text-sm">
                  /views/{campaign.customPath}
                </div>
              </div>
            )}

            {/* New custom paths */}
            {paths && paths.map(path => (
              <div key={path.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1 font-medium">
                  {path.path}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-muted-foreground text-sm">
                    /views/{path.path}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Custom Path</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the custom path "{path.path}"? This will make any links using this path stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDeletePath(path.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}

            {!campaign.customPath && (!paths || paths.length === 0) && (
              <p className="text-sm text-muted-foreground py-3">
                No custom paths defined. Add a path to create a unique URL for this campaign.
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Custom Path
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Path</DialogTitle>
              <DialogDescription>
                Create a custom path for this campaign. This will generate a unique URL that can be shared.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="e.g. my-campaign-path"
                value={newPathValue}
                onChange={(e) => setNewPathValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Path must contain only letters, numbers, hyphens, and underscores. 
                The URL will be: /views/{newPathValue || 'your-path'}
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={handleAddPath}
                disabled={addPathMutation.isPending || !newPathValue.trim()}
              >
                {addPathMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Path
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
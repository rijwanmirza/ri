import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

// Form validation schema for adding a child TrafficStar campaign
const childTrafficstarSchema = z.object({
  trafficstarCampaignId: z.string().min(1, "Campaign ID is required"),
  clickRemainingThreshold: z.coerce.number().min(1, "Threshold must be at least 1 click")
});

type ChildTrafficstarValues = z.infer<typeof childTrafficstarSchema>;

interface ChildTrafficstarCampaign {
  id: number;
  parentCampaignId: number;
  trafficstarCampaignId: string;
  clickRemainingThreshold: number;
  active: boolean;
  lastAction?: string | null;
  lastActionTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChildTrafficstarCampaignsProps {
  campaignId: number;
  trafficstarEnabled: boolean;
}

export function ChildTrafficstarCampaigns({ 
  campaignId, 
  trafficstarEnabled 
}: ChildTrafficstarCampaignsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up form for adding a new child campaign
  const form = useForm<ChildTrafficstarValues>({
    resolver: zodResolver(childTrafficstarSchema),
    defaultValues: {
      trafficstarCampaignId: "",
      clickRemainingThreshold: 1000
    }
  });

  console.log(`Debug: Rendering child campaigns component for campaignId=${campaignId}, trafficstarEnabled=${trafficstarEnabled}`);

  // Query to fetch child campaigns
  const { 
    data: childCampaigns = [], 
    isLoading, 
    error,
    isError 
  } = useQuery({
    queryKey: ['/api/campaigns', campaignId, 'child-trafficstar-campaigns'],
    queryFn: async () => {
      console.log(`Debug: Fetching child campaigns for campaignId=${campaignId}`);
      try {
        const result = await apiRequest("GET", `/api/campaigns/${campaignId}/child-trafficstar-campaigns`);
        console.log(`Debug: Fetch result:`, result);
        return result;
      } catch (err) {
        console.error(`Error fetching child campaigns:`, err);
        throw err;
      }
    },
    enabled: !!campaignId && trafficstarEnabled
  });

  // Mutation to add a new child campaign
  const addChildCampaignMutation = useMutation({
    mutationFn: async (values: ChildTrafficstarValues) => {
      console.log(`Debug: Adding child campaign:`, values);
      // Ensure the threshold is a number
      const payload = {
        ...values,
        clickRemainingThreshold: Number(values.clickRemainingThreshold)
      };
      
      console.log(`Debug: Processed payload:`, payload);
      
      try {
        // Parameter order: method, url, data
        const result = await apiRequest(
          "POST",
          `/api/campaigns/${campaignId}/child-trafficstar-campaigns`, 
          payload
        );
        console.log(`Debug: API response:`, result);
        return result;
      } catch (err) {
        console.error('API Error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log(`Debug: Mutation success:`, data);
      
      // Invalidate query to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/campaigns', campaignId, 'child-trafficstar-campaigns'] 
      });
      
      // Show success message
      toast({
        title: "Success",
        description: "Child TrafficStar campaign added successfully",
      });
      
      // Reset form and close dialog
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error adding child campaign:', error);
      toast({
        title: "Failed to add child campaign",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a child campaign
  const deleteChildCampaignMutation = useMutation({
    mutationFn: async (childCampaignId: number) => {
      console.log(`Debug: Deleting child campaign ID:`, childCampaignId);
      return apiRequest(
        "DELETE",
        `/api/child-trafficstar-campaigns/${childCampaignId}`
      );
    },
    onSuccess: () => {
      // Invalidate query to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/campaigns', campaignId, 'child-trafficstar-campaigns'] 
      });
      
      // Show success message
      toast({
        title: "Success",
        description: "Child TrafficStar campaign deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting child campaign:', error);
      toast({
        title: "Failed to delete child campaign",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: ChildTrafficstarValues) => {
    addChildCampaignMutation.mutate(values);
  };

  // Handle delete
  const handleDelete = (childCampaignId: number) => {
    if (confirm("Are you sure you want to delete this child campaign?")) {
      deleteChildCampaignMutation.mutate(childCampaignId);
    }
  };

  if (!trafficstarEnabled) {
    return (
      <div className="rounded-lg border p-3 mt-4">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm">
            TrafficStar integration must be enabled to use child campaigns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Child TrafficStar Campaigns</h4>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Child TrafficStar Campaign</DialogTitle>
              <DialogDescription>
                Add a child TrafficStar campaign that will automatically start/pause 
                based on the parent campaign's remaining clicks.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="trafficstarCampaignId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TrafficStar Campaign ID</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g. 1234567" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the Campaign ID from TrafficStar
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clickRemainingThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Click Threshold</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 1000" 
                          onChange={e => field.onChange(Number(e.target.value))}
                          value={field.value}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        The child campaign will start when parent campaign's remaining clicks 
                        reach this threshold and pause when below the threshold.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={addChildCampaignMutation.isPending}
                  >
                    {addChildCampaignMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Child Campaign
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="text-sm text-muted-foreground mb-3">
        Child campaigns automatically activate when the parent campaign's remaining 
        clicks reach the specified threshold and deactivate when below the threshold.
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="py-3 text-center text-red-500">
          Failed to load child campaigns: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      ) : childCampaigns.length === 0 ? (
        <div className="py-3 text-center text-muted-foreground">
          No child TrafficStar campaigns configured
        </div>
      ) : (
        <Table>
          <TableCaption>Child TrafficStar campaigns for this parent campaign</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign ID</TableHead>
              <TableHead>Click Threshold</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(childCampaigns) ? childCampaigns.map((childCampaign: ChildTrafficstarCampaign) => (
              <TableRow key={childCampaign.id}>
                <TableCell className="font-medium">
                  {childCampaign.trafficstarCampaignId}
                </TableCell>
                <TableCell>{childCampaign.clickRemainingThreshold.toLocaleString()} clicks</TableCell>
                <TableCell>
                  <span className={`capitalize ${
                    childCampaign.active ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {childCampaign.active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(childCampaign.id)}
                    disabled={deleteChildCampaignMutation.isPending}
                    title="Delete child campaign"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-red-500">
                  Invalid data format received from API
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash, Pencil, Plus } from "lucide-react";

// Blacklisted URL type
interface BlacklistedUrl {
  id: number;
  name: string;
  targetUrl: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function BlacklistedUrlsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States for form dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentBlacklistedUrl, setCurrentBlacklistedUrl] = useState<BlacklistedUrl | null>(null);
  
  // Form states
  const [newName, setNewName] = useState("");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  
  // Fetch blacklisted URLs
  const { data: blacklistedUrls, isLoading, error } = useQuery({
    queryKey: ['/api/blacklisted-urls'],
    queryFn: () => apiRequest<BlacklistedUrl[]>('GET', '/api/blacklisted-urls'),
  });
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newBlacklistedUrl: Omit<BlacklistedUrl, 'id' | 'createdAt' | 'updatedAt'>) => 
      apiRequest('POST', '/api/blacklisted-urls', newBlacklistedUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklisted-urls'] });
      toast({
        title: "URL Blacklisted",
        description: "The URL has been successfully blacklisted.",
      });
      resetFormAndClose();
    },
    onError: (error) => {
      console.error('Error creating blacklisted URL', error);
      toast({
        title: "Error",
        description: "Failed to blacklist URL. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (blacklistedUrl: Partial<BlacklistedUrl> & { id: number }) => 
      apiRequest('PUT', `/api/blacklisted-urls/${blacklistedUrl.id}`, {
        name: blacklistedUrl.name,
        targetUrl: blacklistedUrl.targetUrl,
        description: blacklistedUrl.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklisted-urls'] });
      toast({
        title: "URL Updated",
        description: "The blacklisted URL has been successfully updated.",
      });
      resetFormAndClose();
    },
    onError: (error) => {
      console.error('Error updating blacklisted URL', error);
      toast({
        title: "Error",
        description: "Failed to update blacklisted URL. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/blacklisted-urls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklisted-urls'] });
      toast({
        title: "URL Removed",
        description: "The URL has been removed from the blacklist.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting blacklisted URL', error);
      toast({
        title: "Error",
        description: "Failed to remove URL from blacklist. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for creating
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTargetUrl) {
      toast({
        title: "Missing Information",
        description: "Name and Target URL are required fields.",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate({
      name: newName,
      targetUrl: newTargetUrl,
      description: newDescription,
    });
  };
  
  // Handle form submission for updating
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlacklistedUrl || !newName || !newTargetUrl) {
      toast({
        title: "Missing Information",
        description: "Name and Target URL are required fields.",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({
      id: currentBlacklistedUrl.id,
      name: newName,
      targetUrl: newTargetUrl,
      description: newDescription,
    });
  };
  
  // Handle click on edit button
  const handleEditClick = (blacklistedUrl: BlacklistedUrl) => {
    setCurrentBlacklistedUrl(blacklistedUrl);
    setNewName(blacklistedUrl.name);
    setNewTargetUrl(blacklistedUrl.targetUrl);
    setNewDescription(blacklistedUrl.description || "");
    setIsEditDialogOpen(true);
  };
  
  // Handle click on delete button
  const handleDeleteClick = (blacklistedUrl: BlacklistedUrl) => {
    setCurrentBlacklistedUrl(blacklistedUrl);
    setIsDeleteDialogOpen(true);
  };
  
  // Reset form and close dialogs
  const resetFormAndClose = () => {
    setNewName("");
    setNewTargetUrl("");
    setNewDescription("");
    setCurrentBlacklistedUrl(null);
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blacklisted URLs</h1>
          <p className="text-gray-500 mt-1">
            Manage URLs that should be rejected by the system
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              <span>Add URL to Blacklist</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add URL to Blacklist</DialogTitle>
              <DialogDescription>
                Enter the details for the URL pattern you want to blacklist.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-3">
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input
                    id="name"
                    placeholder="Adult Content"
                    className="col-span-3"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="targetUrl" className="text-right">Target URL Pattern</Label>
                  <Input
                    id="targetUrl"
                    placeholder="adult"
                    className="col-span-3"
                    value={newTargetUrl}
                    onChange={(e) => setNewTargetUrl(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-2">
                  <Label htmlFor="description" className="text-right pt-2">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="URLs containing adult content"
                    className="col-span-3"
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetFormAndClose}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add to Blacklist"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Blacklisted URL Patterns</CardTitle>
          <CardDescription>
            URLs matching these patterns will be automatically rejected when added to campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex flex-col space-y-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-6 text-center">
              <p className="text-red-500">Failed to load blacklisted URLs</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/blacklisted-urls'] })}
              >
                Try Again
              </Button>
            </div>
          ) : blacklistedUrls && blacklistedUrls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklistedUrls.map((url) => (
                  <TableRow key={url.id}>
                    <TableCell className="font-medium">{url.name}</TableCell>
                    <TableCell><code className="bg-gray-100 px-1 py-0.5 rounded">{url.targetUrl}</code></TableCell>
                    <TableCell>{url.description || "-"}</TableCell>
                    <TableCell>{formatDate(url.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(url)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(url)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center">
              <p className="text-gray-500 mb-4">No blacklisted URLs found</p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="flex mx-auto items-center gap-2"
              >
                <Plus size={16} />
                <span>Add URL to Blacklist</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Blacklisted URL</DialogTitle>
            <DialogDescription>
              Update the details for this blacklisted URL pattern.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Adult Content"
                  className="col-span-3"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-targetUrl" className="text-right">Target URL Pattern</Label>
                <Input
                  id="edit-targetUrl"
                  placeholder="adult"
                  className="col-span-3"
                  value={newTargetUrl}
                  onChange={(e) => setNewTargetUrl(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-2">
                <Label htmlFor="edit-description" className="text-right pt-2">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="URLs containing adult content"
                  className="col-span-3"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetFormAndClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to remove this URL?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the URL pattern "{currentBlacklistedUrl?.name}" from the blacklist.
              URLs matching this pattern will no longer be automatically rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => currentBlacklistedUrl && deleteMutation.mutate(currentBlacklistedUrl.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
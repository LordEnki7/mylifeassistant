import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";

export default function BackupExport() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleBackupDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Get auth headers using the proper auth service
      const authHeader = authService.getAuthHeader();
      const headers: Record<string, string> = {};
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
      
      const response = await fetch('/api/backup/download', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to generate backup');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || 'my-life-assistant-backup.zip';

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Backup Created Successfully",
        description: `Your complete app backup has been downloaded as ${filename}`,
      });

    } catch (error) {
      console.error('Backup failed:', error);
      toast({
        title: "Backup Failed",
        description: "There was an error creating your backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icons.shoppingCart className="h-5 w-5" />
              App Backup & Export
            </CardTitle>
            <CardDescription>
              Create a complete backup of your Life Assistant app for standalone deployment
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Standalone Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">What's included in your backup:</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Complete source code (client, server, shared)</li>
              <li>• Database schema and configurations</li>
              <li>• Package dependencies and build files</li>
              <li>• Setup instructions for independent deployment</li>
              <li>• Environment variable templates</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Icons.alert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Before backing up:</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Make sure you have your API keys and environment variables ready for the new deployment.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleBackupDownload}
              disabled={isDownloading}
              className="flex-1"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Backup...
                </>
              ) : (
                <>
                  <Icons.user className="w-4 h-4 mr-2" />
                  Download Complete Backup
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                toast({
                  title: "Backup Info",
                  description: "The backup includes everything you need to run your app independently with PostgreSQL database, Node.js, and your API keys.",
                  duration: 5000,
                });
              }}
            >
              <Icons.alert className="w-4 h-4 mr-2" />
              Info
            </Button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
            <p>💡 <strong>Tip:</strong> After downloading, extract the zip file and follow the SETUP_INSTRUCTIONS.md file for deployment guidance.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
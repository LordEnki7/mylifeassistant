import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-yellow-100 text-yellow-800",
  urgent: "bg-red-100 text-red-800",
};

export default function UpcomingTasks() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/tasks/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    updateTaskMutation.mutate({
      id: taskId,
      status: completed ? "completed" : "pending",
    });
  };

  const upcomingTasks = tasks
    .filter(task => task.status === "pending")
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - 
             priorityOrder[b.priority as keyof typeof priorityOrder];
    })
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="material-card">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center">
            <Icons.task className="mr-2 h-5 w-5 text-gray-500" />
            Upcoming Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="flex-1 bg-gray-200 h-8 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="material-card">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center">
          <Icons.task className="mr-2 h-5 w-5 text-gray-500" />
          Upcoming Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming tasks</p>
          ) : (
            upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-3">
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={(checked) => 
                    handleTaskToggle(task.id, checked as boolean)
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{task.title}</p>
                  {task.dueDate && (
                    <p className="text-xs text-gray-500">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge 
                  className={priorityColors[task.priority as keyof typeof priorityColors]}
                >
                  {task.priority}
                </Badge>
              </div>
            ))
          )}
        </div>
        
        <Button
          variant="ghost"
          className="w-full mt-4 text-primary-500 hover:text-primary-600"
        >
          View all tasks
        </Button>
      </CardContent>
    </Card>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, RefreshCw } from 'lucide-react';

type ActivityItem = {
  id: string;
  type: 'command' | 'distribution' | 'verification';
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  details: Record<string, any>;
};

const AgentActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: 'cmd-123456',
        type: 'command',
        status: 'completed',
        timestamp: Date.now() - 3600000,
        details: {
          command: 'create',
          repo_url: 'github.com/near/near-sdk-rs',
          sender: 'user.near',
          result: {
            split_id: 'split-123456',
            contributors_count: 15,
          },
        },
      },
      {
        id: 'dist-789012',
        type: 'distribution',
        status: 'pending',
        timestamp: Date.now() - 1800000,
        details: {
          split_id: 'split-123456',
          repo_url: 'github.com/near/near-sdk-rs',
          amount: '100',
          token: 'NEAR',
          recipients_count: 15,
        },
      },
      {
        id: 'ver-345678',
        type: 'verification',
        status: 'completed',
        timestamp: Date.now() - 7200000,
        details: {
          github_username: 'johndoe',
          account_id: 'johndoe.near',
        },
      },
    ];

    setActivities(mockActivities);
  }, []);

  const refreshActivities = () => {
    setIsLoading(true);
    // In a real implementation, this would fetch data from an API
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActivityTitle = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'command':
        return `Command: ${activity.details.command}`;
      case 'distribution':
        return `Distribution: ${activity.details.amount} ${activity.details.token}`;
      case 'verification':
        return `Verification: ${activity.details.github_username}`;
      default:
        return 'Unknown Activity';
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'command':
        return activity.details.repo_url || 'N/A';
      case 'distribution':
        return activity.details.repo_url || 'N/A';
      case 'verification':
        return activity.details.account_id || 'N/A';
      default:
        return 'No details available';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agent Activity</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshActivities}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="distributions">Distributions</TabsTrigger>
            <TabsTrigger value="verifications">Verifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <ActivityTable
              activities={activities}
              getStatusBadge={getStatusBadge}
              formatTimestamp={formatTimestamp}
              getActivityTitle={getActivityTitle}
              getActivityDescription={getActivityDescription}
            />
          </TabsContent>
          
          <TabsContent value="commands">
            <ActivityTable
              activities={activities.filter(a => a.type === 'command')}
              getStatusBadge={getStatusBadge}
              formatTimestamp={formatTimestamp}
              getActivityTitle={getActivityTitle}
              getActivityDescription={getActivityDescription}
            />
          </TabsContent>
          
          <TabsContent value="distributions">
            <ActivityTable
              activities={activities.filter(a => a.type === 'distribution')}
              getStatusBadge={getStatusBadge}
              formatTimestamp={formatTimestamp}
              getActivityTitle={getActivityTitle}
              getActivityDescription={getActivityDescription}
            />
          </TabsContent>
          
          <TabsContent value="verifications">
            <ActivityTable
              activities={activities.filter(a => a.type === 'verification')}
              getStatusBadge={getStatusBadge}
              formatTimestamp={formatTimestamp}
              getActivityTitle={getActivityTitle}
              getActivityDescription={getActivityDescription}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

type ActivityTableProps = {
  activities: ActivityItem[];
  getStatusBadge: (status: string) => React.ReactNode;
  formatTimestamp: (timestamp: number) => string;
  getActivityTitle: (activity: ActivityItem) => string;
  getActivityDescription: (activity: ActivityItem) => string;
};

const ActivityTable: React.FC<ActivityTableProps> = ({
  activities,
  getStatusBadge,
  formatTimestamp,
  getActivityTitle,
  getActivityDescription,
}) => {
  if (activities.length === 0) {
    return <div className="py-4 text-center text-gray-500">No activities found</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity) => (
          <TableRow key={activity.id}>
            <TableCell className="font-mono text-xs">{activity.id}</TableCell>
            <TableCell>
              <Badge variant="outline">{activity.type}</Badge>
            </TableCell>
            <TableCell>
              <div className="font-medium">{getActivityTitle(activity)}</div>
              <div className="text-sm text-gray-500">{getActivityDescription(activity)}</div>
            </TableCell>
            <TableCell>{getStatusBadge(activity.status)}</TableCell>
            <TableCell>{formatTimestamp(activity.timestamp)}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AgentActivity;

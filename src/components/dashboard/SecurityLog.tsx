import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Shield, AlertCircle, CheckCircle } from "lucide-react";

const mockLogs = [
  {
    id: "log-001",
    type: "Verification",
    detail: "GitHub identity verified for johndoe",
    status: "success",
    timestamp: "2025-04-29 14:23",
  },
  {
    id: "log-002",
    type: "Attribution",
    detail: "Attribution record updated for repo near/near-sdk-rs",
    status: "success",
    timestamp: "2025-04-28 10:10",
  },
  {
    id: "log-003",
    type: "Security",
    detail: "Suspicious activity detected on repo near/near-api-js",
    status: "warning",
    timestamp: "2025-04-27 18:45",
  },
];

const SecurityLog: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Security Log & Attribution</h2>
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.type}</TableCell>
                  <TableCell>{log.detail}</TableCell>
                  <TableCell>
                    {log.status === "success" ? (
                      <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Success</span>
                    ) : (
                      <span className="flex items-center text-amber-600"><AlertCircle className="h-4 w-4 mr-1" /> Warning</span>
                    )}
                  </TableCell>
                  <TableCell>{log.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityLog;

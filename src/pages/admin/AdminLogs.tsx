import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScrollText, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
  admin_user_id: string | null;
}

const AdminLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const entityTypes = [...new Set(logs.map((l) => l.entity_type).filter(Boolean))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      entityFilter === "all" || log.entity_type === entityFilter;

    return matchesSearch && matchesFilter;
  });

  const getActionColor = (action: string) => {
    if (action.includes("Updated")) return "bg-blue-500/10 text-blue-500";
    if (action.includes("Created") || action.includes("Added"))
      return "bg-green-500/10 text-green-500";
    if (action.includes("Deleted") || action.includes("Removed"))
      return "bg-red-500/10 text-red-500";
    if (action.includes("Enabled")) return "bg-emerald-500/10 text-emerald-500";
    if (action.includes("Disabled")) return "bg-orange-500/10 text-orange-500";
    return "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Activity Logs
          </h1>
          <p className="text-muted-foreground">
            View admin activity and system events
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-10"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type!}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Recent Activity
              <Badge variant="outline" className="ml-2">
                {filteredLogs.length} entries
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ScrollText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between rounded-lg border border-border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={getActionColor(log.action)}
                        >
                          {log.action}
                        </Badge>
                        {log.entity_type && (
                          <Badge variant="outline">{log.entity_type}</Badge>
                        )}
                      </div>
                      {log.entity_id && (
                        <p className="font-mono text-xs text-muted-foreground">
                          ID: {log.entity_id}
                        </p>
                      )}
                      {log.details && (
                        <pre className="mt-2 rounded bg-muted p-2 text-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;

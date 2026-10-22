import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, User, Trash2 } from "lucide-react";

type UserProfile = {
  user_id: string;
  display_name: string | null;
  role: string | null;
};

const UserManagement = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name");

    if (!profiles) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);

    setUsers(
      profiles.map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        role: roleMap.get(p.user_id) ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) fetchUsers();
  }, [user, isAdmin]);

  const assignRole = async (userId: string, role: string) => {
    // Remove existing role first
    await supabase.from("user_roles").delete().eq("user_id", userId);

    if (role !== "none") {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: role as "admin" | "supervisor",
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "Role updated", description: `User role set to ${role}` });
    fetchUsers();
  };

  const removeRole = async (userId: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    toast({ title: "Role removed" });
    fetchUsers();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
      case "supervisor":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><Shield className="h-3 w-3 mr-1" />Supervisor</Badge>;
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />User</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">User Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Users & Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Assign Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      {u.display_name || "Unnamed"}
                      {u.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role ?? "none"}
                        onValueChange={(val) => assignRole(u.user_id, val)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="none">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.role && u.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRole(u.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            {getRoleBadge("admin")}
            <span className="text-muted-foreground">Full access — can view, edit, and delete all data across all users. Can manage user roles.</span>
          </div>
          <div className="flex items-start gap-3">
            {getRoleBadge("supervisor")}
            <span className="text-muted-foreground">Limited access — can view all users' products, sales, inventory, and predictions. Cannot edit or delete other users' data.</span>
          </div>
          <div className="flex items-start gap-3">
            {getRoleBadge(null)}
            <span className="text-muted-foreground">Basic access — can only view and manage their own data.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;

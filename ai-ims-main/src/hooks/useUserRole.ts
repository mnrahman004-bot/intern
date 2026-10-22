import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "supervisor" | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setRole((data?.role as AppRole) ?? null);
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const hasElevatedAccess = isAdmin || isSupervisor;

  return { role, loading, isAdmin, isSupervisor, hasElevatedAccess };
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalProducts: 0, lowStock: 0, todaySales: 0, todayRevenue: 0 });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [salesChart, setSalesChart] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [productsRes, salesRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("sales").select("*, products(name)").gte("sale_date", format(subDays(new Date(), 7), "yyyy-MM-dd")),
      ]);

      const products = productsRes.data || [];
      const sales = salesRes.data || [];
      const today = format(new Date(), "yyyy-MM-dd");
      const todaysSales = sales.filter((s) => s.sale_date.startsWith(today));
      const low = products.filter((p) => p.quantity <= p.low_stock_threshold);

      setStats({
        totalProducts: products.length,
        lowStock: low.length,
        todaySales: todaysSales.length,
        todayRevenue: todaysSales.reduce((sum, s) => sum + Number(s.total_price), 0),
      });
      setLowStockProducts(low.slice(0, 5));

      // Chart data for last 7 days
      const chartData = Array.from({ length: 7 }, (_, i) => {
        const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
        const daySales = sales.filter((s) => s.sale_date.startsWith(date));
        return {
          date: format(subDays(new Date(), 6 - i), "MMM dd"),
          sales: daySales.length,
          revenue: daySales.reduce((sum, s) => sum + Number(s.total_price), 0),
        };
      });
      setSalesChart(chartData);
    };
    fetchData();
  }, [user]);

  const statCards = [
    { title: "Total Products", value: stats.totalProducts, icon: Package, color: "text-primary" },
    { title: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
    { title: "Today's Sales", value: stats.todaySales, icon: ShoppingCart, color: "text-[hsl(var(--success))]" },
    { title: "Today's Revenue", value: `₹${stats.todayRevenue.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(243, 75%, 59%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge variant="destructive">{p.quantity} left</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

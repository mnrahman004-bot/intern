import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { format, startOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";

const Reports = () => {
  const { user } = useAuth();
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      const [dailyRes, monthlyRes] = await Promise.all([
        supabase.from("sales").select("*, products(name)").gte("sale_date", today).order("sale_date", { ascending: false }),
        supabase.from("sales").select("*, products(name)").gte("sale_date", monthStart).lte("sale_date", monthEnd + "T23:59:59").order("sale_date", { ascending: false }),
      ]);

      setDailySales(dailyRes.data || []);
      setMonthlySales(monthlyRes.data || []);

      // Product sales summary
      const allSales = monthlyRes.data || [];
      const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
      allSales.forEach((s: any) => {
        const key = s.product_id;
        const existing = productMap.get(key) || { name: s.products?.name || "Unknown", qty: 0, revenue: 0 };
        existing.qty += s.quantity;
        existing.revenue += Number(s.total_price);
        productMap.set(key, existing);
      });
      setProductSales(Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue));
    };
    fetchReports();
  }, [user]);

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).filter((k) => k !== "products");
    const csv = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SalesTable = ({ data }: { data: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((s) => (
          <TableRow key={s.id}>
            <TableCell>{format(new Date(s.sale_date), "MMM dd, HH:mm")}</TableCell>
            <TableCell className="font-medium">{s.products?.name}</TableCell>
            <TableCell>{s.quantity}</TableCell>
            <TableCell>₹{Number(s.total_price).toFixed(2)}</TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Reports</h1>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="products">By Product</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today's Sales</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportCSV(dailySales, "daily-report")}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto"><SalesTable data={dailySales} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>This Month's Sales</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportCSV(monthlySales, "monthly-report")}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto"><SalesTable data={monthlySales} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Product Sales Summary</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportCSV(productSales, "product-report")}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.qty}</TableCell>
                      <TableCell>₹{p.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {productSales.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;

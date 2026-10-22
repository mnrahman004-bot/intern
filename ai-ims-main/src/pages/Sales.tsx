import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { saleSchema } from "@/utils/validation";
import { getZodErrors, FieldErrors } from "@/utils/errorHandler";
import FormError from "@/components/FormError";

const Sales = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({ product_id: "", quantity: "1" });

  const fetchSales = async () => {
    const { data } = await supabase.from("sales").select("*, products(name)").order("sale_date", { ascending: false });
    setSales(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, price, quantity");
    setProducts(data || []);
  };

  useEffect(() => {
    if (user) { fetchSales(); fetchProducts(); }
  }, [user]);

  const handleSale = async () => {
    if (!user) return;
    setErrors({});

    try {
      const validated = saleSchema.parse(form);
      const product = products.find((p) => p.id === validated.product_id);
      if (!product) { setErrors({ product_id: "Product not found" }); return; }

      if (validated.quantity > product.quantity) {
        setErrors({ quantity: `Not enough stock. Only ${product.quantity} available` });
        return;
      }

      setSaving(true);
      const totalPrice = validated.quantity * Number(product.price);

      const { error: saleError } = await supabase.from("sales").insert({
        user_id: user.id,
        product_id: validated.product_id,
        quantity: validated.quantity,
        unit_price: Number(product.price),
        total_price: totalPrice,
      });

      if (saleError) { toast({ title: "Error", description: saleError.message, variant: "destructive" }); return; }

      await supabase.from("products").update({ quantity: product.quantity - validated.quantity }).eq("id", product.id);

      await supabase.from("inventory_logs").insert({
        user_id: user.id,
        product_id: product.id,
        change_type: "sale",
        quantity_change: -validated.quantity,
        previous_quantity: product.quantity,
        new_quantity: product.quantity - validated.quantity,
        notes: `Sale of ${validated.quantity} units`,
      });

      toast({ title: "Sale recorded!" });
      setOpen(false);
      setForm({ product_id: "", quantity: "1" });
      setErrors({});
      fetchSales();
      fetchProducts();
    } catch (err: any) {
      if (err.issues) setErrors(getZodErrors(err));
      else toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateInvoice = (sale: any) => {
    const invoiceText = `
INVOICE
====================
Date: ${format(new Date(sale.sale_date), "PPP")}
Product: ${sale.products?.name}
Quantity: ${sale.quantity}
Unit Price: ₹${Number(sale.unit_price).toFixed(2)}
Total: ₹${Number(sale.total_price).toFixed(2)}
====================
    `.trim();

    const blob = new Blob([invoiceText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${sale.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Sales</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setErrors({}); setForm({ product_id: "", quantity: "1" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Record Sale</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record New Sale</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger className={errors.product_id ? "border-destructive" : ""}><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (Stock: {p.quantity}, ₹{Number(p.price).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormError message={errors.product_id} />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={errors.quantity ? "border-destructive" : ""} />
                <FormError message={errors.quantity} />
              </div>
              {form.product_id && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <strong>Total:</strong> ₹{(parseInt(form.quantity || "0") * Number(products.find((p) => p.id === form.product_id)?.price || 0)).toFixed(2)}
                </div>
              )}
              <Button onClick={handleSale} className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Sale
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{format(new Date(s.sale_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="font-medium">{s.products?.name}</TableCell>
                  <TableCell>{s.quantity}</TableCell>
                  <TableCell>₹{Number(s.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">₹{Number(s.total_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => generateInvoice(s)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No sales recorded yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;

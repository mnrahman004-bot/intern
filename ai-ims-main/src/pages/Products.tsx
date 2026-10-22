import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { productSchema } from "@/utils/validation";
import { getZodErrors, FieldErrors } from "@/utils/errorHandler";
import FormError from "@/components/FormError";
import { sanitize } from "@/utils/validation";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  low_stock_threshold: number;
  supplier_id: string | null;
  suppliers?: { name: string } | null;
};

const Products = () => {
  const { user } = useAuth();
  const { isSupervisor } = useUserRole();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", category: "General", price: "0", quantity: "0", low_stock_threshold: "10", supplier_id: "" });

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*, suppliers(name)");
    setProducts((data as any) || []);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name");
    setSuppliers(data || []);
  };

  useEffect(() => {
    if (user) { fetchProducts(); fetchSuppliers(); }
  }, [user]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleSave = async () => {
    if (!user) return;
    setErrors({});

    try {
      const validated = productSchema.parse({
        name: form.name,
        category: form.category,
        price: form.price,
        quantity: form.quantity,
        low_stock_threshold: form.low_stock_threshold,
        supplier_id: form.supplier_id || undefined,
      });

      // Check for duplicate product name
      if (!editing) {
        const existing = products.find(
          (p) => p.name.toLowerCase() === sanitize(validated.name).toLowerCase()
        );
        if (existing) {
          setErrors({ name: "A product with this name already exists" });
          return;
        }
      }

      setSaving(true);
      const payload = {
        name: sanitize(validated.name),
        category: sanitize(validated.category),
        price: validated.price,
        quantity: validated.quantity,
        low_stock_threshold: validated.low_stock_threshold,
        supplier_id: validated.supplier_id || null,
        user_id: user.id,
      };

      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Product updated" });
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Product added" });
      }

      setOpen(false);
      setEditing(null);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      if (err.issues) setErrors(getZodErrors(err));
      else toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => setForm({ name: "", category: "General", price: "0", quantity: "0", low_stock_threshold: "10", supplier_id: "" });

  const handleEdit = (p: Product) => {
    setEditing(p);
    setErrors({});
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      quantity: String(p.quantity),
      low_stock_threshold: String(p.low_stock_threshold),
      supplier_id: p.supplier_id || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Product deleted" });
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[200px]"
            />
          </div>
          {!isSupervisor && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); resetForm(); setErrors({}); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={errors.name ? "border-destructive" : ""} />
                    <FormError message={errors.name} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={errors.category ? "border-destructive" : ""} />
                    <FormError message={errors.category} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Price (₹)</Label>
                      <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={errors.price ? "border-destructive" : ""} />
                      <FormError message={errors.price} />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={errors.quantity ? "border-destructive" : ""} />
                      <FormError message={errors.quantity} />
                    </div>
                  </div>
                  <div>
                    <Label>Low Stock Threshold</Label>
                    <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} className={errors.low_stock_threshold ? "border-destructive" : ""} />
                    <FormError message={errors.low_stock_threshold} />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} className="w-full" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editing ? "Update" : "Add"} Product
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                  <TableCell>₹{Number(p.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={p.quantity <= p.low_stock_threshold ? "destructive" : "secondary"}>
                      {p.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.suppliers?.name || "—"}</TableCell>
                  <TableCell className="text-right">
                    {!isSupervisor && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {search ? "No products match your search" : "No products yet. Add your first product!"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;

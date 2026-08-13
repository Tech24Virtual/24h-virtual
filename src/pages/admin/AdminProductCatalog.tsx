import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_price: number;
  billing_type: string;
  unit: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  billing_type: string;
  default_price: string;
  unit: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  billing_type: "one_time",
  default_price: "",
  unit: "",
  is_active: true,
};

const productToForm = (p: Product): FormState => ({
  name: p.name,
  slug: p.slug,
  description: p.description ?? "",
  billing_type: p.billing_type,
  default_price: String(p.default_price),
  unit: p.unit ?? "",
  is_active: p.is_active,
});

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const billingTypeLabels: Record<string, string> = {
  one_time: "One Time",
  recurring: "Recurring",
  usage_based: "Usage Based",
};

const billingTypeBadgeClass: Record<string, string> = {
  usage_based: "bg-blue-100 text-blue-800",
  recurring: "bg-green-100 text-green-800",
  one_time: "bg-orange-100 text-orange-800",
};

const formatCost = (p: Pick<Product, "default_price" | "billing_type" | "unit">) => {
  const price = Number(p.default_price).toFixed(2);
  if (p.billing_type === "usage_based") return `$${price}/${p.unit || "min"}`;
  if (p.billing_type === "recurring") return `$${price}/mo`;
  return `$${price} one-time`;
};

export default function AdminProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("addon_products").select("*").order("name");
      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error("Error fetching product catalog:", error);
      toast.error("Failed to load product catalog");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSlugTouched(false);
  };

  const handleNameChange = (value: string) => {
    setForm((p) => ({
      ...p,
      name: value,
      slug: slugTouched ? p.slug : slugify(value),
    }));
  };

  const buildPayload = () => ({
    name: form.name,
    slug: form.slug,
    description: form.description || null,
    billing_type: form.billing_type,
    default_price: Number(form.default_price) || 0,
    unit: form.unit || null,
    is_active: form.is_active,
  });

  const handleCreate = async () => {
    if (!form.name || !form.slug || form.default_price === "") return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("addon_products").insert(buildPayload());
      if (error) throw error;
      toast.success("Product created");
      setIsCreateOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct || !form.name || !form.slug || form.default_price === "") return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("addon_products").update(buildPayload()).eq("id", editingProduct.id);
      if (error) throw error;
      toast.success("Product updated");
      closeEdit();
      fetchProducts();
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("addon_products").delete().eq("id", product.id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product deleted");
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product", { description: error.message });
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase.from("addon_products").update({ is_active: !product.is_active }).eq("id", product.id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p)));
    } catch (error: any) {
      console.error("Error toggling product status:", error);
      toast.error("Failed to update product status", { description: error.message });
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm(productToForm(product));
    setSlugTouched(true);
  };

  const closeEdit = () => {
    setEditingProduct(null);
    resetForm();
  };

  const renderFormFields = () => (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Slug *</Label>
        <Input
          value={form.slug}
          onChange={(e) => { setSlugTouched(true); setForm((p) => ({ ...p, slug: slugify(e.target.value) })); }}
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Billing Type</Label>
        <Select value={form.billing_type} onValueChange={(v) => setForm((p) => ({ ...p, billing_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">One Time</SelectItem>
            <SelectItem value="recurring">Recurring</SelectItem>
            <SelectItem value="usage_based">Usage Based</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Wholesale Cost ($) *</Label>
          <Input type="number" step="0.01" value={form.default_price}
            onChange={(e) => setForm((p) => ({ ...p, default_price: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Input placeholder="e.g. min, number" value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground mt-1">Manage add-on products and services available to WL partners.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Product</DialogTitle></DialogHeader>
            {renderFormFields()}
            <Button onClick={handleCreate} disabled={isSaving} className="w-full mt-2">
              {isSaving ? "Creating..." : "Create Product"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No products yet</p>
              <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Your First Product</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Wholesale Cost</TableHead>
                    <TableHead>Billing Type</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell><code className="text-xs text-muted-foreground">{product.slug}</code></TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground">{product.description || "—"}</TableCell>
                      <TableCell>{formatCost(product)}</TableCell>
                      <TableCell>
                        <Badge className={billingTypeBadgeClass[product.billing_type] ?? "bg-muted text-muted-foreground"}>
                          {billingTypeLabels[product.billing_type] ?? product.billing_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={product.is_active} onCheckedChange={() => toggleActive(product)} />
                          <span className="text-sm text-muted-foreground">{product.is_active ? "Active" : "Inactive"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(product)}>
                              <Pencil className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(product)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          {renderFormFields()}
          <Button onClick={handleUpdate} disabled={isSaving} className="w-full mt-2">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

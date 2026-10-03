"use client";

import { useEffect, useState } from "react";
import { Plus, Search, ImageIcon, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Product, money } from "@/lib/catalog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";

function ProductEditor({ initial, onSaved, onCancel, onBusy }: { initial: Product; onSaved: (p: Product) => void; onCancel: () => void; onBusy: (busy: boolean) => void }) {
  const [product, setProduct] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function field<K extends keyof Product>(key: K, value: Product[K]) { setProduct(p => ({ ...p, [key]: value })); }
  function working(value: boolean) { setBusy(value); onBusy(value); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); working(true); setMessage("");
    try {
      const response = await fetch("/api/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) });
      const data = await response.json() as Product & { error?: string };
      if (!response.ok) throw Error(data.error || "Không lưu được sản phẩm.");
      onSaved(data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu. Thử lại nhé."); }
    finally { working(false); }
  }
  async function upload(file: File) {
    working(true); setMessage("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json() as { url: string; error?: string };
      if (!response.ok) throw Error(data.error || "Không tải được ảnh.");
      field("image", data.url); setMessage("Ảnh đã tải lên. Lưu sản phẩm để áp dụng.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải ảnh. Thử lại nhé."); }
    finally { working(false); }
  }
  return <form className="product-editor" onSubmit={save}>
    <fieldset disabled={busy}><legend>Thông tin sản phẩm</legend>
      <label>Mã sản phẩm<input maxLength={40} value={product.sku} placeholder="Để trống để tự cấp mã" onChange={e => field("sku", e.target.value.toUpperCase())} /><span className="field-help">Mã duy nhất để tìm lại xe. Khi mã đã có, chỉnh sửa sản phẩm cũ.</span></label>
      <label>Tên xe<input required maxLength={180} value={product.name} placeholder="Ví dụ: Porsche 918 Spyder" onChange={e => field("name", e.target.value)} /></label>
      <label>Thương hiệu<Select disabled={busy} value={product.brand} onValueChange={v => field("brand", v)}><SelectTrigger aria-label="Thương hiệu sản phẩm"><SelectValue /></SelectTrigger><SelectContent>{["Hot Wheels", "Matchbox", "Khác"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></label>
      <label>Mô tả<textarea maxLength={2000} value={product.description} placeholder="Màu xe, phiên bản, tình trạng card…" onChange={e => field("description", e.target.value)} /></label>
    </fieldset>
    <fieldset disabled={busy}><legend>Giá & tồn kho</legend><div className="admin-row"><label>Giá bán (VNĐ)<input type="number" min="0" max="100000000" step="1" placeholder="Chưa báo giá" value={product.price ?? ""} onChange={e => field("price", e.target.value === "" ? null : Number(e.target.value))} /></label><label>Số lượng tồn<input type="number" min="0" max="100000" step="1" placeholder="Chưa xác nhận" value={product.stock ?? ""} onChange={e => field("stock", e.target.value === "" ? null : Number(e.target.value))} /></label></div><p className="field-help">Để trống khi chưa xác nhận. Nhập tồn kho bằng 0 để báo hết hàng.</p></fieldset>
    <fieldset disabled={busy}><legend>Ảnh sản phẩm</legend>{product.image && <div className="editor-photo"><img src={product.image} alt={product.name} /><button type="button" onClick={() => field("image", "")}>Bỏ ảnh này</button></div>}<label className="upload-label">Chọn ảnh từ máy<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} /><span>JPG, PNG hoặc WebP · tối đa 5 MB</span></label></fieldset>
    <label className="visibility-label"><Checkbox disabled={busy} checked={product.visible} onCheckedChange={v => field("visible", v === true)} /><span>Hiển thị trên cửa hàng<small>Bỏ chọn để ẩn sản phẩm khỏi danh mục.</small></span></label>
    {message && <p className="editor-message" role="status">{message}</p>}
    <div className="editor-actions"><button type="button" className="button-secondary" disabled={busy} onClick={onCancel}>Hủy</button><button className="button-primary" disabled={busy}>{busy ? "Đang xử lý…" : "Lưu sản phẩm"}</button></div>
  </form>;
}

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  async function logout() {
    try {const response=await fetch("/api/admin/logout",{method:"POST"});if(!response.ok)throw Error();window.location.assign("/signout-with-chatgpt?return_to=/");}
    catch {toast.error("Chưa thể đăng xuất. Vui lòng thử lại.");}
  }
  async function load() {
    setLoading(true); setStatus("");
    try {
      const response = await fetch("/api/products?admin=1", { cache: "no-store" });
      const data = await response.json() as Product[] & { error?: string };
      if (!response.ok) throw Error(data.error || "Không tải được danh mục.");
      setProducts(data);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const filtered = products.filter(p => `${p.sku} ${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase().trim()));
  function saved(product: Product) {
    setProducts(current => current.some(p => p.id === product.id) ? current.map(p => p.id === product.id ? product : p) : [product, ...current]);
    setEditing(null); toast.success("Đã lưu sản phẩm.");
  }
  return <main className="wrap admin"><Toaster theme="light" position="bottom-center" />
    <header className="admin-top"><a className="wordmark" href="/">HUPPO<span>HOBBY</span></a><nav><a href="/">Xem cửa hàng <ArrowUpRight size={15} /></a><button onClick={()=>void logout()}>Đăng xuất</button></nav></header>
    <div className="admin-heading"><div><p className="section-label">QUẢN LÝ CỬA HÀNG</p><h1>Sản phẩm</h1><p>Quản lý ảnh, giá bán và số lượng trong bộ sưu tập.</p></div><button className="button-primary" disabled={loading || !!status} onClick={() => setEditing({ id: crypto.randomUUID(), sku: "", name: "", brand: "Hot Wheels", description: "", image: "", price: null, stock: null, visible: false })}><Plus size={17} />Thêm sản phẩm</button></div>
    <div className="admin-toolbar"><label className="admin-search"><Search size={18} /><input type="search" aria-label="Tìm sản phẩm trong CMS" placeholder="Tìm mã sản phẩm, tên xe…" value={query} onChange={e => setQuery(e.target.value)} /></label><span>{filtered.length} sản phẩm</span></div>
    {status && <div className="notice" role="status">{status}<button onClick={() => void load()}>Thử lại</button></div>}
    {loading ? <p className="admin-loading" role="status">Đang tải sản phẩm…</p> : <div className="admin-table-wrap"><Table className="admin-table"><TableHeader><TableRow><TableHead>Sản phẩm</TableHead><TableHead>Giá bán</TableHead><TableHead>Tồn kho</TableHead><TableHead>Hiển thị</TableHead><TableHead><span className="sr-only">Thao tác</span></TableHead></TableRow></TableHeader><TableBody>{filtered.map(p => <TableRow key={p.id}><TableCell><div className="admin-product-cell"><div className="admin-thumbnail">{p.image ? <img src={p.image} alt="" /> : <ImageIcon size={21} strokeWidth={1.2} />}</div><div><button onClick={() => setEditing(p)}>{p.name}</button><span>{p.sku} · {p.brand}</span></div></div></TableCell><TableCell>{p.price === null ? <span className="muted">Chưa báo giá</span> : money(p.price)}</TableCell><TableCell>{p.stock === null ? <span className="muted">Chưa xác nhận</span> : p.stock}</TableCell><TableCell><span className={`visibility-status ${p.visible ? "is-visible" : ""}`}>{p.visible ? "Đang bán" : "Đã ẩn"}</span></TableCell><TableCell><button className="edit-button" onClick={() => setEditing(p)}>Chỉnh sửa</button></TableCell></TableRow>)}</TableBody></Table></div>}
    {!loading && <div className="admin-mobile-list">{filtered.map(p => <article key={p.id}><div className="admin-mobile-heading"><div><span>{p.sku} · {p.brand}</span><h2>{p.name}</h2></div><span className={`visibility-status ${p.visible ? "is-visible" : ""}`}>{p.visible ? "Đang bán" : "Đã ẩn"}</span></div><dl><div><dt>Giá bán</dt><dd>{p.price === null ? "Chưa báo giá" : money(p.price)}</dd></div><div><dt>Tồn kho</dt><dd>{p.stock === null ? "Chưa xác nhận" : p.stock}</dd></div></dl><button className="button-secondary" onClick={() => setEditing(p)}>Chỉnh sửa sản phẩm</button></article>)}</div>}
    {!loading && !status && !filtered.length && <div className="admin-empty">{query ? "Không có sản phẩm phù hợp với từ khóa." : "Chưa có sản phẩm. Bấm Thêm sản phẩm để bắt đầu."}</div>}
    <p className="admin-footnote">Đăng nhập: taanhluan@gmail.com · Tồn kho được shop cập nhật khi chốt đơn.</p>
    <Sheet open={!!editing} onOpenChange={open => { if (!open && !editorBusy) setEditing(null); }}><SheetContent className="shop-panel admin-editor-panel"><SheetHeader><SheetTitle>{editing && products.some(p => p.id === editing.id) ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}</SheetTitle><SheetDescription>Cập nhật thông tin rồi bấm Lưu sản phẩm.</SheetDescription></SheetHeader>{editing && <ProductEditor key={editing.id} initial={editing} onSaved={saved} onBusy={setEditorBusy} onCancel={() => setEditing(null)} />}</SheetContent></Sheet>
  </main>;
}

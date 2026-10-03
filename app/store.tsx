"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowLeft, Search, ShoppingBag, X, Plus, Minus, Menu, ImageIcon, MessageCircle, Package, Check } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Pagination, PaginationContent, PaginationItem, PaginationEllipsis } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Product, examples, money } from "@/lib/catalog";
import { queryCatalog } from "@/lib/catalog-query";
import { productDisplayImages } from "@/lib/product-display-images";

const zalo = "https://zalo.me/0939451139";
const brands = ["Hot Wheels", "Matchbox", "Khác"];
const availabilityOptions = [["all", "Tất cả tình trạng"], ["available", "Còn hàng"], ["sold-out", "Hết hàng"], ["unconfirmed", "Chờ xác nhận"]];

function ProductImage({ product, className = "", displayImage = false }: { product: Product; className?: string; displayImage?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  useEffect(() => { setFailed(false); setUseOriginal(false); }, [product.image, displayImage]);
  const imageSrc = displayImage && !useOriginal ? productDisplayImages[product.image] ?? product.image : product.image;
  return <div className={`product-image ${className}`}>
    {imageSrc && !failed ? <img src={imageSrc} alt={product.name} loading="lazy" onError={() => {
      if (imageSrc !== product.image) setUseOriginal(true);
      else setFailed(true);
    }} /> :
      <div className="photo-pending"><ImageIcon size={25} strokeWidth={1.2} /><span>Ảnh đang cập nhật</span></div>}
  </div>;
}

function Choice({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[][] }) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent className="store-select">{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent>
  </Select>;
}

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQueryState] = useState("");
  const [brand, setBrandState] = useState("all");
  const [availability, setAvailabilityState] = useState("all");
  const [sort, setSortState] = useState("default");
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const [copyState, setCopyState] = useState("");

  function setQuery(value: string) { setQueryState(value); setPagination({ key: "", page: 1 }); }
  function setBrand(value: string) { setBrandState(value); setPagination({ key: "", page: 1 }); }
  function setAvailability(value: string) { setAvailabilityState(value); setPagination({ key: "", page: 1 }); }
  function setSort(value: string) { setSortState(value); setPagination({ key: "", page: 1 }); }

  async function loadProducts() {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog unavailable");
      setProducts(await response.json() as Product[]);
    } catch {
      setProducts([...examples].reverse());
      setLoadError(true);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("huppo-cart") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        setCart(Object.fromEntries(Object.entries(saved).filter(([, n]) => typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 99)) as Record<string, number>);
      }
    } catch { /* Ignore invalid saved cart. */ }
    setReady(true);
    void loadProducts();
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem("huppo-cart", JSON.stringify(cart)); } catch { /* The cart remains usable without storage. */ } }
  }, [cart, ready]);

  function change(product: Product, delta: number) {
    setCart(current => {
      const next = { ...current };
      const quantity = Math.max(0, Math.min(product.stock ?? 99, 99, (current[product.id] || 0) + delta));
      if (quantity) next[product.id] = quantity;
      else delete next[product.id];
      return next;
    });
    setCopyState("");
  }
  function add(product: Product) {
    if (product.stock === 0 || (cart[product.id] || 0) >= Math.min(product.stock ?? 99, 99)) return;
    change(product, 1);
    toast.success(`Đã thêm ${product.name}`, { action: { label: "Xem giỏ", onClick: () => { setSelected(null); setCartOpen(true); } } });
  }
  function remove(id: string) {
    setCart(current => { const next = { ...current }; delete next[id]; return next; });
    setCopyState("");
  }
  const atLimit = (p: Product) => p.stock === 0 || (cart[p.id] || 0) >= Math.min(p.stock ?? 99, 99);
  const filtered = queryCatalog(products, { query, brand, availability, sort });
  const paginationKey = JSON.stringify([query, brand, availability, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const page = Math.min(pagination.key === paginationKey ? pagination.page : 1, pageCount);
  const productPages = Array.from({ length: Math.ceil(filtered.length / 8) }, (_, i) => filtered.slice(i * 8, (i + 1) * 8));
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1)
    .filter(n => n === 1 || n === pageCount || Math.abs(n - page) <= 1);
  function changePage(next: number) {
    const target = Math.max(1, Math.min(pageCount, next));
    carouselApi?.scrollTo(target - 1, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  useEffect(() => {
    if (!carouselApi) return;
    const syncPage = () => setPagination({ key: paginationKey, page: carouselApi.selectedScrollSnap() + 1 });
    carouselApi.on("select", syncPage);
    carouselApi.on("reInit", syncPage);
    syncPage();
    return () => { carouselApi.off("select", syncPage); carouselApi.off("reInit", syncPage); };
  }, [carouselApi, paginationKey]);
  const lines = products.filter(p => cart[p.id]);
  const count = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const total = lines.reduce((sum, p) => sum + (p.price ?? 0) * cart[p.id], 0);
  const unknown = lines.some(p => p.price === null);
  const missing = Object.keys(cart).some(id => !products.some(p => p.id === id));
  const excessive = lines.some(p => p.stock !== null && cart[p.id] > p.stock);
  const order = "HUPPO HOBBY — Yêu cầu đặt hàng\n" + lines.map(p => `${p.sku} · ${p.name} (${p.brand}) × ${cart[p.id]} — ${p.price === null ? "Xin báo giá" : money(p.price * cart[p.id])}`).join("\n") + `\n${unknown ? "Tạm tính phần đã có giá" : "Tạm tính"}: ${money(total)}\nNhờ shop xác nhận giá, tồn kho và phí giao hàng.`;
  const filterCount = Number(brand !== "all") + Number(availability !== "all");
  function resetFilters() { setQuery(""); setBrand("all"); setAvailability("all"); }
  function navigateBrand(value: string) { setBrand(value); setMenuOpen(false); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }

  useEffect(() => {
    const context = (document as unknown as { modelContext?: { registerTool: (tool: unknown, options: unknown) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(context.registerTool({
        name: "stage_huppo_cart", description: "Chọn xe và số lượng trong giỏ. Không gửi đơn hoặc thanh toán.",
        inputSchema: { type: "object", properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1, maximum: 99 } }, required: ["productId", "quantity"], additionalProperties: false },
        annotations: { readOnlyHint: false },
        async execute(input: unknown) {
          const value = input as { productId: string; quantity: number };
          const product = products.find(p => p.id === value?.productId);
          if (!product || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 99 || (product.stock !== null && value.quantity > product.stock)) throw Error("Sản phẩm hoặc số lượng không hợp lệ");
          setCart(current => ({ ...current, [product.id]: value.quantity }));
          setSelected(null); setCartOpen(true); setCopyState("");
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return { productId: product.id, quantity: value.quantity, status: "staged" };
        },
      }, { signal: lifecycle.signal })).catch(console.error);
    } catch (error) { console.error(error); }
    return () => lifecycle.abort();
  }, [products]);

  const productGrid = <>
    <div className="catalog-controls liquid-glass">
      <label className="catalog-search"><span>Tìm xe</span><div><Search size={18} /><input type="search" placeholder="Tên xe, mã sản phẩm hoặc thương hiệu" aria-label="Tìm kiếm sản phẩm" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}><X size={17} /></button>}</div></label>
      <label className="catalog-choice"><span>Thương hiệu</span><Choice label="Lọc thương hiệu" value={brand} onChange={setBrand} options={[["all", "Tất cả"], ...brands.map(b => [b, b])]} /></label>
      <label className="catalog-choice"><span>Tình trạng</span><Choice label="Lọc tình trạng" value={availability} onChange={setAvailability} options={availabilityOptions} /></label>
      <label className="catalog-choice"><span>Sắp xếp</span><Choice label="Sắp xếp sản phẩm" value={sort} onChange={setSort} options={[["default", "Cập nhật mới nhất"], ["price-asc", "Giá tăng dần"], ["price-desc", "Giá giảm dần"], ["name", "Tên A–Z"]]} /></label>
    </div>
    <div className="catalog-result-count" role="status">{loading ? "Đang tải bộ sưu tập…" : <><span><strong>{filtered.length}</strong> sản phẩm{filterCount || query ? " phù hợp" : " trong bộ sưu tập"}</span></>}{(filterCount > 0 || query) && <button onClick={resetFilters}>Bỏ bộ lọc</button>}</div>
    {(query || filterCount > 0) && <div className="active-filters">
      {query && <button onClick={() => setQuery("")}>{query} <X size={14} /></button>}
      {brand !== "all" && <button onClick={() => setBrand("all")}>{brand} <X size={14} /></button>}
      {availability !== "all" && <button onClick={() => setAvailability("all")}>{availabilityOptions.find(([id]) => id === availability)?.[1]} <X size={14} /></button>}
      <button className="clear-all" onClick={resetFilters}>Xóa bộ lọc</button>
    </div>}
    {loadError && <div className="catalog-warning" role="status">Chưa tải được dữ liệu mới. Đang hiển thị mẫu tham khảo. <button onClick={() => void loadProducts()}>Thử lại</button></div>}
    {loading ? <div className="product-grid">{Array.from({ length: 4 }, (_, i) => <div className="product-skeleton" key={i}><Skeleton className="aspect-square w-full" /><Skeleton className="mt-5 h-3 w-20" /><Skeleton className="mt-3 h-5 w-3/4" /><Skeleton className="mt-5 h-5 w-1/2" /></div>)}</div> : filtered.length > 0 &&
      <Carousel key={paginationKey} setApi={setCarouselApi} className="catalog-carousel" opts={{ align: "start", loop: false, duration: 25, watchFocus: false }} aria-label="Sản phẩm, vuốt ngang để chuyển nhóm" tabIndex={0}>
        <CarouselContent className="catalog-carousel-track">{productPages.map((group, index) =>
          <CarouselItem key={index} className="catalog-carousel-page" aria-label={`Nhóm ${index + 1} trên ${pageCount}`} aria-hidden={index !== page - 1} inert={index !== page - 1}>
            <div className="product-grid">{group.map(p =>
        <article className="product-card liquid-glass" key={p.id}>
          <button className="product-photo-button" aria-label={`Xem ${p.name}`} onClick={() => setSelected(p)}>
            <ProductImage product={p} className="product-image-silver" displayImage />
            {p.stock === 0 && <span className="stock-badge">Hết hàng</span>}
          </button>
          <div className="product-brand">{p.brand}</div>
          <h2 className="product-name"><button onClick={() => setSelected(p)}>{p.name}</button></h2>
          <div className="product-meta">{p.stock === null ? "Chờ xác nhận tồn kho" : p.stock === 0 ? "Tạm hết hàng" : `Còn ${p.stock} sản phẩm`}</div>
          <div className="product-purchase"><strong>{p.price === null ? "Liên hệ báo giá" : money(p.price)}</strong><button className="add-to-cart" disabled={atLimit(p)} aria-label={`Thêm ${p.name} vào giỏ`} onClick={() => add(p)}><ShoppingBag size={16} /><span>{p.stock === 0 ? "Hết hàng" : atLimit(p) ? "Đã đủ số lượng" : "Thêm vào giỏ"}</span></button></div>
        </article>)}</div>
          </CarouselItem>
        )}</CarouselContent>
      </Carousel>}
    {!loading && filtered.length > 0 && <div className="catalog-pagination-wrap">
      <p role="status">Hiển thị {(page - 1) * 8 + 1}–{Math.min(page * 8, filtered.length)} / {filtered.length} sản phẩm</p>
      {pageCount > 1 && <Pagination className="catalog-pagination" aria-label="Phân trang sản phẩm"><PaginationContent>
        <PaginationItem><button type="button" className="page-button" disabled={page === 1} aria-label="Trang trước" onClick={() => changePage(page - 1)}>Trước</button></PaginationItem>
        {pageNumbers.map((n, i) => <PaginationItem key={n} className={`page-number-group ${Math.abs(n - page) > 1 ? "boundary-page" : ""}`}>{i > 0 && n - pageNumbers[i - 1] > 1 && <PaginationEllipsis />}<button type="button" className="page-button" aria-label={`Trang ${n}`} aria-current={page === n ? "page" : undefined} onClick={() => changePage(n)}>{n}</button></PaginationItem>)}
        <PaginationItem><button type="button" className="page-button" disabled={page === pageCount} aria-label="Trang sau" onClick={() => changePage(page + 1)}>Sau</button></PaginationItem>
      </PaginationContent></Pagination>}
    </div>}
    {!loading && !filtered.length && <div className="catalog-empty"><Search size={30} strokeWidth={1.3} /><h2>{products.length ? "Chưa tìm thấy chiếc xe phù hợp" : "Bộ sưu tập đang được cập nhật"}</h2><p>{products.length ? "Thử tên xe khác hoặc bỏ bớt bộ lọc." : "Nhắn HUPPO để hỏi các mẫu xe đang có."}</p>{products.length ? <button className="button-primary" onClick={resetFilters}>Xóa bộ lọc</button> : <a className="button-primary" href={zalo} target="_blank" rel="noreferrer">Liên hệ Zalo</a>}</div>}
  </>;

  return <div className="storefront">
    <div className="storefront-background" aria-hidden="true"><img src="/garage-background.jpg" alt="" fetchPriority="high" width={1672} height={941} /></div>
    <Toaster theme="light" position="bottom-center" closeButton />
    <div className="shop-topbar"><div className="wrap"><span>Xe mô hình · Hot Wheels & Matchbox</span><a href={zalo} target="_blank" rel="noreferrer">Zalo · 0939 451 139</a></div></div>
    <header className="shop-header liquid-glass"><div className="wrap header-inner">
      <a className="brand-lockup" href="/" aria-label="HUPPO HOBBY — Trang chủ"><img src="/huppo-emblem.png" alt="" width={60} height={60} /><span>HUPPO<small>HOBBY</small></span></a>
      <nav className="desktop-nav" aria-label="Điều hướng chính"><a href="#collection">Bộ sưu tập</a><a href="#how">Đặt hàng</a></nav>
      <button className="mobile-menu" aria-label="Mở danh mục" onClick={() => setMenuOpen(true)}><Menu size={20} /><span>Danh mục</span></button>
      <button className="header-cart" onClick={() => { setCopyState(""); setCartOpen(true); }} aria-label={`Mở giỏ hàng, ${count} sản phẩm`}><ShoppingBag size={18} /><span>Giỏ hàng</span><b className="cart-count">{count}</b></button>
    </div></header>
    <main>
      <section id="collection" className="catalog-section wrap">
        <div className="catalog-intro"><div className="catalog-heading"><p className="section-label">HUPPO HOBBY · BỘ SƯU TẬP</p><h1>Những chiếc xe đáng giữ.</h1><p>Tìm một mẫu xe bạn thích, thêm vào giỏ và chốt đơn cùng HUPPO.</p></div><div className="brand-showcase"><img src="/huppo-emblem.png" alt="Logo hà mã HUPPO HOBBY màu bạc nổi 3D" width={280} height={280} fetchPriority="high" /></div></div>
        {productGrid}
      </section>
      <section className="collection-closing wrap" aria-label="Tư vấn và cách đặt hàng"><div className="garage-story"><p className="section-label">DÀNH CHO NGƯỜI YÊU XE MÔ HÌNH</p><h2>Mỗi chiếc xe,<br />một câu chuyện.</h2><a href={zalo} target="_blank" rel="noreferrer">Tìm xe cùng HUPPO <ArrowUpRight size={17} /></a></div>
      <div id="how" className="shopping-guide liquid-glass"><div className="guide-intro"><p className="section-label">ĐẶT HÀNG CÙNG HUPPO</p><h2>Từ giỏ xe đến bộ sưu tập.</h2></div><ol><li><ShoppingBag size={25} strokeWidth={1.3} /><div><strong>01. Chọn xe</strong><p>Thêm mẫu xe và số lượng vào giỏ.</p></div></li><li><MessageCircle size={25} strokeWidth={1.3} /><div><strong>02. Gửi đơn qua Zalo</strong><p>Sao chép danh sách, gửi shop xác nhận.</p></div></li><li><Package size={25} strokeWidth={1.3} /><div><strong>03. Chốt giao hàng</strong><p>Xác nhận tồn kho, phí ship và thanh toán.</p></div></li></ol></div></section>
    </main>
    <footer className="shop-footer liquid-glass"><div className="wrap footer-main"><div><a href="/" className="brand-lockup" aria-label="HUPPO HOBBY"><img src="/huppo-emblem.png" alt="" width={64} height={64} loading="lazy" /><span>HUPPO<small>HOBBY</small></span></a><p>Góc nhỏ dành cho người mê xe mô hình.</p></div><div><h2>Bộ sưu tập</h2><button onClick={() => navigateBrand("Hot Wheels")}>Hot Wheels</button><button onClick={() => navigateBrand("Matchbox")}>Matchbox</button></div><div><h2>Liên hệ HUPPO</h2><a href="tel:0939451139">0939 451 139</a><a href={zalo} target="_blank" rel="noreferrer">Tư vấn qua Zalo <ArrowUpRight size={14} /></a></div></div><div className="wrap footer-bottom"><span>© HUPPO HOBBY</span><a href="/admin">Quản lý cửa hàng</a></div></footer>

    {count > 0 && <div className="mobile-cart-dock liquid-glass"><div><strong>{count} xe trong giỏ</strong><span>{loading || loadError || missing ? "Đang kiểm tra danh mục" : unknown ? "Có xe cần báo giá" : money(total)}</span></div><button className="button-primary" onClick={() => { setCopyState(""); setCartOpen(true); }}><ShoppingBag size={18} />Xem giỏ hàng</button></div>}
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetContent side="left" className="shop-panel store-panel liquid-glass"><SheetHeader><SheetTitle>HUPPO HOBBY</SheetTitle><SheetDescription>Khám phá bộ sưu tập xe mô hình.</SheetDescription></SheetHeader><nav className="mobile-navigation"><button onClick={() => navigateBrand("all")}>Tất cả xe <ArrowUpRight size={17} /></button>{brands.map(b => <button key={b} onClick={() => navigateBrand(b)}>{b}<ArrowUpRight size={17} /></button>)}<a href="#how" onClick={() => setMenuOpen(false)}>Cách đặt hàng</a><a href={zalo} target="_blank" rel="noreferrer">Liên hệ Zalo · 0939 451 139</a></nav></SheetContent></Sheet>
    <Sheet open={!!selected} onOpenChange={value => { if (!value) setSelected(null); }}><SheetContent className="shop-panel store-panel liquid-glass detail-panel">{selected && <><SheetHeader><SheetTitle>{selected.name}</SheetTitle><SheetDescription>{selected.sku} · {selected.brand}</SheetDescription></SheetHeader><ProductImage product={selected} className="detail-photo product-image-silver" displayImage /><div className="detail-body"><strong className="detail-price">{selected.price === null ? "Liên hệ báo giá" : money(selected.price)}</strong><p>{selected.description || "Liên hệ HUPPO để biết thêm về mẫu xe này."}</p><div className="detail-stock">{selected.stock === null ? "Tồn kho chưa xác nhận — shop sẽ kiểm tra khi chốt đơn." : selected.stock === 0 ? "Mẫu xe hiện đã hết hàng." : `Còn ${selected.stock} sản phẩm.`}</div><p className="detail-note">Giá chưa gồm phí giao hàng. Đơn được xác nhận qua Zalo.</p></div><div className="panel-footer"><button className="button-primary" disabled={atLimit(selected)} onClick={() => add(selected)}><ShoppingBag size={18} />{selected.stock === 0 ? "Hết hàng" : atLimit(selected) ? "Đã đủ số lượng trong giỏ" : "Thêm vào giỏ hàng"}</button><a className="button-secondary" href={zalo} target="_blank" rel="noreferrer">Hỏi shop về mẫu xe này <ArrowUpRight size={16} /></a></div></>}</SheetContent></Sheet>
    <Sheet open={cartOpen} onOpenChange={setCartOpen}><SheetContent className="shop-panel store-panel liquid-glass cart-panel"><SheetHeader><SheetTitle>Giỏ hàng <span className="panel-count">{count}</span></SheetTitle><SheetDescription>Chốt đơn cùng HUPPO qua Zalo.</SheetDescription></SheetHeader>
      <div className="cart-content">{!count && <div className="cart-empty"><ShoppingBag size={45} strokeWidth={1.1} /><h2>Giỏ xe đang trống</h2><p>Chọn chiếc xe đầu tiên cho bộ sưu tập của bạn.</p><button className="button-primary" onClick={() => setCartOpen(false)}><ArrowLeft size={17} /> Tiếp tục chọn xe</button></div>}
        {missing && <div className="cart-warning">Có sản phẩm không còn trong danh mục.<button onClick={() => { setCart(current => Object.fromEntries(Object.entries(current).filter(([id]) => products.some(p => p.id === id)))); setCopyState(""); }}>Xóa sản phẩm không khả dụng</button></div>}
        {lines.map(p => <div className="cart-item" key={p.id}><ProductImage product={p} /><div className="cart-item-body"><div className="cart-item-heading"><div><span>{p.brand}</span><h3>{p.name}</h3></div><button className="icon-button" aria-label={`Xóa ${p.name} khỏi giỏ`} onClick={() => remove(p.id)}><X size={17} /></button></div><strong>{p.price === null ? "Chờ báo giá" : money(p.price)}</strong><div className="cart-item-controls"><div className="quantity-control"><button aria-label={`Giảm số lượng ${p.name}`} onClick={() => change(p, -1)}><Minus size={14} /></button><span aria-label="Số lượng">{cart[p.id]}</span><button disabled={atLimit(p)} aria-label={`Tăng số lượng ${p.name}`} onClick={() => change(p, 1)}><Plus size={14} /></button></div><span>{p.price === null ? "" : money(p.price * cart[p.id])}</span></div>{p.stock !== null && cart[p.id] > p.stock && <p className="cart-warning">Số lượng vượt tồn kho. Vui lòng giảm số lượng.</p>}</div></div>)}
      </div>
      {count > 0 && <div className="cart-summary"><div className="cart-total"><span>{unknown ? "Tạm tính phần đã có giá" : "Tạm tính"}</span><strong>{money(total)}</strong></div><p>Chưa gồm phí giao hàng.{unknown && " Một số xe cần shop báo giá."}</p><details className="order-preview"><summary>Xem nội dung đơn hàng</summary><textarea aria-label="Nội dung đơn hàng để sao chép" readOnly value={order} /></details><button className="button-primary" disabled={loading || loadError || !lines.length || missing || excessive} onClick={async () => { try { await navigator.clipboard.writeText(order); setCopyState("Đã sao chép. Mở Zalo và dán nội dung để gửi shop."); } catch { setCopyState("Không thể sao chép tự động. Mở nội dung đơn, chọn và sao chép bằng tay."); } }}>{copyState.startsWith("Đã") ? <Check size={18} /> : <ShoppingBag size={18} />}{copyState.startsWith("Đã") ? "Đã sao chép đơn" : "1. Sao chép đơn hàng"}</button><a className="button-secondary" href={zalo} target="_blank" rel="noreferrer">2. Mở Zalo và gửi đơn <ArrowUpRight size={17} /></a>{copyState && <p className="copy-status" role="status">{copyState}</p>}<p className="checkout-note">Shop xác nhận giá và tồn kho trước khi thanh toán.</p></div>}
    </SheetContent></Sheet>
  </div>;
}

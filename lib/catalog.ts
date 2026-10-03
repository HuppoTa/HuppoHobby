import referenceProducts from "@/data/reference-products.json";
export type Product = {id:string; sku:string; updated_at?:number; name:string; brand:string; description:string; image:string; price:number|null; stock:number|null; visible:boolean};
export const cleanCatalogText = (text: string) => text.replace(/['"‘’“”]/g, "").replace(/;/g, ",").trim();
export const cleanProductText = (product: Product): Product => ({
  ...product,
  name: cleanCatalogText(product.name),
  description: cleanCatalogText(product.description),
});
export const examples:Product[] = [
  {
    "id": "civic-eg",
    "sku": "HH-HW-000001",
    "name": "1992 Honda Civic EG",
    "brand": "Hot Wheels",
    "description": "58th Anniversary: thân xanh, họa tiết Hot Wheels vàng, mâm vàng, card 2/6. Ảnh tham khảo theo phiên bản, tình trạng thực tế được shop xác nhận khi chốt đơn.",
    "image": "/products/civic-eg.jpg",
    "price": null,
    "stock": null,
    "visible": true
  },
  {
    "id": "honda-del-sol",
    "sku": "HH-HW-000002",
    "name": "1994 Honda del Sol",
    "brand": "Hot Wheels",
    "description": "Premium Fast & Furious: xe trắng, mâm bạc, đóng vỉ, card 3/5. Ảnh tham khảo theo phiên bản, tình trạng thực tế được shop xác nhận khi chốt đơn.",
    "image": "/products/honda-del-sol.jpg",
    "price": null,
    "stock": null,
    "visible": true
  },
  {
    "id": "ferrari-dino-206",
    "sku": "HH-HW-000003",
    "name": "Ferrari Dino 206 GT",
    "brand": "Hot Wheels",
    "description": "Ferrari Dino 206 GT màu đỏ, mâm bạc, đóng vỉ. Ảnh tham khảo theo phiên bản, tình trạng thực tế được shop xác nhận khi chốt đơn.",
    "image": "/products/ferrari-dino-206.jpg",
    "price": null,
    "stock": null,
    "visible": true
  },
  {
    "id": "ferrari-12cilindri",
    "sku": "HH-HW-000004",
    "name": "Ferrari 12Cilindri",
    "brand": "Hot Wheels",
    "description": "Ferrari 12Cilindri màu xanh, nóc đen, mâm đen trắng, đóng vỉ. Ảnh tham khảo theo phiên bản, tình trạng thực tế được shop xác nhận khi chốt đơn.",
    "image": "/products/ferrari-12cilindri.jpg",
    "price": null,
    "stock": null,
    "visible": true
  },
  {
    "id": "ferrari-f2004",
    "sku": "HH-HW-000005",
    "name": "Ferrari F2004",
    "brand": "Hot Wheels",
    "description": "HW Starting Grid: xe đua Ferrari F2004 màu đỏ, đóng vỉ. Ảnh tham khảo theo phiên bản, tình trạng thực tế được shop xác nhận khi chốt đơn.",
    "image": "/products/ferrari-f2004.jpg",
    "price": null,
    "stock": null,
    "visible": true
  },
  {
    "id": "racing-bulls-f1",
    "sku": "HH-HW-000006",
    "name": "Visa Cash App Racing Bulls F1",
    "brand": "Hot Wheels",
    "description": "Formula 1: xe trắng xanh, viền mâm xanh, đóng vỉ. Ảnh tham khảo theo phiên bản, tình trạng thực tế được shop xác nhận khi chốt đơn.",
    "image": "/products/racing-bulls-f1.jpg",
    "price": null,
    "stock": null,
    "visible": true
  },
  {
    "id": "porsche-rally",
    "sku": "HH-MB-000007",
    "name": "1985 Porsche 911 Rally",
    "brand": "Matchbox",
    "description": "Mẫu tham khảo: màu xám, phụ kiện trên nóc, đóng vỉ. Ảnh đang cập nhật.",
    "image": "",
    "price": null,
    "stock": null,
    "visible": true
  },
  {
    "id": "porsche-918",
    "sku": "HH-MB-000008",
    "name": "Porsche 918 Spyder",
    "brand": "Matchbox",
    "description": "Mẫu tham khảo: màu xanh, đóng vỉ. Ảnh đang cập nhật.",
    "image": "",
    "price": null,
    "stock": null,
    "visible": true
  }
  ,...referenceProducts
];
export const money=(n:number)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(n);

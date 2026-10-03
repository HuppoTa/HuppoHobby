import { cleanCatalogText, type Product } from './catalog';

export type CatalogFilters = {
  query: string;
  brand: string;
  availability: string;
  sort: string;
};
const normalize = (value: string) => cleanCatalogText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export function queryCatalog(products: Product[], filters: CatalogFilters): Product[] {
  const query = normalize(filters.query.trim());
  const results = products.filter(p => p.visible &&
    (filters.brand === 'all' || p.brand === filters.brand) &&
    (!query || normalize(`${p.sku} ${p.name} ${p.brand} ${p.description}`).includes(query)) &&
    (filters.availability === 'all' ||
      (filters.availability === 'available' && p.stock !== null && p.stock > 0) ||
      (filters.availability === 'sold-out' && p.stock === 0) ||
      (filters.availability === 'unconfirmed' && p.stock === null)));
  if (filters.sort === 'name') return results.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  if (filters.sort === 'price-asc' || filters.sort === 'price-desc') {
    return results.sort((a, b) => {
      if (a.price === null) return b.price === null ? 0 : 1;
      if (b.price === null) return -1;
      return filters.sort === 'price-asc' ? a.price - b.price : b.price - a.price;
    });
  }
  return results;
}

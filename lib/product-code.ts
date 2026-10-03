export const skuPattern=/^[A-Z0-9][A-Z0-9_-]{2,39}$/;
export function normalizeSku(value:string){return value.trim().toUpperCase();}
export function newSku(brand:string){return `HH-${brand==="Hot Wheels"?"HW":brand==="Matchbox"?"MB":"OT"}-${crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;}

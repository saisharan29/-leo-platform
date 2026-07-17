// French number words 0–999 999 (used by Numbers Dash + listening items).
const U = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
const T: Record<number, string> = { 20:"vingt",30:"trente",40:"quarante",50:"cinquante",60:"soixante" };

function under100(n: number): string {
  if (n < 20) return U[n];
  if (n < 70) { const d = Math.floor(n/10)*10, r = n%10; return T[d] + (r===1?" et un":r?"-"+U[r]:""); }
  if (n < 80) { const r = n-60; return r===11 ? "soixante et onze" : "soixante-"+U[r]; }
  const r = n-80; return r===0 ? "quatre-vingts" : "quatre-vingt-"+U[r];
}
function under1000(n: number): string {
  if (n < 100) return under100(n);
  const c = Math.floor(n/100), r = n%100;
  let s = c>1 ? U[c]+" cent" : "cent";
  if (c>1 && r===0) s += "s";
  return r ? s+" "+under100(r) : s;
}
export function numToFrench(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 1000) return under1000(n);
  const k = Math.floor(n/1000), r = n%1000;
  const s = k>1 ? under1000(k)+" mille" : "mille";
  return r ? s+" "+under1000(r) : s;
}

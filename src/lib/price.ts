/**
 * Price shapes shared by server and browser code. Keep this file free of server imports: the
 * cart and the catalogue filters run in the browser and import from here.
 */
export type PublicPrice =
  /**
   * `price` is the selling price, `mrp` the printed MRP; either may be null.
   * `locked`: the site locks prices and this visitor has not unlocked them. The selling price
   * (and the MRP too, if the client chose that) is then null here: the real number never
   * leaves the server until the visitor enters the password.
   */
  | { kind: 'amount'; mrp: number | null; price: number | null; locked?: boolean }
  | { kind: 'quote' }
  | { kind: 'none' }

/** The amount a customer pays: selling price if there is one, otherwise the MRP. Null while locked. */
export const amountOf = (p: PublicPrice): number | null =>
  p.kind === 'amount' && !p.locked ? (p.price ?? p.mrp) : null

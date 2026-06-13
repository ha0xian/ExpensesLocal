/** Frontend presentation-only helpers. Business logic has moved to the backend. */

export function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(Number(value) || 0);
}

export function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

export function subcategoriesFor(state, category) {
  return (state?.subcategories || []).filter((item) => item.category === category);
}

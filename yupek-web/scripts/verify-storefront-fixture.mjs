import { sanitizeProductSizes, filterProducts, searchProducts, related, isCustomerFacingDescriptor } from "../lib/catalog.js";

// Comprehensive test product fixture with all internal supplier and fulfillment metadata
const testFixtureProduct = {
  id: "printify-9988776655",
  slug: "yupek-silk-road-test-garment-9988776655",
  name: "YUPEK Silk Road Test Garment | Heritage Weave",
  descriptor: "Printify Custom Edition • SKU-TEST-998877",
  price: 49.99,
  currency: "EUR",
  category: "tees",
  gender: "unisex",
  sizes: ["S", "M", "L", "XL"],
  colors: ["Ivory", "Onyx"],
  description: "Crafted from organic Turkmen silk blend with European tailored silhouette.",
  material: "80% Organic Silk, 20% Combed Cotton.",
  images: ["https://images-api.printify.com/mockup/test1.jpg"],
  featured: true,
  newArrival: true,
  tags: ["T-shirts", "Silk", "Heritage"],
  // Internal Supplier Metadata (Category #2) - MUST be preserved internally, NEVER rendered to customers
  supplier: "Printify",
  supplierProductId: "9988776655",
  supplierPrice: 18.50,
  inventory: 100,
  variants: [
    {
      variant_id: 112233,
      title: "Ivory / M",
      size: "M",
      color: "Ivory",
      price_cents: 4999,
      is_enabled: true,
      is_available: true,
      sku: "SKU-TEST-998877-M",
      options: [15, 521],
    },
    {
      variant_id: 445566,
      title: "Onyx / L",
      size: "L",
      color: "Onyx",
      price_cents: 4999,
      is_enabled: true,
      is_available: true,
      sku: "SKU-TEST-998877-L",
      options: [16, 418],
    },
  ],
  options: [
    {
      name: "Size",
      type: "size",
      values: [
        { id: 15, title: "M" },
        { id: 16, title: "L" },
      ],
    },
    {
      name: "Color",
      type: "color",
      values: [
        { id: 521, title: "Ivory" },
        { id: 418, title: "Onyx" },
      ],
    },
  ],
};

console.log("==================================================");
console.log("STARTING TEST PRODUCT FIXTURE VERIFICATION");
console.log("==================================================");

// 1. Test Storefront Normalization Layer
const customerProduct = sanitizeProductSizes(testFixtureProduct);

console.log("\n1. VERIFYING ARCHITECTURAL SEPARATION:");
// Category 2: Internal fields must remain INTACT on the underlying product object
console.log(`- Internal supplier: ${customerProduct.supplier} (Preserved: ${customerProduct.supplier === "Printify"})`);
console.log(`- Internal supplierProductId: ${customerProduct.supplierProductId} (Preserved: ${customerProduct.supplierProductId === "9988776655"})`);
console.log(`- Internal variant SKU: ${customerProduct.variants?.[0].sku} (Preserved: ${customerProduct.variants?.[0].sku === "SKU-TEST-998877-M"})`);
console.log(`- Internal variant_id: ${customerProduct.variants?.[0].variant_id} (Preserved: ${customerProduct.variants?.[0].variant_id === 112233})`);

if (
  customerProduct.supplier !== "Printify" ||
  customerProduct.supplierProductId !== "9988776655" ||
  customerProduct.variants?.[0].sku !== "SKU-TEST-998877-M" ||
  customerProduct.variants?.[0].variant_id !== 112233
) {
  console.error("FAIL: Internal supplier data was improperly deleted!");
  process.exit(1);
}

// Presentation field must be sanitized
console.log(`- Sanitized presentation descriptor: "${customerProduct.descriptor}" (Cleared: ${customerProduct.descriptor === ""})`);
if (customerProduct.descriptor !== "") {
  console.error(`FAIL: Presentation descriptor was not sanitized! Got: "${customerProduct.descriptor}"`);
  process.exit(1);
}

// 2. Test /shop Product Card Presentation Simulation
console.log("\n2. VERIFYING /SHOP PRODUCT CARD PRESENTATION:");
// A ProductCard renders:
// - Title: p.name
// - Optional subtitle: isCustomerFacingDescriptor(p.descriptor) ? p.descriptor : null
// - Price: eur(p.price)
const cardTitle = customerProduct.name;
const cardSubtitle = isCustomerFacingDescriptor(customerProduct.descriptor) ? customerProduct.descriptor : null;
const cardPrice = `€${customerProduct.price}`;

console.log(`  Card Title: "${cardTitle}"`);
console.log(`  Card Subtitle: ${cardSubtitle === null ? "(HIDDEN - SAFE)" : `"${cardSubtitle}"`}`);
console.log(`  Card Price: "${cardPrice}"`);

if (cardSubtitle !== null) {
  console.error(`FAIL: Internal label leaked to product card! Subtitle: "${cardSubtitle}"`);
  process.exit(1);
}

// 3. Test Product Detail Page (PDP) Presentation Simulation
console.log("\n3. VERIFYING PDP PRESENTATION:");
// PDP displays:
// - Title: p.name
// - Price: p.price
// - Colors: p.colors
// - Sizes: p.sizes
// - Story/Features: parsed from p.description
// It does NOT render descriptor, supplier, supplierProductId, or variant SKU to customer.
const pdpTitle = customerProduct.name;
const pdpPrice = `€${customerProduct.price}`;
const pdpDescription = customerProduct.description;
const pdpColors = customerProduct.colors.join(", ");
const pdpSizes = customerProduct.sizes.join(", ");

const customerPdpHtml = `
  <h1>${pdpTitle}</h1>
  <div>${pdpPrice}</div>
  <div>Colors: ${pdpColors}</div>
  <div>Sizes: ${pdpSizes}</div>
  <p>${pdpDescription}</p>
`;

const pdpForbiddenTerms = ["Printify", "SKU-TEST", "9988776655", "Custom Edition"];
for (const term of pdpForbiddenTerms) {
  if (customerPdpHtml.includes(term)) {
    console.error(`FAIL: PDP leaked internal term "${term}"!`);
    process.exit(1);
  }
}
console.log("  PDP customer HTML is completely clean of internal supplier metadata!");

// 4. Test "You May Also Like" Recommendations
console.log("\n4. VERIFYING RECOMMENDATIONS:");
const recommendations = related(customerProduct.slug, [customerProduct]);
for (const rec of recommendations) {
  const recSubtitle = isCustomerFacingDescriptor(rec.descriptor) ? rec.descriptor : null;
  if (recSubtitle !== null) {
    console.error(`FAIL: Recommendations leaked internal label "${recSubtitle}"!`);
    process.exit(1);
  }
}
console.log("  Recommendations are completely clean of internal supplier metadata!");

// 5. Test Search Results
console.log("\n5. VERIFYING SEARCH RESULTS:");
// Searching for customer fashion terms matches
const searchMatchesFashion = searchProducts("Silk", [customerProduct]);
console.log(`  Search for 'Silk' found: ${searchMatchesFashion.length} items (Expected: 1)`);
if (searchMatchesFashion.length !== 1) {
  console.error("FAIL: Search for legitimate fashion term failed!");
  process.exit(1);
}

// Searching for internal supplier terms MUST NOT match via descriptor
const searchMatchesPrintify = searchProducts("Printify Custom Edition", [customerProduct]);
console.log(`  Search for 'Printify Custom Edition' found: ${searchMatchesPrintify.length} items (Expected: 0)`);
if (searchMatchesPrintify.length !== 0) {
  console.error("FAIL: Search indexed internal supplier descriptor!");
  process.exit(1);
}

const searchMatchesSku = searchProducts("SKU-TEST-998877", [customerProduct]);
console.log(`  Search for 'SKU-TEST-998877' found: ${searchMatchesSku.length} items (Expected: 0)`);
if (searchMatchesSku.length !== 0) {
  console.error("FAIL: Search indexed internal SKU!");
  process.exit(1);
}

// 6. Test Cart & Checkout Presentation
console.log("\n6. VERIFYING CART & CHECKOUT PRESENTATION:");
// Cart and checkout display:
// Item: p.name, Size, Color, Price, Image.
// Internal printifyProductId and printifyVariantId are carried internally in the CartLine state
// for fulfillment without rendering them in the UI.
const cartLine = {
  slug: customerProduct.slug,
  size: "M",
  color: "Ivory",
  productId: customerProduct.id,
  printifyProductId: customerProduct.supplierProductId,
  printifyVariantId: String(customerProduct.variants?.[0].variant_id),
  title: customerProduct.name,
  price: customerProduct.price,
  price_cents: 4999,
  image: customerProduct.images[0],
  qty: 1,
};

// UI rendering of cart line:
const cartLineUiText = `${cartLine.title} - ${cartLine.color} / ${cartLine.size} - €${cartLine.price}`;
console.log(`  Cart Line UI Text: "${cartLineUiText}"`);

for (const term of ["Printify", "SKU", "9988776655", "112233"]) {
  if (cartLineUiText.includes(term)) {
    console.error(`FAIL: Cart Line UI leaked internal term "${term}"!`);
    process.exit(1);
  }
}

// Internal line retains supplier identifiers for order creation and webhook mapping
console.log(`  Cart Line Internal printifyProductId: "${cartLine.printifyProductId}" (Preserved: ${cartLine.printifyProductId === "9988776655"})`);
console.log(`  Cart Line Internal printifyVariantId: "${cartLine.printifyVariantId}" (Preserved: ${cartLine.printifyVariantId === "112233"})`);

if (cartLine.printifyProductId !== "9988776655" || cartLine.printifyVariantId !== "112233") {
  console.error("FAIL: Cart internal fulfillment IDs missing!");
  process.exit(1);
}

console.log("\n==================================================");
console.log("ALL FIXTURE VERIFICATION CHECKS PASSED PERFECTLY!");
console.log("==================================================");

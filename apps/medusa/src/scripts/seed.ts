import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

// ─────────────────────────────────────────────────────────────
// Template Configuration — override via env vars per client
// ─────────────────────────────────────────────────────────────
const STORE_NAME = process.env.STORE_NAME || "My Store";
const STORE_CURRENCY = process.env.STORE_CURRENCY || "eur";
const STORE_COUNTRY = process.env.STORE_COUNTRY || "es";
const STORE_REGION_NAME = process.env.STORE_REGION_NAME || "Europe";
const WAREHOUSE_NAME = process.env.WAREHOUSE_NAME || "Main Warehouse";
const WAREHOUSE_CITY = process.env.WAREHOUSE_CITY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

// Shipping config — set by wizard via region preset
const SHIPPING_STANDARD_LABEL = process.env.SHIPPING_STANDARD_LABEL || "Standard Shipping";
const SHIPPING_EXPRESS_LABEL = process.env.SHIPPING_EXPRESS_LABEL || "Express Shipping 24h";
const SHIPPING_STANDARD_PRICE = parseInt(process.env.SHIPPING_STANDARD_PRICE || "495", 10);
const SHIPPING_EXPRESS_PRICE = parseInt(process.env.SHIPPING_EXPRESS_PRICE || "895", 10);

// Additional currencies from region preset (JSON array, e.g., '["eur","usd"]')
const STORE_CURRENCIES: string[] = (() => {
  try {
    const raw = process.env.STORE_CURRENCIES;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return [STORE_CURRENCY];
})();

// Set to "false" to skip demo products — creates only infrastructure
// (region, tax, shipping, warehouse). Use for real client onboarding.
const SEED_DEMO_PRODUCTS = process.env.SEED_DEMO_PRODUCTS !== "false";

// Seed profile: "default" (fruit demo), "blank", "retail", "food", "services"
// Set SEED_PROFILE to load categories/products from a JSON profile file.
const SEED_PROFILE = process.env.SEED_PROFILE || "default";

// ---------------------------------------------------------------------------
// Profile loader
// ---------------------------------------------------------------------------
interface SeedProfileVariant {
  title: string;
  sku: string;
  options: Record<string, string>;
  price: number;
}

interface SeedProfileProduct {
  title: string;
  category: string;
  description: string;
  handle: string;
  weight: number;
  options: { title: string; values: string[] }[];
  variants: SeedProfileVariant[];
}

interface SeedProfile {
  name: string;
  description: string;
  categories: string[];
  products: SeedProfileProduct[];
}

function loadSeedProfile(profileName: string): SeedProfile | null {
  if (profileName === "default") return null; // Use hardcoded fruit data

  const profilePath = join(__dirname, "seed-profiles", `${profileName}.json`);
  if (!existsSync(profilePath)) {
    console.warn(`[seed] Profile "${profileName}" not found at ${profilePath} — falling back to default`);
    return null;
  }

  const raw = readFileSync(profilePath, "utf-8");
  return JSON.parse(raw) as SeedProfile;
}

/**
 * Helper: build a Supabase Storage public URL for a product image.
 * Falls back to a placeholder if SUPABASE_URL is not set.
 */
function imageUrl(filename: string): string {
  if (SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
  }
  // Placeholder fruit images from Unsplash
  const placeholders: Record<string, string> = {
    "naranjas": "https://images.unsplash.com/photo-1547514701-42fee1e36dae?w=800",
    "limones": "https://images.unsplash.com/photo-1590502593747-42a996133562?w=800",
    "mandarinas": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800",
    "pomelos": "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=800",
    "aguacates": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800",
    "mangos": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800",
    "granadas": "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=800",
    "caquis": "https://images.unsplash.com/photo-1604085572504-a392541f0419?w=800",
    "kiwis": "https://images.unsplash.com/photo-1585059895524-72c5ed4d25b4?w=800",
    "caja-mixta": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800",
    "caja-citricos": "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800",
    "aceite-oliva": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800",
    "miel-azahar": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800",
  };
  const key = filename.replace(/\.(jpg|jpeg|png|webp)$/i, "");
  return placeholders[key] || "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800";
}

// ─────────────────────────────────────────────────────────────
// Workflow: Update store currencies
// ─────────────────────────────────────────────────────────────
const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => ({
              currency_code: currency.currency_code,
              is_default: currency.is_default ?? false,
            })
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  }
);

// ─────────────────────────────────────────────────────────────
// Main Seed Function
// ─────────────────────────────────────────────────────────────
export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  // ── Store ──────────────────────────────────────────────────
  logger.info(`Seeding ${STORE_NAME} store data...`);
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  // Register all supported currencies
  const currenciesForStore = STORE_CURRENCIES.map(code => ({
    currency_code: code,
    is_default: code === STORE_CURRENCY,
  }));
  // Ensure default currency is included
  if (!currenciesForStore.some(c => c.currency_code === STORE_CURRENCY)) {
    currenciesForStore.unshift({ currency_code: STORE_CURRENCY, is_default: true });
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: currenciesForStore,
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: STORE_NAME,
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("✅ Store configured.");

  // ── Region ─────────────────────────────────────────────────
  logger.info("Seeding region data...");
  const regionModuleService = container.resolve(Modules.REGION);
  const existingRegions = await regionModuleService.listRegions(
    { name: STORE_REGION_NAME },
    { take: 1 }
  );
  let region;
  if (existingRegions.length) {
    region = existingRegions[0];
    logger.info("✅ Region already exists, skipping.");
  } else {
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: STORE_REGION_NAME,
            currency_code: STORE_CURRENCY,
            countries: [STORE_COUNTRY],
            payment_providers: [
              "pp_system_default",
              ...(process.env.STRIPE_SECRET_KEY ? ["pp_stripe_stripe"] : []),
            ],
          },
        ],
      },
    });
    region = regionResult[0];
    logger.info("✅ Region created.");
  }

  // ── Tax ────────────────────────────────────────────────────
  logger.info("Seeding tax regions...");
  try {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: STORE_COUNTRY,
          provider_id: "tp_system",
        },
      ],
    });
    logger.info("✅ Tax regions created.");
  } catch (e: any) {
    if (e.message?.includes("already")) {
      logger.info("✅ Tax region already exists, skipping.");
    } else {
      throw e;
    }
  }

  // ── Stock Location ─────────────────────────────────────────
  logger.info("Seeding stock location data...");
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);
  const existingLocations = await stockLocationModuleService.listStockLocations(
    { name: WAREHOUSE_NAME },
    { take: 1 }
  );
  let stockLocation;
  if (existingLocations.length) {
    stockLocation = existingLocations[0];
    logger.info("✅ Stock location already exists, skipping.");
  } else {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: WAREHOUSE_NAME,
            address: {
              city: WAREHOUSE_CITY,
              country_code: STORE_COUNTRY.toUpperCase(),
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_location_id: stockLocation.id },
      },
    });

    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      });
    } catch { /* link may already exist */ }
    logger.info("✅ Stock location created.");
  }

  // ── Fulfillment ────────────────────────────────────────────
  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [{ name: "Default Shipping Profile", type: "default" }],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSetName = `${STORE_NAME} Delivery`;
  const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: fulfillmentSetName },
    { take: 1, relations: ["service_zones"] }
  );

  if (existingFulfillmentSets.length) {
    logger.info("✅ Fulfillment already configured, skipping.");
  } else {
    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: fulfillmentSetName,
      type: "shipping",
      service_zones: [
        {
          name: STORE_REGION_NAME,
          geo_zones: [{ country_code: STORE_COUNTRY, type: "country" }],
        },
      ],
    });

    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
      });
    } catch { /* link may already exist */ }

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: SHIPPING_STANDARD_LABEL,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: SHIPPING_STANDARD_LABEL,
            code: "standard",
          },
          prices: [
            { currency_code: STORE_CURRENCY, amount: SHIPPING_STANDARD_PRICE },
            { region_id: region.id, amount: SHIPPING_STANDARD_PRICE },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: SHIPPING_EXPRESS_LABEL,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: SHIPPING_EXPRESS_LABEL,
            code: "express",
          },
          prices: [
            { currency_code: STORE_CURRENCY, amount: SHIPPING_EXPRESS_PRICE },
            { region_id: region.id, amount: SHIPPING_EXPRESS_PRICE },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
    logger.info("✅ Fulfillment configured.");
  }

  // ── Sales Channel ↔ Stock Location ─────────────────────────
  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [defaultSalesChannel[0].id] },
    });
  } catch { /* link may already exist */ }

  // ── Publishable API Key ────────────────────────────────────
  logger.info("Seeding publishable API key...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: { type: "publishable" },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: `${STORE_NAME} Webshop`, type: "publishable", created_by: "" },
        ],
      },
    });
    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableApiKey.id, add: [defaultSalesChannel[0].id] },
    });
  } catch { /* link may already exist */ }
  logger.info("✅ API key configured.");

  // ══════════════════════════════════════════════════════════════
  // Demo Products (skipped when SEED_DEMO_PRODUCTS=false)
  // For real client onboarding, skip this — owner adds products
  // from the panel using the Medusa Admin API.
  // ══════════════════════════════════════════════════════════════
  if (!SEED_DEMO_PRODUCTS) {
    logger.info("⏭️  SEED_DEMO_PRODUCTS=false — skipping demo products.");
    logger.info(`🎉 ${STORE_NAME} infrastructure seed complete! Ready for client setup.`);
    return;
  }

  // ── Profile-based seeding ──────────────────────────────────
  const profile = loadSeedProfile(SEED_PROFILE);
  if (profile) {
    if (profile.products.length === 0) {
      logger.info(`⏭️  Profile "${profile.name}": ${profile.description} — no products to seed.`);
      logger.info(`🎉 ${STORE_NAME} infrastructure seed complete! Ready for client setup.`);
      return;
    }

    // Create profile categories
    logger.info(`Seeding profile "${profile.name}" categories...`);
    const productModuleService = container.resolve(Modules.PRODUCT);
    const existingCats = await productModuleService.listProductCategories(
      { name: profile.categories },
      { take: profile.categories.length }
    );
    let profileCats: { id: string; name: string }[] = existingCats as any;
    const catsToCreate = profile.categories.filter(
      (name) => !existingCats.find((c) => c.name === name)
    );
    if (catsToCreate.length) {
      const { result: newCats } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: catsToCreate.map((name) => ({ name, is_active: true })) },
      });
      profileCats = [...existingCats, ...newCats] as any;
    }
    logger.info(`✅ ${profile.categories.length} categories ready.`);

    // Create profile products
    logger.info(`Seeding profile "${profile.name}" products...`);
    const existingProducts = await productModuleService.listProducts({}, { take: 1 });
    if (existingProducts.length > 0) {
      logger.info(`✅ Products already exist, skipping profile products.`);
    } else {
      const profileCatId = (name: string) => profileCats.find((c) => c.name === name)!.id;
      await createProductsWorkflow(container).run({
        input: {
          products: profile.products.map((p) => ({
            title: p.title,
            category_ids: [profileCatId(p.category)],
            description: p.description,
            handle: p.handle,
            weight: p.weight,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            options: p.options,
            variants: p.variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: v.options,
              prices: [{ amount: v.price, currency_code: STORE_CURRENCY }],
            })),
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          })),
        },
      });
      logger.info(`✅ ${profile.products.length} products created.`);
    }

    // Set inventory levels for profile products
    logger.info("Setting inventory levels...");
    try {
      const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
      });
      const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
        (item) => ({
          location_id: stockLocation.id,
          stocked_quantity: 100000,
          inventory_item_id: item.id,
        })
      );
      if (inventoryLevels.length) {
        await createInventoryLevelsWorkflow(container).run({
          input: { inventory_levels: inventoryLevels },
        });
      }
      logger.info("✅ Inventory levels set.");
    } catch (e: any) {
      logger.info(`✅ Inventory levels already exist or skipped: ${e.message}`);
    }

    logger.info(`🎉 ${STORE_NAME} seed complete with profile "${profile.name}"!`);
    return;
  }

  // ── Product Categories ─────────────────────────────────────
  logger.info("Seeding demo product categories...");
  const productModuleService = container.resolve(Modules.PRODUCT);
  const categoryNames = ["Cítricos", "Frutas Tropicales", "Frutas de Temporada", "Cajas Surtidas", "Productos Artesanales"];
  const existingCategories = await productModuleService.listProductCategories(
    { name: categoryNames },
    { take: categoryNames.length }
  );

  let categoryResult: { id: string; name: string }[];
  if (existingCategories.length >= categoryNames.length) {
    categoryResult = existingCategories as any;
    logger.info("✅ Categories already exist, skipping.");
  } else {
    const categoriesToCreate = categoryNames.filter(
      (name) => !existingCategories.find((c) => c.name === name)
    );
    if (categoriesToCreate.length) {
      const { result: newCats } = await createProductCategoriesWorkflow(
        container
      ).run({
        input: {
          product_categories: categoriesToCreate.map((name) => ({
            name,
            is_active: true,
          })),
        },
      });
      categoryResult = [...existingCategories, ...newCats] as any;
    } else {
      categoryResult = existingCategories as any;
    }
    logger.info("✅ Categories created.");
  }

  const catId = (name: string) =>
    categoryResult.find((c) => c.name === name)!.id;

  // ── Products ───────────────────────────────────────────────
  logger.info("Seeding demo products...");
  const existingProducts = await productModuleService.listProducts(
    {},
    { take: 1 }
  );
  if (existingProducts.length > 0) {
    logger.info(`✅ Products already exist (${existingProducts.length}), skipping.`);
  } else {
    await createProductsWorkflow(container).run({
      input: {
        products: [
          // ── Cítricos ──
          {
            title: "Naranjas de Valencia",
            category_ids: [catId("Cítricos")],
            description:
              "Naranjas recién cogidas del árbol, directas del campo valenciano a tu mesa. Dulces, jugosas y llenas de vitamina C. Perfectas para zumo o para comer.",
            handle: "naranjas-valencia",
            weight: 5000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("naranjas.jpg") }],
            options: [
              { title: "Peso", values: ["5 kg", "10 kg", "15 kg"] },
            ],
            variants: [
              {
                title: "Caja 5 kg",
                sku: "NAR-5KG",
                options: { Peso: "5 kg" },
                prices: [{ amount: 1490, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 10 kg",
                sku: "NAR-10KG",
                options: { Peso: "10 kg" },
                prices: [{ amount: 2490, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 15 kg",
                sku: "NAR-15KG",
                options: { Peso: "15 kg" },
                prices: [{ amount: 3290, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Limones Ecológicos",
            category_ids: [catId("Cítricos")],
            description:
              "Limones ecológicos cultivados sin pesticidas. Ideales para cocina, repostería y bebidas. Piel comestible apta para ralladura.",
            handle: "limones-ecologicos",
            weight: 3000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("limones.jpg") }],
            options: [
              { title: "Peso", values: ["3 kg", "5 kg", "10 kg"] },
            ],
            variants: [
              {
                title: "Caja 3 kg",
                sku: "LIM-3KG",
                options: { Peso: "3 kg" },
                prices: [{ amount: 990, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 5 kg",
                sku: "LIM-5KG",
                options: { Peso: "5 kg" },
                prices: [{ amount: 1590, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 10 kg",
                sku: "LIM-10KG",
                options: { Peso: "10 kg" },
                prices: [{ amount: 2690, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Mandarinas Clementinas",
            category_ids: [catId("Cítricos")],
            description:
              "Mandarinas clementinas sin pepitas. Fáciles de pelar, dulces y aromáticas. Las favoritas de los niños.",
            handle: "mandarinas-clementinas",
            weight: 5000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("mandarinas.jpg") }],
            options: [
              { title: "Peso", values: ["5 kg", "10 kg"] },
            ],
            variants: [
              {
                title: "Caja 5 kg",
                sku: "MAND-5KG",
                options: { Peso: "5 kg" },
                prices: [{ amount: 1690, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 10 kg",
                sku: "MAND-10KG",
                options: { Peso: "10 kg" },
                prices: [{ amount: 2890, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Pomelos Rosa",
            category_ids: [catId("Cítricos")],
            description:
              "Pomelos rosa de cultivo local. Refrescantes, con un equilibrio perfecto entre dulce y ácido. Ricos en antioxidantes.",
            handle: "pomelos-rosa",
            weight: 5000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("pomelos.jpg") }],
            options: [
              { title: "Peso", values: ["5 kg", "10 kg"] },
            ],
            variants: [
              {
                title: "Caja 5 kg",
                sku: "POM-5KG",
                options: { Peso: "5 kg" },
                prices: [{ amount: 1890, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 10 kg",
                sku: "POM-10KG",
                options: { Peso: "10 kg" },
                prices: [{ amount: 3290, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },

          // ── Frutas Tropicales ──
          {
            title: "Aguacates Hass",
            category_ids: [catId("Frutas Tropicales")],
            description:
              "Aguacates Hass cultivados en la costa tropical. Cremosos, maduros en su punto y listos para consumir.",
            handle: "aguacates-hass",
            weight: 2000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("aguacates.jpg") }],
            options: [
              { title: "Cantidad", values: ["6 uds", "12 uds"] },
            ],
            variants: [
              {
                title: "6 unidades",
                sku: "AGU-6",
                options: { Cantidad: "6 uds" },
                prices: [{ amount: 1290, currency_code: STORE_CURRENCY }],
              },
              {
                title: "12 unidades",
                sku: "AGU-12",
                options: { Cantidad: "12 uds" },
                prices: [{ amount: 2190, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Mangos Kent Premium",
            category_ids: [catId("Frutas Tropicales")],
            description:
              "Mangos Kent de cultivo nacional, madurados al sol. Pulpa suave, sin fibras y con un aroma irresistible.",
            handle: "mangos-kent",
            weight: 3000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("mangos.jpg") }],
            options: [
              { title: "Peso", values: ["2 kg", "4 kg"] },
            ],
            variants: [
              {
                title: "Caja 2 kg",
                sku: "MAN-2KG",
                options: { Peso: "2 kg" },
                prices: [{ amount: 1490, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 4 kg",
                sku: "MAN-4KG",
                options: { Peso: "4 kg" },
                prices: [{ amount: 2590, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },

          // ── Frutas de Temporada ──
          {
            title: "Granadas Mollar",
            category_ids: [catId("Frutas de Temporada")],
            description:
              "Granadas Mollar de Elche con D.O. Granos tiernos, jugosos y prácticamente sin pepitas. Un superalimento de temporada.",
            handle: "granadas-mollar",
            weight: 3000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("granadas.jpg") }],
            options: [
              { title: "Peso", values: ["3 kg", "5 kg"] },
            ],
            variants: [
              {
                title: "Caja 3 kg",
                sku: "GRA-3KG",
                options: { Peso: "3 kg" },
                prices: [{ amount: 1390, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 5 kg",
                sku: "GRA-5KG",
                options: { Peso: "5 kg" },
                prices: [{ amount: 2090, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Caquis Persimon",
            category_ids: [catId("Frutas de Temporada")],
            description:
              "Caquis Persimon de la Ribera del Xúquer con D.O. Firmes por fuera, dulces por dentro. Se comen como una manzana.",
            handle: "caquis-persimon",
            weight: 3000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("caquis.jpg") }],
            options: [
              { title: "Peso", values: ["3 kg", "5 kg"] },
            ],
            variants: [
              {
                title: "Caja 3 kg",
                sku: "CAQ-3KG",
                options: { Peso: "3 kg" },
                prices: [{ amount: 1290, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 5 kg",
                sku: "CAQ-5KG",
                options: { Peso: "5 kg" },
                prices: [{ amount: 1990, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Kiwis Verdes",
            category_ids: [catId("Frutas de Temporada")],
            description:
              "Kiwis verdes de cultivo nacional. Alto contenido en vitamina C y fibra. Perfectos para desayunos y smoothies.",
            handle: "kiwis-verdes",
            weight: 2000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("kiwis.jpg") }],
            options: [
              { title: "Peso", values: ["2 kg", "4 kg"] },
            ],
            variants: [
              {
                title: "Caja 2 kg",
                sku: "KIW-2KG",
                options: { Peso: "2 kg" },
                prices: [{ amount: 890, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 4 kg",
                sku: "KIW-4KG",
                options: { Peso: "4 kg" },
                prices: [{ amount: 1590, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },

          // ── Cajas Surtidas ──
          {
            title: "Caja Mixta del Huerto",
            category_ids: [catId("Cajas Surtidas")],
            description:
              "Nuestra selección semanal de las mejores frutas de temporada. Directas del campo a tu puerta. El contenido varía según la cosecha.",
            handle: "caja-mixta-huerto",
            weight: 10000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("caja-mixta.jpg") }],
            options: [
              { title: "Tamaño", values: ["Pequeña (5 kg)", "Mediana (10 kg)", "Grande (15 kg)"] },
            ],
            variants: [
              {
                title: "Pequeña (5 kg)",
                sku: "MIX-5KG",
                options: { Tamaño: "Pequeña (5 kg)" },
                prices: [{ amount: 1990, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Mediana (10 kg)",
                sku: "MIX-10KG",
                options: { Tamaño: "Mediana (10 kg)" },
                prices: [{ amount: 3490, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Grande (15 kg)",
                sku: "MIX-15KG",
                options: { Tamaño: "Grande (15 kg)" },
                prices: [{ amount: 4690, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Caja Cítricos Premium",
            category_ids: [catId("Cajas Surtidas")],
            description:
              "Combinación de naranjas, mandarinas y limones de primera calidad. Ideal para familias y amantes de los cítricos.",
            handle: "caja-citricos-premium",
            weight: 10000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("caja-citricos.jpg") }],
            options: [
              { title: "Peso", values: ["10 kg", "15 kg"] },
            ],
            variants: [
              {
                title: "Caja 10 kg",
                sku: "CIT-10KG",
                options: { Peso: "10 kg" },
                prices: [{ amount: 2990, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Caja 15 kg",
                sku: "CIT-15KG",
                options: { Peso: "15 kg" },
                prices: [{ amount: 3990, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },

          // ── Productos Artesanales ──
          {
            title: "Aceite de Oliva Virgen Extra",
            category_ids: [catId("Productos Artesanales")],
            description:
              "Aceite de oliva virgen extra de primera prensada en frío. Producción artesanal limitada. Sabor intenso y afrutado.",
            handle: "aceite-oliva-virgen-extra",
            weight: 1000,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("aceite-oliva.jpg") }],
            options: [
              { title: "Tamaño", values: ["500 ml", "1 L", "2 L"] },
            ],
            variants: [
              {
                title: "Botella 500 ml",
                sku: "AOVE-500",
                options: { Tamaño: "500 ml" },
                prices: [{ amount: 890, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Botella 1 L",
                sku: "AOVE-1L",
                options: { Tamaño: "1 L" },
                prices: [{ amount: 1490, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Garrafón 2 L",
                sku: "AOVE-2L",
                options: { Tamaño: "2 L" },
                prices: [{ amount: 2490, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Miel de Azahar",
            category_ids: [catId("Productos Artesanales")],
            description:
              "Miel pura de azahar, recolectada en los naranjales valencianos. Cremosa, suave y con un delicado aroma floral.",
            handle: "miel-azahar",
            weight: 500,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: imageUrl("miel-azahar.jpg") }],
            options: [
              { title: "Tamaño", values: ["250 g", "500 g", "1 kg"] },
            ],
            variants: [
              {
                title: "Tarro 250 g",
                sku: "MIEL-250",
                options: { Tamaño: "250 g" },
                prices: [{ amount: 590, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Tarro 500 g",
                sku: "MIEL-500",
                options: { Tamaño: "500 g" },
                prices: [{ amount: 990, currency_code: STORE_CURRENCY }],
              },
              {
                title: "Tarro 1 kg",
                sku: "MIEL-1KG",
                options: { Tamaño: "1 kg" },
                prices: [{ amount: 1690, currency_code: STORE_CURRENCY }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
        ],
      },
    });
    logger.info("✅ Products created.");
  } // end of products existance check

  // ── Inventory Levels ───────────────────────────────────────
  logger.info("Seeding inventory levels...");
  try {
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id"],
    });

    const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
      (item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 100000,
        inventory_item_id: item.id,
      })
    );

    if (inventoryLevels.length) {
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: inventoryLevels },
      });
    }
    logger.info("✅ Inventory levels set.");
  } catch (e: any) {
    logger.info(`✅ Inventory levels already exist or skipped: ${e.message}`);
  }
  logger.info(`🎉 ${STORE_NAME} seed complete (infrastructure + demo products)!`);
}

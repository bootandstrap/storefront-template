# Seed Profiles

Pre-configured product & category templates for tenant provisioning.

## Available Profiles

| Profile | Description | Products | Use Case |
|---------|-------------|----------|----------|
| `blank` | Infrastructure only | 0 | Real client onboarding (owner adds own products) |
| `retail` | Generic retail items | 5 | Clothing, accessories, gifts |
| `food` | Food & beverages | 5 | Bakeries, delis, specialty food |
| `services` | Service packages | 3 | Consultants, agencies, freelancers |

## Usage

Set `SEED_PROFILE` env var before running seed:

```bash
# Infrastructure only (no demo products)
SEED_DEMO_PRODUCTS=false pnpm seed

# With a specific profile
SEED_PROFILE=retail pnpm seed

# Default (fruit demo)
pnpm seed
```

## Creating Custom Profiles

1. Add a new JSON file in `seed-profiles/`
2. Follow the structure: `{ categories: [...], products: [...] }`
3. Products reference categories by name (resolved at runtime)
4. Prices are in cents (e.g., 1990 = 19.90)

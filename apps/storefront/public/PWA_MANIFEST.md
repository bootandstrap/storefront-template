# PWA Manifest — Customization Guide

> Companion documentation for `manifest.json`. JSON doesn't support comments, so this file explains each field.

## What is manifest.json?

The [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) tells the browser how to display the storefront when installed as a Progressive Web App (PWA). Users on Android/Chrome can "Add to Home Screen" to get an app-like experience.

## Fields

| Field | Default | Purpose | Customization |
|-------|---------|---------|---------------|
| `name` | `"Mi Tienda"` | Full app name shown during install prompt | Set to the tenant's store name |
| `short_name` | `"Tienda"` | Shown under the icon on home screen (≤12 chars) | Abbreviation of store name |
| `description` | `"Tu tienda online"` | App description in store listings | Brief tagline for the store |
| `start_url` | `"/"` | URL opened when launching from home screen | Keep as `/` (locale is auto-resolved) |
| `display` | `"standalone"` | How the app appears — no browser chrome | Keep as `standalone` |
| `background_color` | `"#0a0a0a"` | Splash screen background | Match the store's dark mode background |
| `theme_color` | `"#2D5016"` | Browser toolbar color (Android) | Match `--brand` from `globals.css` |
| `orientation` | `"any"` | Screen orientation lock | Keep as `any` unless POS-only (then use `portrait`) |
| `categories` | `["shopping", "business"]` | App store categories | Keep as-is |

## Icons

Two icon files are required:

| File | Size | Purpose |
|------|------|---------|
| `/public/icon-192.png` | 192×192 | Home screen icon, app switcher |
| `/public/icon-512.png` | 512×512 | Splash screen, install prompt |

Both must be PNG with `"purpose": "any maskable"`:
- `any` — standard rectangular icon
- `maskable` — icon with safe zone for circular/shaped masks (Android)

> ⚠️ If icon files don't exist at the specified paths, PWA install will fail silently on Android.

### Creating Proper Icons

1. Start with a square logo at least 512×512
2. For `maskable` compatibility, ensure the important content is within the center 80% (safe zone)
3. Export as PNG with transparent or solid-color background matching `theme_color`

## How It's Linked

The manifest is linked in the root layout via:

```html
<link rel="manifest" href="/manifest.json" />
```

No code changes needed — just update the JSON file and icon assets.

## Per-Tenant Customization Checklist

1. ☐ Update `name` and `short_name` in `manifest.json`
2. ☐ Update `theme_color` to match `globals.css` brand color
3. ☐ Update `background_color` to match dark mode bg
4. ☐ Place `icon-192.png` and `icon-512.png` in `/public/`
5. ☐ Verify install flow on Android Chrome (DevTools → Application → Manifest)

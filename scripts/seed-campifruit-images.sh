#!/bin/bash
# seed-campifruit-images.sh — Copy & optimize Campifruit images to storefront public/
# Uses macOS native 'sips' to convert PNG → JPEG and resize to max 800px width
# Generates campifruit-image-urls.json for seed-demo.ts

set -e

SOURCE_DIR="/Users/webnorka/DESARROLLO/CAMPIFRUT/REC.GRAFICOS/Fotos Pagina/JPG"
TARGET_DIR="$(dirname "$0")/../apps/storefront/public/products/campifruit"
JSON_OUTPUT="$(dirname "$0")/campifruit-image-urls.json"

mkdir -p "$TARGET_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  📸 CAMPIFRUIT IMAGE PROCESSOR"
echo "═══════════════════════════════════════════════════════════════"
echo "  Source: $SOURCE_DIR"
echo "  Target: $TARGET_DIR"
echo ""

# Start JSON
echo "{" > "$JSON_OUTPUT"
FIRST=true

process_image() {
    local src_file="$1"
    local slug="$2"
    local src_path="$SOURCE_DIR/$src_file"
    local dst_path="$TARGET_DIR/${slug}.jpg"

    if [ ! -f "$src_path" ]; then
        echo "  ⚠️  Not found: $src_file"
        return
    fi

    local size_mb=$(du -m "$src_path" | cut -f1)

    # Copy and convert PNG to JPEG with sips (macOS native)
    sips -s format jpeg -s formatOptions 80 --resampleWidth 800 "$src_path" --out "$dst_path" >/dev/null 2>&1

    local dst_size=$(du -k "$dst_path" | cut -f1)
    echo "  ✅ ${src_file} (${size_mb}MB) → ${slug}.jpg (${dst_size}KB)"

    # Append to JSON
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo "," >> "$JSON_OUTPUT"
    fi
    printf '  "%s": "/products/campifruit/%s.jpg"' "$slug" "$slug" >> "$JSON_OUTPUT"
}

# ── Primary product thumbnails ──
echo "  ── Primary Thumbnails ──"
process_image "FRESA.png" "fresa-fresca"
process_image "FRESA 250.png" "fresa-250g"
process_image "Fresa 500.png" "fresa-500g"
process_image "MORA 250.png" "mora-250g"
process_image "mora 500.png" "mora-500g"
process_image "BREVAS.png" "breva-fresca"
process_image "BREVA 250.png" "breva-250g"
process_image "BREVAS 500.png" "breva-500g"
process_image "BREVAS 1000.png" "breva-1000g"
process_image "durazno 1.png" "durazno-fresco"
process_image "durazno 250.png" "durazno-250g"
process_image "DURAZNO 500.png" "durazno-500g"
process_image "PIÑAS.png" "pina-entera"
process_image "PIÑA 250.png" "pina-250g"
process_image "PIÑA 1000.png" "pina-1000g"
process_image "PIÑA EN RODAJAS.png" "pina-rodajas"
process_image "PIÑA RODAJA 1000.png" "pina-rodajas-1000g"
process_image "PIÑA CUBO.png" "pina-cubos"
process_image "piña cubo 1.png" "pina-cubos-1"
process_image "PIÑA TROZOS.png" "pina-trozos"
process_image "GLASE DE FRESA.png" "glase-fresa"
process_image "GLASE DE MORA.png" "glase-mora"
process_image "MERMELADA MORA 1.png" "mermelada-mora"
process_image "mermelada de mora.png" "mermelada-mora-alt"

# ── Gallery images ──
echo ""
echo "  ── Gallery Images ──"
process_image "FRESAS.png" "fresas-galeria"
process_image "FRESA 1.png" "fresa-1-galeria"
process_image "2 FRESA 500.png" "fresa-500-alt"
process_image "BREVAS 1.png" "brevas-1-galeria"
process_image "BREVAS 2.png" "brevas-2-galeria"
process_image "DURAZNO 2.png" "durazno-2-galeria"
process_image "DURAZNO 3.png" "durazno-3-galeria"
process_image "DURAZNO 4.png" "durazno-4-galeria"
process_image "PIÑA 1.png" "pina-1-galeria"
process_image "PIÑA 3.png" "pina-3-galeria"
process_image "PIÑA 4.png" "pina-4-galeria"
process_image "PIÑA 5.png" "pina-5-galeria"
process_image "PIÑA 6.png" "pina-6-galeria"
process_image "PIÑA 7.png" "pina-7-galeria"
process_image "PIÑA 8.png" "pina-8-galeria"
process_image "piña 1000g.png" "pina-1000g-alt"
process_image "PIÑA EN RODAJA 1.png" "pina-rodaja-1"
process_image "PIÑA EN RODAJA 2.png" "pina-rodaja-2"
process_image "PIÑA EN RODAJAS 3.png" "pina-rodajas-3"
process_image "GLASSE FRESA.png" "glase-fresa-alt"
process_image "GLASE MORA.png" "glase-mora-alt"

# Close JSON
echo "" >> "$JSON_OUTPUT"
echo "}" >> "$JSON_OUTPUT"

echo ""
echo "═══════════════════════════════════════════════════════════════"
TOTAL=$(ls -1 "$TARGET_DIR"/*.jpg 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$TARGET_DIR" | cut -f1)
echo "  🎉 DONE: $TOTAL images processed ($TOTAL_SIZE total)"
echo "  📁 Images: $TARGET_DIR"
echo "  📋 URL map: $JSON_OUTPUT"
echo "═══════════════════════════════════════════════════════════════"

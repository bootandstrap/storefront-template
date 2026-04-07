#!/usr/bin/env python3
"""
Update governance-contract.json with all remediation fixes.
Run: python3 scripts/update-contract.py
"""
import json
import sys
from pathlib import Path

CONTRACT = Path("apps/storefront/src/lib/governance-contract.json")
c = json.loads(CONTRACT.read_text())

# ─── 1. Add new flags (sorted alpha) ──────────────────────────────────────
new_flags = [
    'enable_2fa',
    'enable_apple_oauth',
    'enable_crm_contacts',
    'enable_crm_interactions',
    'enable_crm_segments',
    'enable_custom_webhooks',
    'enable_email_segmentation',
    'enable_facebook_oauth',
    'enable_kiosk_analytics',
    'enable_kiosk_idle_timer',
    'enable_kiosk_remote_management',
    'enable_magic_link',
    'enable_reservation_checkout',
    'enable_review_request_emails',
    'enable_seo_tools',
    'enable_social_sharing',
    'enable_transactional_emails',
]

all_flags = sorted(set(c['flags']['keys'] + new_flags))
c['flags']['keys'] = all_flags
c['flags']['count'] = len(all_flags)

# ─── 2. Add new limits ───────────────────────────────────────────────────
new_limits = ['max_automations', 'max_pos_kiosk_devices']
all_limits_keys = sorted(set(c['limits']['keys'] + new_limits))
c['limits']['keys'] = all_limits_keys
c['limits']['count'] = len(all_limits_keys)
# Update numeric_keys (add new limits that are numeric)
numeric = sorted(set(c['limits']['numeric_keys'] + new_limits))
c['limits']['numeric_keys'] = numeric

# ─── 3. Add new flags to groups ──────────────────────────────────────────
groups = c['flags']['groups']

# Auth group
groups['___auth___accounts']['flags'].extend([
    f for f in ['enable_2fa', 'enable_apple_oauth', 'enable_facebook_oauth', 
                'enable_magic_link']
    if f not in groups['___auth___accounts']['flags']
])

# CRM group
groups['___crm']['flags'].extend([
    f for f in ['enable_crm_contacts', 'enable_crm_interactions', 'enable_crm_segments']
    if f not in groups['___crm']['flags']
])

# Email group
groups['___email_marketing']['flags'].extend([
    f for f in ['enable_transactional_emails', 'enable_review_request_emails', 
                'enable_email_segmentation']
    if f not in groups['___email_marketing']['flags']
])

# Content/POS group — add kiosk flags
groups['___content___discovery']['flags'].extend([
    f for f in ['enable_kiosk_analytics', 'enable_kiosk_idle_timer', 
                'enable_kiosk_remote_management']
    if f not in groups['___content___discovery']['flags']
])

# Business group
if 'enable_social_sharing' not in groups['___business___branding']['flags']:
    groups['___business___branding']['flags'].append('enable_social_sharing')

# System group
for f in ['enable_custom_webhooks', 'enable_seo_tools']:
    if f not in groups['___system']['flags']:
        groups['___system']['flags'].append(f)

# Checkout group
if 'enable_reservation_checkout' not in groups['___checkout']['flags']:
    groups['___checkout']['flags'].append('enable_reservation_checkout')

# ─── 4. Fix auth_advanced — rename google_oauth → google_auth ────────────
for m in c['modules']['catalog']:
    if m['key'] == 'auth_advanced':
        for t in m['tiers']:
            effects = t.get('flag_effects', {})
            if 'enable_google_oauth' in effects:
                effects['enable_google_auth'] = effects.pop('enable_google_oauth')
            # Also add enable_auth_advanced meta-flag to all tiers
            effects['enable_auth_advanced'] = True

# ─── 5. Connect orphan meta-flags to their modules ──────────────────────
for m in c['modules']['catalog']:
    if m['key'] == 'sales_channels':
        for t in m['tiers']:
            t.setdefault('flag_effects', {})['enable_sales_channels'] = True
    elif m['key'] == 'seo':
        for t in m['tiers']:
            t.setdefault('flag_effects', {})['enable_seo'] = True
    elif m['key'] == 'rrss':
        for t in m['tiers']:
            effects = t.get('flag_effects', {})
            effects['enable_social_media'] = True
            t['flag_effects'] = effects

# ─── 6. Fix pos_kiosk — add flag_effects + limit_effects ─────────────────
for m in c['modules']['catalog']:
    if m['key'] == 'pos_kiosk':
        m['tiers'] = [
            {
                "key": "basic",
                "name": "Kiosco Basic",
                "price_chf": 15,
                "features": [
                    "Modo pantalla completa (F11)",
                    "UI simplificada sin barra de gestión",
                    "Bloqueo de navegación (sin salir del kiosco)",
                    "Logo de negocio en pantalla de espera",
                    "1 dispositivo kiosco"
                ],
                "recommended": False,
                "flag_effects": {
                    "enable_pos_kiosk": True,
                    "enable_kiosk_idle_timer": True
                },
                "limit_effects": {
                    "max_pos_kiosk_devices": 1
                }
            },
            {
                "key": "pro",
                "name": "Kiosco Pro",
                "price_chf": 30,
                "features": [
                    "Todo de Basic incluido",
                    "Pantalla de espera personalizable (imágenes, vídeo)",
                    "Hasta 3 tablets simultáneos",
                    "Modo offline con sincronización",
                    "Temporizador de inactividad configurable",
                    "Analítica de uso por dispositivo"
                ],
                "recommended": True,
                "flag_effects": {
                    "enable_pos_kiosk": True,
                    "enable_pos_multi_device": True,
                    "enable_pos_offline_cart": True,
                    "enable_kiosk_idle_timer": True,
                    "enable_kiosk_analytics": True
                },
                "limit_effects": {
                    "max_pos_kiosk_devices": 3
                }
            },
            {
                "key": "enterprise",
                "name": "Kiosco Enterprise",
                "price_chf": 50,
                "features": [
                    "Todo de Pro incluido",
                    "Dispositivos ilimitados",
                    "Gestión remota de kioscos",
                    "Analítica avanzada por dispositivo",
                    "Configuración centralizada desde panel"
                ],
                "recommended": False,
                "flag_effects": {
                    "enable_pos_kiosk": True,
                    "enable_pos_multi_device": True,
                    "enable_pos_offline_cart": True,
                    "enable_kiosk_idle_timer": True,
                    "enable_kiosk_analytics": True,
                    "enable_kiosk_remote_management": True
                },
                "limit_effects": {
                    "max_pos_kiosk_devices": 99
                }
            }
        ]

# ─── 7. Validate ─────────────────────────────────────────────────────────
all_contract_flags = set(c['flags']['keys'])
all_contract_limits = set(c['limits']['keys'])
phantom_flags = set()
phantom_limits = set()
modules_without_effects = []

for m in c['modules']['catalog']:
    has_any_effects = False
    for t in m['tiers']:
        for f in t.get('flag_effects', {}).keys():
            if f not in all_contract_flags:
                phantom_flags.add(f)
        for l in t.get('limit_effects', {}).keys():
            if l not in all_contract_limits:
                phantom_limits.add(l)
        if t.get('flag_effects'):
            has_any_effects = True
    if not has_any_effects:
        modules_without_effects.append(m['key'])

if phantom_flags:
    print(f"❌ PHANTOM FLAGS: {phantom_flags}")
    sys.exit(1)
if phantom_limits:
    print(f"❌ PHANTOM LIMITS: {phantom_limits}")
    sys.exit(1)
if modules_without_effects:
    print(f"❌ MODULES WITHOUT EFFECTS: {modules_without_effects}")
    sys.exit(1)

# ─── 8. Write ─────────────────────────────────────────────────────────────
CONTRACT.write_text(json.dumps(c, indent=2, ensure_ascii=False) + '\n')

print(f"✅ Contract updated: {c['flags']['count']} flags, {c['limits']['count']} limits")
print(f"✅ Zero phantom flags, zero phantom limits")
print(f"✅ All {len(c['modules']['catalog'])} modules have flag_effects")

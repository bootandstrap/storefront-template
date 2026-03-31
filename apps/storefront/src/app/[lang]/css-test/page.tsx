/**
 * CSS Test Page — Visual audit of all design system tokens under Turbopack.
 * Route: /es/css-test
 * DELETE THIS FILE before production deploy.
 */
export default function CSSTestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
        🎨 CSS Token Test — RELOAD 2 (static @theme fix)
      </h1>

      {/* ========== SECTION 1: Brand Colors (custom namespace) ========== */}
      <Section title="1. Brand Tokens (--color-brand / --color-sec / --color-accent)">
        <SwatchRow label="brand" colors={[
          { cls: 'bg-brand', label: 'bg-brand' },
          { cls: 'bg-brand-light', label: 'bg-brand-light' },
          { cls: 'bg-brand-dark', label: 'bg-brand-dark' },
          { cls: 'bg-brand-subtle', label: 'bg-brand-subtle' },
          { cls: 'bg-brand-muted', label: 'bg-brand-muted' },
          { cls: 'bg-brand-emphasis', label: 'bg-brand-emphasis' },
        ]} />
        <SwatchRow label="sec/accent" colors={[
          { cls: 'bg-sec', label: 'bg-sec' },
          { cls: 'bg-sec-light', label: 'bg-sec-light' },
          { cls: 'bg-accent', label: 'bg-accent' },
          { cls: 'bg-accent-light', label: 'bg-accent-light' },
        ]} />
      </Section>

      {/* ========== SECTION 2: UUI brand-* scale ========== */}
      <Section title="2. UUI brand-* Scale (should be GREEN, not purple)">
        <SwatchRow label="brand-*" colors={[
          { cls: 'bg-brand-50', label: '50' },
          { cls: 'bg-brand-100', label: '100' },
          { cls: 'bg-brand-200', label: '200' },
          { cls: 'bg-brand-300', label: '300' },
          { cls: 'bg-brand-400', label: '400' },
          { cls: 'bg-brand-500', label: '500' },
          { cls: 'bg-brand-600', label: '600' },
          { cls: 'bg-brand-700', label: '700' },
          { cls: 'bg-brand-800', label: '800' },
          { cls: 'bg-brand-900', label: '900' },
          { cls: 'bg-brand-950', label: '950' },
        ]} />
      </Section>

      {/* ========== SECTION 3: Surfaces ========== */}
      <Section title="3. Surface Tokens (sf-0 → sf-3)">
        <SwatchRow label="surfaces" colors={[
          { cls: 'bg-sf-0', label: 'sf-0' },
          { cls: 'bg-sf-1', label: 'sf-1' },
          { cls: 'bg-sf-2', label: 'sf-2' },
          { cls: 'bg-sf-3', label: 'sf-3' },
        ]} />
      </Section>

      {/* ========== SECTION 4: Text hierarchy ========== */}
      <Section title="4. Text Tokens">
        <div className="space-y-1">
          <p className="text-tx font-semibold">text-tx — Primary text (should be dark green-black)</p>
          <p className="text-tx-sec">text-tx-sec — Secondary text</p>
          <p className="text-tx-muted">text-tx-muted — Muted text</p>
          <p className="text-tx-inv bg-brand p-2 rounded">text-tx-inv on bg-brand — Inverted (white on green)</p>
        </div>
      </Section>

      {/* ========== SECTION 5: Buttons ========== */}
      <Section title="5. Buttons (.btn classes)">
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary">Primary</button>
          <button className="btn btn-secondary">Secondary</button>
          <button className="btn btn-ghost">Ghost</button>
          <button className="btn btn-accent">Accent</button>
          <button className="btn btn-danger">Danger</button>
          <button className="btn btn-whatsapp">WhatsApp</button>
        </div>
      </Section>

      {/* ========== SECTION 6: Tailwind utility buttons ========== */}
      <Section title="6. Tailwind Utility Buttons (inline classes)">
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">
            bg-brand text-white
          </button>
          <button className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold">
            bg-brand-600 text-white
          </button>
          <button className="px-4 py-2 rounded-lg bg-sec text-white font-semibold">
            bg-sec text-white
          </button>
          <button className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold">
            bg-gray-900 text-white
          </button>
          <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold">
            bg-emerald-600 text-white
          </button>
          <button className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold">
            border outline btn
          </button>
        </div>
      </Section>

      {/* ========== SECTION 7: UUI semantic tokens ========== */}
      <Section title="7. UUI Semantic Tokens (bg-*, fg-*, text-*)">
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-3 rounded-lg bg-bg-brand-solid text-white text-sm font-medium">
            bg-bg-brand-solid (should be green)
          </div>
          <div className="px-4 py-3 rounded-lg bg-bg-brand-primary text-sm font-medium">
            bg-bg-brand-primary (light green bg)
          </div>
          <div className="px-4 py-3 rounded-lg bg-bg-error-solid text-white text-sm font-medium">
            bg-bg-error-solid (red)
          </div>
          <div className="px-4 py-3 rounded-lg bg-bg-success-solid text-white text-sm font-medium">
            bg-bg-success-solid (green)
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <span className="text-fg-brand-primary font-semibold">fg-brand-primary</span>
          <span className="text-fg-error-primary font-semibold">fg-error-primary</span>
          <span className="text-fg-success-primary font-semibold">fg-success-primary</span>
          <span className="text-text-primary font-semibold">text-primary (gray-900)</span>
          <span className="text-text-secondary font-semibold">text-secondary (gray-700)</span>
          <span className="text-text-tertiary font-semibold">text-tertiary (gray-600)</span>
        </div>
      </Section>

      {/* ========== SECTION 8: Borders & Focus ========== */}
      <Section title="8. Borders & Rings">
        <div className="flex flex-wrap gap-3">
          <div className="w-24 h-16 rounded-lg border-2 border-brand flex items-center justify-center text-xs">brand</div>
          <div className="w-24 h-16 rounded-lg border-2 border-border-primary flex items-center justify-center text-xs">border-primary</div>
          <div className="w-24 h-16 rounded-lg border-2 border-border-brand flex items-center justify-center text-xs">border-brand</div>
          <div className="w-24 h-16 rounded-lg ring-2 ring-brand/40 flex items-center justify-center text-xs">ring brand/40</div>
        </div>
      </Section>

      {/* ========== SECTION 9: Inputs ========== */}
      <Section title="9. Form Inputs">
        <div className="flex flex-wrap gap-3 max-w-lg">
          <input className="input" placeholder=".input class" />
          <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand" placeholder="Tailwind inline input" />
        </div>
      </Section>

      {/* ========== SECTION 10: Shadows ========== */}
      <Section title="10. Shadows">
        <div className="flex flex-wrap gap-6">
          <div className="w-32 h-20 rounded-xl bg-white shadow-card flex items-center justify-center text-xs">shadow-card</div>
          <div className="w-32 h-20 rounded-xl bg-white shadow-card-hover flex items-center justify-center text-xs">card-hover</div>
          <div className="w-32 h-20 rounded-xl bg-white shadow-glass flex items-center justify-center text-xs">shadow-glass</div>
          <div className="w-32 h-20 rounded-xl bg-white shadow-float flex items-center justify-center text-xs">shadow-float</div>
          <div className="w-32 h-20 rounded-xl bg-white shadow-brand-soft flex items-center justify-center text-xs">brand-soft</div>
        </div>
      </Section>

      {/* ========== SECTION 11: Palette colors (extras not in UUI) ========== */}
      <Section title="11. Palette Extras (slate, zinc, emerald, sky, amber, red)">
        <SwatchRow label="slate" colors={[
          { cls: 'bg-slate-100', label: '100' },
          { cls: 'bg-slate-300', label: '300' },
          { cls: 'bg-slate-500', label: '500' },
          { cls: 'bg-slate-700', label: '700' },
          { cls: 'bg-slate-900', label: '900' },
        ]} />
        <SwatchRow label="emerald" colors={[
          { cls: 'bg-emerald-100', label: '100' },
          { cls: 'bg-emerald-300', label: '300' },
          { cls: 'bg-emerald-500', label: '500' },
          { cls: 'bg-emerald-700', label: '700' },
        ]} />
        <SwatchRow label="red" colors={[
          { cls: 'bg-red-100', label: '100' },
          { cls: 'bg-red-300', label: '300' },
          { cls: 'bg-red-500', label: '500' },
          { cls: 'bg-red-700', label: '700' },
        ]} />
      </Section>

      {/* ========== RAW CSS VAR TEST ========== */}
      <Section title="12. Raw var() Test (inline styles)">
        <div className="flex flex-wrap gap-3">
          <div style={{ background: 'var(--color-brand)', color: 'white', padding: '8px 16px', borderRadius: 8 }}>
            var(--color-brand)
          </div>
          <div style={{ background: 'var(--color-brand-600)', color: 'white', padding: '8px 16px', borderRadius: 8 }}>
            var(--color-brand-600)
          </div>
          <div style={{ background: 'var(--color-sec)', color: 'white', padding: '8px 16px', borderRadius: 8 }}>
            var(--color-sec)
          </div>
          <div style={{ background: 'var(--color-sf-2)', padding: '8px 16px', borderRadius: 8 }}>
            var(--color-sf-2)
          </div>
        </div>
      </Section>
    </div>
  )
}

/* ── Helper Components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>{title}</h2>
      {children}
    </section>
  )
}

function SwatchRow({ label, colors }: { label: string; colors: { cls: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{label}</span>
      {colors.map((c) => (
        <div key={c.cls} style={{ textAlign: 'center' }}>
          <div className={c.cls} style={{ width: 56, height: 40, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }} />
          <span style={{ fontSize: 10, color: '#9ca3af' }}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

'use client'

/**
 * PanelDashboardStyles — Runtime CSS Injector for Premium Dashboard Styling
 * 
 * Required because Turbopack aggressively tree-shakes vanilla CSS classes 
 * in globals.css that aren't recognized as Tailwind utilities or used in 
 * Client Components. Since our dashboard uses React Server Components heavily,
 * these Awwwards-level premium styles get dropped from the CSS chunk.
 * 
 * Injecting them at runtime guarantees they are evaluated across the entire
 * owner panel (injected via (panel)/layout.tsx).
 */
export default function PanelDashboardStyles() {
    return (
        <style dangerouslySetInnerHTML={{
            __html: `
/* ========================================================================
   PREMIUM DASHBOARD — Awwwards-Level Design System Extensions
   Phase 1: Animated borders, bento grid, elevated cards, scroll-reveal,
            premium glass overlays, sidebar glow, dark mode native
   ======================================================================== */

/* ── Animated Gradient Border (conic spin) ── */
@keyframes border-spin {
  0% { --border-angle: 0deg; }
  100% { --border-angle: 360deg; }
}

@property --border-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.glow-border {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-card);
}

.glow-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--border-angle),
    #2D5016,
    #8BC34A,
    #FF9800,
    #2D5016
  );
  animation: border-spin 4s linear infinite;
  z-index: -1;
  opacity: 0.5;
  filter: blur(2px);
}

.glow-border::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: var(--color-sf-0);
  z-index: -1;
}

.dark .glow-border::after {
  background: var(--color-sf-0);
}

/* ── Premium Card Elevation ── */
.card-elevated {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.card-elevated:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(45, 80, 22, 0.12),
              0 8px 16px -8px rgba(0, 0, 0, 0.06);
}

.dark .card-elevated:hover {
  box-shadow: 0 20px 40px -12px rgba(139, 195, 74, 0.1),
              0 8px 16px -8px rgba(0, 0, 0, 0.3);
}

/* ── Bento Grid Layout System ── */
.bento-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(12, 1fr);
    gap: 1.25rem;
  }

  .bento-hero { grid-column: span 8; }
  .bento-aside { grid-column: span 4; }
  .bento-half { grid-column: span 6; }
  .bento-third { grid-column: span 4; }
  .bento-quarter { grid-column: span 3; }
  .bento-full { grid-column: span 12; }
  .bento-two-thirds { grid-column: span 8; }
  .bento-wide { grid-column: span 9; }
  .bento-narrow { grid-column: span 3; }
}

/* ── Premium Glass with Noise Texture ── */
.glass-premium {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(190%);
  -webkit-backdrop-filter: blur(16px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04),
              inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.glass-premium::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

.dark .glass-premium {
  background: rgba(15, 26, 10, 0.75);
  border-color: rgba(139, 195, 74, 0.12);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(139, 195, 74, 0.06);
}

/* ── Scroll Reveal Animation ── */
@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes reveal-scale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.reveal-on-scroll {
  animation: reveal-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.reveal-on-scroll-scale {
  animation: reveal-scale 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── Dashboard Welcome Hero Card ── */
@keyframes mesh-gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hero-welcome {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-card);
  background: linear-gradient(-45deg,
    #2D5016,
    #234010,
    #3d6b1e,
    #4a8030
  );
  background-size: 300% 300%;
  animation: mesh-gradient 8s ease infinite;
  color: white;
}

.hero-welcome::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(at 70% 30%, rgba(139, 195, 74, 0.25) 0%, transparent 60%),
              radial-gradient(at 20% 80%, rgba(255, 152, 0, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.hero-welcome::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  pointer-events: none;
}

/* ── StatCard Premium Variants ── */
.stat-card-premium {
  position: relative;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              border-color 0.3s;
}

.stat-card-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -8px rgba(45, 80, 22, 0.1),
              0 4px 10px -4px rgba(0, 0, 0, 0.04);
}

.dark .stat-card-premium:hover {
  box-shadow: 0 12px 28px -8px rgba(139, 195, 74, 0.08),
              0 4px 10px -4px rgba(0, 0, 0, 0.3);
}

.stat-card-premium .stat-icon-ring {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.3s;
}

.stat-card-premium:hover .stat-icon-ring {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 16px -4px rgba(45, 80, 22, 0.15);
}

.dark .stat-card-premium:hover .stat-icon-ring {
  box-shadow: 0 6px 16px -4px rgba(139, 195, 74, 0.12);
}

/* Subtle gradient overlay for stat cards */
.stat-card-premium::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s;
  background: linear-gradient(135deg,
    rgba(45, 80, 22, 0.02) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.stat-card-premium:hover::after {
  opacity: 1;
}

/* ── Sidebar Premium Active Glow ── */
.sidebar-link-glow {
  position: relative;
  background: rgba(45, 80, 22, 0.06);
  border-radius: 12px;
}

.sidebar-link-glow::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, #8BC34A, #2D5016);
  box-shadow: 0 0 12px rgba(139, 195, 74, 0.3);
}

.dark .sidebar-link-glow {
  background: rgba(139, 195, 74, 0.08);
}

.dark .sidebar-link-glow::before {
  box-shadow: 0 0 12px rgba(139, 195, 74, 0.2);
}

/* ── Timeline Connector for Activity Feed ── */
.timeline-connector {
  position: relative;
}

.timeline-connector::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 32px;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg,
    var(--color-sf-3) 0%,
    transparent 100%
  );
}

.dark .timeline-connector::before {
  background: linear-gradient(180deg,
    rgba(139, 195, 74, 0.1) 0%,
    transparent 100%
  );
}

/* ── Quick Action Cards v2 ── */
.quick-action-v2 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 1.25rem 1rem;
  border-radius: var(--radius-card);
  background: var(--color-sf-0);
  border: 1px solid var(--color-sf-2);
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
  text-decoration: none;
  color: var(--color-tx);
  position: relative;
  overflow: hidden;
}

.quick-action-v2::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s;
  background: linear-gradient(135deg,
    rgba(45, 80, 22, 0.04) 0%,
    rgba(139, 195, 74, 0.04) 100%
  );
  pointer-events: none;
}

.quick-action-v2:hover {
  border-color: var(--color-brand);
  transform: translateY(-3px);
  box-shadow: 0 12px 24px -8px rgba(45, 80, 22, 0.12);
}

.quick-action-v2:hover::before {
  opacity: 1;
}

.dark .quick-action-v2 {
  background: var(--color-sf-1);
  border-color: rgba(139, 195, 74, 0.1);
}

.dark .quick-action-v2:hover {
  border-color: rgba(139, 195, 74, 0.3);
  box-shadow: 0 12px 24px -8px rgba(139, 195, 74, 0.08);
}

.quick-action-v2 .quick-action-icon-v2 {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2D5016, #4a8030);
  color: white;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.3s;
}

.quick-action-v2:hover .quick-action-icon-v2 {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 8px 20px -4px rgba(45, 80, 22, 0.25);
}

/* ── Floating Animation for Empty States ── */
@keyframes gentle-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.animate-float {
  animation: gentle-float 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* ── Pulsing Accent Underline ── */
@keyframes accent-pulse {
  0%, 100% { opacity: 0.4; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1); }
}

.accent-underline {
  position: relative;
  display: inline-block;
}

.accent-underline::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(90deg, var(--color-brand), var(--color-sec));
  animation: accent-pulse 3s ease-in-out infinite;
}

/* ── Avatar Online Ring ── */
@keyframes avatar-ring-pulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--color-sf-0), 0 0 0 4px rgba(34, 197, 94, 0.3); }
  50% { box-shadow: 0 0 0 2px var(--color-sf-0), 0 0 0 6px rgba(34, 197, 94, 0.15); }
}

.avatar-online-ring {
  border-radius: 9999px;
  animation: avatar-ring-pulse 3s ease-in-out infinite;
}

/* ── Section Divider with Gradient ── */
.section-divider {
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--color-sf-3) 20%,
    var(--color-sf-3) 80%,
    transparent 100%
  );
  margin: 0.5rem 0;
}

.dark .section-divider {
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(139, 195, 74, 0.1) 20%,
    rgba(139, 195, 74, 0.1) 80%,
    transparent 100%
  );
}

/* ── Shimmer Slide (for skeleton loaders) ── */
@keyframes shimmer-slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

/* ── SOTA Core Toolkit (Phase 1) ── */

/* SOTA Bento Grid Wrapper */
.sota-bento-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  grid-auto-flow: dense;
}
@media (min-width: 768px) {
  .sota-bento-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .sota-bento-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
}

/* SOTA Glass Card / Glowing Container */
.sota-glass-card {
  position: relative;
  background: var(--color-sf-0);
  border-radius: 20px;
  border: 1px solid rgba(139, 195, 74, 0.15); /* Brand tint */
  padding: 1.5rem;
  box-shadow: 0 4px 24px -8px rgba(45, 80, 22, 0.08);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1),
              border-color 0.4s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dark .sota-glass-card {
  background: rgba(10, 15, 8, 0.4);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-color: rgba(139, 195, 74, 0.08);
  box-shadow: 0 4px 24px -8px rgba(0, 0, 0, 0.5), 
              inset 0 1px 1px rgba(255, 255, 255, 0.04);
}
.sota-glass-card:hover {
  transform: translateY(-4px) scale(1.005);
  box-shadow: 0 16px 40px -12px rgba(45, 80, 22, 0.15);
  border-color: rgba(139, 195, 74, 0.3);
}
.dark .sota-glass-card:hover {
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.8),
              0 0 20px rgba(139, 195, 74, 0.05); /* subtle brand glow */
}

/* SOTA Grain Texture */
.sota-noise-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  opacity: 0.03;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E");
}
.dark .sota-noise-overlay {
  opacity: 0.05;
}

/* SOTA Typography Imperial */
.sota-metric-value {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 4rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--color-tx);
}

/* Reduced motion safety */
@media (prefers-reduced-motion: reduce) {
  .glow-border::before,
  .hero-welcome,
  .animate-float,
  .avatar-online-ring,
  .accent-underline::after {
    animation: none !important;
  }
  .card-elevated:hover,
  .stat-card-premium:hover,
  .quick-action-v2:hover,
  .sota-glass-card:hover {
    transform: none !important;
  }
}
            `
        }} />
    )
}

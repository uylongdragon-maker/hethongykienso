# Design System: Hệ Thống Tiếp Nhận & Giải Quyết Kiến Nghị (Ý Kiến Số)

## 1. Visual Theme & Atmosphere
A clinical yet warm, high-agency administrative dashboard interface with confident asymmetric layouts, deep slate obsidian canvas, and fluid spring-physics motion. The visual tone balances authoritative public sector governance with cutting-edge digital craftsmanship — zero bureaucracy fluff, zero generic enterprise templates.

- **Density:** 5 (Balanced administrative clarity with spacious form focus)
- **Variance:** 7 (Offset asymmetric split screens for key entry points, structured grid layout for monitoring)
- **Motion:** 6 (Weighty spring physics `stiffness: 120, damping: 18`, hardware-accelerated transforms)

## 2. Color Palette & Roles
- **Canvas App Background** (`#f5f5f7`) — Primary crisp neutral surface for application container
- **Pure Surface Card** (`#ffffff`) — Elevated component, form card, and data container fill
- **Dark Obsidian Slate** (`#121316`) — Primary typography, high-contrast headings, and hero accent panel
- **Muted Steel** (`#6b7280`) — Secondary labels, metadata, timestamps, helper text
- **Whisper Structural Line** (`rgba(0, 0, 0, 0.07)`) — Crisp 1px borders, subtle table row dividers
- **Superlist Coral Accent** (`#ff4d4d`) — Singular high-contrast accent for primary CTAs, active pills, focus rings (Saturation < 80%, strictly no neon glows)
- **Status Success** (`#10b981`) — Completed petitions, active online status
- **Status Pending** (`#f59e0b`) — Processing petitions, pending review

## 3. Typography Architecture
- **Display / Headlines:** `Montserrat` (Weights: 700, 800) — Track-tight (`-0.03em`), weight-driven hierarchy, concise authoritative scaling.
- **Body:** `Montserrat` (Weights: 400, 500, 600) — Relaxed line height (`1.6`), max 65 characters per line for content blocks.
- **Monospace:** `Geist Mono` / `JetBrains Mono` / `ui-monospace` — Strictly enforced for petition tracking codes (`KN2026-001`), administrative unit codes, timestamps, and metric numbers.
- **Banned:** `Inter` is banned for display/headlines; generic unstyled serif fonts (`Times New Roman`, `Georgia`) are strictly forbidden in dashboard interfaces.

## 4. Component Stylings
- **Buttons:** Tactile flat elevation. Primary button uses Obsidian Slate (`#121316`) or Coral Accent (`#ff4d4d`) with `-1px` translate push feedback on active state. Secondary buttons use subtle outline/ghost borders. Strictly NO neon outer glows.
- **Login Hero & Cards:** Generously rounded corners (`18px` to `24px`). Subtle whisper shadow (`0 4px 24px rgba(0,0,0,0.04)`). High-density list views replace heavy shadows with crisp `1px border-top` structural lines.
- **Inputs & Forms:** Labels placed cleanly above inputs (`font-weight: 600`, `font-size: 0.8rem`). Focus rings in Dark Slate or Coral with clean `2px` offset. Error text rendered immediately below in danger hue with smooth fade-in.
- **Authentication Cards:** Asymmetric split canvas. The left panel showcases the administrative brand identity with staggered typography punctuation; the right panel presents a focused, ultra-clean login card with 1-click quick credentials selector for testing roles.
- **Loading & Micro-states:** Skeletal shimmer loaders matching exact layout dimensions — no generic circular spinners.

## 5. Layout Principles
- **Grid-First Responsive Architecture:** Multi-column dashboard layouts collapse cleanly to single-column on viewports under `768px`.
- **Asymmetric Whitespace:** Centered hero sections banned — login and portal hero sections use split screen, left-aligned, or staggered spatial zones.
- **No Element Overlapping:** Text never overlaps background graphics or images. Every functional element occupies its own spatial boundary.
- **Viewport Height:** Full-height containers enforce `min-h-[100dvh]` to eliminate iOS Safari mobile browser address bar jump bugs.

## 6. Motion & Interaction
- **GSAP & Spring Physics:** Interactive elements employ spring transitions (`stiffness: 120, damping: 18`) for a weighted, responsive feel.
- **Staggered Orchestration:** Sequential elements (nav links, login options, petition list items) reveal via staggered cascade delays (`stagger: 0.06`).
- **Hardware Acceleration:** Animations restricted to `transform` (`scale`, `translate3d`) and `opacity`.

## 7. Anti-Patterns (Banned AI Clichés)
- 🚫 **No Emojis** anywhere in the interface or system text.
- 🚫 **No `Inter` font** in display or primary branding.
- 🚫 **No pure black** (`#000000`) — always use Dark Obsidian Slate (`#121316`).
- 🚫 **No AI Purple / Neon Glows** — no purple drop shadows, no neon gradient buttons.
- 🚫 **No fake fabricated statistics** (e.g. "99.9% UPTIME", "124ms response") — display only real data.
- 🚫 **No AI Copywriting Clichés** ("Elevate", "Next-Gen", "Seamless", "Unleash").
- 🚫 **No 3-equal card rows** — use asymmetric splits or structured data tables.
- 🚫 **No generic placeholders** ("John Doe", "Acme Corp") — use realistic Vietnamese administrative context ("Phường Bình Đông", "Khu phố 12").

---
name: lading-page-design
description: Use when the user wants to design, build, or improve a landing page — including public portals, product pages, lead-generation pages, feature announcement pages, or any page whose primary goal is to convert anonymous visitors. Triggers on "landing page", "portal público", "portal de transparência", "página inicial pública", "página de apresentação", "above the fold", "hero section", "conversion", "CTA", "call to action", "visitor to lead". Applies conversion-centered design (CCD) principles and information architecture best practices.
metadata:
  version: 1.0.0
  source: created for anthropic/claude-code (inferen-sh/skills does not contain this skill)
---

# Landing Page Design

You are a conversion-centered designer specializing in institutional and civic-tech landing pages.

## Conversion-Centered Design (CCD) Principles

1. **Single primary action** — every landing page has ONE goal; everything else is secondary
2. **Above the fold** — the hero must answer: Who is this for? What do they get? Why trust you?
3. **Social proof** — numbers, testimonials, logos, certifications reduce anxiety
4. **Progressive disclosure** — lead with benefit, follow with feature, close with proof
5. **Friction removal** — every extra field, click, or second of load time costs conversions
6. **Visual focus** — use contrast, whitespace, and directional cues to guide to the CTA

## Page Architecture (AIDA)

```
ATTENTION  → Hero: headline + subheadline + primary CTA
INTEREST   → Problem statement or "who this is for"
DESIRE     → Key benefits (3–5 max), social proof, numbers
ACTION     → Repeated CTA with low-friction offer
```

## For Public/Institutional Portals (civic-tech)

The goal shifts from commercial conversion to **trust + transparency**:
- Lead with **what citizens can do** (consult, follow, download)
- Show **recency** prominently (last updated, latest items)
- Display **access statistics** (transparency metrics build trust)
- Use **government/institutional visual language** (formal, accessible, never flashy)
- Ensure **screen reader accessibility** and **keyboard navigation**
- Support **low-bandwidth users** (minimal JS, fast first paint)

## Hero Section Formula

```
[Logo/Institution name]
[Headline: primary benefit in ≤ 10 words]
[Subheadline: who it's for + what they can find]
[Search bar OR primary CTA button]
[Trust signal: "X proposições em tramitação" / "Dados abertos conforme LAI"]
```

## Common Mistakes to Fix

- Headline that describes the system instead of the user's outcome
- No empty state for search (users get frustrated and leave)
- Stats section with no context (show change over time, not just current value)
- No mobile menu or collapsed nav for small screens
- Missing meta tags (title, description, og:image) for social sharing

## Before Building

1. Who is the primary visitor? (citizen, journalist, researcher, opposing party staff)
2. What is the ONE thing they need to find/do?
3. What makes this institution/portal trustworthy?
4. What data is available and how fresh is it?

## Output

For a new landing page:
1. Information architecture sketch (sections in order)
2. Hero copy (headline + subheadline + CTA text)
3. Component code (responsive, accessible)
4. Meta tags for SEO/social

For an existing page:
1. Audit against CCD checklist
2. Prioritized improvements (high impact, low effort first)
3. Revised code for top 3 issues

---
# curebase-54ia
title: Staff use a designed participant form and table
status: todo
type: feature
created_at: 2026-11-04T21:41:56Z
updated_at: 2026-11-04T21:41:56Z
---

## What to build

Replace the unstyled page with a designed one: Tailwind CSS, one centralized theme, and styled form fields, buttons, warnings, errors, the BMI filter, the participant table, paging and the loading overlay.

## Open decision

UI library on top of Tailwind (to settle before starting; record in an ADR):
- shadcn/ui (recommended): Radix-based, accessible components copied into the repo, themed by CSS variables
- daisyUI: Tailwind plugin with class-based components and themes
- hand-built components on plain Tailwind

## Acceptance criteria

- [ ] Tailwind is set up in the frontend; theme tokens (colours, radius, spacing, typography) live in one place
- [ ] Form fields, unit selects, buttons, field errors and soft-range warnings use the shared components
- [ ] The participant table, BMI filter, paging and loading overlay are styled and readable on narrow screens
- [ ] Accessibility kept: labels, focus rings, error announcements, aria-busy
- [ ] Page-level tests still pass unchanged (they query by role and label, not by markup)

# GitSplits Product Design Document

## Overview

GitSplits is a platform that enables fair compensation for open source contributors through AI-powered analysis and blockchain-based payments. This document outlines the product design philosophy, UI/UX improvements, and future recommendations.

## Core Value Proposition

**For Project Maintainers:**
- Easily distribute funds to contributors based on actual contributions
- Transparent, verifiable calculation of splits
- Simple one-command operation via AI agent

**For Contributors:**
- Fair compensation for open source work
- Secure wallet verification process
- Clear visibility into how splits are calculated

## Design Philosophy

### 1. Trust Through Transparency
- Show exactly how contributions are calculated
- Provide cryptographic proofs (TEE attestations)
- Clear communication about security measures

### 2. Simplicity First
- One-command operation for common tasks
- Progressive disclosure of advanced features
- Minimal cognitive load for new users

### 3. Professional Yet Approachable
- Clean, modern design language
- Friendly micro-interactions and animations
- Clear visual hierarchy

## UI/UX Improvements Implemented

### Dark Mode Support
- Full dark mode implementation with system preference detection
- Carefully chosen color palette for readability
- Smooth transitions between themes
- Persistent theme preference storage

### Visual Enhancements
- **Glass Morphism**: Subtle backdrop blur effects on cards
- **Gradient Backgrounds**: Dynamic gradients that adapt to theme
- **Smooth Animations**: Framer Motion for page transitions and micro-interactions
- **Hover Effects**: Lift and shadow effects for interactive elements
- **Loading States**: Shimmer effects and animated loaders

### Navigation Improvements
- **Sticky Header**: Glass-morphism header that adapts on scroll
- **Mobile-First**: Responsive navigation with hamburger menu
- **Active States**: Clear visual indication of current page
- **Theme Toggle**: Easy access to dark/light mode switcher

### Component Upgrades
- **Cards**: Improved shadows, borders, and hover states
- **Buttons**: Gradient primary buttons, better focus states
- **Inputs**: Better contrast, clear focus rings
- **Tabs**: Icon-enhanced tabs with smooth transitions

## Information Architecture

### Landing Page
```
Hero Section
├── Trust Badge (EigenCompute)
├── Headline + Subheadline
├── Primary CTAs (Try Agent, Connect Wallet)
├── Repo Analysis Widget
│   ├── Input Field
│   ├── Quick Picks
│   └── Results Display
└── Secondary Features Link

Features Section
├── Why Gitsplits? (3-column grid)
└── Feature cards with icons

How It Works
├── 4-step process visualization
└── Connecting arrows between steps

Security Section
├── EigenCompute deep-dive
├── 3-column security features
└── External link to learn more

CTA Section
├── Final conversion push
├── Trust badges
└── Secondary actions

Footer
├── Social links
├── Attribution
└── Copyright
```

### Dashboard
```
Header
├── Page title + description
└── Quick actions

Wallet Status Bar
├── Connection status
└── Network info

Tab Navigation
├── Verification
├── X Commands
├── NEAR Contract
└── Overview

Tab Content Areas
├── Verification Center
├── Command Guide
├── Contract Manager
└── Overview Dashboard
    ├── Stats Grid
    ├── Value Props
    └── Recent Activity
```

## Color System

### Light Mode
- **Background**: Gradient from gentle-blue → gentle-purple → gentle-orange
- **Cards**: White with 80% opacity + backdrop blur
- **Text**: Gray-900 (headings), Gray-600 (body), Gray-500 (secondary)
- **Primary**: Blue-600 to Purple-600 gradient
- **Accent**: Teal for highlights

### Dark Mode
- **Background**: Deep gradient from blue-950 → purple-950 → orange-950
- **Cards**: Gray-900 with 80% opacity + backdrop blur
- **Text**: White (headings), Gray-300 (body), Gray-400 (secondary)
- **Primary**: Brighter Blue-500 to Purple-500 gradient
- **Accent**: Brighter Teal for highlights

## Typography

- **Headings**: Bold, tight tracking for impact
- **Body**: Comfortable line height (1.6) for readability
- **Labels**: Uppercase with wide tracking for UI elements
- **Code**: Monospace for technical content

## Animation Guidelines

### Page Load
- Staggered fade-in from top to bottom
- 0.6s duration with ease-out easing
- 0.1s delay between elements

### Interactions
- **Hover**: 0.2s transition for immediate feedback
- **Focus**: 0.15s for snappy feel
- **Page Transitions**: 0.3s slide + fade

### Micro-interactions
- Button hover: Scale 1.02 + shadow increase
- Card hover: Translate Y -4px + shadow
- Icon hover: Subtle bounce or rotation

## Responsive Breakpoints

- **Mobile**: < 640px (single column, stacked layout)
- **Tablet**: 640px - 1024px (2-column grids)
- **Desktop**: > 1024px (full layout, 3-4 column grids)

## Accessibility Considerations

- WCAG 2.1 AA compliance target
- Minimum contrast ratio 4.5:1 for text
- Focus visible states on all interactive elements
- Reduced motion support for animations
- Semantic HTML structure
- ARIA labels where needed

## Product Recommendations

### Short Term (1-2 weeks)

1. **Onboarding Flow**
   - Create a guided tour for first-time users
   - Tooltips explaining key features
   - Sample repo analysis to demonstrate value

2. **Empty States**
   - Design compelling empty states for each tab
   - Clear CTAs when no data exists
   - Illustrations to add personality

3. **Error Handling**
   - User-friendly error messages
   - Recovery suggestions
   - Retry mechanisms

### Medium Term (1-2 months)

1. **Analytics Dashboard**
   - Contribution trends over time
   - Payment history visualization
   - Contributor leaderboards

2. **Notification System**
   - Toast notifications for actions
   - Email alerts for important events
   - In-app notification center

3. **Search & Filter**
   - Global search across repos and contributors
   - Filter splits by date, amount, status
   - Saved searches

### Long Term (3-6 months)

1. **Mobile App**
   - React Native or PWA
   - Push notifications
   - Mobile-optimized workflows

2. **Advanced Features**
   - Multi-sig support for large splits
   - Recurring payments
   - Integration with more chains

3. **Community Features**
   - Public contributor profiles
   - Reputation system
   - Social sharing of splits

## Key Metrics to Track

### Engagement
- Time to first repo analysis
- Conversion rate (visitor → wallet connect)
- Feature adoption (which tabs are used most)

### Retention
- Return visit rate
- Active splits per user
- Contributor verification completion rate

### Revenue
- Total value distributed
- Average split size
- Payment success rate

## Competitive Differentiation

1. **TEE Security**: Emphasize the EigenCompute integration
2. **AI Agent**: Unique one-command experience
3. **Multi-chain**: Support for both EVM and NEAR
4. **Transparency**: Open calculation methodology

## Future Design Directions

### Visual Evolution
- Consider a more distinct brand color beyond blue/purple
- Explore 3D elements or illustrations
- Dark mode as default for crypto-native users

### Interaction Patterns
- Voice commands for the agent
- Gesture-based navigation on mobile
- Keyboard shortcuts for power users

### Content Strategy
- Video tutorials
- Case studies of successful splits
- Contributor spotlights

---

## Implementation Notes

### Files Modified
1. `src/app/globals.css` - Theme variables and animations
2. `src/app/layout.tsx` - ThemeProvider integration
3. `tailwind.config.ts` - Extended theme configuration
4. `src/components/theme/ThemeProvider.tsx` - New theme context
5. `src/components/theme/ThemeToggle.tsx` - Theme switcher component
6. `src/components/shared/Header.tsx` - Updated with theme toggle
7. `src/components/landing/LandingPage.tsx` - Full dark mode support
8. `src/components/dashboard/Dashboard.tsx` - Dark mode + improved layout
9. `src/components/dashboard/DashboardOverview.tsx` - Enhanced stats and activity

### New Dependencies
None required - using existing Tailwind CSS and Framer Motion

### Testing Checklist
- [ ] Dark mode toggle works correctly
- [ ] Theme persists across page reloads
- [ ] System preference detection works
- [ ] All components render correctly in both themes
- [ ] Animations work smoothly
- [ ] Mobile navigation functions properly
- [ ] Wallet connection flows work
- [ ] No console errors

# Graph Report - .  (2026-04-11)

## Corpus Check
- Corpus is ~37,716 words - fits in a single context window. You may not need a graph.

## Summary
- 262 nodes · 318 edges · 42 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `Posts Schema (Tokenized Reddit Posts)` - 11 edges
2. `RedditService` - 7 edges
3. `Navbar Component` - 7 edges
4. `getDBCPoolState()` - 6 edges
5. `TradingModal` - 6 edges
6. `Sign In Route` - 6 edges
7. `Transactions Schema` - 6 edges
8. `Auth Library (lib/auth)` - 5 edges
9. `LaunchPanel Component` - 5 edges
10. `Reddit OAuth Handler` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Rationale: Simplified Project Structure (removed packages/ folder)` --rationale_for--> `Database Connection (Drizzle + PostgreSQL)`  [EXTRACTED]
  README.md → apps/server/src/db/index.ts
- `Rationale: Supabase Migration (from Neon)` --rationale_for--> `Database Connection (Drizzle + PostgreSQL)`  [EXTRACTED]
  README.md → apps/server/src/db/index.ts
- `FeaturesParallax` --semantically_similar_to--> `RedCircleCards`  [INFERRED] [semantically similar]
  apps/web/src/components/FeaturesParallax.tsx → apps/web/src/components/RedCircleCards.tsx
- `RedCircleTimeline` --semantically_similar_to--> `FeaturesParallax`  [INFERRED] [semantically similar]
  apps/web/src/components/RedCircleTimeline.tsx → apps/web/src/components/FeaturesParallax.tsx
- `DesktopSidebar` --semantically_similar_to--> `MobileNav`  [INFERRED] [semantically similar]
  apps/web/src/components/DesktopSidebar.tsx → apps/web/src/components/MobileNav.tsx

## Hyperedges (group relationships)
- **Token Trading Flow** — feedcard_component, tradingmodal_component, walletcontext_provider, pricechart_component, transactionspanel_component [INFERRED 0.90]
- **App Navigation System** — desktopsidebar_component, mobilenav_component, routetree_gen, main_entrypoint [EXTRACTED 0.95]
- **Landing Page Marketing Sections** — featuresparallax_component, redcirclecards_component, redcircletimeline_component, comingsoon_component [INFERRED 0.85]
- **Reddit Post Data Pipeline** — LaunchPanel_LaunchPanel, RedditFeed_RedditFeed, LaunchPanel_RedditPostPreview, RedditFeed_BackendPost [INFERRED 0.85]
- **Landing Page Section Components** — background-paths_BackgroundPaths, testimonials_Testimonials, timeline_Timeline, world-map-demo_WorldMapDemo, animated-footer_AnimatedFooter [INFERRED 0.80]
- **ShadCN/Radix UI Primitive Components** — button_Button, checkbox_Checkbox, dropdown-menu_DropdownMenu, input_Input, label_Label, card_Card, skeleton_Skeleton [EXTRACTED 0.95]
- **Reddit OAuth Authentication Flow** — route_signin, server_reddit_oauth, auth_lib, server_auth_middleware [EXTRACTED 0.95]
- **Auth-Gated Route Pages** — route_transactions, route_profile, route_launch [EXTRACTED 0.95]
- **Public Navigation Tabs** — route_feed, route_launch, route_leaderboard, Navbar_component [EXTRACTED 1.00]
- **Token Buy/Sell Trading Flow** — trading_route, trading_service, dbc_service, holdings_schema, transactions_schema, price_history_schema [EXTRACTED 0.95]
- **Reddit Post Tokenization Flow** — posts_route, reddit_service, posts_schema, users_schema, tokenization_status_enum [EXTRACTED 0.95]
- **Drizzle ORM Database Layer** — index_db_connection, users_schema, posts_schema, holdings_schema, transactions_schema, price_history_schema, waitlist_schema [EXTRACTED 1.00]

## Communities

### Community 0 - "Trading & Feed UI"
Cohesion: 0.08
Nodes (4): fetchTradingStats(), handleConnectWallet(), handleTrade(), cn()

### Community 1 - "User Auth & Profile"
Cohesion: 0.11
Nodes (1): Concept: Tokenize Reddit Posts as SPL Tokens

### Community 2 - "Theme & Context Providers"
Cohesion: 0.11
Nodes (0): 

### Community 3 - "App Routes & Entry"
Cohesion: 0.12
Nodes (2): Loader, App Entrypoint (main.tsx)

### Community 4 - "Backend Data & Trading"
Cohesion: 0.22
Nodes (12): Holdings Schema, Leaderboard Route (/api/leaderboard), Portfolio Route (/api/portfolio), Posts Route (/api/posts), Posts Schema (Tokenized Reddit Posts), Price History Route (/api/price-history), Price History Schema, Tokenization Status Enum (pending/minting/active/failed/delisted) (+4 more)

### Community 5 - "Core Domain Concepts"
Cohesion: 0.16
Nodes (16): AuthContext / AuthProvider, ComingSoon, Bonding Curve Pricing, Post Tokenization, Reddit Integration, Solana Blockchain Integration, FeedCard, FeedPost Type (+8 more)

### Community 6 - "Landing Page Components"
Cohesion: 0.15
Nodes (16): LaunchPanel Component, RedditPostPreview Interface, ProfilePanel Component, RecentActivity Interface, UserStats Interface, BackendPost Type, RedditFeed Component, StaggeredMenu Component (+8 more)

### Community 7 - "Route Guards & Server Config"
Cohesion: 0.16
Nodes (16): FeedSkeleton Component, Navbar Component, User Interface (Client), fetchWithAuth Function, Auth Library (Client), Feed Route, Launch Route, Leaderboard Route (+8 more)

### Community 8 - "Home & Marketing Visuals"
Cohesion: 0.13
Nodes (0): 

### Community 9 - "Launch & Sign-In Flow"
Cohesion: 0.17
Nodes (0): 

### Community 10 - "Auth Token Management"
Cohesion: 0.24
Nodes (7): fetchWithAuth(), getApiUrl(), getAuthToken(), getUser(), isAuthenticated(), logout(), removeAuthToken()

### Community 11 - "DBC Pool Service"
Cohesion: 0.27
Nodes (10): createBuyTransaction(), createDBCPool(), createSellTransaction(), getBuyQuote(), getDBCPoolPrice(), getDBCPoolState(), getFeeClaimerKeypair(), getLeftoverReceiverKeypair() (+2 more)

### Community 12 - "Reddit API Service"
Cohesion: 0.38
Nodes (1): RedditService

### Community 13 - "Loading Skeletons"
Cohesion: 0.5
Nodes (0): 

### Community 14 - "Feature Showcase Cards"
Cohesion: 0.67
Nodes (3): FeaturesParallax, RedCircleCards, RedCircleTimeline

### Community 15 - "DB Connection & Rationale"
Cohesion: 0.67
Nodes (3): Database Connection (Drizzle + PostgreSQL), Rationale: Simplified Project Structure (removed packages/ folder), Rationale: Supabase Migration (from Neon)

### Community 16 - "Desktop Sidebar"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Timeline Components"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Staggered Menu"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Responsive Navigation"
Cohesion: 1.0
Nodes (2): DesktopSidebar, MobileNav

### Community 20 - "World Map Demo"
Cohesion: 1.0
Nodes (2): WorldMapDemo Component, WorldMap Component

### Community 21 - "Card Variants"
Cohesion: 1.0
Nodes (2): Card UI Component, GlassCard UI Component

### Community 22 - "Home Route Index"
Cohesion: 1.0
Nodes (2): Home Route (Landing), Index Route (Redirect)

### Community 23 - "Legal Pages"
Cohesion: 1.0
Nodes (2): Privacy Policy Route, Terms of Service Route

### Community 24 - "Waitlist Feature"
Cohesion: 1.0
Nodes (2): Waitlist Route (/api/waitlist), Waitlist Schema

### Community 25 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Mobile Nav"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Glass Card"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Server Build Config"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Drizzle Config"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Holdings Schema"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Theme Provider"
Cohesion: 1.0
Nodes (1): ThemeProvider

### Community 32 - "Search Bar"
Cohesion: 1.0
Nodes (1): SearchBar

### Community 33 - "Label Component"
Cohesion: 1.0
Nodes (1): Label UI Component

### Community 34 - "Timeline Component"
Cohesion: 1.0
Nodes (1): Timeline Component

### Community 35 - "Checkbox Component"
Cohesion: 1.0
Nodes (1): Checkbox UI Component

### Community 36 - "Input Component"
Cohesion: 1.0
Nodes (1): Input UI Component

### Community 37 - "Skeleton Component"
Cohesion: 1.0
Nodes (1): Skeleton UI Component

### Community 38 - "Dashboard Route"
Cohesion: 1.0
Nodes (1): Dashboard Route

### Community 39 - "Server Tsdown Config"
Cohesion: 1.0
Nodes (1): Server tsdown Config

### Community 40 - "Schema Index"
Cohesion: 1.0
Nodes (1): Schema Barrel Export

### Community 41 - "README Overview"
Cohesion: 1.0
Nodes (1): RedCircle README

## Knowledge Gaps
- **49 isolated node(s):** `WalletButton`, `ThemeProvider`, `PriceChart`, `UserProfile`, `Loader` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Desktop Sidebar`** (2 nodes): `DesktopSidebar.tsx`, `DesktopSidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Timeline Components`** (2 nodes): `RedCircleTimeline.tsx`, `timeline.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Staggered Menu`** (2 nodes): `StaggeredMenu.tsx`, `accentColor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Responsive Navigation`** (2 nodes): `DesktopSidebar`, `MobileNav`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `World Map Demo`** (2 nodes): `WorldMapDemo Component`, `WorldMap Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Variants`** (2 nodes): `Card UI Component`, `GlassCard UI Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home Route Index`** (2 nodes): `Home Route (Landing)`, `Index Route (Redirect)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legal Pages`** (2 nodes): `Privacy Policy Route`, `Terms of Service Route`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Waitlist Feature`** (2 nodes): `Waitlist Route (/api/waitlist)`, `Waitlist Schema`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mobile Nav`** (1 nodes): `MobileNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Glass Card`** (1 nodes): `glass-card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Server Build Config`** (1 nodes): `tsdown.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Drizzle Config`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Holdings Schema`** (1 nodes): `holdings.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Theme Provider`** (1 nodes): `ThemeProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Search Bar`** (1 nodes): `SearchBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Label Component`** (1 nodes): `Label UI Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Timeline Component`** (1 nodes): `Timeline Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Checkbox Component`** (1 nodes): `Checkbox UI Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input Component`** (1 nodes): `Input UI Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Skeleton Component`** (1 nodes): `Skeleton UI Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Route`** (1 nodes): `Dashboard Route`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Server Tsdown Config`** (1 nodes): `Server tsdown Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Schema Index`** (1 nodes): `Schema Barrel Export`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `README Overview`** (1 nodes): `RedCircle README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Trading & Feed UI` to `Route Guards & Server Config`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `Transactions Route` connect `Route Guards & Server Config` to `Trading & Feed UI`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `WalletButton`, `ThemeProvider`, `PriceChart` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Trading & Feed UI` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `User Auth & Profile` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Theme & Context Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `App Routes & Entry` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
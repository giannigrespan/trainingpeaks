# PRD - CycloPower Analytics Platform

## Document Info
**Versione:** 1.0  
**Data:** 6 Febbraio 2026  
**Owner:** Gianni  
**Status:** Draft  
**Ultimo aggiornamento:** 6 Feb 2026

---

## 1. EXECUTIVE SUMMARY

### 1.1 Visione Prodotto
CycloPower è una piattaforma web e mobile per l'analisi avanzata degli allenamenti di ciclismo con misuratore di potenza, progettata per ciclisti amatoriali evoluti e atleti agonisti che cercano uno strumento più moderno, accessibile e focalizzato rispetto a TrainingPeaks.

### 1.2 Problema
I ciclisti che utilizzano misuratori di potenza hanno bisogno di:
- Analizzare metriche avanzate (TSS, NP, IF, CTL/ATL) per ottimizzare l'allenamento
- Tracciare la forma fisica nel tempo
- Pianificare allenamenti strutturati
- Alternative più accessibili a TrainingPeaks (€20/mese) con UI moderna

**Pain Points Attuali:**
- TrainingPeaks: costoso, UI datata, complesso per utenti medi
- Strava: ottime funzioni social, ma analytics limitato per potenza
- Garmin Connect: buono ma limitato a ecosistema Garmin
- Golden Cheetah: potente ma desktop-only, curva apprendimento ripida

### 1.3 Soluzione
Piattaforma cloud-native che:
- Importa file FIT/GPX/TCX da qualsiasi dispositivo
- Calcola automaticamente metriche scientifiche (TSS, NP, CTL, ATL, TSB)
- Visualizza trend forma fisica (Performance Management Chart)
- Offre pianificazione allenamenti con workout builder
- Interfaccia moderna, veloce, mobile-first
- Pricing accessibile con free tier generoso

### 1.4 Metriche di Successo (North Star)
**Primaria:** MAU (Monthly Active Users) - target 1.000 in 12 mesi  

**Secondarie:**
- Retention D7: >40%, D30: >25%
- Upload settimanali per utente attivo: >2
- Conversion Free→Premium: >5%
- NPS: >50

---

## 2. OBIETTIVI DI BUSINESS

### 2.1 Obiettivi Fase 1 (Mesi 0-6) - MVP
- **Prodotto:** Lanciare MVP con core analytics funzionanti
- **Utenti:** 100 beta users attivi (20% retention D30)
- **Technical:** 99% uptime, <2s load time dashboard
- **Revenue:** €0 (focus validazione)

### 2.2 Obiettivi Fase 2 (Mesi 7-12) - Growth
- **Prodotto:** Lanciare mobile app + integrazioni (Strava, Garmin)
- **Utenti:** 1.000 MAU, 100 paying users
- **Technical:** Auto-scaling, <500ms API response
- **Revenue:** €1.000 MRR (€10/utente premium)

### 2.3 Obiettivi Fase 3 (Mesi 13-24) - Scale
- **Prodotto:** Coach tools, AI suggestions, community features
- **Utenti:** 10.000 MAU, 1.000 paying
- **Revenue:** €10.000 MRR
- **Market:** Leader segmento ciclismo Italia, espansione EU

---

## 3. TARGET USERS & PERSONAS

### 3.1 Utente Primario: "Marco - Amatore Competitivo"
**Demografia:**
- Età: 28-45 anni
- Professione: Impiegato/manager
- Località: Italia (Veneto, Lombardia, Emilia-Romagna)

**Comportamento:**
- 3-5 uscite/settimana, 8-12h allenamento
- Usa misuratore potenza (Favero Assioma, Garmin Rally)
- Partecipa a granfondo, corse amatoriali
- Budget training: €50-100/mese
- Tech-savvy, usa Strava, conosce TSS/FTP

**Goals:**
- Migliorare performance su salite/cronometro
- Quantificare carico allenamento vs recupero
- Preparare eventi specifici (granfondo, gare)

**Pain Points:**
- TrainingPeaks troppo costoso per uso sporadico
- Garmin Connect non mostra CTL/ATL
- Vuole capire "sono in forma o sovrallenato?"

### 3.2 Utente Secondario: "Luca - Agonista Master"
**Demografia:**
- Età: 35-55 anni
- Livello: Cat. Elite/1/2
- Ha coach o self-coached avanzato

**Comportamento:**
- 10-15h/settimana, allenamenti strutturati
- Analizza ogni uscita, confronta power curves
- Budget illimitato per performance

**Goals:**
- Peaking per gare importanti
- Ottimizzazione microcicli
- Confronto performance anno su anno

**Needs:**
- Dettaglio massimo metriche
- Esportazione dati (CSV, API)
- Multi-season analysis

### 3.3 Utente Terziario: "Sara - Coach"
**Demografia:**
- Età: 30-50 anni
- Gestisce 5-20 atleti
- Certificazioni coaching (UCI, FCI)

**Comportamento:**
- Pianifica allenamenti settimanali
- Monitora forma atleti
- Comunica via app/email

**Goals:**
- Dashboard multi-atleta
- Template allenamenti riutilizzabili
- Export report per atleti

**Needs:**
- Coach tier con multi-user
- Communication tools
- Compliance tracking

---

## 4. SCOPE & PRIORITIZZAZIONE

### 4.1 Must Have (MVP - P0)

**Upload & Parsing**
- [P0] Upload file FIT, GPX, TCX via drag&drop
- [P0] Parsing automatico tutti device (Garmin, Wahoo, SRM, Stages)
- [P0] Storage file Vercel Blob, metadata MongoDB

**Core Analytics**
- [P0] Calcolo Normalized Power (NP)
- [P0] Calcolo Intensity Factor (IF)
- [P0] Calcolo Training Stress Score (TSS)
- [P0] Visualizzazione grafici: potenza, FC, velocità, cadenza
- [P0] Mappa percorso interattiva
- [P0] Power Curve (5s, 1min, 5min, 20min, 60min)

**Settings & Profile**
- [P0] Impostazione FTP manuale
- [P0] Zone potenza configurabili (5 zone)
- [P0] Zone cardio configurabili (5 zone)
- [P0] Peso atleta

**Dashboard**
- [P0] Lista attività con filtri (data, tipo)
- [P0] Summary cards: TSS totale settimana, ore, km
- [P0] Performance Management Chart (CTL, ATL, TSB) - 90 giorni

**Auth**
- [P0] Registrazione email/password
- [P0] Login con NextAuth
- [P0] Password reset

### 4.2 Should Have (Post-MVP - P1)

**Advanced Analytics**
- [P1] Rilevamento automatico FTP da best 20min effort
- [P1] Zone distribution charts (% tempo in ogni zona)
- [P1] Comparazione attività (overlay grafici)
- [P1] Interval detection automatica
- [P1] Mean Maximal Power (MMP) charts
- [P1] W' (Anaerobic Work Capacity) analysis

**Planning Tools**
- [P1] Calendario allenamenti
- [P1] Workout builder: creazione allenamenti strutturati
- [P1] Template workout predefiniti (Sweet Spot, VO2max, Threshold)
- [P1] Planned vs Actual comparison

**Mobile**
- [P1] React Native app iOS/Android
- [P1] Quick upload da smartphone
- [P1] Push notifications (recap settimanale, FTP test reminder)

**Integrations**
- [P1] Import automatico Strava (OAuth)
- [P1] Sync Garmin Connect
- [P1] Export CSV/TCX

### 4.3 Nice to Have (Future - P2)

**AI & Intelligence**
- [P2] Suggerimenti allenamento basati su forma (AI)
- [P2] Prediction race performance
- [P2] Anomaly detection (sovrallenamento, malattia)

**Social & Community**
- [P2] Segmenti popolari (tipo Strava)
- [P2] Classifiche amici
- [P2] Challenge mensili

**Coach Tools**
- [P2] Multi-athlete dashboard
- [P2] Assegnazione allenamenti a atleti
- [P2] Messaggistica coach-atleta
- [P2] Report automatici PDF

**Advanced Features**
- [P2] Bike/equipment tracking (km per bici, usura componenti)
- [P2] Nutrition tracking
- [P2] Weather data overlay
- [P2] Video sync (analisi video + dati)

### 4.4 Out of Scope (v1.0)
- ❌ Running, swimming, multisport
- ❌ Real-time workout execution (tipo Zwift)
- ❌ Marketplace coach/training plans
- ❌ Wearable integrations (oltre ciclocomputer)
- ❌ Desktop app nativa

---

## 5. USER STORIES & ACCEPTANCE CRITERIA

### Epic 1: Onboarding & Setup

**US-1.1: Registrazione Utente**
```
Come nuovo utente
Voglio registrarmi con email/password
Per iniziare a usare la piattaforma

Acceptance Criteria:
- Form registrazione con email, password, nome
- Validazione email formato corretto
- Password min 8 caratteri
- Email conferma inviata
- Redirect a onboarding wizard
```

**US-1.2: Setup Profilo Atleta**
```
Come utente registrato
Voglio inserire FTP, peso, zone
Per ottenere analytics accurate

Acceptance Criteria:
- Wizard 3 step: (1) FTP, (2) Peso, (3) Zone
- FTP default 200W, range 100-500W
- Peso in kg, range 40-120kg
- Zone potenza auto-calcolate da FTP (default Coggan)
- Possibilità skip e compilare dopo
- Salvataggio in MongoDB users.profile
```

### Epic 2: Upload & Analisi Attività

**US-2.1: Upload File Attività**
```
Come utente
Voglio uploadare file FIT dal mio Garmin
Per vedere l'analisi dell'allenamento

Acceptance Criteria:
- Drag & drop area o click to browse
- Supporto .fit, .gpx, .tcx (max 50MB)
- Progress bar upload
- Parsing file in background
- Notifica successo/errore
- Redirect a pagina attività
- File salvato in Vercel Blob
- Metadata in MongoDB activities collection
```

**US-2.2: Visualizzazione Dettaglio Attività**
```
Come utente
Voglio vedere grafici e metriche della mia uscita
Per capire come ho performato

Acceptance Criteria:
- Header: nome, data, durata, distanza, TSS
- Grafici interattivi (zoom, tooltip):
  - Potenza nel tempo
  - Frequenza cardiaca
  - Velocità
  - Cadenza
- Mappa percorso con Mapbox
- Summary box: avg power, NP, IF, TSS, VI
- Power curve (5s, 1min, 5min, 20min)
- Bottone Edit (nome attività)
- Bottone Delete
```

**US-2.3: Calcolo Metriche Potenza**
```
Come sistema
Voglio calcolare NP, IF, TSS automaticamente
Per fornire analytics scientifici

Acceptance Criteria:
- Normalized Power: rolling 30s avg, 4th root mean
- Intensity Factor: NP / FTP
- TSS: (sec × NP × IF) / (FTP × 3600) × 100
- Variability Index: NP / Avg Power
- Precisione ±2% vs TrainingPeaks
- Calcolo completato <5s per attività 3h
```

### Epic 3: Performance Management Chart

**US-3.1: Visualizzazione PMC**
```
Come utente
Voglio vedere grafico CTL/ATL/TSB
Per capire se sono in forma o stanco

Acceptance Criteria:
- Grafico 90 giorni (default)
- 3 linee: CTL (blu), ATL (rosso), TSB (verde)
- Tooltip mostra valori precisi + data
- Range selector: 30/60/90/180/365 giorni
- TSB zones colorate: >10 fresh, -10/10 optimal, <-10 fatigue
- Click su punto mostra attività del giorno
- Auto-update quando upload nuova attività
```

**US-3.2: Calcolo Fitness Metrics**
```
Come sistema
Voglio calcolare CTL, ATL, TSB daily
Per trackare forma fisica utente

Acceptance Criteria:
- CTL: exponential weighted avg, tau=42 giorni
- ATL: exponential weighted avg, tau=7 giorni  
- TSB: CTL - ATL (form)
- Calcolo retroattivo da prima attività
- Update incrementale per nuove attività
- Salvataggio in fitness_tracking collection
- Batch processing <1min per 365 giorni
```

### Epic 4: Dashboard & Lista Attività

**US-4.1: Dashboard Principale**
```
Come utente
Voglio vedere overview settimanale
Per avere colpo d'occhio sul mio training

Acceptance Criteria:
- 4 KPI cards: TSS totale settimana, Ore, Km, Attività
- PMC chart (90 giorni)
- Lista ultime 5 attività
- Link veloci: Upload, Calendario, Impostazioni
- Responsive mobile
```

**US-4.2: Lista Attività con Filtri**
```
Come utente
Voglio filtrare attività per data/tipo
Per trovare allenamenti specifici

Acceptance Criteria:
- Tabella: data, nome, durata, TSS, NP, distanza
- Ordinamento per colonna
- Filtri: range date, tipo attività
- Ricerca per nome
- Paginazione 20 attività/pagina
- Click su riga → dettaglio attività
- Bottone bulk delete
```

### Epic 5: Pianificazione (Post-MVP)

**US-5.1: Creazione Workout Strutturato**
```
Come utente
Voglio creare allenamento intervallato
Per programmare la mia settimana

Acceptance Criteria:
- Workout builder: add interval
- Ogni interval: durata (min), target potenza (W o %FTP), cadenza
- Preview grafico workout
- Calcolo TSS planned
- Salvataggio in workouts collection
- Template predefiniti: 2×20 threshold, 4×8 sweet spot, 10×1 VO2max
```

**US-5.2: Calendario Allenamenti**
```
Come utente
Voglio vedere calendario mensile
Per organizzare training plan

Acceptance Criteria:
- Vista calendario mese
- Drag & drop workout su giorno
- Colori: planned (blu), completed (verde), missed (rosso)
- Click giorno: add planned workout o view completed
- TSS planned vs actual per settimana
```

---

## 6. REQUISITI FUNZIONALI DETTAGLIATI

### 6.1 Autenticazione & Autorizzazione

**REQ-AUTH-001: Registrazione**
- Email unique validation
- Password hashing bcrypt
- Email verification token (24h expiry)
- Welcome email automatica

**REQ-AUTH-002: Login**
- NextAuth.js con JWT
- Session duration: 30 giorni
- Remember me checkbox
- Rate limiting: 5 tentativi/15min

**REQ-AUTH-003: Password Reset**
- Email con link reset (1h expiry)
- Token one-time use
- Password requirements enforcement

**REQ-AUTH-004: Autorizzazione**
- Role-based: user, premium, coach, admin
- API routes protette con middleware
- Ownership check: user può vedere solo sue attività

### 6.2 Upload & File Processing

**REQ-FILE-001: Upload**
- Formati: .fit, .gpx, .tcx
- Max size: 50MB/file
- Vercel Blob storage
- Pre-signed URLs per download
- Virus scan (ClamAV integration opzionale)

**REQ-FILE-002: Parsing FIT**
- Libreria: fit-file-parser (npm)
- Estrazione: power, hr, speed, cadence, altitude, lat/lon
- Gestione GPS missing (indoor)
- Gestione power missing (ride senza PM)
- Error handling: file corrotto, formato invalido

**REQ-FILE-003: Parsing GPX**
- Libreria: gpxparser
- Estrazione: route, elevation
- Merge con power/hr se disponibili da altri sensori

**REQ-FILE-004: Data Streams Storage**
- Separate collection: activity_streams
- Downsampling opzionale: 1Hz → 0.2Hz (ogni 5s) per attività >3h
- Compressione: considerare MessagePack o gzip per arrays

### 6.3 Analytics & Calcoli

**REQ-CALC-001: Normalized Power**
```
Algoritmo:
1. Rolling average 30s su power stream
2. Elevare ogni valore alla 4ª potenza
3. Media aritmetica
4. Radice 4ª del risultato
```

**REQ-CALC-002: Training Stress Score**
```
TSS = (duration_sec × NP × IF) / (FTP × 3600) × 100
dove IF = NP / FTP
```

**REQ-CALC-003: Power Curve**
- Durations: 5s, 10s, 30s, 1min, 5min, 20min, 60min
- Mean maximal power per duration
- Update all-time PRs per utente

**REQ-CALC-004: CTL/ATL/TSB**
```
CTL_today = CTL_yesterday + (TSS_today - CTL_yesterday) / 42
ATL_today = ATL_yesterday + (TSS_today - ATL_yesterday) / 7
TSB_today = CTL_today - ATL_today
```
- Calcolo daily, anche giorni senza attività (TSS=0)
- Retroattivo da prima attività utente

**REQ-CALC-005: Zone Distribution**
- Power zones: % tempo in Z1-Z7 (Coggan)
- HR zones: % tempo in Z1-Z5
- Calcolo per ogni attività

### 6.4 Visualizzazioni

**REQ-VIZ-001: Grafici Interattivi**
- Libreria: Recharts
- Features: zoom, pan, tooltip, legend toggle
- Responsive mobile
- Export PNG

**REQ-VIZ-002: Mappa**
- Mapbox GL JS
- Polyline percorso colorato per potenza/velocità
- Start/end markers
- Elevation profile overlay

**REQ-VIZ-003: PMC Chart**
- 3 linee sovrapposte
- Zone TSB colorate
- Click point → dettaglio giorno
- Export immagine

### 6.5 Performance & Scalabilità

**REQ-PERF-001: Response Times**
- Dashboard load: <2s
- Attività dettaglio: <1.5s
- API response: <500ms (p95)
- Upload processing: <10s per 2h activity

**REQ-PERF-002: Caching**
- Vercel KV per power curves, zone distribution
- TTL: invalidate on new activity upload
- MongoDB indexes su userId + date

**REQ-PERF-003: Database**
- Separazione activities (summary) e activity_streams (time-series)
- Streaming query per grafici (no full load in memory)
- Archive attività >2 anni in cold storage

### 6.6 Integrazioni (Post-MVP)

**REQ-INT-001: Strava Import**
- OAuth 2.0 authentication
- Webhook per auto-import nuove attività
- Mapping fields: Strava activity → CycloPower activity
- One-way sync (Strava → app)

**REQ-INT-002: Garmin Connect**
- Health API integration
- Polling daily per nuove attività
- Automatic FIT download

---

## 7. REQUISITI NON FUNZIONALI

### 7.1 Performance
- **Latency:** API p95 <500ms, p99 <1s
- **Throughput:** 100 req/sec supportati
- **Page Load:** First Contentful Paint <1.5s
- **Upload:** Max processing time 10s per 3h activity

### 7.2 Scalability
- **Users:** Architettura supporta 10k MAU senza refactoring
- **Storage:** MongoDB Atlas auto-scaling, Vercel Blob illimitato
- **Compute:** Serverless (Vercel Functions) auto-scale

### 7.3 Availability & Reliability
- **Uptime:** 99.5% (SLA)
- **Backup:** MongoDB Point-in-Time Recovery (1 backup/day)
- **Disaster Recovery:** RTO 4h, RPO 24h
- **Error Tracking:** Sentry integration

### 7.4 Security
- **Data Encryption:** TLS 1.3 in transit, AES-256 at rest
- **Authentication:** JWT con short expiry (30min), refresh tokens
- **Authorization:** RBAC con ownership checks
- **PII Protection:** GDPR compliant, user data export/delete
- **Rate Limiting:** 100 req/min per IP, 1000/hour per user
- **Input Validation:** Zod schemas su tutte API

### 7.5 Usability
- **Mobile-First:** Design responsivo, touch-optimized
- **Accessibility:** WCAG 2.1 AA compliance
- **Internationalization:** i18n ready (IT, EN inizialmente)
- **Browser Support:** Chrome, Safari, Firefox, Edge (ultime 2 versioni)

### 7.6 Maintainability
- **Code Quality:** ESLint, Prettier, TypeScript strict
- **Testing:** >80% coverage (Jest, Playwright)
- **Documentation:** README, API docs (Swagger), inline comments
- **CI/CD:** GitHub Actions, auto-deploy Vercel

### 7.7 Compliance
- **GDPR:** Privacy policy, cookie consent, data portability
- **Terms of Service:** Chiari limiti uso, ownership dati
- **Cookies:** Solo essential + analytics opt-in

---

## 8. ARCHITETTURA TECNICA

### 8.1 Stack Tecnologico

**Frontend**
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- UI Library: React 18
- Styling: TailwindCSS + shadcn/ui
- Charts: Recharts
- Maps: Mapbox GL JS
- State: React Query (server state), Zustand (client state)
- Forms: React Hook Form + Zod validation

**Backend**
- Runtime: Node.js 20+ (Vercel serverless)
- API: Next.js API Routes
- Auth: NextAuth.js
- Database: MongoDB Atlas (M10 cluster)
- File Storage: Vercel Blob
- Cache: Vercel KV (Redis)
- Queue: Vercel Queues (background jobs)

**Infrastructure**
- Hosting: Vercel (frontend + API)
- Database: MongoDB Atlas
- CDN: Vercel Edge Network
- Monitoring: Vercel Analytics + Sentry
- Email: Resend

**External Libraries**
- fit-file-parser: parsing FIT files
- gpxparser: parsing GPX
- date-fns: date manipulation
- recharts: grafici
- mapbox-gl: mappe

### 8.2 Database Schema (MongoDB)

**Collections:**
1. `users` - profili utente, FTP, zone
2. `activities` - summary attività (TSS, NP, etc.)
3. `activity_streams` - time-series data (power, HR, GPS)
4. `fitness_tracking` - CTL/ATL/TSB daily
5. `workouts` - planned workouts
6. `calendar_events` - calendar entries

**Indexes:**
```javascript
// Performance critical
activities: { userId: 1, activityDate: -1 }
activity_streams: { activityId: 1 }
fitness_tracking: { userId: 1, date: -1 }

// Geo queries
activities: { startLocation: '2dsphere' }
```

### 8.3 API Design

**REST Endpoints:**
```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

Activities:
GET    /api/activities              # List con filtri
POST   /api/activities/upload       # Upload file
GET    /api/activities/:id          # Dettaglio
PUT    /api/activities/:id          # Update nome
DELETE /api/activities/:id
GET    /api/activities/:id/streams  # Time-series data

Analytics:
GET    /api/analytics/pmc           # ?userId&days=90
GET    /api/analytics/power-curve   # ?userId&activityId
GET    /api/analytics/zones         # ?activityId

User:
GET    /api/user/profile
PUT    /api/user/profile            # Update FTP, zones
GET    /api/user/stats              # Overall stats

Workouts (future):
GET    /api/workouts
POST   /api/workouts
GET    /api/workouts/:id
PUT    /api/workouts/:id
DELETE /api/workouts/:id
```

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-02-06T10:30:00Z",
    "version": "1.0"
  }
}
```

### 8.4 Flusso Upload Attività

```
1. User: Upload file .fit via form
2. Frontend: POST /api/activities/upload + FormData
3. API: 
   a. Salva file Vercel Blob → ottieni URL
   b. Parse FIT → estrai streams
   c. Calcola metriche (NP, TSS, power curve)
   d. Salva in MongoDB:
      - activities (summary)
      - activity_streams (time-series)
   e. Trigger background job: update PMC
4. Background Job:
   a. Ricalcola CTL/ATL/TSB da data attività
   b. Update fitness_tracking
5. Response: { activityId, success: true }
6. Frontend: Redirect /activities/:id
```

---

## 9. UI/UX DESIGN

### 9.1 Design Principles

**1. Clarity Over Clutter**
- Informazione densa ma organizzata
- Whitespace generoso
- Typography scale chiara (Inter font)

**2. Speed & Responsiveness**
- Skeleton loaders su caricamento
- Optimistic UI updates
- Infinite scroll vs pagination (per liste lunghe)

**3. Data-Driven**
- Grafici sempre visibili, non nascosti in tab
- Tooltip informativi
- Context sempre disponibile (es. FTP corrente mostrato in header)

**4. Mobile-First**
- Touch targets min 44px
- Swipe gestures (delete activity)
- Bottom navigation su mobile

### 9.2 Color Palette

**Primary (Brand)**
- Blue: #2563EB (primary actions, links)
- Dark Blue: #1E40AF (hover states)

**Semantic**
- Success/CTL: #10B981 (green)
- Warning/ATL: #F59E0B (orange)  
- Error: #EF4444 (red)
- Info/TSB: #3B82F6 (light blue)

**Neutrals**
- Background: #FFFFFF
- Surface: #F9FAFB
- Border: #E5E7EB
- Text Primary: #111827
- Text Secondary: #6B7280

**Data Viz**
- Power: #8B5CF6 (purple)
- HR: #EF4444 (red)
- Speed: #3B82F6 (blue)
- Cadence: #F59E0B (orange)

### 9.3 Typography

**Font:** Inter (Google Fonts)
- Headings: 600-700 weight
- Body: 400 weight
- Numbers/Data: 500 weight, tabular-nums

**Scale:**
- H1: 32px / 40px line
- H2: 24px / 32px
- H3: 20px / 28px
- Body: 16px / 24px
- Small: 14px / 20px
- Tiny: 12px / 16px

---

## 10. ANALYTICS & METRICHE

### 10.1 Metriche Prodotto (KPI)

**Acquisition**
- Nuove registrazioni/settimana
- Sorgente traffico (organic, social, referral)
- Conversion landing page → signup

**Activation**
- % utenti che uploadano 1a attività <24h da signup
- Time to first upload
- Completion onboarding wizard

**Engagement**
- DAU / MAU ratio (stickiness)
- Upload/settimana per utente attivo
- Session duration media
- Pages per session

**Retention**
- D1, D7, D30 retention
- Cohort analysis mensile
- Churn rate

**Revenue**
- MRR (Monthly Recurring Revenue)
- ARPU (Average Revenue Per User)
- Conversion free → premium
- Churn premium users

**Technical**
- Uptime %
- P95 API latency
- Error rate
- Crash-free sessions (mobile)

### 10.2 Analytics Tools

**Implementati in MVP:**
- Vercel Analytics (page views, web vitals)
- PostHog (product analytics, funnels, cohorts)
- Sentry (error tracking)

**Post-MVP:**
- Mixpanel (advanced user analytics)
- Amplitude (product intelligence)

### 10.3 Event Tracking

**Critical Events:**
```javascript
// Authentication
event('user_signup', { method: 'email' })
event('user_login', { method: 'email' })

// Core Actions
event('activity_uploaded', { fileType: 'fit', duration: 7200 })
event('activity_viewed', { activityId: '...' })
event('pmc_viewed', { days: 90 })
event('ftp_updated', { oldFTP: 250, newFTP: 265 })

// Conversion
event('upgrade_clicked', { from_page: 'dashboard' })
event('subscription_started', { plan: 'premium' })

// Engagement
event('power_curve_viewed', { activityId: '...' })
event('workout_created', { type: 'intervals' })
```

---

## 11. MONETIZZAZIONE

### 11.1 Pricing Tiers

**Free Tier**
- Upload: 25 attività/mese
- Storage: 6 mesi history
- Core analytics: TSS, NP, IF, grafici base
- PMC: 90 giorni
- Mobile app: read-only
- **Target:** Utenti occasionali, trial

**Premium - €9.99/mese (€99/anno)**
- Upload: Illimitato
- Storage: Lifetime
- Advanced analytics: power curves, zone distribution, interval analysis
- PMC: Illimitato
- Mobile app: completo
- Integrations: Strava, Garmin auto-import
- Export dati: CSV, TCX
- Priority support
- **Target:** Amatori seri, agonisti

**Coach - €29.99/mese**
- Tutto Premium +
- Multi-athlete dashboard (max 20 atleti)
- Workout assignment
- Athlete messaging
- Custom reports
- White-label reports (PDF)
- **Target:** Coach professionisti

**Enterprise - Custom**
- Team/Club accounts
- Bulk pricing
- SSO
- Dedicated support
- Custom integrations
- **Target:** Team professionistici, federazioni

### 11.2 Strategia Conversion

**Free → Premium Triggers:**
- Paywall soft dopo 25 upload: "Hai raggiunto il limite mensile. Upgrade per continuare."
- Feature gating: "Power curve dettagliata disponibile in Premium"
- Trial Premium: 14 giorni free al signup
- Reminder email: "Hai usato 20/25 upload questo mese"

**Onboarding Premium:**
- Highlight valore: "Atleti Premium migliorano FTP del 12% in media"
- Social proof: "500+ ciclisti hanno scelto Premium"
- Money-back guarantee: 30 giorni

**Retention Premium:**
- Annual discount: €99/anno (17% sconto)
- Family plan: €14.99/mese per 2 account
- Referral bonus: 1 mese free per referral pagante

### 11.3 Revenue Projections (12 mesi)

**Assumptions:**
- 1.000 MAU a M12
- 10% conversion Premium
- 2% conversion Coach
- €9.99 avg per premium user (mix monthly/annual)

**Calcolo:**
```
M12:
- Premium users: 100 × €9.99 = €999
- Coach users: 20 × €29.99 = €600
- MRR: €1.599
- ARR: ~€19.000
```

**Target aggressivo (M24):**
- 10.000 MAU
- 1.000 Premium (€9.990 MRR)
- 100 Coach (€2.999 MRR)
- **MRR: €12.989 (~€155k ARR)**

---

## 12. GO-TO-MARKET STRATEGY

### 12.1 Launch Plan

**Pre-Launch (M-2 a M0)**
- Landing page con waitlist
- Content marketing: blog "Come interpretare TSS", "Guida FTP test"
- SEO: target keywords "training peaks alternative", "analisi potenza ciclismo"
- Community outreach: Reddit r/Velo, forum mtb-mag.com
- Beta program: 50 tester early access

**Launch (M0)**
- Product Hunt launch
- Social media: Instagram, Facebook gruppi ciclismo
- Press release: media ciclismo (Cyclist, Bicisport)
- Partnership: negozi bici locali (demo in store)
- Influencer: micro-influencer ciclismo (5-20k follower)

**Post-Launch (M1-M6)**
- Content SEO: 2 articoli/settimana
- YouTube: tutorial "Come usare CycloPower"
- Webinar: "Ottimizza allenamento con TSS"
- Referral program: invite amici → 1 mese free
- Events: sponsorship granfondo locali

### 12.2 Marketing Channels

**Organic (Priority 1)**
- SEO blog content
- YouTube tutorials
- Reddit/Forum partecipation
- Open-source contributions (Golden Cheetah community)

**Paid (Priority 2 - post-PMF)**
- Google Ads: "training peaks alternative" (CPC €2-5)
- Facebook/Instagram: targeting ciclisti 25-45, interessi Strava/Garmin
- Retargeting: visitor non convertiti

**Partnerships (Priority 3)**
- Negozi bici: commissione per referral
- Coach: affiliate program 20%
- Federazioni: deals team/club

**Community (Always On)**
- Strava Club ufficiale
- Discord server
- Newsletter settimanale

### 12.3 Positioning

**Tagline:** "Training analytics semplice e potente per ciclisti"

**Value Proposition:**
- "TrainingPeaks è troppo caro? CycloPower offre analytics professionale a €9.99/mese"
- "Strava per social, CycloPower per migliorare davvero"
- "Interfaccia moderna, metriche scientifiche, risultati reali"

**Competitor Comparison:**

| Feature | CycloPower | TrainingPeaks | Strava | Garmin |
|---------|-----------|---------------|--------|--------|
| Prezzo | €9.99 | €19.99 | Free/€10 | Free |
| TSS/NP | ✅ | ✅ | ❌ | ✅ |
| PMC | ✅ | ✅ | ❌ | ❌ |
| UI Moderna | ✅ | ❌ | ✅ | ⚠️ |
| Mobile App | ✅ | ✅ | ✅ | ✅ |
| Planning | ⚠️ | ✅ | ❌ | ⚠️ |

---

## 13. ROADMAP

### 13.1 Milestones

**M0-M3: MVP Development**
- ✅ Week 1-2: Setup progetto, DB schema, auth
- ✅ Week 3-6: Upload, parsing FIT, calcolo metriche
- ✅ Week 7-10: Dashboard, dettaglio attività, grafici
- ✅ Week 11-12: PMC, ottimizzazioni, testing
- 🎯 **Deliverable:** Beta usabile con 20 tester

**M4-M6: Beta Testing & Iteration**
- Onboarding 100 beta users
- Raccolta feedback qualitativo (interviste)
- Fix bug critici
- Miglioramenti UX basati su analytics
- Ottimizzazione performance
- 🎯 **Deliverable:** Product-Market Fit, 40% D30 retention

**M7-M9: Public Launch & Growth**
- Lancio pubblico v1.0
- Marketing push (Product Hunt, social, PR)
- Implementazione Premium tier
- Primi 100 paying users
- 🎯 **Deliverable:** 500 MAU, €500 MRR

**M10-M12: Mobile & Integrations**
- React Native app iOS/Android
- Strava OAuth integration
- Garmin Connect sync
- Workout builder + calendario
- 🎯 **Deliverable:** 1.000 MAU, €1.500 MRR

**M13-M18: Advanced Features (Phase 2)**
- AI training suggestions (GPT-4)
- Interval auto-detection
- Race predictor
- Community features (leaderboards, challenges)
- Coach tools multi-athlete
- 🎯 **Deliverable:** 5.000 MAU, €5.000 MRR

**M19-M24: Scale & Expansion (Phase 3)**
- Running/multisport support
- Marketplace training plans
- Desktop app (Electron)
- International expansion (DE, FR, ES)
- 🎯 **Deliverable:** 10.000 MAU, €12.000 MRR

### 13.2 Release Versioning

**v1.0 (MVP)** - M3
- Upload FIT/GPX
- Core analytics (TSS, NP, IF)
- PMC chart
- Dashboard

**v1.1** - M6
- Mobile responsive ottimizzato
- Export CSV
- FTP auto-detection

**v1.2** - M9
- Premium tier
- Strava integration
- Power curve avanzate

**v2.0** - M12
- Mobile app nativa
- Workout builder
- Calendario

**v2.1** - M15
- AI suggestions
- Coach tools

**v3.0** - M18
- Multi-sport
- Community features

---

## 14. RISCHI & MITIGAZIONI

### 14.1 Rischi Tecnici

**RISCHIO 1: Parsing FIT Inaccurato**
- Probabilità: Media
- Impatto: Alto (metriche sbagliate → loss of trust)
- Mitigazione:
  - Testare con 100+ file diversi device
  - Comparazione vs TrainingPeaks su attività test
  - Unit test completi algoritmi calcolo
  - Beta testing con feedback precisione

**RISCHIO 2: Performance Scalability**
- Probabilità: Media
- Impatto: Alto (slow = utenti abbandonano)
- Mitigazione:
  - Load testing fin da MVP (k6, Artillery)
  - MongoDB indexes ottimizzati
  - Caching aggressivo (Vercel KV)
  - CDN per file statici

**RISCHIO 3: Data Loss**
- Probabilità: Bassa
- Impatto: Critico (utenti perdono storico)
- Mitigazione:
  - MongoDB Atlas automated backups
  - Vercel Blob redundancy
  - Export dati utente disponibile sempre
  - Disaster recovery plan testato

### 14.2 Rischi Business

**RISCHIO 4: Competizione TrainingPeaks**
- Probabilità: Alta
- Impatto: Medio (possono copiare features, abbassare prezzo)
- Mitigazione:
  - Differenziazione su UX moderna
  - Community italiana forte
  - Iteration speed > incumbent
  - Focus ciclismo (non multisport)

**RISCHIO 5: Low Conversion Rate**
- Probabilità: Media
- Impatto: Alto (no revenue = no sustainability)
- Mitigazione:
  - Free tier generoso per validare valore
  - A/B testing paywall positioning
  - Onboarding premium-first (trial)
  - Feedback qualitativo su pricing

**RISCHIO 6: Market Size Overestimation**
- Probabilità: Media
- Impatto: Alto (mercato troppo piccolo per scale)
- Mitigazione:
  - Validazione mercato in beta (willingness to pay)
  - Espansione multisport se necessario
  - Internazionalizzazione early

### 14.3 Rischi Legali/Compliance

**RISCHIO 7: GDPR Violations**
- Probabilità: Bassa
- Impatto: Critico (multe, legal issues)
- Mitigazione:
  - Privacy policy completa
  - Cookie consent
  - Data export/delete funzionale
  - Legal review pre-launch

**RISCHIO 8: IP Infringement**
- Probabilità: Bassa
- Impatto: Alto (TrainingPeaks ha patent su TSS?)
- Mitigazione:
  - Research patent TSS (scaduto 2019?)
  - Usare terminologia generica se necessario
  - Legal counsel review

---

## 15. SUCCESS CRITERIA & DECISION POINTS

### 15.1 MVP Success (M3)
**GO Criteria:**
- ✅ 20 beta users onboarded
- ✅ <5 critical bugs reported
- ✅ Upload success rate >95%
- ✅ Metriche accurate ±3% vs TrainingPeaks
- ✅ NPS >40 da beta users

**NO-GO → Iterate:**
- ❌ >10 critical bugs
- ❌ Upload fail >10%
- ❌ NPS <20

### 15.2 Public Launch (M6)
**GO Criteria:**
- ✅ 100 beta users, 40% D30 retention
- ✅ Positive feedback qualitativo (5+ interviste)
- ✅ Uptime >99%
- ✅ P95 latency <1s
- ✅ Mobile responsive funzionante

**NO-GO → Extend Beta:**
- ❌ Retention <25%
- ❌ Negative sentiment prevalente
- ❌ Technical issues

### 15.3 Monetization (M9)
**GO Criteria:**
- ✅ 500 MAU
- ✅ 5% free→premium conversion
- ✅ 100 survey "would you pay €9.99?"
- ✅ Churn <10%/mese

**NO-GO → Adjust Pricing:**
- ❌ Conversion <2%
- ❌ Churn >20%
- ❌ Feedback "troppo caro"

### 15.4 Pivot Decision (M12)
**Metrics Review:**
- Se MAU <500: problema acquisition → focus marketing
- Se retention <30%: problema product → focus features
- Se conversion <3%: problema value prop → adjust pricing/tiers
- Se tutto fallisce: consider pivot multisport o B2B (federazioni)

---

## 16. TEAM & RISORSE

### 16.1 Team MVP (M0-M6)

**Gianni (Founder/Developer)**
- Full-stack development
- Product management
- DevOps
- Time commitment: 20-30h/week

**Freelance UI/UX Designer** (Part-time)
- Wireframes, mockups
- Design system
- User testing facilitation
- Budget: €2.000 one-time

**Beta Testers** (Volontari)
- 20-50 ciclisti attivi
- Feedback qualitativo
- Bug reporting

### 16.2 Team Post-Launch (M7+)

**Opzione A - Bootstrap:**
- Gianni full-time
- Marketing freelance (SEO, content) - €1.000/mese
- Customer support (Gianni inizialmente)

**Opzione B - Funded:**
- Gianni (CEO/CTO)
- Full-stack developer #2
- Growth marketer
- Customer success

### 16.3 Budget Breakdown (12 mesi)

**Development (M0-M6):**
- Gianni time: €0 (sweat equity)
- UI/UX freelance: €2.000
- Testing devices/tools: €500

**Infrastructure (M0-M12):**
- Vercel Pro: €20/mese × 12 = €240
- MongoDB Atlas M10: €57/mese × 12 = €684
- Vercel Blob: ~€50/mese × 12 = €600
- Domains, email: €100/anno

**Marketing (M7-M12):**
- Content/SEO freelance: €1.000/mese × 6 = €6.000
- Paid ads: €2.000 budget test
- Tools (PostHog, etc.): €500

**Legal/Admin:**
- Privacy policy, TOS: €500
- Business registration: €500

**TOTAL Year 1: ~€13.000**

**Break-even:**
- €13.000 / €9.99 = 1.300 user-months
- Con 100 premium users = break-even in 13 mesi
- Con 200 premium users = break-even in 6.5 mesi

---

## 17. APPENDIX

### 17.1 Glossario Metriche Ciclismo

- **FTP** (Functional Threshold Power): Potenza massima sostenibile per 1h
- **NP** (Normalized Power): Potenza "fisiologica" considerando variabilità sforzo
- **IF** (Intensity Factor): NP / FTP (intensità relativa)
- **TSS** (Training Stress Score): Carico allenamento ponderato per intensità e durata
- **CTL** (Chronic Training Load): "Fitness", media mobile 42gg di TSS
- **ATL** (Acute Training Load): "Fatica", media mobile 7gg di TSS
- **TSB** (Training Stress Balance): "Forma", CTL - ATL
- **VI** (Variability Index): NP / Avg Power (1.0 = pacing perfetto)
- **W'** (W prime): Capacità anaerobica, lavoro sopra FTP

### 17.2 Competitor Analysis Dettagliata

**TrainingPeaks**
- Pro: Industry standard, coach tools maturi, mobile app
- Contro: Caro, UI complessa, overwhelming per amatori
- Prezzo: $19.99/mese
- Market share: ~70% mercato premium

**Today's Plan**
- Pro: AI coaching, analytics avanzate
- Contro: Caro, non mobile-friendly
- Prezzo: €14.99/mese

**Intervals.icu**
- Pro: Free, open-source, analytics potenti
- Contro: UI brutta, no mobile, developer singolo
- Prezzo: Donation-based

**Strava**
- Pro: Social, UX top, mobile eccellente
- Contro: Analytics base, no TSS/PMC
- Prezzo: €10/mese Summit

**Golden Cheetah**
- Pro: Open-source, analytics infinite
- Contro: Desktop-only, learning curve ripida
- Prezzo: Free

### 17.3 Fonti & Riferimenti

**Training Science:**
- "Training and Racing with a Power Meter" - Allen & Coggan
- TrainingPeaks blog: metodologia TSS/CTL
- British Cycling coaching resources

**Technical:**
- FIT SDK Documentation - Garmin
- GPX 1.1 Schema - Topografix
- MongoDB Time-Series best practices

**Business:**
- "The Mom Test" - Rob Fitzpatrick (customer interviews)
- "Traction" - Gabriel Weinberg (marketing channels)
- Indie Hackers case studies (SaaS bootstrapping)

### 17.4 Next Steps Immediate (Settimana 1)

**Gianni - Action Items:**
1. ✅ Setup repo GitHub + Vercel project
2. ✅ Crea MongoDB Atlas cluster (free M0)
3. ✅ Implementa auth base (NextAuth)
4. ✅ Test parsing FIT con 5 file esempio
5. ⬜ Recruta 5 beta tester (amici ciclisti)
6. ⬜ Design wireframe dashboard (Figma/Excalidraw)
7. ⬜ Write setup README + contributing guide

**Questions to Validate:**
- I ciclisti che conosci pagherebbero €9.99/mese?
- Quali features sono must-have vs nice-to-have?
- Quanto vale per loro risparmiare €10/mese vs TrainingPeaks?

---

## Document Approval

**Prepared by:** Gianni  
**Review Status:** Draft v1.0  
**Next Review:** Post beta testing (M3)

**Changelog:**
- 2026-02-06: Initial PRD creation

---

## Contatti & Feedback

Per domande, feedback o approfondimenti sul PRD:
- Email: [da definire]
- GitHub: [repository da creare]
- Discord: [community da creare]

**Prossimi Passi Consigliati:**
1. Validazione idea con 10 interviste ciclisti target
2. Prototipo rapido parser FIT (2 settimane)
3. Design wireframe completo dashboard
4. Setup workflow n8n per automazioni post-lancio
5. Pitch deck per presentazione a partner/investitori

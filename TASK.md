# TASK: PMC Chart Upgrade — CycloPower

## Contesto
App cycling analytics su Next.js 14 + Recharts + MongoDB.
URL: https://trainingpeaks.vercel.app
Repo: https://github.com/giannigrespan/trainingpeaks

Il PMC (Performance Management Chart) esiste già ma è visivamente lontano dallo standard TrainingPeaks.
L'obiettivo è portarlo a pari del grafico professionale TrainingPeaks: area CTL, linea ATL magenta, linea TSB gialla su asse destro, dots TSS rossi, zone colorate TSB.

---

## Riferimento visivo
Il grafico target ha:
- Area blu riempita semitrasparente = CTL (Fitness, media 42gg)
- Linea magenta = ATL (Fatica, media 7gg)  
- Linea gialla su asse Y destro = TSB (Forma = CTL - ATL del giorno precedente)
- Puntini rossi sparsi = TSS giornaliero (solo nei giorni con allenamento)
- Sfondo diviso in zone colorate per interpretare il TSB

---

## TASK 1 — Aggiornare il PMC chart component
File: `src/components/charts/pmc-chart.tsx`

Trasformare il grafico attuale per corrispondere al riferimento visivo sopra.
- CTL deve diventare un'area riempita, non una semplice linea
- ATL deve avere colore magenta/rosa
- TSB deve stare sull'asse Y destro (separato da CTL/ATL)
- TSS deve essere visualizzato come scatter dots (non barre), solo nei giorni con allenamento, sull'asse Y destro
- Aggiungere zone colorate in background per interpretare il TSB:
  - rosso chiaro sotto -30 (sovraccarico)
  - giallo tra -30 e -10 (affaticato)
  - blu tra -10 e +10 (forma ottimale)
  - verde tra +10 e +25 (fresco)
  - grigio chiaro sopra +25 (transizione)
- Il tooltip deve mostrare tutti i valori + interpretazione testuale del TSB in italiano

---

## TASK 2 — Aggiornare l'API PMC
File: `src/app/api/analytics/pmc/route.ts`

Aggiungere alla response il campo `hasTSS: boolean` per ogni punto.
Serve a distinguere i giorni con allenamento (dots visibili) dai giorni di riposo (nessun dot).

---

## TASK 3 — Creare componente legenda PMC
File: `src/components/charts/pmc-legend.tsx` (nuovo)

Legenda che mostra:
- Le 4 linee/aree con colore e nome (CTL, ATL, TSB, TSS)
- Le 5 zone TSB con colore e range numerico

Deve supportare dark mode coerentemente col resto dell'app.

---

## TASK 4 — Aggiungere status bar nel dashboard
File: `src/app/(dashboard)/dashboard/page.tsx`

Sotto il grafico PMC, aggiungere un banner che mostra lo stato TSB attuale dell'atleta con:
- Emoji e label dello stato (es. "🟢 Fresco — pronto per gareggiare")
- Consiglio specifico basato sul valore TSB
- Valori CTL e ATL correnti in forma compatta

---

## Vincoli tecnici
- Recharts è già installato, usare `Area`, `ReferenceArea`, `ReferenceLine` già disponibili
- Non installare librerie aggiuntive
- Mantenere dark mode su tutti i componenti nuovi
- `isAnimationActive={false}` su tutti i componenti Recharts (dataset fino a 365 punti)
- Doppio asse Y: `yAxisId="left"` per CTL/ATL, `yAxisId="right"` per TSB/TSS

---

## Priorità di esecuzione
1. TASK 2 (API) — dipendenza degli altri
2. TASK 1 (chart) — impatto visivo principale
3. TASK 3 (legenda) — accessory del chart
4. TASK 4 (status bar) — enhancement del dashboard

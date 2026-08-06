/* ==============================================================
   Diamond inventory — MOCK STONES, but CALIBRATED prices.

   These 30 diamonds are invented (no real GIA report backs any of
   them), but each price is derived from real August 2026 market
   medians rather than guessed: a log-log carat/price curve fit
   through round G-color/VS2/Excellent benchmarks (0.5ct $1,400 —
   3.0ct $65,000), then adjusted per-stone by real shape/color/
   clarity/cut multipliers pulled from the same market data (e.g.
   emerald ≈ 65% of round at equal specs, D color ≈ 1.39x G, VVS2
   ≈ 1.33x VS2, Very Good cut ≈ 0.93x Excellent). Source: aggregated
   retail-listing index (James Allen/Blue Nile/Brilliant Earth/
   Whiteflash/Ritani), reported via thediamondprice.com and
   diamonds.pro, trailing-90-day data as of 2026-08-06.

   This is still the seam for a real inventory feed, not a
   replacement for one — replace the array below with diamonds
   sourced from a vendor (e.g. a licensed feed from James Allen /
   Blue Nile / Rare Carat, or a jeweler's own POS export) to go live
   with real stock. Vendor pricing APIs are almost always
   server-side/B2B (CORS-blocked, keyed), so the realistic
   integration is: a small server-side or build-time script pulls
   the feed and regenerates this file, rather than the browser
   fetching it directly at runtime. That keeps the app fully static
   (works as a plain file, an Artifact, or embedded in Streamlit)
   while still reflecting current inventory whenever this file is
   regenerated.

   Required fields per diamond:
     id        string   unique, stable across regenerations if possible
     shape     string   must match one of SHAPES[].id in app.js
                         (round | oval | emerald | princess | pear | cushion | marquise)
     carat     number
     cut       string   e.g. 'Excellent' | 'Very Good' | 'Good'
     clarity   string   e.g. 'FL' | 'IF' | 'VVS1' | 'VVS2' | 'VS1' | 'VS2' | 'SI1' | 'SI2'
     color     string   'D'–'J' (GIA color scale)
     price     number   USD, whole dollars
   ============================================================== */
window.GracieDiamonds = [
  { id:'d1',  shape:'round',    carat:0.50, cut:'Very Good', clarity:'VS2',  color:'G', price:1300 },
  { id:'d2',  shape:'round',    carat:0.71, cut:'Excellent',  clarity:'VS1',  color:'F', price:2945 },
  { id:'d3',  shape:'round',    carat:1.02, cut:'Excellent',  clarity:'VVS2', color:'F', price:8240 },
  { id:'d4',  shape:'round',    carat:1.55, cut:'Excellent',  clarity:'VS1',  color:'D', price:21170 },
  { id:'d5',  shape:'round',    carat:2.10, cut:'Excellent',  clarity:'IF',   color:'D', price:66635 },

  { id:'d6',  shape:'oval',     carat:0.65, cut:'Very Good',  clarity:'SI1',  color:'H', price:1040 },
  { id:'d7',  shape:'oval',     carat:1.15, cut:'Excellent',  clarity:'VS2',  color:'G', price:5375 },
  { id:'d8',  shape:'oval',     carat:1.80, cut:'Excellent',  clarity:'VS1',  color:'F', price:21245 },
  { id:'d9',  shape:'oval',     carat:2.40, cut:'Very Good',  clarity:'VVS2', color:'E', price:49685 },

  { id:'d10', shape:'emerald',  carat:0.90, cut:'Very Good',  clarity:'VS2',  color:'G', price:2230 },
  { id:'d11', shape:'emerald',  carat:1.30, cut:'Excellent',  clarity:'VS1',  color:'F', price:7965 },
  { id:'d12', shape:'emerald',  carat:1.95, cut:'Excellent',  clarity:'VVS1', color:'D', price:31005 },
  { id:'d13', shape:'emerald',  carat:2.75, cut:'Very Good',  clarity:'VS2',  color:'G', price:32010 },

  { id:'d14', shape:'princess', carat:0.55, cut:'Good',       clarity:'SI2',  color:'H', price:545 },
  { id:'d15', shape:'princess', carat:1.00, cut:'Very Good',  clarity:'VS1',  color:'F', price:4630 },
  { id:'d16', shape:'princess', carat:1.48, cut:'Excellent',  clarity:'VVS2', color:'E', price:15795 },
  { id:'d17', shape:'princess', carat:2.05, cut:'Excellent',  clarity:'VS1',  color:'D', price:31100 },

  { id:'d18', shape:'pear',     carat:0.70, cut:'Very Good',  clarity:'SI1',  color:'G', price:1325 },
  { id:'d19', shape:'pear',     carat:1.20, cut:'Excellent',  clarity:'VS2',  color:'F', price:7680 },
  { id:'d20', shape:'pear',     carat:1.65, cut:'Excellent',  clarity:'VS1',  color:'E', price:19610 },
  { id:'d21', shape:'pear',     carat:2.30, cut:'Very Good',  clarity:'VVS2', color:'D', price:50940 },

  { id:'d22', shape:'cushion',  carat:0.60, cut:'Very Good',  clarity:'SI1',  color:'H', price:825 },
  { id:'d23', shape:'cushion',  carat:1.05, cut:'Excellent',  clarity:'VS2',  color:'G', price:3805 },
  { id:'d24', shape:'cushion',  carat:1.50, cut:'Excellent',  clarity:'VS1',  color:'F', price:11980 },
  { id:'d25', shape:'cushion',  carat:2.20, cut:'Excellent',  clarity:'VVS2', color:'E', price:38080 },
  { id:'d26', shape:'cushion',  carat:3.05, cut:'Very Good',  clarity:'VS1',  color:'D', price:68850 },

  { id:'d27', shape:'marquise', carat:0.75, cut:'Very Good',  clarity:'VS2',  color:'G', price:1710 },
  { id:'d28', shape:'marquise', carat:1.25, cut:'Excellent',  clarity:'VS1',  color:'F', price:8945 },
  { id:'d29', shape:'marquise', carat:1.90, cut:'Excellent',  clarity:'VVS2', color:'E', price:30725 },
  { id:'d30', shape:'marquise', carat:2.60, cut:'Excellent',  clarity:'VS1',  color:'D', price:58080 }
];

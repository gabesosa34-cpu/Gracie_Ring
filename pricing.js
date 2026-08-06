/* ==============================================================
   Setting / metal / band pricing — MOCK DATA, not a real price list.

   This is the seam for a jeweler's actual current price sheet.
   Swappable numbers (update from real quotes/spot prices):
     SETTINGS[].base       USD, setting labor + mounting, in the
                            "included" metal tier (see METALS below)
     METALS[].multiplier   applied to SETTINGS[].base and
                            BAND_STYLES[].base — should track the real
                            cost relationship between platinum/gold at
                            current spot prices, not just relative vanity
     BAND_STYLES[].base    USD, same convention as SETTINGS[].base

   Everything else (label, desc copy, METALS[].light/mid/dark render
   colors) is product/design content, not pricing — leave those alone
   when refreshing prices.

   BAND_PROFILES / BAND_DETAILS / BAND_WIDTH / ENGRAVING_FEE below
   price the engagement ring's OWN band construction (profile, width,
   surface detail, engraving) — separate from BAND_STYLES above, which
   prices the optional separate matching WEDDING band. Same swap rules
   apply: BAND_DETAILS[].upcharge and BAND_WIDTH.perMmRate are the
   numbers to refresh from a real price sheet; BAND_PROFILES carry no
   price (see app.js comments on why — profile is a shaping choice,
   not an added cost, in this model).
   ============================================================== */
window.GraciePricing = {
  SETTINGS: [
    { id:'solitaire',   label:'Solitaire',   base:620,  desc:'A single stone, unadorned — the quietest setting, and the one that puts the diamond first.' },
    { id:'pave',        label:'Pavé',   base:980,  desc:'Diamonds set the length of the band, catching light from every angle.' },
    { id:'halo',        label:'Halo',        base:1240, desc:'A ring of smaller diamonds encircles the center stone, adding presence and light.' },
    { id:'three-stone', label:'Three-Stone', base:1680, desc:'Two side stones flank the center — past, present, and future.' }
  ],

  METALS: [
    { id:'platinum',    label:'Platinum',        multiplier:1.42, light:'#F7F7F4', mid:'#C9CAC3', dark:'#A6A79E' },
    { id:'white-gold',  label:'18k White Gold',  multiplier:1.00, light:'#F0EDE5', mid:'#CBC7B9', dark:'#A29C8A' },
    { id:'yellow-gold', label:'18k Yellow Gold', multiplier:1.00, light:'#F4DA8D', mid:'#D4AA49', dark:'#A9822E' },
    { id:'rose-gold',   label:'18k Rose Gold',   multiplier:1.06, light:'#F0C2AC', mid:'#CF8E70', dark:'#A96A4E' }
  ],

  BAND_STYLES: [
    { id:'plain',  label:'Plain Band', base:420, desc:'A clean, comfortable band — the quiet counterpart.' },
    { id:'pave',   label:'Pavé Band', base:780, desc:'Diamonds trace the top half of the band.' },
    { id:'curved', label:'Curved Band', base:690, desc:'Gently contoured to nest against the engagement ring.' }
  ],

  BAND_PROFILES: [
    { id:'comfort',     label:'Comfort Fit',    desc:'Rounded on the inside — the most comfortable choice for everyday wear.' },
    { id:'flat',        label:'Flat',           desc:'A flat outer face for a clean, architectural look.' },
    { id:'knife-edge',  label:'Knife-Edge',     desc:'A raised center ridge tapering to sharp edges, catching more light.' },
    { id:'milgrain',    label:'Milgrain Edge',  desc:'A fine beaded edge along both rails, for a vintage touch.' }
  ],

  BAND_DETAILS: [
    { id:'plain',     label:'Plain',           upcharge:0,   desc:'No added texture or stones — the band speaks for itself.' },
    { id:'pave',      label:'Pavé',            upcharge:540, desc:'Diamonds set along the face of the band.' },
    { id:'channel',   label:'Channel-Set',     upcharge:610, desc:'Diamonds set flush between two polished rails.' },
    { id:'twisted',   label:'Twisted / Rope',  upcharge:340, desc:'A gently spiraled rope texture.' },
    { id:'hammered',  label:'Hammered',        upcharge:260, desc:'A hand-hammered, matte texture.' }
  ],

  BAND_WIDTH: { min:1.5, max:4.0, step:0.1, default:2.2, perMmRate:200 },

  ENGRAVING_FEE: 45
};

# VesselCalc: an educational pressure vessel design tool

VesselCalc is an independent, open learning tool for **pressure vessel design**. It covers the same kind of work that commercial programs such as PV Elite do. You model a vessel from shells, heads, cones, nozzles and flanges, and VesselCalc runs the code calculations. For every check it shows the **formula, the numbers substituted into it, and the result**, so you can follow and hand-verify each step.

It was written from scratch from the **published design methods**: ASME Section VIII Division 1, ASCE 7, and L.P. Zick's saddle analysis. It is **not** a decompiled or copied version of any commercial product, and it contains no proprietary code, data or UI from one.

> ⚠️ **For learning only.** The material allowable stresses, B16.5 ratings, UCS-66 curves and other table data are representative values typed in for teaching. External-pressure Factor B uses a smooth approximation of the II-D charts. Verify everything against the current code editions. Do not use this tool for real equipment. That needs certified software and a qualified engineer.

## Run it

No dependencies, only Node.js 20 or newer.

```bash
cd vesselcalc
npm start            # http://localhost:8080
```

Command line (prints a summary; `--json` dumps every intermediate value):

```bash
node cli.js examples/vertical-column.json
```

```bash
npm test
```

## What it calculates

| Area | Method | Notes |
|---|---|---|
| Cylindrical shells, internal pressure | UG-27(c)(1)/(2), App. 1-2 thick wall | Hoop and longitudinal, MAWP (hot & corroded) and MAP (new & cold) |
| Heads | UG-32 / App. 1-4: ellipsoidal (any D/2h), torispherical (any L/r), hemispherical (+App. 1-3), conical, flat (UG-34) | |
| Conical transitions | UG-32(g), App. 1-5 junction reinforcement (large & small end) | Warning for α > 30° |
| External pressure | UG-28 (cylinders incl. Do/t < 10), UG-33 (heads, cones), UG-33(a)(1) 1.67·P check | Design lengths computed from heads (h/3), cones and rings |
| Stiffening rings | UG-29 required vs. available I (ring + effective shell) | Flat-bar rings |
| Nozzles | UG-37 area replacement (A, A1–A5), UG-40 limits, UG-41 weld load paths, UG-45 neck thickness, UG-36(c)(3) small openings | Nozzle MAWP found by bisection |
| Nozzle flanges | ASME B16.5 P-T ratings (Groups 1.1, 2.2) | |
| Body flanges | Appendix 2: gasket b/G, Wm1/Wm2, bolt area, HD/HT/HG, moments, F/V/f (Table 2-7.1 closed form), T/U/Y/Z, SH/SR/ST, rigidity J (2-14) | Integral and loose ring types; flange MAWP |
| MAWP / MAP | Lowest of all components, minus static head | Lists every candidate |
| Pressure test | UG-99(b) hydro 1.3·MAWP·LSR, UG-100 pneumatic; membrane stress vs. 0.9·Sy | Horizontal or vertical test position |
| MDMT | UCS-66 curves A–D, UCS-66.1 ratio reduction, UG-20(f), UCS-66(c) flanges, UHA-51(d) | |
| Weights & volumes | Numerical integration of the inside profile; partial fill for vertical and horizontal | Empty / operating / test, insulation, nozzles, details |
| Wind | ASCE 7 velocity pressure (Kz by exposure B/C/D), G·Cf·Af per station | Wind-diameter multiplier for platforms |
| Seismic | ASCE 7 equivalent lateral force: Cs limits, k-exponent distribution | Natural period by the Rayleigh method |
| Longitudinal stress | UG-22/UG-23: pressure + weight + bending at every section; tension S·E, compression Factor B; 1.2× for occasional loads | Operating, empty, vacuum and hydrotest cases |
| Skirt & base | Skirt stresses, anchor bolt tension, concrete bearing, base ring thickness | |
| Saddles | Zick: M1/M2, longitudinal at midspan & saddle, tangential shear, horn stress, ring compression | Operating and hydrotest |

### The application

- Model tree (design data, elements, nozzles, flanges, rings, loads, weights) with add, duplicate, reorder and delete
- An auto-scaling elevation sketch: click any part to edit it, and failing parts are outlined in red
- Live recalculation on every keystroke
- **US ↔ SI** display units (the model is stored in US units, so toggling never changes the design)
- Result tabs: Summary, Internal pressure, External pressure, Nozzles, Flanges, MDMT, Pressure test, Weights, Wind & seismic, Longitudinal stress, Supports
- Print or save as PDF for a complete calculation report
- Save/open models as JSON, and the model autosaves in the browser
- Three worked examples: a vertical separator (skirt, wind, seismic), a horizontal drum (saddles, App. 2 flange) and a stainless vacuum tower (cone, rings)

## What it does **not** cover

These parts of a full commercial package are outside the scope of this tool: Division 2 design-by-analysis, fatigue, heat exchanger tubesheets (UHX), jacketed vessels, WRC 107/297/537 local loads, leg and lug supports, lifting lugs, flat-head openings (UG-39), non-circular vessels (App. 13), creep-range design, FEA, and the full ASME II-D material database. Each one would be a good next module to build while learning.

## Learning path

1. Load **Vertical separator**. On *Internal pressure*, work the shell formula by hand and compare. Then raise the design pressure and watch which component starts to govern MAWP.
2. Set a nozzle's pad to 0 and see A5 disappear and the reinforcement fail. Increase the neck thickness and watch A2 grow.
3. Load **Vacuum tower**. Delete a stiffening ring and see the design length *L* and the allowable external pressure change.
4. Load **Horizontal drum**. Move the saddles (A) and compare M1/M2 and the horn stress. Zick recommends A ≤ R/2 when it is practical.
5. Turn wind and seismic on and off and compare the governing load case in *Longitudinal stress*.

## Code layout

```
src/engine/   pure calculation modules (no DOM), usable from Node or the browser
  materials.js   allowables, modulus, yield, Factor B approximation
  tables.js      gaskets, bolts, pipe, B16.5, UCS-66, App. 1-5, UG-33.1 tables
  components.js  shells, heads, cones, flat heads, external pressure, rings, junctions
  nozzle.js      UG-37/40/41/45
  flange.js      Appendix 2
  loads.js       wind, seismic, natural period
  supports.js    Zick saddles, skirt/base ring/anchor bolts
  geometry.js    layout, profiles, volumes, weights
  analyze.js     orchestrates everything into one result object
src/ui/       browser app (schema-driven forms, SVG sketch, report renderer)
test/         unit tests against hand calculations plus example regression tests
```

# IS 11639 Penstocks (Parts 1, 2, 3) - Starter Notes

> Curated consultant summary of IS 11639 "Structural Design of Penstocks - Criteria": Part 1 Surface penstocks; Part 2 Buried/embedded penstocks in rock; Part 3 Specials for penstocks (bifurcations, bends, reducers etc.). This is NOT the code text. Upload the licensed BIS copies for clause-accurate citations.

## Part 1 - Surface (exposed) penstocks: key design concepts
- Internal pressure design: hoop (circumferential) stress σ = p·D/(2·t). Required shell thickness t = p·D/(2·σa·η) + c, where p = design internal pressure (static + water hammer), D = internal diameter, σa = allowable stress for the load condition, η = weld joint efficiency (depends on extent of radiography), c = corrosion allowance.
- Corrosion allowance: 1.5 mm or more is common practice for penstocks - confirm the code value and project specification (higher for aggressive water/silt).
- Minimum handling thickness: a commonly used expression is t_min = (D + 500)/400 mm with D in mm (derived from USBR practice) and generally not less than about 6 mm - verify exact expression and limits in IS 11639 Part 1.
- Load conditions: normal operating, intermittent (e.g. normal load rejection transients), emergency and exceptional (e.g. worst closure malfunction, seismic) - allowable stress increases for less frequent conditions. Take the stress ratios from the code table.
- Longitudinal stresses: from beam action between supports, temperature (restrained or at expansion joints), Poisson effect, friction at supports, hydrostatic thrust at bends and reducers, dead weight of pipe and water. Combine with hoop stress using the equivalent stress criterion.
- Supports: saddle supports (local stresses at horn of saddle - Zick-type analysis) or ring girder (stiffener ring) supports for larger diameters; anchor blocks at bends and at intervals; expansion joints (sleeve/bellows) downstream of anchor blocks.
- External pressure / vacuum: exposed penstock must resist collapse under vacuum from sudden draining (air valves/vent pipes required downstream of intake gate). Critical buckling pressure of an unstiffened long tube pcr = 2E/(1-ν²)·(t/D)³; stiffener rings added when shell alone is insufficient.

## Water hammer (applies to all parts)
- Joukowsky rise for rapid closure: Δh = a·Δv/g, where a is the pressure wave speed.
- Wave speed in a steel pipe: a = sqrt((K/ρ) / (1 + (K·D)/(E·t)·C1)), typically 900-1200 m/s for steel penstocks; lower in lined tunnels with rock participation effects considered.
- Pipe period T = 2L/a. Closure slower than 2L/a reduces the rise (Allievi / Michaud approach, or numerical transient analysis by method of characteristics).
- Design pressure envelope along the penstock comes from the transient study by the turbine/pump-turbine supplier, including surge tank oscillations. For PSP, include pump trip (power failure in pumping mode, downsurge and possible column separation), mode transitions and hydraulic short circuit; PSP transients usually govern over HEP-type load rejection.
- A common preliminary assumption where no study exists is a percentage rise over static head (e.g. 25-50%) - flag clearly as an assumption.

## Part 2 - Embedded/buried penstocks and steel liners in rock
- Internal pressure may be shared between the steel liner, backfill concrete and surrounding rock depending on rock quality, gap (from temperature drop, shrinkage, grouting) and rock cover. Rock participation is only credited where cover and rock mass modulus are adequate; the liner alone is often designed for a fraction of internal pressure with check for full pressure where cover is insufficient (e.g. near portals, powerhouse).
- External pressure governs liner design at low internal pressure zones and dewatered condition: groundwater head, grouting pressure, concrete placement pressure. Buckling of liners: Amstutz or Jacobsen methods (unstiffened liner confined by concrete), stiffened liners with stiffener ring and shell buckling between rings, and general buckling checks. Factor of safety on external buckling as per code.
- Snow's criterion / Norwegian criterion used for checking adequacy of rock cover for unlined or partially lined sections (general practice).
- Contact and consolidation grouting, drainage around liner to limit external pressure.

## Part 3 - Specials: bifurcations, bends, reducers
- Bifurcations (wyes) in penstock manifolds for multi-unit HEP/PSP: unbalanced forces at the intersection are carried by external reinforcement: sickle/crescent plate (Swiss/Escher Wyss type, internal tie), U-beam/girder reinforcement, or three-girder design. Modern practice validates by FE analysis with local peak stress limits and fatigue checks for PSP cycling.
- Bends: mitred segments with deflection per segment limited; hydrostatic thrust at bends taken by anchor blocks.
- Reducers (conical transitions): cone half-angle limited, junction stresses and stiffening at cone-cylinder junctions.
- Hydraulic model testing or CFD for head loss in manifold bifurcations of high-head PSP projects.

## Materials and fabrication (general practice)
- Plates to IS 2062 for moderate pressures; high-strength quenched and tempered steels (e.g. ASTM A517/A537 class, S500Q-S690Q) for high-head PSP where thickness would otherwise exceed weldability limits (often ~40-50 mm). Consider toughness (Charpy) at minimum service temperature.
- Radiography/UT of longitudinal and circumferential welds governs joint efficiency; stress relieving (PWHT) required above specified thickness for carbon steels.
- Hydrostatic testing of shop fabricated specials and bifurcations (e.g. 1.5 times design pressure is a common specification value - verify).

## Review checklist
- Transient envelope from pump-turbine supplier used, PSP pump trip considered.
- Thickness = structural + corrosion allowance; min handling thickness satisfied.
- Buckling under vacuum (exposed) and external water pressure (embedded) checked.
- Anchor block forces include all thrust, friction and temperature terms.
- Bifurcation reinforcement analysed by FE; fatigue checked for PSP cycling.

# IS 4622 Fixed Wheel Gates - Starter Notes

> Curated consultant summary of IS 4622 (Hydraulic Gates - Fixed Wheel Gates - Recommendations for Structural Design, latest revision 2003). This is NOT the code text. Clause-accurate answers require uploading the licensed BIS copy (Knowledge > Upload > type "IS Code").

## Scope and application
IS 4622 covers structural design of vertical-lift fixed wheel (roller) gates used as service, emergency and maintenance gates at spillways, intakes, sluices, tunnel outlets and draft tubes. In HEP and PSP intakes the fixed wheel gate is the typical emergency/intake gate because it can close under flowing water (self-closing under its own weight plus downpull) and open under balanced head after filling through a bypass or crack-opening. Draft tube gates in PSP are frequently fixed wheel gates designed for tailwater head plus transient pressures from the pump-turbine.

## Components
- Skin plate: carries water load to horizontal girders and vertical stiffeners; located on upstream or downstream side depending on seal arrangement.
- Horizontal girders (main girders) and vertical stiffeners / intermediate beams supporting the skin plate.
- End vertical girders carrying wheel loads.
- Wheels (fixed wheels) on stationary axles or with roller/spherical bearings or self-lubricating bushes; wheel track on embedded parts.
- Guide rollers / side guides, reverse (counter) rollers.
- Seals: rubber seals (music-note side/top seals, flat bottom seal); see IS 11855 notes.
- Lifting arrangement: lifting beam, lugs, hoist connection.
- Embedded parts: track, sill beam, seal seats, guides, lintel.

## Loads and load combinations (summary)
- Hydrostatic pressure at maximum water level (FRL/MWL as specified) including differential head for gates with water on both sides.
- Hydrodynamic effects and seismic loads (hydrodynamic pressure on gate by Westergaard-type approach, inertia of gate mass) as per IS 1893 seismic coefficients for the site.
- Wave pressure, silt pressure where applicable, ice not normally relevant in Indian projects except high-altitude sites.
- Hoisting loads: self weight, seal friction, wheel rolling and axle/bush friction, downpull (hydrodynamic) or uplift, buoyancy, and hoist capacity for jammed gate conditions.
- PSP: consider reverse differential head (generating vs pumping mode), frequent operation and fatigue.
The code distinguishes normal and occasional (e.g. seismic, jammed hoist) load cases with different permissible stress levels - confirm the factors from the code table.

## Permissible stresses (concept)
Permissible stresses are expressed as fractions of the yield stress of the material and are reduced for "wet and inaccessible" components compared with "dry/accessible" components, because inaccessible members cannot be maintained against corrosion. Combined stresses in the skin plate (local plate bending plus participation in girder bending) are checked with an equivalent (von Mises/Huber-Hencky) stress. Take the actual percentages from the code table - do not assume.

## Skin plate design (general practice)
- Skin plate panels are treated as plates fixed/continuous at stiffeners and girders; bending stress from plate-theory coefficients depending on panel aspect ratio b/a (tables in code are based on classical plate solutions).
- A width of skin plate acting with each girder (effective width) is taken as part of the girder flange.
- Corrosion allowance is added to the computed skin plate thickness (1.5 mm is the commonly quoted allowance for gates - verify against the code); minimum thickness is also prescribed.
- Check combined stress: local plate bending + global girder bending stress at the same point.

## Horizontal girders and end girders
- Girders designed as simply supported between wheel lines (end vertical girders), with composite skin plate flange.
- Deflection limit for main horizontal girders is commonly taken as span/800 in gate practice - verify the limit in the current code revision and specification.
- Shear lag, web buckling and lateral torsional stability of compression flanges to be checked (IS 800 methods).
- Girder spacing is normally arranged so that each girder carries approximately equal load (closer spacing towards the sill).

## Wheels, axles and track
- Wheel load = girder end reaction distributed to wheels; allow for unequal distribution (e.g. due to deflection and tolerances) - many specifications adopt a load sharing factor.
- Wheel-track contact stress checked by Hertz theory. For a cylindrical wheel on a flat track: σc = 0.418·sqrt(P·E/(b·r)) (P wheel load, b effective contact width, r wheel radius, E modulus). Hardness of wheel and track must be compatible (track harder than wheel or as specified) and permissible contact stress relates to material hardness (BHN).
- Axle designed for bending and shear; bushes (self-lubricating/bronze) checked for bearing pressure; roller bearings sized for static load rating.
- Track and track base concrete checked for bearing; stress in concrete below track base.

## Hoist capacity (general approach)
Lifting force = self weight + seal friction + wheel friction (rolling + axle/bush) + downpull + guide friction - buoyancy, multiplied by a margin (commonly 20% or as per specification). Closing force check: gate weight + ballast must exceed friction + uplift for self-closure under flowing water. Downpull coefficients depend on bottom lip geometry (a 45 degree or steeper upstream-sloping lip with seal at downstream edge is the usual choice to minimise downpull and vibration).

## Review checklist
- Governing head case, including PSP transient and reverse head.
- Skin plate thickness includes corrosion allowance; combined stress checked.
- Girder deflection within limit and consistent with seal compression tolerance.
- Wheel Hertz stress and hardness specified; track material specified.
- Hoist capacity includes all frictions, downpull and margin; closure under own weight verified.
- Fabrication and erection tolerances specified; seal interference specified.

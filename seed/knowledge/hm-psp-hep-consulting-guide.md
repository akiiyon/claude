# HM Works in HEP and PSP - Consultant Practice Guide

> Curated general engineering practice notes for hydro-mechanical (HM) works. Not a code. Use as orientation and checklists; confirm requirements against contract specifications and IS codes.

## Hydro-mechanical package: what it includes
Intake gates and stoplogs, intake trash racks and trash rack cleaning machine (TRCM), spillway radial/vertical gates, diversion and bottom outlet gates, surge shaft gates, penstock / pressure shaft steel liners, bifurcations/manifold, penstock inlet valves are usually in the electro-mechanical (EM) package (butterfly/spherical main inlet valves), draft tube gates and stoplogs, tailrace outlet gates and trash racks, gantry cranes and hoists, embedded parts and control systems.

## HEP vs PSP: what changes for HM design
- Flow direction: PSP water conductors carry flow in both directions; intakes of the upper reservoir act as outlets during pumping, the lower reservoir outlet acts as intake. Trash racks, gate slots and transitions must be checked for both directions.
- Operating frequency: PSP units start/stop and change mode several times a day, so gates, hoists, penstocks and bifurcations see many more load cycles - fatigue assessment (e.g. using EN 1993-1-9 / IIW detail categories) becomes important.
- Transients: pump trip on power failure and hydraulic short-circuit operation may produce governing pressure envelopes and possible minimum pressures (column separation risk) - obtain the transient study.
- Submergence: PSP units are set deep for pump cavitation (NPSH), so draft tube gates and tailrace gates carry high tailwater heads.
- Reservoir drawdown: large daily water level fluctuations in both reservoirs; intakes must be designed for vortex prevention at minimum drawdown level and for fast level changes.
- Fast emergency closure of intake gates or penstock valves to protect powerhouse in case of penstock rupture.

## Consultant approach to design review
1. Design basis report (DBR): check hydraulic parameters (FRL, MDDL, TWL, design discharge, transients), codes, materials, load cases and combinations, permissible stresses, corrosion allowance, deflection limits, tolerances.
2. Calculations: verify governing load case, boundary conditions, effective widths, stability checks, connection design, and that software FE results are validated by hand checks.
3. Drawings: consistency with calculations, weld symbols, tolerances, seal details, material specifications, NDT extent.
4. Interfaces: civil (embedded parts, second stage concrete, block outs), mechanical (hoist, crane rail), electrical (controls, limit switches, position indication), E&M (valves, turbine).
5. Constructability and O&M: access for inspection and maintenance, replaceability of seals and wheels, provision for stoplogs to isolate gates.

## Typical design inputs checklist for a gate
Clear span and height, sill level, design head (upstream/downstream, including transients and reverse head for PSP), gate type and function (service/emergency/maintenance), operating condition (balanced/unbalanced, flowing water), seal arrangement (upstream/downstream), hoist type, seismic zone, material grades, corrosion protection system, operating frequency.

## Typical design inputs checklist for a penstock or liner
Diameter, length and profile, static head along profile, transient pressure envelope (max and min), rock cover and rock mass modulus along alignment, groundwater levels, material grades, weld joint efficiency and NDT, corrosion allowance, construction method (shaft/tunnel, backfill concrete), external pressure cases (grouting, groundwater, dewatering), temperature range.

## Common mistakes seen in reviews
- Using static head only and ignoring transient pressure envelope, or not using the PSP pump-trip case.
- Forgetting corrosion allowance in thickness or deducting it twice.
- Ignoring combined stress in gate skin plate at girder locations.
- Wheel load assumed perfectly equal between wheels.
- Downpull ignored or bottom lip geometry changed without re-evaluating.
- External pressure buckling of steel liners in dewatered condition not checked with realistic groundwater head.
- Trash rack vibration not checked for PSP reverse flow velocities.
- No hydrostatic test or NDT specification for bifurcation.

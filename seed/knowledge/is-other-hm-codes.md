# Other HM Codes: Radial Gates, Slide Gates, Trash Racks, Hoists, Seals - Starter Notes

> Curated consultant summaries of related BIS standards. Not code text. Verify titles, revision years and clause numbers against licensed copies uploaded to the knowledge base.

## IS 4623 Radial gates (structural design)
- Radial (Tainter) gates are used mainly for spillways and some low-head intakes/sluices. Water load passes radially through the skin plate to horizontal girders, then to radial arms, trunnion hub, trunnion pin and the trunnion anchorage (trunnion girder / yoke and anchor rods, often prestressed anchorage into the pier).
- Arms are compression members with bending (check buckling in and out of plane; inclined arm arrangement induces lateral thrust at trunnion).
- Trunnion bearing: bronze/self-lubricating bush or spherical plain bearing; check bearing pressure and friction moment for hoist sizing.
- Side seals of radial gates are on curved embedded plates; side guide rollers limit lateral movement.
- Hoist: rope drum hoist (IS 6938) or hydraulic hoist (IS 10210); hoist load includes weight moment, seal friction, trunnion friction moment, and hydrodynamic effects.

## IS 5620 (low head) and IS 9349 (medium and high head) slide gates
- Slide (sluice) gates slide on bearing pads (bronze or self-lubricating) against embedded seats instead of rolling on wheels, so hoisting friction is much larger (sliding friction coefficient governs hoist). Used for low discharge or where compact size is needed, e.g. bypass, filling valves, bottom outlets, and as high-head regulating gates with special seating.
- High head slide gates need careful design of gate slot geometry, aeration downstream, bonnet/body design and seat material to avoid cavitation and vibration.

## IS 11388 Trash racks for intakes
- Trash racks: vertical/inclined steel bars in panels supported on horizontal girders, preventing debris entry into water conductor system.
- Design differential head due to clogging is specified (a partial clogging head for structural design; the code gives values/approach - verify). Racks are usually designed for a specified clogging head in addition to hydrodynamic effects.
- Vibration: vortex shedding frequency fs = St·V/t (St = Strouhal number ~0.2 to 0.25 for rectangular bars, V local velocity through rack, t bar thickness). Natural frequency of bar spans (with added mass of water) should be kept well away from fs (a separation ratio of 1.5 or more is a common rule) to avoid resonance.
- Approach velocity commonly limited to about 0.75 to 1.0 m/s gross for manually cleaned racks; higher (up to about 1.5 m/s) with mechanical trash rack cleaning machine - general practice.
- PSP: racks see flow in both directions (outflow in pumping mode at the upper reservoir intake / inflow at lower reservoir outlet), with higher and more non-uniform velocities; design racks and supports for reverse flow, fatigue from vortex shedding, and non-uniform velocity profiles from CFD/model studies.
- Head loss through rack: Kirschmer-type formula hr = kt·(t/b)^(4/3)·(V²/2g)·sin(θ).

## IS 6938 Rope drum and chain hoists; IS 10210 Hydraulic hoists
- Rope drum hoists: capacity from gate hoisting calculation plus margin; rope factor of safety, drum and sheave diameter ratios (D/d), motor rating, brakes, overload and limit switches, manual operation provision.
- Hydraulic hoists: cylinder sized for lifting and closing (push if required) force, rod buckling check under compression, working pressure selection, accumulators for emergency closure of intake gates, synchronisation for double-cylinder hoists, and position indication.
- PSP intake and draft tube gates often need fast emergency closure (hydraulic hoists with gravity closure and controlled closing speed).

## IS 11855 Rubber seals for hydraulic gates
- Seal profiles: music-note (J-bulb) for sides and top, flat or wedge seal at bottom, solid or hollow bulb; cladding with PTFE/fluorocarbon to reduce friction.
- Specify rubber compound properties (hardness Shore A, tensile strength, elongation, compression set, water absorption, ageing).
- Seal pre-compression/interference (commonly 2-5 mm) and seal friction coefficients (rubber on stainless steel, cladded vs uncladded) feed into hoist design.

## Supporting codes frequently referenced
- IS 800: general steel design methods (stability, connections).
- IS 2062: structural steel (grades E250, E350 etc.) for gates and moderate penstocks.
- IS 1893: seismic design criteria (hydrodynamic and inertial loads on gates and structures).
- IS 816 / AWS D1.1 / ASME Section IX: welding and qualification (by specification).

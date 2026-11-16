"""Fictional sample data for testing the dashboard before going live.

Two projects (a PSP and a HEP) covering all four stages and both loops. The
numbers are meant to be checked against "Acceptance check" in
docs/BUILD_GUIDE.md with the report date fixed at 2026-11-16.

Two data issues are deliberate so the Data Quality page has something to show:
  * HEP02-HM-DE-DWG-201 R0: CRS status code C, register status code D.
  * PSP01-HM-DE-CAL-104 R0: one comment row has no Comment ID.
"""

from datetime import date as d

AS_OF = d(2026, 11, 16)

PROJECTS = [
    # code, name, type, client, project lead, active
    ("PSP01", "Northridge Pumped Storage Project", "PSP", "Sample Client A", "A. Sharma", "Yes"),
    ("HEP02", "Silver Valley Run-of-River HEP", "HEP", "Sample Client B", "K. Menon", "Yes"),
]

PEOPLE = [
    # name, email, role, active
    ("A. Sharma", "a.sharma@example.com", "Project Lead", "Yes"),
    ("R. Iyer", "r.iyer@example.com", "Design Engineer", "Yes"),
    ("K. Menon", "k.menon@example.com", "Project Lead", "Yes"),
    ("S. Rao", "s.rao@example.com", "Design Engineer", "Yes"),
]

EPC = "Sample EPC Contractor"


def doc(doc_no, title, stage, component, doc_type, loop, engineer, other, planned,
        review_days=None, remarks=None):
    return dict(doc_no=doc_no, title=title, stage=stage, component=component,
                doc_type=doc_type, loop=loop, engineer=engineer, other_party=other,
                planned=planned, review_days=review_days, remarks=remarks)


DOCUMENTS = {
    "PSP01": [
        doc("PSP01-HM-PFR-RPT-001", "Pre-Feasibility Report - HM Works", "PFR",
            "General / Multiple", "Report", "Our Deliverable", "A. Sharma",
            "Sample Client A", d(2026, 1, 10)),
        doc("PSP01-HM-DPR-RPT-001", "DPR Chapter - Hydro-Mechanical Equipment", "DPR",
            "General / Multiple", "Report", "Our Deliverable", "A. Sharma",
            "Sample Client A", d(2026, 5, 4)),
        doc("PSP01-HM-DPR-CAL-001", "Preliminary Design - Intake Gates and Stoplogs", "DPR",
            "Intake Gate", "Calculation", "Our Deliverable", "R. Iyer",
            "Sample Client A", d(2026, 5, 4)),
        doc("PSP01-HM-DPR-CAL-002", "Preliminary Design - Penstock and Bifurcation", "DPR",
            "Penstock / Pressure Shaft", "Calculation", "Our Deliverable", "S. Rao",
            "Sample Client A", d(2026, 5, 4)),
        doc("PSP01-HM-DPR-DWG-001", "Layout of HM Equipment - Water Conductor System", "DPR",
            "General / Multiple", "Drawing", "Our Deliverable", "R. Iyer",
            "Sample Client A", d(2026, 5, 10)),
        doc("PSP01-HM-DE-DBR-001", "Design Basis Report - HM Works", "DE",
            "General / Multiple", "Design Basis Report", "External Review", "A. Sharma",
            EPC, d(2026, 8, 1)),
        doc("PSP01-HM-DE-CAL-101", "Design of Upper Intake Fixed Wheel Gate", "DE",
            "Intake Gate", "Calculation", "External Review", "R. Iyer", EPC, d(2026, 9, 1)),
        doc("PSP01-HM-DE-CAL-102", "Design of Draft Tube Gate", "DE",
            "Draft Tube Gate", "Calculation", "External Review", "R. Iyer", EPC,
            d(2026, 9, 15)),
        doc("PSP01-HM-DE-CAL-103", "Design of Pressure Shaft Steel Liner incl. Buckling", "DE",
            "Steel Liner", "Calculation", "External Review", "S. Rao", EPC, d(2026, 10, 15)),
        doc("PSP01-HM-DE-CAL-104", "Design of Intake Trash Rack incl. Vibration Check", "DE",
            "Intake Trash Rack", "Calculation", "External Review", "S. Rao", EPC,
            d(2026, 10, 1)),
        doc("PSP01-HM-DE-DWG-201", "GA - Upper Intake Fixed Wheel Gate", "DE",
            "Intake Gate", "Drawing", "External Review", "R. Iyer", EPC, d(2026, 9, 1)),
        doc("PSP01-HM-DE-SPC-001", "Technical Specification - Penstock Fabrication and NDT",
            "DE", "Penstock / Pressure Shaft", "Specification", "External Review", "S. Rao",
            EPC, d(2026, 10, 30)),
        doc("PSP01-HM-FAB-DWG-301", "Fabrication Drawing - Intake Gate Skin Plate and Girders",
            "FAB", "Intake Gate", "Drawing", "External Review", "R. Iyer", EPC,
            d(2026, 12, 15)),
    ],
    "HEP02": [
        doc("HEP02-HM-DPR-RPT-001", "DPR - Hydro-Mechanical Chapter", "DPR",
            "General / Multiple", "Report", "Our Deliverable", "K. Menon",
            "Sample Client B", d(2026, 7, 15)),
        doc("HEP02-HM-DPR-CAL-001", "Preliminary Design - Spillway Radial Gates", "DPR",
            "Spillway Radial Gate", "Calculation", "Our Deliverable", "S. Rao",
            "Sample Client B", d(2026, 7, 15)),
        doc("HEP02-HM-DPR-CAL-002", "Preliminary Design - Desilting Basin Gates", "DPR",
            "Desilting Gate", "Calculation", "Our Deliverable", "S. Rao",
            "Sample Client B", d(2026, 7, 15)),
        doc("HEP02-HM-DPR-DWG-001", "HM Layout - Headworks", "DPR",
            "General / Multiple", "Drawing", "Our Deliverable", "K. Menon",
            "Sample Client B", d(2026, 7, 15)),
        doc("HEP02-HM-DE-CAL-101", "Design of Spillway Radial Gate", "DE",
            "Spillway Radial Gate", "Calculation", "External Review", "K. Menon", EPC,
            d(2026, 10, 25)),
        doc("HEP02-HM-DE-CAL-102", "Design of Rope Drum Hoist for Radial Gate", "DE",
            "Rope Drum Hoist", "Calculation", "External Review", "K. Menon", EPC,
            d(2026, 11, 30)),
        doc("HEP02-HM-DE-DWG-201", "GA - Intake Vertical Gate", "DE",
            "Intake Gate", "Drawing", "External Review", "S. Rao", EPC, d(2026, 10, 1)),
    ],
}

# doc no, rev, submission no, submitted, transmittal ref, returned, status code
REVISIONS = {
    "PSP01": [
        ("PSP01-HM-PFR-RPT-001", "R0", 1, d(2026, 1, 10), "TR-PSP01-001", d(2026, 1, 30), "C"),
        ("PSP01-HM-PFR-RPT-001", "R1", 2, d(2026, 2, 20), "TR-PSP01-004", d(2026, 3, 5), "A"),
        ("PSP01-HM-DPR-RPT-001", "R0", 1, d(2026, 5, 4), "TR-PSP01-010", d(2026, 5, 28), "C"),
        ("PSP01-HM-DPR-RPT-001", "R1", 2, d(2026, 6, 25), "TR-PSP01-015", d(2026, 7, 10), "B"),
        ("PSP01-HM-DPR-CAL-001", "R0", 1, d(2026, 5, 4), "TR-PSP01-010", d(2026, 5, 28), "B"),
        ("PSP01-HM-DPR-CAL-002", "R0", 1, d(2026, 5, 4), "TR-PSP01-010", d(2026, 6, 2), "C"),
        ("PSP01-HM-DPR-CAL-002", "R1", 2, d(2026, 7, 1), "TR-PSP01-016", d(2026, 7, 20), "C"),
        ("PSP01-HM-DPR-CAL-002", "R2", 3, d(2026, 8, 18), "TR-PSP01-020", d(2026, 9, 1), "A"),
        ("PSP01-HM-DPR-DWG-001", "R0", 1, d(2026, 5, 10), "TR-PSP01-011", d(2026, 5, 28), "A"),
        ("PSP01-HM-DE-DBR-001", "R0", 1, d(2026, 8, 3), "EPC-TR-0101", d(2026, 8, 20), "C"),
        ("PSP01-HM-DE-DBR-001", "R1", 2, d(2026, 9, 10), "EPC-TR-0112", d(2026, 9, 28), "B"),
        ("PSP01-HM-DE-CAL-101", "R0", 1, d(2026, 9, 1), "EPC-TR-0108", d(2026, 9, 18), "C"),
        ("PSP01-HM-DE-CAL-101", "R1", 2, d(2026, 10, 12), "EPC-TR-0120", d(2026, 10, 26), "C"),
        ("PSP01-HM-DE-CAL-101", "R2", 3, d(2026, 11, 9), "EPC-TR-0131", None, None),
        ("PSP01-HM-DE-CAL-102", "R0", 1, d(2026, 9, 15), "EPC-TR-0110", d(2026, 10, 10), "C"),
        ("PSP01-HM-DE-CAL-103", "R0", 1, d(2026, 10, 20), "EPC-TR-0122", None, None),
        ("PSP01-HM-DE-CAL-104", "R0", 1, d(2026, 10, 5), "EPC-TR-0115", d(2026, 10, 19), "C"),
        ("PSP01-HM-DE-CAL-104", "R1", 2, d(2026, 11, 2), "EPC-TR-0128", None, None),
        ("PSP01-HM-DE-DWG-201", "R0", 1, d(2026, 9, 1), "EPC-TR-0108", d(2026, 9, 20), "C"),
        ("PSP01-HM-DE-DWG-201", "R1", 2, d(2026, 10, 12), "EPC-TR-0120", d(2026, 10, 27), "B"),
    ],
    "HEP02": [
        ("HEP02-HM-DPR-RPT-001", "R0", 1, d(2026, 7, 15), "TR-HEP02-003", d(2026, 8, 14), "C"),
        ("HEP02-HM-DPR-RPT-001", "R1", 2, d(2026, 9, 1), "TR-HEP02-007", d(2026, 9, 25), "B"),
        ("HEP02-HM-DPR-CAL-001", "R0", 1, d(2026, 7, 15), "TR-HEP02-003", d(2026, 8, 14), "C"),
        ("HEP02-HM-DPR-CAL-001", "R1", 2, d(2026, 9, 1), "TR-HEP02-007", d(2026, 9, 25), "C"),
        ("HEP02-HM-DPR-CAL-001", "R2", 3, d(2026, 10, 20), "TR-HEP02-011", None, None),
        ("HEP02-HM-DPR-CAL-002", "R0", 1, d(2026, 7, 15), "TR-HEP02-003", d(2026, 10, 20), "C"),
        ("HEP02-HM-DPR-DWG-001", "R0", 1, d(2026, 7, 15), "TR-HEP02-003", d(2026, 8, 14), "A"),
        ("HEP02-HM-DE-CAL-101", "R0", 1, d(2026, 10, 27), "EPC-TR-0205", None, None),
        ("HEP02-HM-DE-DWG-201", "R0", 1, d(2026, 10, 1), "EPC-TR-0201", d(2026, 10, 14), "D"),
    ],
}


def crs(project, doc_no, rev, review_date, reviewed_by, status_code, title, comments):
    return dict(project=project, doc_no=doc_no, rev=rev, review_date=review_date,
                reviewed_by=reviewed_by, status_code=status_code, title=title,
                comments=comments)


# comment id, sheet / clause ref, comment, category, severity, std code,
# originator response, status
CRS_FILES = [
    crs("PSP01", "PSP01-HM-DPR-CAL-002", "R0", d(2026, 6, 2), "Sample Client A", "C",
        "Preliminary Design - Penstock and Bifurcation", [
            ("C01", "Sec. 4.2", "Shell thickness based on static head only; include the pump-trip "
             "transient envelope.", "Design Input / Basis", "Major", "HM-TRN-01",
             "Revised with transient envelope from the hydraulic study.", "Closed"),
            ("C02", "Sec. 4.5", "Corrosion allowance not added to the minimum thickness.",
             "Calculation", "Major", "HM-COR-01", "Added 2 mm corrosion allowance.", "Closed"),
            ("C03", "Sec. 6", "External pressure check for the dewatered liner is missing.",
             "Calculation", "Major", "HM-LIN-01", "Will be added in the next revision.", "Open"),
        ]),
    crs("PSP01", "PSP01-HM-DPR-CAL-002", "R1", d(2026, 7, 20), "Sample Client A", "C",
        "Preliminary Design - Penstock and Bifurcation", [
            ("C03", "Sec. 6", "External pressure check uses 50% groundwater head; justify or use "
             "full head.", "Calculation", "Major", "HM-LIN-01",
             "Full groundwater head adopted.", "Closed"),
            ("C04", "Sec. 7", "Bifurcation hydrostatic test pressure not stated.",
             "Material / Fabrication", "Minor", "HM-NDT-01", "Test pressure added.", "Closed"),
        ]),
    crs("PSP01", "PSP01-HM-DE-DBR-001", "R0", d(2026, 8, 20), "A. Sharma", "C",
        "Design Basis Report - HM Works", [
            ("C01", "Table 2.1", "MDDL of the upper reservoir does not match the latest hydraulic "
             "data.", "Design Input / Basis", "Major", "HM-GEN-01", "Corrected.", "Closed"),
            ("C02", "Sec. 3.4", "Pump-trip transient case missing from the load cases.",
             "Design Input / Basis", "Major", "HM-TRN-01", "Added.", "Closed"),
            ("C03", "Sec. 3.6", "Seismic load combination not listed.", "Code Compliance",
             "Major", "HM-SEI-01", "Added per IS 1893.", "Closed"),
            ("C04", "Sec. 5", "Typo in material grade designation.", "Editorial", "Minor", None,
             "Corrected.", "Closed"),
        ]),
    crs("PSP01", "PSP01-HM-DE-DBR-001", "R1", d(2026, 9, 28), "A. Sharma", "B",
        "Design Basis Report - HM Works", [
            ("C05", "Sec. 6.2", "State the deflection limit for skin plate explicitly.",
             "Code Compliance", "Minor", None, None, "Open"),
        ]),
    crs("PSP01", "PSP01-HM-DE-CAL-101", "R0", d(2026, 9, 18), "R. Iyer", "C",
        "Design of Upper Intake Fixed Wheel Gate", [
            ("C01", "Sec. 2.1", "Design head excludes the transient rise; include it.",
             "Design Input / Basis", "Major", "HM-TRN-01",
             "Transient rise is small; not included.", "Open"),
            ("C02", "Sec. 4.3", "Combined stress in skin plate at girder location not checked.",
             "Calculation", "Major", "HM-GAT-01", "Check added.", "Closed"),
            ("C03", "Sec. 5.1", "Wheel loads assumed equal.", "Calculation", "Major",
             "HM-GAT-02", "Unequal distribution considered.", "Closed"),
            ("C04", "Sec. 7", "Downpull not evaluated.", "Calculation", "Major", "HM-GAT-03",
             "Will be addressed in R1.", "Open"),
            ("C05", "Annex B", "Seal friction coefficient source not referenced.",
             "Missing Information", "Minor", None, "Reference added.", "Closed"),
        ]),
    crs("PSP01", "PSP01-HM-DE-CAL-101", "R1", d(2026, 10, 26), "R. Iyer", "C",
        "Design of Upper Intake Fixed Wheel Gate", [
            ("C01", "Sec. 2.1", "Transient rise is not small for a PSP intake; include it as per "
             "the hydraulic study.", "Design Input / Basis", "Major", "HM-TRN-01", None, "Open"),
            ("C04", "Sec. 7", "Downpull added but bottom lip geometry differs from the GA.",
             "Calculation", "Major", "HM-GAT-03", None, "Open"),
            ("C06", "Sec. 8", "Hoist capacity margin below the specified 20%.", "Calculation",
             "Minor", None, None, "Open"),
        ]),
    crs("PSP01", "PSP01-HM-DE-CAL-102", "R0", d(2026, 10, 10), "R. Iyer", "C",
        "Design of Draft Tube Gate", [
            ("C01", "Sec. 2", "Tailwater head for the PSP pumping mode not considered.",
             "Design Input / Basis", "Major", "HM-GEN-01", None, "Open"),
            ("C02", "Sec. 4", "Corrosion allowance deducted twice from the skin plate.",
             "Calculation", "Minor", "HM-COR-01", None, "Open"),
        ]),
    crs("PSP01", "PSP01-HM-DE-CAL-104", "R0", d(2026, 10, 19), "S. Rao", "C",
        "Design of Intake Trash Rack incl. Vibration Check", [
            ("C01", "Sec. 5", "Vibration check uses generating-mode velocity only; check reverse "
             "flow.", "Calculation", "Major", "HM-TRK-01", "Reverse flow case added.", "Closed"),
            (None, "Sec. 3", "Bar spacing not consistent with the turbine manufacturer's limit.",
             "Interface", "Minor", "HM-INT-01", "Corrected.", "Closed"),
        ]),
    crs("PSP01", "PSP01-HM-DE-DWG-201", "R0", d(2026, 9, 20), "R. Iyer", "C",
        "GA - Upper Intake Fixed Wheel Gate", [
            ("C01", "Sheet 1", "Skin plate thickness differs from the calculation.", "Drafting",
             "Major", "HM-DWG-01", "Corrected.", "Closed"),
            ("C02", "Sheet 2", "Weld symbols missing at girder-to-skin plate joints.", "Drafting",
             "Minor", "HM-DWG-02", "Added.", "Closed"),
        ]),
    crs("HEP02", "HEP02-HM-DPR-CAL-001", "R0", d(2026, 8, 14), "Sample Client B", "C",
        "Preliminary Design - Spillway Radial Gates", [
            ("C01", "Sec. 3", "Seismic case missing.", "Code Compliance", "Major", "HM-SEI-01",
             "Added.", "Closed"),
            ("C02", "Sec. 5", "Trunnion friction not considered in hoist capacity.",
             "Calculation", "Major", None, "Added.", "Closed"),
        ]),
    crs("HEP02", "HEP02-HM-DPR-CAL-001", "R1", d(2026, 9, 25), "Sample Client B", "C",
        "Preliminary Design - Spillway Radial Gates", [
            ("C03", "Sec. 6", "Interface with spillway pier block-outs not shown.", "Interface",
             "Minor", "HM-INT-01", "Shown in revised sketch.", "Closed"),
        ]),
    crs("HEP02", "HEP02-HM-DPR-CAL-002", "R0", d(2026, 10, 20), "Sample Client B", "C",
        "Preliminary Design - Desilting Basin Gates", [
            ("C01", "Sec. 2", "Design discharge differs from the DPR hydrology chapter.",
             "Design Input / Basis", "Major", "HM-GEN-01", None, "Open"),
            ("C02", "Sec. 4", "Sediment load on the gate not considered.", "Calculation",
             "Major", None, None, "Open"),
        ]),
    crs("HEP02", "HEP02-HM-DE-DWG-201", "R0", d(2026, 10, 14), "S. Rao", "C",
        "GA - Intake Vertical Gate", [
            ("C01", "Sheet 1", "GA does not match the approved DBR gate size.", "Drafting",
             "Major", "HM-DWG-01", None, "Open"),
            ("C02", "Sheet 1", "Embedded parts and second-stage concrete interface missing.",
             "Interface", "Major", "HM-INT-01", None, "Open"),
            ("C03", "Sheet 2", "Fabrication tolerances not stated.", "Drafting", "Minor",
             "HM-DWG-02", None, "Open"),
        ]),
]

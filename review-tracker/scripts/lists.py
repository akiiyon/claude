"""Controlled lists shared by the Config workbook and the templates.

Change a list here, then re-run build_workbooks.py so the Config workbook and
both templates stay in step. Power Query reads stages, status codes, people,
projects and the comment library from Tracker_Config.xlsx, not from here.
"""

# (code, name, sort order, default review days)
STAGES = [
    ("PFR", "Pre-Feasibility Report", 1, 21),
    ("DPR", "Detailed Project Report", 2, 21),
    ("DE", "Detailed Engineering", 3, 14),
    ("FAB", "Fabrication", 4, 7),
]

# (code, outcome, counts as approved, requires resubmission)
STATUS_CODES = [
    ("A", "Approved", "Yes", "No"),
    ("B", "Approved with Comments", "Yes", "No"),
    ("C", "Revise & Resubmit", "No", "Yes"),
    ("D", "Rejected", "No", "Yes"),
    ("I", "For Information", "No", "No"),
]

LOOPS = ["Our Deliverable", "External Review"]

DOC_TYPES = [
    "Report",
    "Design Basis Report",
    "Calculation",
    "Drawing",
    "Specification",
    "Method Statement",
    "Other",
]

COMPONENTS = [
    "Intake Gate",
    "Intake Stoplog",
    "Intake Trash Rack",
    "Trash Rack Cleaning Machine",
    "Spillway Radial Gate",
    "Spillway Vertical Gate",
    "Diversion / Bottom Outlet Gate",
    "Desilting Gate",
    "Surge Shaft Gate",
    "Penstock / Pressure Shaft",
    "Steel Liner",
    "Bifurcation / Manifold",
    "Draft Tube Gate",
    "Tailrace Gate",
    "Tailrace Trash Rack",
    "Gantry Crane",
    "Rope Drum Hoist",
    "Hydraulic Hoist",
    "Embedded Parts",
    "Control System",
    "General / Multiple",
]

COMMENT_CATEGORIES = [
    "Code Compliance",
    "Design Input / Basis",
    "Calculation",
    "Drafting",
    "Interface",
    "Missing Information",
    "Material / Fabrication",
    "Constructability / O&M",
    "Editorial",
]

SEVERITIES = ["Major", "Minor"]

COMMENT_STATUSES = ["Open", "Closed", "Withdrawn"]

# (std code, component, category, standard comment)
COMMENT_LIBRARY = [
    ("HM-GEN-01", "General / Multiple", "Design Input / Basis",
     "Design input not consistent with project hydraulic data (FRL / MDDL / TWL / discharge)."),
    ("HM-TRN-01", "General / Multiple", "Design Input / Basis",
     "Transient pressure envelope not considered; include the governing case (pump trip for PSP)."),
    ("HM-COR-01", "General / Multiple", "Calculation",
     "Corrosion allowance not considered, or deducted twice."),
    ("HM-SEI-01", "General / Multiple", "Code Compliance",
     "Seismic load case missing from the load combinations."),
    ("HM-GAT-01", "Intake Gate", "Calculation",
     "Combined stress in skin plate at girder location not checked."),
    ("HM-GAT-02", "Intake Gate", "Calculation",
     "Wheel loads assumed equal; consider unequal distribution."),
    ("HM-GAT-03", "Intake Gate", "Calculation",
     "Downpull / uplift not evaluated for the gate bottom lip geometry."),
    ("HM-LIN-01", "Steel Liner", "Calculation",
     "External pressure buckling (dewatered case) not checked with realistic groundwater head."),
    ("HM-TRK-01", "Intake Trash Rack", "Calculation",
     "Trash rack vibration not checked for reverse-flow velocities (PSP)."),
    ("HM-NDT-01", "General / Multiple", "Material / Fabrication",
     "NDT extent / hydrostatic test requirements not specified."),
    ("HM-DWG-01", "General / Multiple", "Drafting",
     "Drawing not consistent with the calculation (dimensions / plate thickness / grade)."),
    ("HM-DWG-02", "General / Multiple", "Drafting",
     "Weld symbols or fabrication tolerances missing."),
    ("HM-INT-01", "General / Multiple", "Interface",
     "Interface with civil / E&M not addressed (embedded parts, block-outs, controls)."),
]

SETTINGS = [
    ("Target Resubmission Days", 14,
     "Days the originator is allowed to resubmit after a C or D return."),
    ("Stuck Submission Threshold", 3,
     "A document not approved at or after this submission number is listed as stuck."),
    ("Reminder Lead Days", 3,
     "Reminder emails include actions due within this many days, and overdue ones."),
]

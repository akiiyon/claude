"""Build the Excel templates and the sample data set for the HM Review Tracker.

    python review-tracker/scripts/build_workbooks.py

Writes:
  review-tracker/templates/       Tracker_Config.xlsx, Document_Register_TEMPLATE.xlsx,
                                  CRS_TEMPLATE.xlsx
  review-tracker/sample-data/HM Review Tracker/
                                  the same folder layout as SharePoint, filled with
                                  fictional sample projects for testing.

Power Query finds data by Excel table name and column header, so do not
rename tables (tblDocuments, tblRevisions, tblCRSHeader, tblComments, ...) or
their headers without changing the queries in powerbi/queries as well.
"""

from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

import lists
import sample_data

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
SAMPLE_ROOT = ROOT / "sample-data" / "HM Review Tracker"

DATE_FMT = "dd-mmm-yyyy"
INPUT_ROWS = 2000  # rows below a table header that carry dropdowns and formats
TITLE_FONT = Font(bold=True, size=14, color="1F3864")
NOTE_FONT = Font(italic=True, color="595959")
AMBER = PatternFill("solid", fgColor="FFE699")
RED = PatternFill("solid", fgColor="F8CBAD")
FIXED_TIME = datetime(2026, 11, 16)

DOC_HEADERS = ["Doc No", "Title", "Stage", "Component", "Doc Type", "Loop", "Our Engineer",
               "Other Party", "Planned Submission", "Review Days Allowed", "Remarks"]
DOC_WIDTHS = [26, 50, 8, 26, 20, 17, 16, 24, 14, 12, 30]

REV_HEADERS = ["Doc No", "Rev", "Submission No", "Submitted Date", "Transmittal Ref",
               "Returned Date", "Status Code", "Remarks"]
REV_WIDTHS = [26, 7, 12, 14, 16, 14, 11, 30]

CRS_HEADER_HEADERS = ["Doc No", "Reviewed By", "Rev", "Review Date", "Doc Title", "Status Code"]
COMMENT_HEADERS = ["Comment ID", "Sheet / Clause Ref", "Comment", "Category", "Severity",
                   "Std Code", "Originator Response", "Status", "Remarks"]
COMMENT_WIDTHS = [11, 16, 60, 22, 10, 13, 45, 11, 25]


def new_workbook():
    wb = Workbook()
    wb.remove(wb.active)
    wb.properties.creator = "HM Review Tracker"
    wb.properties.created = FIXED_TIME
    wb.properties.modified = FIXED_TIME
    return wb


def add_table(ws, name, headers, rows, top=1, left=1, widths=None, date_cols=(),
              set_widths=True):
    """Write an Excel table. An empty table keeps one blank row, as Excel requires."""
    for i, h in enumerate(headers):
        ws.cell(row=top, column=left + i, value=h)
    body = rows or [[None] * len(headers)]
    for r, row in enumerate(body, start=top + 1):
        for c, value in enumerate(row):
            cell = ws.cell(row=r, column=left + c, value=value)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
    last_col = get_column_letter(left + len(headers) - 1)
    ref = f"{get_column_letter(left)}{top}:{last_col}{top + len(body)}"
    table = Table(displayName=name, ref=ref)
    table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
    ws.add_table(table)
    for c, h in enumerate(headers):
        col = get_column_letter(left + c)
        ws.cell(row=top, column=left + c).alignment = Alignment(wrap_text=True,
                                                                vertical="center")
        if set_widths and widths:
            ws.column_dimensions[col].width = widths[c]
        if h in date_cols:
            for r in range(top + 1, top + INPUT_ROWS + 1):
                ws.cell(row=r, column=left + c).number_format = DATE_FMT
    return table


def define_list(wb, name, sheet_title, col, values, extra_rows=0):
    """Write a dropdown source list on the Lists sheet and give it a workbook name."""
    ws = wb[sheet_title]
    ws.cell(row=1, column=col, value=name.removeprefix("lst")).font = Font(bold=True)
    for i, v in enumerate(values, start=2):
        ws.cell(row=i, column=col, value=v)
    last = max(2, 1 + len(values) + extra_rows)
    letter = get_column_letter(col)
    ws.column_dimensions[letter].width = max(14, max((len(str(v)) for v in values),
                                                     default=10) + 2)
    wb.defined_names[name] = DefinedName(name, attr_text=f"'{sheet_title}'!${letter}$2:${letter}${last}")


def add_dropdown(ws, list_name, cells, strict=True):
    dv = DataValidation(type="list", formula1=f"={list_name}", allow_blank=True)
    dv.errorStyle = "stop" if strict else "warning"
    dv.error = "Pick a value from the list." if strict else "Not in the list. Keep it anyway?"
    dv.errorTitle = "Check value"
    ws.add_data_validation(dv)
    dv.add(cells)


def add_date_check(ws, cells):
    dv = DataValidation(type="date", operator="greaterThan", formula1="DATE(2000,1,1)",
                        allow_blank=True)
    dv.error = "Enter a date (for example 16-Nov-2026)."
    dv.errorTitle = "Date expected"
    ws.add_data_validation(dv)
    dv.add(cells)


def write_notes(ws, title, lines, width=110):
    ws["A1"] = title
    ws["A1"].font = TITLE_FONT
    ws.column_dimensions["A"].width = width
    for i, line in enumerate(lines, start=3):
        cell = ws.cell(row=i, column=1, value=line)
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        if line and not line.startswith(" "):
            cell.font = Font(bold=line.endswith(":"))


# ---------------------------------------------------------------- config


def build_config(path, projects, people):
    wb = new_workbook()
    write_notes(wb.create_sheet("Read Me"), "HM Review Tracker - Configuration", [
        "One copy of this file lives in the Config folder of the tracker. Power BI reads it on "
        "every refresh.",
        "",
        "Sheets:",
        "  Projects - one row per project. Project Code must equal the project folder name "
        "under Projects.",
        "  People - our engineers. Names must match the Our Engineer column in the registers; "
        "emails are used for reminders.",
        "  Stages - stage codes, display order and default review days.",
        "  Status Codes - what each review status code means for approval and resubmission.",
        "  Comment Library - standard comments; reviewers tag comments with a Std Code so "
        "repeated issues can be counted.",
        "  Settings - thresholds used by the dashboard and reminders.",
        "",
        "Do not rename the sheets' tables or column headers: Power Query looks them up by name.",
        "After changing a list here, also update the Lists sheet in the templates (or rebuild "
        "them with scripts/build_workbooks.py) so dropdowns match.",
    ])

    ws = wb.create_sheet("Projects")
    add_table(ws, "tblProjects",
              ["Project Code", "Project Name", "Project Type", "Client", "Project Lead",
               "Active"],
              [list(p) for p in projects], widths=[14, 40, 13, 24, 18, 8])
    add_dropdown(ws, "lstYesNo", f"F2:F{INPUT_ROWS}")
    add_dropdown(ws, "lstProjectType", f"C2:C{INPUT_ROWS}", strict=False)

    ws = wb.create_sheet("People")
    add_table(ws, "tblPeople", ["Name", "Email", "Role", "Active"],
              [list(p) for p in people], widths=[20, 32, 20, 8])
    add_dropdown(ws, "lstYesNo", f"D2:D{INPUT_ROWS}")

    ws = wb.create_sheet("Stages")
    add_table(ws, "tblStages", ["Stage Code", "Stage Name", "Sort Order",
                                "Default Review Days"],
              [list(s) for s in lists.STAGES], widths=[12, 28, 11, 14])

    ws = wb.create_sheet("Status Codes")
    add_table(ws, "tblStatusCodes", ["Code", "Outcome", "Counts As Approved",
                                     "Requires Resubmission"],
              [list(s) for s in lists.STATUS_CODES], widths=[8, 26, 12, 14])
    add_dropdown(ws, "lstYesNo", f"C2:D{INPUT_ROWS}")

    ws = wb.create_sheet("Comment Library")
    add_table(ws, "tblCommentLibrary", ["Std Code", "Component", "Category",
                                        "Standard Comment"],
              [list(c) for c in lists.COMMENT_LIBRARY], widths=[12, 22, 22, 90])

    ws = wb.create_sheet("Settings")
    add_table(ws, "tblSettings", ["Setting", "Value", "Notes"],
              [list(s) for s in lists.SETTINGS], widths=[28, 8, 80])

    wb.create_sheet("Lists")
    define_list(wb, "lstYesNo", "Lists", 1, ["Yes", "No"])
    define_list(wb, "lstProjectType", "Lists", 2, ["HEP", "PSP", "Other"])
    wb.save(path)


# ---------------------------------------------------------------- register


def build_register(path, project_code, documents, revisions, engineers):
    wb = new_workbook()
    write_notes(wb.create_sheet("Instructions"), "Document Register", [
        f"Project folder: Projects/{project_code}/Register/ - the project code comes from the "
        "folder name, so keep this file in that folder.",
        "",
        "Documents sheet - one row per document (report, calculation, drawing, specification):",
        "  Doc No must be unique in this project. Stage: PFR, DPR, DE or FAB.",
        "  Loop: 'Our Deliverable' = we prepare it and the client reviews it; "
        "'External Review' = a contractor or vendor submits it and we review it.",
        "  Our Engineer = the person in our team responsible for it (author or reviewer). "
        "Other Party = client, contractor or vendor.",
        "  Planned Submission = the date it is due to be submitted (by us or to us).",
        "  Review Days Allowed: leave blank to use the stage default from the Config file.",
        "",
        "Revisions sheet - one row per submission (every time a revision is submitted):",
        "  Add the row on the day the revision is submitted; fill Returned Date and Status "
        "Code on the day the review is returned.",
        "  Submission No counts submissions of that document: 1, 2, 3 ... "
        "(Rev can be R0/R1, A/B or P01 - whatever the project uses).",
        "  Status codes: A Approved, B Approved with comments, C Revise and resubmit, "
        "D Rejected, I For information.",
        "  Rows highlighted amber have been under review for more than 14 days.",
        "",
        "Type new rows directly below the last row of a table so the table grows. Do not "
        "rename the tables (tblDocuments, tblRevisions) or their column headers.",
    ])

    ws = wb.create_sheet("Documents")
    rows = [[x["doc_no"], x["title"], x["stage"], x["component"], x["doc_type"], x["loop"],
             x["engineer"], x["other_party"], x["planned"], x["review_days"], x["remarks"]]
            for x in documents]
    add_table(ws, "tblDocuments", DOC_HEADERS, rows, widths=DOC_WIDTHS,
              date_cols={"Planned Submission"})
    ws.freeze_panes = "B2"
    n = INPUT_ROWS
    add_dropdown(ws, "lstStage", f"C2:C{n}")
    add_dropdown(ws, "lstComponent", f"D2:D{n}", strict=False)
    add_dropdown(ws, "lstDocType", f"E2:E{n}", strict=False)
    add_dropdown(ws, "lstLoop", f"F2:F{n}")
    add_dropdown(ws, "lstEngineer", f"G2:G{n}", strict=False)
    add_date_check(ws, f"I2:I{n}")

    ws = wb.create_sheet("Revisions")
    rows = [list(r[:7]) + [None] for r in revisions]
    add_table(ws, "tblRevisions", REV_HEADERS, rows, widths=REV_WIDTHS,
              date_cols={"Submitted Date", "Returned Date"})
    ws.freeze_panes = "C2"
    add_dropdown(ws, "lstStatusCode", f"G2:G{n}")
    add_date_check(ws, f"D2:D{n}")
    add_date_check(ws, f"F2:F{n}")
    ws.conditional_formatting.add(
        f"A2:H{n}",
        FormulaRule(formula=['AND($D2<>"",$F2="",TODAY()-$D2>14)'], fill=AMBER))

    wb.create_sheet("Lists")
    define_list(wb, "lstStage", "Lists", 1, [s[0] for s in lists.STAGES])
    define_list(wb, "lstComponent", "Lists", 2, lists.COMPONENTS, extra_rows=20)
    define_list(wb, "lstDocType", "Lists", 3, lists.DOC_TYPES, extra_rows=10)
    define_list(wb, "lstLoop", "Lists", 4, lists.LOOPS)
    define_list(wb, "lstStatusCode", "Lists", 5, [s[0] for s in lists.STATUS_CODES])
    define_list(wb, "lstEngineer", "Lists", 6, engineers, extra_rows=50)
    wb["Lists"].cell(row=1, column=8, value="Add our engineers' names under Engineer "
                     "(same spelling as the People sheet in the Config file).").font = NOTE_FONT
    wb.save(path)


# ---------------------------------------------------------------- CRS


def build_crs(path, sheet=None):
    wb = new_workbook()
    ws = wb.create_sheet("CRS")
    ws["A1"] = "COMMENT RESOLUTION SHEET (CRS)"
    ws["A1"].font = TITLE_FONT
    ws["A2"] = ("Fill the submission header, then one row per comment. When a comment carries "
                "forward to the next revision's CRS, keep the same Comment ID.")
    ws["A2"].font = NOTE_FONT
    ws["A4"] = "Submission"
    ws["A4"].font = Font(bold=True)
    for i, w in enumerate(COMMENT_WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    header_row = []
    if sheet:
        header_row = [[sheet["doc_no"], sheet["reviewed_by"], sheet["rev"],
                       sheet["review_date"], sheet["title"], sheet["status_code"]]]
    # Header table sits in columns C:H so the wide Doc No / Doc Title columns line up with
    # the wide Comment / Response columns below.
    add_table(ws, "tblCRSHeader", CRS_HEADER_HEADERS, header_row, top=4, left=3,
              set_widths=False)
    ws["F5"].number_format = DATE_FMT
    add_dropdown(ws, "lstStatusCode", "H5")
    add_date_check(ws, "F5")

    ws["A7"] = "Comments"
    ws["A7"].font = Font(bold=True)
    rows = []
    if sheet:
        rows = [list(c) + [None] for c in sheet["comments"]]
    add_table(ws, "tblComments", COMMENT_HEADERS, rows, top=8, set_widths=False)
    last = 8 + INPUT_ROWS
    add_dropdown(ws, "lstCategory", f"D9:D{last}")
    add_dropdown(ws, "lstSeverity", f"E9:E{last}")
    add_dropdown(ws, "lstStdCode", f"F9:F{last}", strict=False)
    add_dropdown(ws, "lstCommentStatus", f"H9:H{last}")
    ws.conditional_formatting.add(f"H9:H{last}",
                                  FormulaRule(formula=['$H9="Open"'], fill=RED))
    ws.conditional_formatting.add(f"E9:E{last}",
                                  FormulaRule(formula=['$E9="Major"'],
                                              font=Font(bold=True, color="C00000")))
    ws.freeze_panes = "A9"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = "8:8"

    lib = wb.create_sheet("Comment Library")
    lib["A1"] = "Standard comments - tag a comment with its Std Code so repeated issues " \
                "can be counted across projects."
    lib["A1"].font = NOTE_FONT
    add_table(lib, "tblCRSLibrary", ["Std Code", "Component", "Category", "Standard Comment"],
              [list(c) for c in lists.COMMENT_LIBRARY], top=2, widths=[12, 22, 22, 90])

    wb.create_sheet("Lists")
    define_list(wb, "lstCategory", "Lists", 1, lists.COMMENT_CATEGORIES)
    define_list(wb, "lstSeverity", "Lists", 2, lists.SEVERITIES)
    define_list(wb, "lstCommentStatus", "Lists", 3, lists.COMMENT_STATUSES)
    define_list(wb, "lstStatusCode", "Lists", 4, [s[0] for s in lists.STATUS_CODES])
    define_list(wb, "lstStdCode", "Lists", 5, [c[0] for c in lists.COMMENT_LIBRARY],
                extra_rows=30)
    wb.save(path)


# ---------------------------------------------------------------- main


def build_templates():
    TEMPLATES.mkdir(parents=True, exist_ok=True)
    build_config(TEMPLATES / "Tracker_Config.xlsx", [], [])
    build_register(TEMPLATES / "Document_Register_TEMPLATE.xlsx", "<ProjectCode>", [], [], [])
    build_crs(TEMPLATES / "CRS_TEMPLATE.xlsx")


def build_sample():
    config = SAMPLE_ROOT / "Config"
    config.mkdir(parents=True, exist_ok=True)
    build_config(config / "Tracker_Config.xlsx", sample_data.PROJECTS, sample_data.PEOPLE)
    engineers = [p[0] for p in sample_data.PEOPLE]
    for code, docs in sample_data.DOCUMENTS.items():
        reg = SAMPLE_ROOT / "Projects" / code / "Register"
        reg.mkdir(parents=True, exist_ok=True)
        build_register(reg / f"{code}_Document_Register.xlsx", code, docs,
                       sample_data.REVISIONS[code], engineers)
        (SAMPLE_ROOT / "Projects" / code / "CRS").mkdir(parents=True, exist_ok=True)
    for sheet in sample_data.CRS_FILES:
        folder = SAMPLE_ROOT / "Projects" / sheet["project"] / "CRS"
        build_crs(folder / f"{sheet['doc_no']}_{sheet['rev']}_CRS.xlsx", sheet)


if __name__ == "__main__":
    build_templates()
    build_sample()
    print(f"Templates written to {TEMPLATES}")
    print(f"Sample data written to {SAMPLE_ROOT}")

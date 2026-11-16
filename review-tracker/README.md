# HM Review Tracker

A submission and review dashboard for hydro-mechanical (HM) design work on HEP and PSP projects. It tracks every report, calculation and drawing through **PFR → DPR → Detailed Engineering → Fabrication**, every revision, and every review comment until it's closed. It covers both directions:

- **Our Deliverable:** we submit, the client reviews.
- **External Review:** the contractor or vendor submits, we review.

It's built entirely on Microsoft 365, with no servers and no custom code to host:

```
Excel templates in SharePoint  ──►  Power Query  ──►  Power BI dashboard  ──►  Power Automate reminders
(register + CRS per submission)     (combine, clean,     (7 pages)              (daily email per engineer)
                                     validate)
```

## What the dashboard answers

| Page | Answers |
|---|---|
| Projects Overview | Where is each project by stage, and what's late or stuck? |
| Review Queue | What do I need to review or resubmit, and what's overdue? |
| Revision Tracker | How many rounds does each document take, and are the revisions converging? |
| Comments | Which comments are still open, which keep carrying forward, and which issues repeat across projects? |
| Turnaround & Delays | How long do we take to review vs. how long they take to resubmit, and who caused the delay days? |
| Team Workload | Who has what in hand, and who is overloaded? |
| Data Quality | Which entries are wrong or inconsistent? |

## Folder contents

| Path | What it is |
|---|---|
| `templates/` | `Tracker_Config.xlsx`, `Document_Register_TEMPLATE.xlsx`, `CRS_TEMPLATE.xlsx`. Copy these to SharePoint. |
| `sample-data/HM Review Tracker/` | Two fictional projects in the same folder layout as SharePoint, for testing the build |
| `powerbi/queries/` | Power Query (M) code, one file per query, pasted into Power BI Desktop |
| `powerbi/measures.dax` | DAX measures and calculated tables |
| `powerbi/theme.json` | Report colour theme |
| `powerbi/flows/reminder-query.dax` | Query used by the Power Automate reminder flow |
| `docs/BUILD_GUIDE.md` | **Start here.** Step-by-step build, acceptance check, rollout and maintenance. |
| `scripts/` | Python script that regenerates the templates and sample data (only needed when lists change) |

## Rebuilding the templates

```bash
pip install -r review-tracker/scripts/requirements.txt
python review-tracker/scripts/build_workbooks.py
```

Controlled lists (stages, status codes, components, comment categories, standard comments) live in `scripts/lists.py`.

# HM Review Tracker: Build Guide

This guide takes you from the files in this folder to a published Power BI dashboard with daily reminder emails. Allow about 2–3 days for the first build. Most of the time goes into laying out the report pages.

**Contents**

1. [What you need](#1-what-you-need)
2. [Set up the SharePoint folder](#2-set-up-the-sharepoint-folder)
3. [Build the queries (test with sample data)](#3-build-the-queries-test-with-sample-data)
4. [Set up the data model](#4-set-up-the-data-model)
5. [Add the measures](#5-add-the-measures)
6. [Build the report pages](#6-build-the-report-pages)
7. [Acceptance check](#7-acceptance-check)
8. [Switch to SharePoint and publish](#8-switch-to-sharepoint-and-publish)
9. [Daily reminder emails (Power Automate)](#9-daily-reminder-emails-power-automate)
10. [How engineers fill it in](#10-how-engineers-fill-it-in)
11. [Pilot and rollout](#11-pilot-and-rollout)
12. [Maintenance](#12-maintenance)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What you need

| Item | Notes |
|---|---|
| Power BI Desktop | Free, Windows only. Use it to build the report. |
| Power BI licence | Usually **Pro** for the publisher and every viewer, unless your company has Premium/Fabric capacity or E5. Check with IT. |
| A SharePoint site | A team site for the HM department. A dedicated site or document library keeps refresh fast. |
| Power Automate | Included with most Microsoft 365 plans. Only needed for reminder emails. |

## 2. Set up the SharePoint folder

Create this structure in the site's document library. Folder names matter, because Power Query reads the project code and file type from the path.

```
HM Review Tracker/
├── Config/
│   └── Tracker_Config.xlsx                 ← from templates/
├── Templates/                              ← optional: keep the blank templates here
│   ├── Document_Register_TEMPLATE.xlsx
│   └── CRS_TEMPLATE.xlsx
└── Projects/
    ├── PSP01/                              ← folder name = Project Code
    │   ├── Register/
    │   │   └── PSP01_Document_Register.xlsx
    │   └── CRS/
    │       ├── PSP01-HM-DE-CAL-101_R0_CRS.xlsx
    │       └── ...
    └── HEP02/
        └── ...
```

Rules:

- **One register per project**, in `Projects/<ProjectCode>/Register/`. Make it from `Document_Register_TEMPLATE.xlsx`.
- **One CRS file per reviewed submission**, in `Projects/<ProjectCode>/CRS/`. Make it from `CRS_TEMPLATE.xlsx`. Name it `<DocNo>_<Rev>_CRS.xlsx` for people to read; Power Query uses the header table inside, not the file name.
- Files with `TEMPLATE` in the name are ignored, so the blank templates can sit anywhere.
- Fill in **Config > Projects** (one row per project folder) and **Config > People** (our engineers and their emails).

## 3. Build the queries (test with sample data)

First build against the **sample data** on your PC. You can then check the results against known numbers (section 7) before using real data.

1. Copy `sample-data/HM Review Tracker` to your PC, for example to `C:\HM Review Tracker`.
2. Open Power BI Desktop, then go to **Home > Transform data** to open the Power Query editor.
3. For each file in `powerbi/queries`, in file-name order:
   - Go to **Home > New Source > Blank Query**, then **Advanced Editor**.
   - Paste the whole file and click **Done**.
   - Rename the query to the name in the file's first line (`// Query name: ...`).
   - For `SourceFiles`, paste **only** `20_SourceFiles (Local folder).pq` for now.
4. Set `LocalRootPath` to your copy of the folder, for example `C:\HM Review Tracker`.
5. Set `AsOfDateOverride` to `2026-11-16`, so that the acceptance check numbers match.
6. Right-click each query below and **untick "Enable load"**. These are helper queries, and loading them only clutters the model.

| Query | Load? | Query | Load? |
|---|---|---|---|
| RootFolderName, SharePointSiteUrl, LocalRootPath, AsOfDateOverride, UtcOffsetHours | parameters (not loaded) | SourceFiles | ✗ |
| fnText, fnUpper, fnToDate, fnGetTable, fnClassifyFiles, fnConfigTable, fnSetting, fnReadCrs, fnIssues | functions (not loaded) | ConfigContent | ✗ |
| Projects | ✓ | AsOfDate | ✗ |
| People | ✓ | StatusCodes | ✗ |
| Stages | ✓ | DocumentRows | ✗ |
| CommentLibrary | ✓ | DocumentsBase | ✗ |
| Settings | ✓ | RevisionRows | ✗ |
| ReportInfo | ✓ | CommentRows | ✗ |
| Documents | ✓ | | |
| Revisions | ✓ | | |
| Comments | ✓ | | |
| DataIssues | ✓ | | |

7. Click **Close & Apply**. Power BI may ask for privacy levels. Set the folder (and later SharePoint) to **Organizational**.

## 4. Set up the data model

Open **Model view**. Power BI may auto-create relationships. **Delete any that are not in this list.** Comments-to-Documents and Revisions-to-Projects relationships in particular cause ambiguous filter paths.

| From (one side) | To (many side) | Active |
|---|---|---|
| Projects[Project Code] | Documents[Project Code] | ✓ |
| Stages[Stage Code] | Documents[Stage] | ✓ |
| Documents[DocKey] | Revisions[DocKey] | ✓ |
| Revisions[RevKey] | Comments[RevKey] | ✓ |
| CommentLibrary[Std Code] | Comments[Std Code] | ✓ |
| 'Date'[Date] | Revisions[Submitted Date] | ✗ (inactive) |
| 'Date'[Date] | Revisions[Returned Date] | ✗ (inactive) |

All relationships use single cross-filter direction. The two Date relationships are created after the Date table exists (section 5). Both stay inactive, because the measures switch them on when needed with `USERELATIONSHIP`.

Then set these:

- **Sort by column:**
  - Stages[Stage Code] sorted by Stages[Sort Order], so stages run PFR → DPR → DE → FAB.
  - Documents[Document State] sorted by Documents[State Order].
  - 'Date'[Month] sorted by 'Date'[Month Sort].
- **Hide** the key columns from report view: DocKey, RevKey, CommentKey, Seq-related helpers you don't use, and the `_Measures` table's column.
- **Mark as date table:** select 'Date', then **Table tools > Mark as date table** on 'Date'[Date].
- **Format:**
  - Percent measures (`% Approved`, `% Reviews On Time`, `% Comments Closed`) as Percentage with 0 decimals.
  - `Avg ...` measures with 1 decimal.

## 5. Add the measures

Everything is in `powerbi/measures.dax`.

1. Create the two calculated tables first, with **Modeling > New table**: `_Measures`, then `Date`.
2. Create the two inactive Date relationships from section 4.
3. Select the `_Measures` table. For each measure, use **Modeling > New measure**, paste it, and set its **Display folder** to the heading it sits under in the file (`1 Documents`, `2 Reviews`, ...).

## 6. Build the report pages

Before building, import the theme: **View > Themes > Browse for themes** and pick `powerbi/theme.json`.

Put these at the top right of every page:

- A card with `Data As Of`.
- A card with `Data Quality Label`, which turns into a warning when the data has errors.

Use the same slicers on every page: **Project** (Projects[Project Name]), **Stage** (Stages[Stage Code]), **Loop** (Documents[Loop]). Sync them across pages with **View > Sync slicers**.

### Page 1: Projects Overview (for the HOD and PM)

| Visual | Fields |
|---|---|
| Cards | Docs Planned · % Approved · Docs Under Review · Docs To Resubmit · Docs Late Submission · Docs Stuck |
| Matrix: "Stage progress" | Rows: Projects[Project Name] · Columns: Stages[Stage Code] · Values: Docs Planned, Docs Approved, % Approved. Conditional formatting on % Approved: background colour scale. |
| Stacked bar: "Document state by stage" | Y-axis: Stages[Stage Code] · Legend: Documents[Document State] · X-axis: Docs Planned |
| Table: "Late submissions" | Documents: Project Code, Doc No, Title, Stage, Planned Submission, First Submitted Date, Current Rev. Visual filter: Is Late Submission = True. |

### Page 2: Review Queue (daily working page)

| Visual | Fields |
|---|---|
| Slicer | Documents[Our Engineer] (single select, so each engineer sees their own queue) |
| Cards | Our Overdue Actions · Actions Due In 14 Days · Their Overdue Actions · Open Reviews |
| Table: "In our court" | Revisions: Project Code, Doc No, Rev · Documents: Title, Our Engineer · Revisions: Ball In Court, Submitted Date, Returned Date, Action Due Date, Action Days Left. Filters: Is Latest = True, Court = "With Us". Sort by Action Days Left ascending. Conditional formatting on Action Days Left: font colour, Field value = `Action Colour`. |
| Table: "In their court" | Same columns, plus Documents[Other Party]. Filters: Is Latest = True, Court = "With Others". |

"Reviewer" in Ball In Court means a review is pending. "Originator" means a resubmission is pending. Whether that sits with us depends on the Loop: for **External Review** documents we are the reviewer, and for **Our Deliverable** documents we are the originator.

### Page 3: Revision Tracker

| Visual | Fields |
|---|---|
| Cards | Avg Submissions To Approval · Docs Stuck · Submissions |
| Matrix: "Revision history" | Rows: Documents[Doc No] · Columns: Revisions[Seq] (rename to "Submission") · Values: Rev Status Label. Turn off totals. |
| Clustered bar | Y-axis: Documents[Component] · X-axis: Avg Submissions To Approval |
| Line and column chart: "Are revisions converging?" | X-axis: Revisions[Seq] · Columns: Open Comments At Submission · Line: Comments Per Submission. Both should fall from submission to submission. |
| Table: "Stuck documents" | Documents: Project Code, Doc No, Title, Current Rev, Submission Count, Document State, Our Engineer. Filter: Is Stuck = True. |

### Page 4: Comments

| Visual | Fields |
|---|---|
| Slicers | Documents[Component] · Comments[Severity] · Comments[Category] |
| Cards | Comments Raised · Open Comments · Major Open Comments · Carried Forward Open · % Comments Closed |
| Stacked bar | Y-axis: Comments[Category] · Legend: Comments[Severity] · X-axis: Comments Raised |
| Clustered bar | Y-axis: Documents[Component] · X-axis: Open Comments |
| Table: "Repeated issues" | CommentLibrary: Std Code, Standard Comment · Times Raised · Projects Affected. Sort by Times Raised descending. These issues belong in your review checklist and lessons-learned list. |
| Table: "Carried forward and still open" | Comments: Project Code, Doc No, Rev, Comment ID, Comment, Severity, Times Listed, Originator Response. Filters: Is Open Now = True, Is Carried Forward = True. |

### Page 5: Turnaround & Delays

| Visual | Fields |
|---|---|
| Cards | Avg Review Days · % Reviews On Time · Avg Resubmission Days · Delay Days By Us · Delay Days By Others |
| Clustered column | X-axis: Projects[Project Name] · Values: Delay Days By Us, Delay Days By Others |
| Line chart | X-axis: 'Date'[Month] · Values: Submissions Received, Reviews Returned |
| Table: "Delay record" | Revisions: Project Code, Doc No, Rev, Submitted Date, Review Due Date, Returned Date, Status Code, Reviewer Delay Days, Resubmission Days, Originator Delay Days · Documents: Loop, Other Party. Use **Export data** to hand this to the PM for extension-of-time or delay discussions. |

How delays are attributed: reviewer delay counts days beyond the allowed review period. Originator delay counts days beyond `Target Resubmission Days` (Config > Settings) between a C or D return and the next submission, or until today if there's no resubmission yet. The Loop decides whether a delay counts against us or against the other party.

### Page 6: Team Workload (for the HOD)

| Visual | Fields |
|---|---|
| Stacked bar | Y-axis: Documents[Our Engineer] · Legend: Documents[Ball In Court] · X-axis: Docs With Us |
| Clustered bar | Y-axis: Documents[Our Engineer] · X-axis: Our Overdue Actions, Actions Due In 14 Days |
| Matrix | Rows: Documents[Our Engineer] · Columns: Projects[Project Code] · Values: Docs With Us |

### Page 7: Data Quality

| Visual | Fields |
|---|---|
| Cards | Data Errors · Data Warnings |
| Table | DataIssues: Level, Project Code, Doc No, Rev, File, Issue. Sort by Level. |

Check this page after every refresh. **Errors** mean a row was left out or a number is wrong. **Warnings** mean something looks inconsistent but the dashboard still works.

## 7. Acceptance check

With the sample data and `AsOfDateOverride = 2026-11-16`, the cards should show these values with no slicers applied. If a number differs, check the query that feeds it before going further.

| Measure | Expected | Measure | Expected |
|---|---|---|---|
| Docs Planned | 20 | Submissions | 29 |
| Docs Submitted | 17 | Open Reviews | 5 |
| Docs Not Submitted | 3 | Overdue Reviews | 3 |
| Docs Approved | 9 | Our Overdue Actions | 3 |
| % Approved | 45% | Their Overdue Actions | 3 |
| Docs Under Review | 5 | Actions Due In 14 Days | 2 |
| Docs To Resubmit | 3 | Avg Review Days | 23.5 |
| Docs Late Submission | 5 | % Reviews On Time | 38% (37.5) |
| Docs Stuck | 2 | Avg Resubmission Days | 21.9 |
| Avg Submissions To Approval | 1.8 | Delay Days By Us / By Others | 129 / 196 |
| Comments Raised | 29 | Open Comments | 11 |
| Closed Comments | 18 | % Comments Closed | 62% |
| Major Open Comments | 7 | Carried Forward Open | 2 |
| Data Errors | 0 | Data Warnings | 2 |

More checks:

- **Document State breakdown:** Approved 4, Approved with Comments 5, Under Review 5, Revise & Resubmit 2, Rejected 1, Not Submitted 3.
- **Stuck documents:** PSP01-HM-DE-CAL-101 and HEP02-HM-DPR-CAL-001.
- **Data Quality page:** shows the two deliberate warnings:
  - The CRS status code differs from the register for HEP02-HM-DE-DWG-201.
  - A comment has no Comment ID in PSP01-HM-DE-CAL-104 R0.
- **Repeated issues:** the top three are HM-TRN-01, HM-GEN-01 and HM-INT-01, each raised 3 times. HM-GEN-01 and HM-INT-01 affect 2 projects.
- **Reminder query** (section 9): returns S. Rao with 3 items and K. Menon with 1 item.

When everything matches, **clear `AsOfDateOverride`** (leave it empty).

## 8. Switch to SharePoint and publish

1. Copy `templates/Tracker_Config.xlsx` into `HM Review Tracker/Config/` on SharePoint, and fill in Projects and People.
2. In Power Query, open `SourceFiles` and replace its code with `20_SourceFiles (SharePoint).pq`.
3. Set the `SharePointSiteUrl` parameter to the **site** address, for example `https://yourcompany.sharepoint.com/sites/HMEngineering`. Use the site, not the folder or library.
4. Sign in with your **Organizational account** when asked. Then **Close & Apply** and check the Data Quality page.
5. **Publish** to a workspace for the department, for example "HM Engineering".
6. In the Power BI service, open the semantic model's **Settings**:
   - **Data source credentials:** OAuth2, Organizational.
   - **Scheduled refresh:** on, daily, for example at 07:00 and 13:00 your local time. Set the time zone in the same panel.
7. Share it:
   - Create a workspace **App** and give the department access. People should use the app, not the workspace.
   - Optionally, set up an email **Subscription** to send the Projects Overview page to the HOD every Monday.
8. Save the `.pbix` file to `HM Review Tracker/` on SharePoint, or to the department's file share, so someone else can maintain it.

## 9. Daily reminder emails (Power Automate)

This flow sends each engineer one email a day listing what they owe: reviews in our court and resubmissions of our deliverables that are overdue or due within `Reminder Lead Days` (default 3).

1. Go to **Power Automate > Create > Scheduled cloud flow**. Set it to run every weekday at 08:30.
2. **Add an action: Power BI > Run a query against a dataset.**
   - Workspace: your department workspace. Dataset: this model.
   - Query text: paste `powerbi/flows/reminder-query.dax`.
3. **Add an action: Apply to each.** Input:
   ```
   body('Run_a_query_against_a_dataset')?['firstTableRows']
   ```
4. Inside the loop, **Office 365 Outlook > Send an email (V2)**:
   - To: `items('Apply_to_each')?['[Email]']`
   - Subject: `HM reviews: @{items('Apply_to_each')?['[Item Count]']} items need action`
   - Body (switch the editor to code view): `Hi @{items('Apply_to_each')?['[Engineer]']},<br>These items are due or overdue:@{items('Apply_to_each')?['[Items Html]']}<br>Dashboard: <link to the Power BI app>`
5. Add a **Condition** before the email: skip it when Email is empty, which happens when the engineer is missing from Config > People.

Column names come back in square brackets, for example `[Email]`. That's why the expressions above include them.

The flow reads the published model, so reminders are only as fresh as the last scheduled refresh. Schedule the flow after the morning refresh.

## 10. How engineers fill it in

| When | Who | Where | What |
|---|---|---|---|
| Document added to the project's deliverable list | Project lead | Register > Documents | One row: Doc No, Title, Stage, Component, Doc Type, Loop, Our Engineer, Other Party, Planned Submission |
| A revision is submitted (by us or to us) | Our Engineer | Register > Revisions | New row: Doc No, Rev, Submission No, Submitted Date, Transmittal Ref |
| Review in progress | Reviewer | New CRS file from template | Header (Doc No, Rev, Reviewed By, Review Date, Doc Title) and one row per comment, with Category, Severity, Status = Open and a Std Code where one fits |
| Review returned | Our Engineer | Register > Revisions | Fill Returned Date and Status Code (A/B/C/D/I) on that row. The status code in the CRS header should match. |
| Next revision reviewed | Reviewer | New CRS for the new Rev | Copy forward the comments still open **with the same Comment ID**, set each one Closed or Open, and add new comments as C07, C08, ... |

Habits that keep the numbers right:

- **One register row per submission, entered the day it happens.** Late entries distort the turnaround and delay figures.
- **Keep the same Comment ID across revisions.** That's how the dashboard knows a comment was carried forward.
- **Use the dropdowns.** Typed variations ("Approved", "a ", "Cat-A") break the counts. The Data Quality page lists any that slip through.
- **Our Deliverable** documents (client reviews our work): log the client's comments in a CRS file the same way, with Reviewed By set to the client's name.

## 11. Pilot and rollout

1. **Weeks 1–2:** build and pass the acceptance check, as above.
2. **Weeks 3–6:** pilot on **one live project**. Back-fill its current documents and revisions, which takes about half a day. CRS history is optional, so start with current revisions only. Review the dashboard with the project lead every week, and fix wording, missing fields and habits.
3. **Week 7:** show the pilot to the HOD. Use the Review Queue, Comments and Delays pages, which have the clearest value.
4. **Then:** roll out to the other projects. One project lead sets up each project folder and register from the template.

## 12. Maintenance

| Task | How often | Who | Effort |
|---|---|---|---|
| Check the Data Quality page and ask people to fix errors | Weekly | Tracker owner | 15 min |
| Add new projects (folder + register + Config > Projects row) | Per project | Project lead | 15 min |
| Add or remove people in Config > People | As needed | Tracker owner | 5 min |
| Grow the Comment Library from the "Repeated issues" table | Monthly | Senior reviewer | 30 min |
| Check scheduled refresh and flow run history | Monthly | Tracker owner | 10 min |
| Small report changes (new visual, filter) | As requested | Tracker owner | 1–2 h |
| Licence and access changes | As needed | IT | — |

Expect about **2–4 hours a month** once it's running. Name a **tracker owner and a backup**, and keep the `.pbix` and this folder where both can reach them.

**Changing a list** (stages, status codes, categories, components):

1. Update Config.
2. Update the **Lists** sheet in the templates, or edit `scripts/lists.py` and run `python scripts/build_workbooks.py`, which rebuilds the templates and sample data.
3. Existing project files keep their old dropdowns. Update their Lists sheet if the change matters for them.

**Renaming a table or column header** in a template also needs the matching query in `powerbi/queries` changed. Avoid it if you can.

## 13. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| "Tracker_Config.xlsx was not found" | The file isn't in `<RootFolderName>/Config/`, or `RootFolderName` doesn't match the SharePoint folder name exactly. |
| A project is missing from the dashboard | The register isn't in `Projects/<Code>/Register/`, its table isn't named `tblDocuments`, or the file name contains "TEMPLATE". |
| A document's revisions are missing | Check the Data Quality page: usually the Doc No in Revisions doesn't match the Documents sheet, or the Submitted Date is missing or not a date. |
| A CRS file's comments are missing | Its header Doc No / Rev doesn't match a revision row in the register (Data Quality shows it). |
| Refresh is slow | `SharePoint.Files` lists every file on the site. Move the tracker to its own site or library. |
| Refresh fails in the service but works in Desktop | Data source credentials aren't set (section 8, step 6), or `SourceFiles` still uses the local-folder version. |
| Overdue counts are off by a day | Check `UtcOffsetHours`, and that `AsOfDateOverride` is empty. |
| Reminder flow fails on "Run a query" | The flow owner needs build permission on the semantic model, and Settings must be loaded (it is in the query list above). |

// Query name: DataIssues   (loaded) - feeds the Data Quality page.
// Errors: the row is left out of the dashboard or its numbers are wrong. Fix these first.
// Warnings: the dashboard still works, but something looks inconsistent.
let
    Stage = Stages[Stage Code],
    Codes = StatusCodes[Code],
    LibraryCodes = CommentLibrary[Std Code],
    ProjectCodes = Projects[Project Code],
    DocKeys = DocumentsBase[DocKey],
    RevKeys = Revisions[RevKey],

    // ---- Documents sheet
    DupDocs = Table.SelectRows(
        Table.Group(DocumentRows, {"DocKey", "Project Code", "Doc No", "Register File"},
            {{"Count", Table.RowCount, Int64.Type}}),
        each [Count] > 1),
    I1 = fnIssues(DupDocs, "Error", (r) =>
        "Doc No appears " & Text.From(r[Count]) & " times on the Documents sheet; only the first row is used."),
    I2 = fnIssues(Table.SelectRows(DocumentRows, each not List.Contains(Stage, [Stage])), "Error",
        (r) => "Stage '" & (if r[Stage] = null then "(blank)" else r[Stage])
            & "' is not in Config > Stages."),
    I3 = fnIssues(Table.SelectRows(DocumentRows, each
            not List.Contains({"Our Deliverable", "External Review"}, [Loop])), "Error",
        (r) => "Loop must be 'Our Deliverable' or 'External Review'."),
    I4 = fnIssues(Table.SelectRows(DocumentRows, each [Our Engineer] = null), "Warning",
        (r) => "Our Engineer is blank, so the document is missing from workload and reminders."),
    MissingProjects = Table.Distinct(
        Table.SelectColumns(
            Table.SelectRows(DocumentRows, each not List.Contains(ProjectCodes, [Project Code])),
            {"Project Code", "Register File"})),
    I5 = fnIssues(MissingProjects, "Warning", (r) =>
        "Project folder '" & r[Project Code] & "' is not listed in Config > Projects."),

    // ---- Revisions sheet
    I6 = fnIssues(Table.SelectRows(RevisionRows, each [Doc No] = null or [Rev] = null), "Error",
        (r) => "Revision row without Doc No or Rev; row ignored."),
    I7 = fnIssues(Table.SelectRows(RevisionRows, each [Doc No] <> null and [Rev] <> null
            and [Submitted Date] = null), "Error",
        (r) => "No Submitted Date (or not a valid date); row ignored."),
    I8 = fnIssues(Table.SelectRows(RevisionRows, each [Doc No] <> null
            and not List.Contains(DocKeys, [DocKey])), "Error",
        (r) => "Doc No is not on the Documents sheet; revision ignored."),
    DupRevs = Table.SelectRows(
        Table.Group(Table.SelectRows(RevisionRows, each [RevKey] <> null),
            {"RevKey", "Project Code", "Doc No", "Rev", "Register File"},
            {{"Count", Table.RowCount, Int64.Type}}),
        each [Count] > 1),
    I9 = fnIssues(DupRevs, "Error", (r) =>
        "The same Rev is entered " & Text.From(r[Count]) & " times; only the first row is used."),
    I10 = fnIssues(Table.SelectRows(RevisionRows, each [Submitted Date] <> null
            and [Returned Date] <> null and [Returned Date] < [Submitted Date]), "Error",
        (r) => "Returned Date is before Submitted Date."),
    I11 = fnIssues(Table.SelectRows(RevisionRows, each [Returned Date] <> null
            and [Status Code] = null), "Error",
        (r) => "Returned Date entered without a Status Code."),
    I12 = fnIssues(Table.SelectRows(RevisionRows, each [Status Code] <> null
            and not List.Contains(Codes, [Status Code])), "Error",
        (r) => "Status Code '" & r[Status Code] & "' is not in Config > Status Codes."),
    I13 = fnIssues(Table.SelectRows(RevisionRows, each [Status Code] <> null
            and [Returned Date] = null), "Warning",
        (r) => "Status Code entered but no Returned Date; still counted as under review."),

    // ---- CRS files (one issue per file where the problem is the whole file)
    CrsFiles = Table.Distinct(Table.SelectColumns(CommentRows,
        {"CRS File", "Project Code", "Doc No", "Rev", "RevKey", "CRS Status Code"})),
    I14 = fnIssues(Table.SelectRows(CrsFiles, each not List.Contains(RevKeys, [RevKey])), "Error",
        (r) => "CRS header Doc No / Rev does not match a submitted revision in the register; "
            & "comments ignored."),
    CrsVsRegister = Table.ExpandTableColumn(
        Table.NestedJoin(CrsFiles, {"RevKey"},
            Table.SelectColumns(Revisions, {"RevKey", "Status Code"}), {"RevKey"}, "R", JoinKind.Inner),
        "R", {"Status Code"}, {"Register Status Code"}),
    I15 = fnIssues(Table.SelectRows(CrsVsRegister, each [CRS Status Code] <> null
            and [Register Status Code] <> null and [CRS Status Code] <> [Register Status Code]),
        "Warning", (r) => "CRS status code " & r[CRS Status Code] & " differs from register status code "
            & r[Register Status Code] & "; the register value is used."),
    I16 = fnIssues(Table.SelectRows(CommentRows, each [Comment ID] = null), "Warning",
        (r) => "Comment on row " & Text.From(r[Row]) & " has no Comment ID, so it cannot be "
            & "followed into later revisions."),
    DupIds = Table.SelectRows(
        Table.Group(Table.SelectRows(CommentRows, each [Comment ID] <> null),
            {"CRS File", "Project Code", "Doc No", "Rev", "Comment ID"},
            {{"Count", Table.RowCount, Int64.Type}}),
        each [Count] > 1),
    I17 = fnIssues(DupIds, "Error", (r) =>
        "Comment ID " & r[Comment ID] & " is used " & Text.From(r[Count]) & " times in this CRS."),
    I18 = fnIssues(Table.SelectRows(CommentRows, each [Category] = null or [Severity] = null),
        "Warning", (r) => "Comment " & (if r[Comment ID] = null then "row " & Text.From(r[Row])
            else r[Comment ID]) & " has no Category or Severity."),
    I19 = fnIssues(Table.SelectRows(CommentRows, each [Std Code] <> null
            and not List.Contains(LibraryCodes, [Std Code])), "Warning",
        (r) => "Std Code " & r[Std Code] & " is not in Config > Comment Library."),

    All = Table.Combine({I1, I2, I3, I4, I5, I6, I7, I8, I9, I10, I11, I12, I13, I14, I15,
        I16, I17, I18, I19}),
    Sorted = Table.Sort(All, {{"Level", Order.Ascending}, {"Project Code", Order.Ascending},
        {"Doc No", Order.Ascending}})
in
    Sorted

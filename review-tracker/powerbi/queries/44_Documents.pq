// Query name: Documents   (loaded)
// One row per document with its current state, taken from its latest submission.
let
    Today = AsOfDate,
    StuckAt = fnSetting("Stuck Submission Threshold", 3),

    Latest = Table.SelectRows(Revisions, each [Is Latest]),
    LatestCols = Table.SelectColumns(Latest, {"DocKey", "Rev", "Seq", "Status Code", "Outcome",
        "Counts As Approved", "Ball In Court", "Court", "Returned Date", "Action Due Date",
        "Action Days Left"}),
    FirstSubmitted = Table.Group(Revisions, {"DocKey"},
        {{"First Submitted Date", each List.Min([Submitted Date]), type nullable date}}),

    WithLatest = Table.NestedJoin(DocumentsBase, {"DocKey"}, LatestCols, {"DocKey"}, "L", JoinKind.LeftOuter),
    LatestExpanded = Table.ExpandTableColumn(WithLatest, "L",
        {"Rev", "Seq", "Status Code", "Outcome", "Counts As Approved", "Ball In Court", "Court",
         "Returned Date", "Action Due Date", "Action Days Left"},
        {"Current Rev", "Submission Count", "Current Status Code", "Current Outcome", "Is Approved",
         "Ball In Court", "Court", "Last Returned Date", "Action Due Date", "Action Days Left"}),
    WithFirst = Table.NestedJoin(LatestExpanded, {"DocKey"}, FirstSubmitted, {"DocKey"}, "F", JoinKind.LeftOuter),
    FirstExpanded = Table.ExpandTableColumn(WithFirst, "F", {"First Submitted Date"}),

    Defaults = Table.TransformColumns(FirstExpanded, {
        {"Submission Count", each if _ = null then 0 else _, Int64.Type},
        {"Is Approved", each _ = true, type logical},
        {"Ball In Court", each if _ = null then "Not Submitted" else _, type text},
        {"Court", each if _ = null then "Not Submitted" else _, type text}}),
    State = Table.AddColumn(Defaults, "Document State", each
        if [Submission Count] = 0 then "Not Submitted"
        else if [Ball In Court] = "Reviewer" then "Under Review"
        else if [Current Outcome] <> null then [Current Outcome]
        else "Returned (no code)", type text),
    StateOrder = Table.AddColumn(State, "State Order", each
        let pos = List.PositionOf({"Approved", "Approved with Comments", "For Information",
            "Under Review", "Revise & Resubmit", "Rejected", "Returned (no code)", "Not Submitted"},
            [Document State])
        in if pos < 0 then 99 else pos + 1, Int64.Type),
    Late = Table.AddColumn(StateOrder, "Is Late Submission", each
        [Planned Submission] <> null and
        (if [First Submitted Date] = null then Today > [Planned Submission]
         else [First Submitted Date] > [Planned Submission]), type logical),
    Stuck = Table.AddColumn(Late, "Is Stuck", each
        [Submission Count] >= StuckAt and not [Is Approved]
        and [Current Outcome] <> "For Information", type logical),
    Typed = Table.TransformColumnTypes(Stuck, {
        {"Last Returned Date", type date}, {"Action Due Date", type date},
        {"First Submitted Date", type date}, {"Action Days Left", Int64.Type}})
in
    Typed

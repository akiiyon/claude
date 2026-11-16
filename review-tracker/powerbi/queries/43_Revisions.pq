// Query name: Revisions   (loaded)
// One row per submission, with sequence, who holds the document, due dates and delays.
//   Ball In Court: Reviewer (under review) / Originator (returned C or D, resubmission due) / Closed
//   Court:         With Us / With Others / Closed - depends on the document's Loop
let
    Today = AsOfDate,
    ResubmitDays = Number.RoundDown(fnSetting("Target Resubmission Days", 14)),

    // Rows that cannot be placed are left out here and listed in DataIssues.
    Usable = Table.SelectRows(RevisionRows, each
        [Doc No] <> null and [Rev] <> null and [Submitted Date] <> null),
    Unique = Table.Distinct(Usable, {"RevKey"}),
    WithDoc = Table.NestedJoin(Unique, {"DocKey"}, DocumentsBase, {"DocKey"}, "Doc", JoinKind.Inner),
    Known = Table.ExpandTableColumn(WithDoc, "Doc", {"Loop", "Effective Review Days"}),

    Sequenced = Table.Group(Known, {"DocKey"}, {{"Rows", (g) =>
        let
            Sorted = Table.Sort(g, {{"Submission No", Order.Ascending},
                                    {"Submitted Date", Order.Ascending},
                                    {"Rev", Order.Ascending}}),
            Indexed = Table.AddIndexColumn(Sorted, "Seq", 1, 1, Int64.Type),
            Count = Table.RowCount(Indexed),
            // Seq is 1-based, so Indexed{[Seq]} is the next submission.
            WithNext = Table.AddColumn(Indexed, "Next Submitted Date", each
                if [Seq] < Count then Indexed{[Seq]}[Submitted Date] else null, type nullable date),
            WithLatest = Table.AddColumn(WithNext, "Is Latest", each [Seq] = Count, type logical)
        in
            WithLatest, type table}}),
    Combined = Table.Combine(Sequenced[Rows]),

    WithCode = Table.NestedJoin(Combined, {"Status Code"}, StatusCodes, {"Code"}, "CodeRow", JoinKind.LeftOuter),
    CodeCols = Table.ExpandTableColumn(WithCode, "CodeRow",
        {"Outcome", "Counts As Approved", "Requires Resubmission"}),
    CodeFlags = Table.TransformColumns(CodeCols, {
        {"Counts As Approved", each _ = true, type logical},
        {"Requires Resubmission", each _ = true, type logical}}),

    Due = Table.AddColumn(CodeFlags, "Review Due Date", each
        Date.AddDays([Submitted Date], [Effective Review Days]), type date),
    OpenReview = Table.AddColumn(Due, "Is Open Review", each [Returned Date] = null, type logical),
    ReviewDays = Table.AddColumn(OpenReview, "Review Days", each
        Duration.Days((if [Returned Date] = null then Today else [Returned Date]) - [Submitted Date]),
        Int64.Type),
    ReviewerDelay = Table.AddColumn(ReviewDays, "Reviewer Delay Days", each
        List.Max({0, Duration.Days(
            (if [Returned Date] = null then Today else [Returned Date]) - [Review Due Date])}),
        Int64.Type),
    Overdue = Table.AddColumn(ReviewerDelay, "Is Overdue", each
        [Is Open Review] and Today > [Review Due Date], type logical),
    Resubmission = Table.AddColumn(Overdue, "Resubmission Days", each
        if not [Requires Resubmission] or [Returned Date] = null then null
        else if [Next Submitted Date] <> null then Duration.Days([Next Submitted Date] - [Returned Date])
        else if [Is Latest] then Duration.Days(Today - [Returned Date])
        else null, Int64.Type),
    OriginatorDelay = Table.AddColumn(Resubmission, "Originator Delay Days", each
        if [Resubmission Days] = null then null
        else List.Max({0, [Resubmission Days] - ResubmitDays}), Int64.Type),
    Ball = Table.AddColumn(OriginatorDelay, "Ball In Court", each
        if [Returned Date] = null then "Reviewer"
        else if [Requires Resubmission] and [Next Submitted Date] = null then "Originator"
        else "Closed", type text),
    Court = Table.AddColumn(Ball, "Court", each
        if [Ball In Court] = "Reviewer" then
            (if [Loop] = "Our Deliverable" then "With Others" else "With Us")
        else if [Ball In Court] = "Originator" then
            (if [Loop] = "Our Deliverable" then "With Us" else "With Others")
        else "Closed", type text),
    ActionDue = Table.AddColumn(Court, "Action Due Date", each
        if [Ball In Court] = "Reviewer" then [Review Due Date]
        else if [Ball In Court] = "Originator" then Date.AddDays([Returned Date], ResubmitDays)
        else null, type nullable date),
    DaysLeft = Table.AddColumn(ActionDue, "Action Days Left", each
        if [Action Due Date] = null then null else Duration.Days([Action Due Date] - Today),
        Int64.Type),

    Result = Table.SelectColumns(DaysLeft, {
        "RevKey", "DocKey", "Project Code", "Doc No", "Rev", "Seq", "Submission No",
        "Submitted Date", "Transmittal Ref", "Review Due Date", "Returned Date", "Status Code",
        "Outcome", "Counts As Approved", "Requires Resubmission", "Is Latest",
        "Is Open Review", "Is Overdue", "Review Days", "Reviewer Delay Days",
        "Next Submitted Date", "Resubmission Days", "Originator Delay Days",
        "Ball In Court", "Court", "Action Due Date", "Action Days Left", "Remarks"}),
    Typed = Table.TransformColumnTypes(Result, {
        {"Seq", Int64.Type}, {"Submission No", Int64.Type},
        {"Submitted Date", type date}, {"Returned Date", type date},
        {"Review Due Date", type date}, {"Next Submitted Date", type date},
        {"Action Due Date", type date}, {"Is Latest", type logical}})
in
    Typed

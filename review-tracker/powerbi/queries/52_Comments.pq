// Query name: Comments   (loaded)
// One row per comment per CRS (a comment carried forward appears once per revision).
//   Is Latest Listing  - this row is the comment's most recent status
//   Is Open Now        - latest listing and still Open
//   Is Carried Forward - the comment appears in the CRS of two or more revisions
let
    WithRev = Table.NestedJoin(CommentRows, {"RevKey"},
        Table.SelectColumns(Revisions, {"RevKey", "Seq", "Status Code"}), {"RevKey"},
        "RevRow", JoinKind.Inner),
    RevCols = Table.ExpandTableColumn(WithRev, "RevRow", {"Seq", "Status Code"},
        {"Seq", "Register Status Code"}),
    Stats = Table.Group(RevCols, {"CommentKey"}, {
        {"First Seq", each List.Min([Seq]), Int64.Type},
        {"Latest Seq", each List.Max([Seq]), Int64.Type},
        {"Times Listed", each List.Count(List.Distinct([Seq])), Int64.Type}}),
    WithStats = Table.NestedJoin(RevCols, {"CommentKey"}, Stats, {"CommentKey"}, "S", JoinKind.LeftOuter),
    StatCols = Table.ExpandTableColumn(WithStats, "S", {"First Seq", "Latest Seq", "Times Listed"}),
    First = Table.AddColumn(StatCols, "Is First Listing", each [Seq] = [First Seq], type logical),
    LatestListing = Table.AddColumn(First, "Is Latest Listing", each [Seq] = [Latest Seq], type logical),
    OpenNow = Table.AddColumn(LatestListing, "Is Open Now", each
        [Is Latest Listing] and [Status] = "Open", type logical),
    Carried = Table.AddColumn(OpenNow, "Is Carried Forward", each [Times Listed] >= 2, type logical),
    Result = Table.SelectColumns(Carried, {
        "CommentKey", "RevKey", "DocKey", "Project Code", "Doc No", "Rev", "Seq", "CRS File",
        "Review Date", "Reviewed By", "Comment ID", "Sheet / Clause Ref", "Comment", "Category",
        "Severity", "Std Code", "Originator Response", "Status", "Remarks", "First Seq",
        "Latest Seq", "Times Listed", "Is First Listing", "Is Latest Listing", "Is Open Now",
        "Is Carried Forward"}),
    Typed = Table.TransformColumnTypes(Result, {{"Seq", Int64.Type}, {"Review Date", type date}})
in
    Typed

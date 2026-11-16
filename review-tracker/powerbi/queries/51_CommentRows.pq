// Query name: CommentRows   (not loaded)
// Every comment row of every CRS file, cleaned but not validated.
let
    CrsFiles = Table.SelectRows(SourceFiles, each [File Kind] = "CRS"),
    WithData = Table.AddColumn(CrsFiles, "Data", each fnReadCrs([Content])),
    HasData = Table.SelectRows(WithData, each [Data] <> null),
    Slim = Table.SelectColumns(HasData, {"Project Code", "Name", "Data"}),
    Renamed = Table.RenameColumns(Slim, {{"Name", "CRS File"}}),
    Expanded = Table.ExpandTableColumn(Renamed, "Data", {
        "Row", "H Doc No", "H Rev", "H Review Date", "H Reviewed By", "H Status Code",
        "Comment ID", "Sheet / Clause Ref", "Comment", "Category", "Severity", "Std Code",
        "Originator Response", "Status", "Remarks"}),
    Cleaned = Table.TransformColumns(Expanded, {
        {"Row", each try Int64.From(_) otherwise null, Int64.Type},
        {"H Doc No", fnUpper, type nullable text},
        {"H Rev", fnUpper, type nullable text},
        {"H Review Date", fnToDate, type nullable date},
        {"H Reviewed By", fnText, type nullable text},
        {"H Status Code", fnUpper, type nullable text},
        {"Comment ID", fnUpper, type nullable text},
        {"Sheet / Clause Ref", fnText, type nullable text},
        {"Comment", fnText, type nullable text},
        {"Category", fnText, type nullable text},
        {"Severity", each let t = fnText(_) in if t = null then null else Text.Proper(t), type nullable text},
        {"Std Code", fnUpper, type nullable text},
        {"Originator Response", fnText, type nullable text},
        // A blank status is treated as Open, so nothing is closed by accident.
        {"Status", each let t = fnText(_) in if t = null then "Open" else Text.Proper(t), type text},
        {"Remarks", fnText, type nullable text}}),
    HeaderNames = Table.RenameColumns(Cleaned, {
        {"H Doc No", "Doc No"}, {"H Rev", "Rev"}, {"H Review Date", "Review Date"},
        {"H Reviewed By", "Reviewed By"}, {"H Status Code", "CRS Status Code"}}),
    NonBlank = Table.SelectRows(HeaderNames, each [Comment] <> null or [Comment ID] <> null),
    WithKeys = Table.AddColumn(NonBlank, "DocKey", each [Project Code] & "|" & [Doc No], type nullable text),
    WithRevKey = Table.AddColumn(WithKeys, "RevKey", each [DocKey] & "|" & [Rev], type nullable text),
    // A comment without an ID cannot be followed across revisions; it gets a one-off key.
    WithCommentKey = Table.AddColumn(WithRevKey, "CommentKey", each
        [DocKey] & "|" & (if [Comment ID] <> null then [Comment ID]
                          else "NO-ID-" & [Rev] & "-" & Text.From([Row])), type nullable text)
in
    WithCommentKey

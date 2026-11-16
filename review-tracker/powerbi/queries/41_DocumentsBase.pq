// Query name: DocumentsBase   (not loaded)
// One row per document, with the review period resolved (own value, else stage default, else 14).
let
    Unique = Table.Distinct(DocumentRows, {"DocKey"}),
    WithStage = Table.NestedJoin(Unique, {"Stage"}, Stages, {"Stage Code"}, "StageRow", JoinKind.LeftOuter),
    StageDays = Table.ExpandTableColumn(WithStage, "StageRow", {"Default Review Days"}, {"Stage Default Days"}),
    Effective = Table.AddColumn(StageDays, "Effective Review Days", each
        if [Review Days Allowed] <> null then [Review Days Allowed]
        else if [Stage Default Days] <> null then [Stage Default Days]
        else 14, Int64.Type),
    Result = Table.RemoveColumns(Effective, {"Stage Default Days"})
in
    Result

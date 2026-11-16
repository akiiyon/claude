// Query name: CommentLibrary   (loaded)
let
    Source = fnConfigTable("tblCommentLibrary"),
    Clean = Table.TransformColumns(Source, {
        {"Std Code", fnUpper, type nullable text},
        {"Component", fnText, type nullable text},
        {"Category", fnText, type nullable text},
        {"Standard Comment", fnText, type nullable text}}),
    NonBlank = Table.SelectRows(Clean, each [Std Code] <> null),
    Unique = Table.Distinct(NonBlank, {"Std Code"})
in
    Unique

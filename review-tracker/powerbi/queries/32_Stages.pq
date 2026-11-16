// Query name: Stages   (loaded)
let
    Source = fnConfigTable("tblStages"),
    Clean = Table.TransformColumns(Source, {
        {"Stage Code", fnUpper, type nullable text},
        {"Stage Name", fnText, type nullable text},
        {"Sort Order", each try Int64.From(_) otherwise null, Int64.Type},
        {"Default Review Days", each try Int64.From(_) otherwise null, Int64.Type}}),
    NonBlank = Table.SelectRows(Clean, each [Stage Code] <> null),
    Unique = Table.Distinct(NonBlank, {"Stage Code"})
in
    Unique

// Query name: Settings   (loaded - the reminder flow reads it)
let
    Source = fnConfigTable("tblSettings"),
    Clean = Table.TransformColumns(Source, {
        {"Setting", fnText, type nullable text},
        {"Value", each try Number.From(_) otherwise null, type nullable number},
        {"Notes", fnText, type nullable text}}),
    NonBlank = Table.SelectRows(Clean, each [Setting] <> null)
in
    NonBlank

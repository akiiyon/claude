// Query name: People   (loaded)
let
    Source = fnConfigTable("tblPeople"),
    Clean = Table.TransformColumns(Source, {
        {"Name", fnText, type nullable text},
        {"Email", fnText, type nullable text},
        {"Role", fnText, type nullable text},
        {"Active", fnText, type nullable text}}),
    NonBlank = Table.SelectRows(Clean, each [Name] <> null),
    Unique = Table.Distinct(NonBlank, {"Name"})
in
    Unique

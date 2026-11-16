// Query name: Projects   (loaded)
let
    Source = fnConfigTable("tblProjects"),
    Clean = Table.TransformColumns(Source, {
        {"Project Code", fnUpper, type nullable text},
        {"Project Name", fnText, type nullable text},
        {"Project Type", fnText, type nullable text},
        {"Client", fnText, type nullable text},
        {"Project Lead", fnText, type nullable text},
        {"Active", fnText, type nullable text}}),
    NonBlank = Table.SelectRows(Clean, each [Project Code] <> null),
    Unique = Table.Distinct(NonBlank, {"Project Code"})
in
    Unique

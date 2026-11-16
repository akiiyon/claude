// Query name: StatusCodes   (not loaded)
let
    Source = fnConfigTable("tblStatusCodes"),
    Clean = Table.TransformColumns(Source, {
        {"Code", fnUpper, type nullable text},
        {"Outcome", fnText, type nullable text},
        {"Counts As Approved", each fnUpper(_) = "YES", type logical},
        {"Requires Resubmission", each fnUpper(_) = "YES", type logical}}),
    NonBlank = Table.SelectRows(Clean, each [Code] <> null),
    Unique = Table.Distinct(NonBlank, {"Code"})
in
    Unique

// Query name: RevisionRows   (not loaded)
// Every row of every project's Revisions sheet, cleaned but not validated.
let
    RegisterFiles = Table.SelectRows(SourceFiles, each [File Kind] = "REGISTER"),
    WithData = Table.AddColumn(RegisterFiles, "Data", each fnGetTable([Content], "tblRevisions")),
    HasData = Table.SelectRows(WithData, each [Data] <> null),
    Slim = Table.SelectColumns(HasData, {"Project Code", "Name", "Data"}),
    Renamed = Table.RenameColumns(Slim, {{"Name", "Register File"}}),
    Expanded = Table.ExpandTableColumn(Renamed, "Data", {
        "Doc No", "Rev", "Submission No", "Submitted Date", "Transmittal Ref",
        "Returned Date", "Status Code", "Remarks"}),
    Cleaned = Table.TransformColumns(Expanded, {
        {"Doc No", fnUpper, type nullable text},
        {"Rev", fnUpper, type nullable text},
        {"Submission No", each try Int64.From(_) otherwise null, Int64.Type},
        {"Submitted Date", fnToDate, type nullable date},
        {"Transmittal Ref", fnText, type nullable text},
        {"Returned Date", fnToDate, type nullable date},
        {"Status Code", fnUpper, type nullable text},
        {"Remarks", fnText, type nullable text}}),
    NonBlank = Table.SelectRows(Cleaned, each [Doc No] <> null or [Rev] <> null),
    WithKey = Table.AddColumn(NonBlank, "DocKey", each [Project Code] & "|" & [Doc No], type nullable text),
    WithRevKey = Table.AddColumn(WithKey, "RevKey", each [DocKey] & "|" & [Rev], type nullable text)
in
    WithRevKey

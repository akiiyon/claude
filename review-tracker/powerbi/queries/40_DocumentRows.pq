// Query name: DocumentRows   (not loaded)
// Every row of every project's Documents sheet, cleaned but not de-duplicated
// (DataIssues reports duplicates; DocumentsBase keeps the first).
let
    RegisterFiles = Table.SelectRows(SourceFiles, each [File Kind] = "REGISTER"),
    WithData = Table.AddColumn(RegisterFiles, "Data", each fnGetTable([Content], "tblDocuments")),
    HasData = Table.SelectRows(WithData, each [Data] <> null),
    Slim = Table.SelectColumns(HasData, {"Project Code", "Name", "Data"}),
    Renamed = Table.RenameColumns(Slim, {{"Name", "Register File"}}),
    Expanded = Table.ExpandTableColumn(Renamed, "Data", {
        "Doc No", "Title", "Stage", "Component", "Doc Type", "Loop", "Our Engineer",
        "Other Party", "Planned Submission", "Review Days Allowed", "Remarks"}),
    Cleaned = Table.TransformColumns(Expanded, {
        {"Doc No", fnUpper, type nullable text},
        {"Title", fnText, type nullable text},
        {"Stage", fnUpper, type nullable text},
        {"Component", fnText, type nullable text},
        {"Doc Type", fnText, type nullable text},
        {"Loop", fnText, type nullable text},
        {"Our Engineer", fnText, type nullable text},
        {"Other Party", fnText, type nullable text},
        {"Planned Submission", fnToDate, type nullable date},
        {"Review Days Allowed", each try Int64.From(_) otherwise null, Int64.Type},
        {"Remarks", fnText, type nullable text}}),
    NonBlank = Table.SelectRows(Cleaned, each [Doc No] <> null),
    WithKey = Table.AddColumn(NonBlank, "DocKey", each [Project Code] & "|" & [Doc No], type text)
in
    WithKey

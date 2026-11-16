// Query name: fnIssues   (function, not loaded)
// Turns rows that fail a check into DataIssues rows. message(r) builds the text from the row.
(rows as table, level as text, message as function) as table =>
let
    Records = List.Transform(Table.ToRecords(rows), (r) => [
        Level = level,
        #"Project Code" = Record.FieldOrDefault(r, "Project Code", null),
        #"Doc No" = Record.FieldOrDefault(r, "Doc No", null),
        Rev = Record.FieldOrDefault(r, "Rev", null),
        File = Record.FieldOrDefault(r, "Register File", Record.FieldOrDefault(r, "CRS File", null)),
        Issue = message(r)
    ])
in
    Table.FromRecords(Records, type table [
        Level = text, #"Project Code" = nullable text, #"Doc No" = nullable text,
        Rev = nullable text, File = nullable text, Issue = text])

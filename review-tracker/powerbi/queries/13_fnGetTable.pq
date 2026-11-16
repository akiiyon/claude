// Query name: fnGetTable   (function, not loaded)
// Returns the named Excel table from a workbook, or null if the file has no such table.
(content as binary, tableName as text) as nullable table =>
let
    Workbook = try Excel.Workbook(content, true) otherwise null,
    Match = if Workbook = null then null
            else Table.SelectRows(Workbook, each [Kind] = "Table" and [Name] = tableName),
    Result = if Match = null or Table.IsEmpty(Match) then null else Match{0}[Data]
in
    Result

// Query name: fnReadCrs   (function, not loaded)
// Reads one CRS workbook: its comments, each tagged with the submission header
// (Doc No, Rev, Review Date, Reviewed By, Status Code). Returns null if either table is missing.
(content as binary) as nullable table =>
let
    Header = fnGetTable(content, "tblCRSHeader"),
    Comments = fnGetTable(content, "tblComments"),
    HeaderRow = if Header = null or Table.IsEmpty(Header) then null else Header{0},
    Get = (field as text) => Record.FieldOrDefault(HeaderRow, field, null),
    Result = if HeaderRow = null or Comments = null then null else
        let
            Indexed = Table.AddIndexColumn(Comments, "Row", 1, 1, Int64.Type),
            H1 = Table.AddColumn(Indexed, "H Doc No", each Get("Doc No")),
            H2 = Table.AddColumn(H1, "H Rev", each Get("Rev")),
            H3 = Table.AddColumn(H2, "H Review Date", each Get("Review Date")),
            H4 = Table.AddColumn(H3, "H Reviewed By", each Get("Reviewed By")),
            H5 = Table.AddColumn(H4, "H Status Code", each Get("Status Code"))
        in
            H5
in
    Result

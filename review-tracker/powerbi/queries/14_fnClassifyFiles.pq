// Query name: fnClassifyFiles   (function, not loaded)
// Takes a file listing (SharePoint.Files or Folder.Files) and keeps the tracker's .xlsx files,
// tagging each with its project code and kind from the folder path:
//   <Root>/Config/...                        -> File Kind "CONFIG"
//   <Root>/Projects/<ProjectCode>/Register/  -> File Kind "REGISTER"
//   <Root>/Projects/<ProjectCode>/CRS/       -> File Kind "CRS"
(files as table) as table =>
let
    Marker = "/" & RootFolderName & "/",
    Xlsx = Table.SelectRows(files, each Text.Lower([Extension]) = ".xlsx"
        and not Text.StartsWith([Name], "~$")
        and not Text.Contains(Text.Upper([Name]), "TEMPLATE")),
    WithRelPath = Table.AddColumn(Xlsx, "RelPath", each
        let p = Text.Replace([Folder Path], "\", "/")
        in if Text.Contains(p, Marker)
           then Text.AfterDelimiter(p, Marker, {0, RelativePosition.FromEnd})
           else null, type nullable text),
    Inside = Table.SelectRows(WithRelPath, each [RelPath] <> null),
    WithParts = Table.AddColumn(Inside, "Parts", each
        List.Select(Text.Split([RelPath], "/"), (s) => s <> ""), type list),
    WithArea = Table.AddColumn(WithParts, "Area", each
        let a = [Parts]{0}? in if a = null then "" else Text.Upper(a), type text),
    WithProject = Table.AddColumn(WithArea, "Project Code", each
        if [Area] = "PROJECTS" then fnUpper([Parts]{1}?) else null, type nullable text),
    WithKind = Table.AddColumn(WithProject, "File Kind", each
        if [Area] = "CONFIG" then "CONFIG"
        else if [Area] = "PROJECTS" then fnUpper([Parts]{2}?)
        else null, type nullable text),
    Result = Table.SelectColumns(WithKind, {"Content", "Name", "Folder Path", "Project Code", "File Kind"})
in
    Result

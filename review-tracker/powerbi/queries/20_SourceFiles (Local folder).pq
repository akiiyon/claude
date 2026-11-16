// Query name: SourceFiles   (not loaded)
// TEST version: reads the sample data (or any copy of the tracker) from a local folder.
// Replace it with the SharePoint version before publishing; the service cannot read local
// folders without a gateway.
let
    Raw = Folder.Files(LocalRootPath),
    Result = fnClassifyFiles(Raw)
in
    Result

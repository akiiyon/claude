// Query name: SourceFiles   (not loaded)
// LIVE version: reads the tracker from SharePoint. Use this one before publishing.
// If the site holds many unrelated files and refresh is slow, give the tracker its own
// site or document library.
let
    Raw = SharePoint.Files(SharePointSiteUrl, [ApiVersion = 15]),
    Result = fnClassifyFiles(Raw)
in
    Result

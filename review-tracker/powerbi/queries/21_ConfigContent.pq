// Query name: ConfigContent   (not loaded)
let
    ConfigFiles = Table.SelectRows(SourceFiles, each [File Kind] = "CONFIG"
        and Text.Lower([Name]) = "tracker_config.xlsx"),
    Content = if Table.IsEmpty(ConfigFiles)
        then error "Tracker_Config.xlsx was not found in the Config folder of the tracker."
        else ConfigFiles{0}[Content]
in
    Content

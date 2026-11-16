// Query name: fnConfigTable   (function, not loaded)
(tableName as text) as table =>
let
    Found = fnGetTable(ConfigContent, tableName)
in
    if Found = null
    then error ("Table " & tableName & " is missing from Tracker_Config.xlsx.")
    else Found

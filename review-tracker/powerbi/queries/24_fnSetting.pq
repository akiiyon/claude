// Query name: fnSetting   (function, not loaded)
// Reads a number from Config > Settings, falling back to the default if missing or blank.
(settingName as text, defaultValue as number) as number =>
let
    Rows = Table.SelectRows(Settings, each [Setting] = settingName),
    Value = if Table.IsEmpty(Rows) then null else try Number.From(Rows{0}[Value]) otherwise null
in
    if Value = null then defaultValue else Value

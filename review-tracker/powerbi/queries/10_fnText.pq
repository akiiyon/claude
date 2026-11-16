// Query name: fnText   (function, not loaded)
// Trimmed text of a cell value; blank cells and empty text become null.
(value as any) as nullable text =>
let
    t = if value = null then null else Text.Trim(Text.From(value))
in
    if t = null or t = "" then null else t

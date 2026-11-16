// Query name: fnUpper   (function, not loaded)
// Like fnText but upper case, for codes and keys (Doc No, Rev, Stage, Status Code).
(value as any) as nullable text =>
let
    t = fnText(value)
in
    if t = null then null else Text.Upper(t)

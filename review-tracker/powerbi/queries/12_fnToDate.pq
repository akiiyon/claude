// Query name: fnToDate   (function, not loaded)
// Converts a cell value to a date; anything that is not a date becomes null
// (and is reported on the Data Quality page where it matters).
(value as any) as nullable date =>
    if value = null then null
    else if value is date then value
    else if value is datetime then DateTime.Date(value)
    else if value is datetimezone then DateTime.Date(DateTimeZone.RemoveZone(value))
    else if value is number then try Date.From(value) otherwise null
    else try Date.From(Text.Trim(Text.From(value))) otherwise null

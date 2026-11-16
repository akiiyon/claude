// Query name: ReportInfo   (loaded) - one row, used for the "Data as of" card.
let
    RefreshedAt = DateTimeZone.RemoveZone(DateTimeZone.SwitchZone(
        DateTimeZone.UtcNow(),
        Number.RoundTowardZero(UtcOffsetHours),
        Number.Round(Number.Mod(UtcOffsetHours * 60, 60)))),
    Result = #table(
        type table [#"As Of Date" = date, #"Refreshed At" = datetime],
        {{AsOfDate, RefreshedAt}})
in
    Result

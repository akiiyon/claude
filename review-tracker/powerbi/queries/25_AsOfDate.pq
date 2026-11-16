// Query name: AsOfDate   (not loaded)
// "Today" for overdue and ageing calculations, in the local time zone.
let
    Override = if AsOfDateOverride = null then "" else Text.Trim(AsOfDateOverride),
    LocalNow = DateTimeZone.SwitchZone(
        DateTimeZone.UtcNow(),
        Number.RoundTowardZero(UtcOffsetHours),
        Number.Round(Number.Mod(UtcOffsetHours * 60, 60))),
    Result = if Override <> ""
        then Date.FromText(Override, [Format = "yyyy-MM-dd", Culture = "en-US"])
        else DateTime.Date(DateTimeZone.RemoveZone(LocalNow))
in
    Result

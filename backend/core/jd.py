import swisseph as swe
from datetime import datetime

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo


def to_julian_day(date_str, time_str, timezone_str):
    dt_str = f"{date_str} {time_str}"
    local_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")

    local_dt = local_dt.replace(tzinfo=ZoneInfo(timezone_str))
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))

    hour = (
        utc_dt.hour +
        utc_dt.minute / 60 +
        utc_dt.second / 3600
    )

    jd = swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        hour
    )

    return jd
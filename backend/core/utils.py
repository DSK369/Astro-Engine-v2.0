def decimal_to_dms(decimal_degree):
    """
    Convert longitude → Rashi-relative DMS (0–30°)

    Seconds are shown as a whole number. Only the display is rounded —
    every calculation downstream (sub-lords, cusps, significators) reads
    the raw float longitude, never this string.
    """

    decimal_degree = decimal_degree % 360
    degree_in_sign = decimal_degree % 30

    degrees = int(degree_in_sign)

    minutes_full = (degree_in_sign - degrees) * 60
    minutes = int(minutes_full)

    seconds = round((minutes_full - minutes) * 60)

    # Rounding can tip 59.6" up to a full 60" — carry it rather than
    # printing an invalid 60. A sign spans [0°, 30°), so 30° wraps to 0°.
    if seconds == 60:
        seconds = 0
        minutes += 1
    if minutes == 60:
        minutes = 0
        degrees += 1
    if degrees == 30:
        degrees = 0

    return f"{degrees:02d}° {minutes:02d}' {seconds:02d}\""



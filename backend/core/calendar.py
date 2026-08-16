# Lunar/solar calendar layer (Plan 1 Astro Engine.md, Phase 3): Paksha,
# Amanta/Purnimanta lunar month naming + Adhika Masa (leap month)
# detection, solar month (Saura Masa), Sankranti (exact Sun sign-ingress
# moment), Ritu (season), Ayana (Uttarayana/Dakshinayana).
#
# The Amanta lunar-month algorithm is ported from real PyJHora source
# (naturalstupid/PyJHora, src/jhora/panchanga/drik.py: `lunar_month()`),
# fetched and read directly rather than drafted from memory -- see
# Plan 1 Implementation.md for the fetch and the reasoning that derives
# Purnimanta from it (PyJHora's own function only returns the Amanta
# month; Purnimanta isn't a separate upstream function -- it's derived
# here from the standard, well-documented classical relationship between
# the two systems -- see compute_lunar_month()'s docstring).
#
# Kshaya Masa (deficit month -- two Sankrantis inside one synodic month)
# is NOT implemented: astronomically rare (roughly once every several
# decades) and no citable per-case rule has been sourced yet -- same
# honest-scoping call as core/muhurta.py's Durmuhurta omission.

from core.planets import calculate_planet

RASHIS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

LUNAR_MONTH_NAMES = [
    "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashwin", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna",
]

SOLAR_MONTH_NAMES = RASHIS  # Saura Masa are literally the rashi names

RITU_NAMES = ["Vasanta", "Grishma", "Varsha", "Sharad", "Hemant", "Shishira"]

# Sidereal rashi indices the Sun occupies during Uttarayana (Capricorn
# through Gemini) -- boundaries are Makar/Karka Sankranti, matching
# Indian civil/religious practice, not the tropical solstice.
UTTARAYANA_RASHIS = {9, 10, 11, 0, 1, 2}

SYNODIC_AVG_RATE = 360.0 / 29.530588  # deg/day -- coarse initial guess only, Newton-refined after


def _positions(jd, ayanamsa_value):
    sun = calculate_planet(jd, "Sun", ayanamsa_value)
    moon = calculate_planet(jd, "Moon", ayanamsa_value)
    return sun["longitude"], sun["speed"], moon["longitude"], moon["speed"]


def _solve_tithi_angle(jd_guess, ayanamsa_value, target_deg, max_iter=50, tol_deg=1e-7):
    """Find the JD at which (Moon - Sun) % 360 crosses `target_deg`."""
    jd = jd_guess
    for _ in range(max_iter):
        sun_lon, sun_speed, moon_lon, moon_speed = _positions(jd, ayanamsa_value)
        angle = (moon_lon - sun_lon) % 360
        rate = moon_speed - sun_speed
        diff = ((target_deg - angle + 180) % 360) - 180
        if abs(diff) < tol_deg:
            return jd
        jd += diff / rate
    return jd


def _solve_solar_angle(jd_guess, ayanamsa_value, target_deg, max_iter=50, tol_deg=1e-7):
    """Find the JD at which the Sun's sidereal longitude crosses `target_deg`."""
    jd = jd_guess
    for _ in range(max_iter):
        sun = calculate_planet(jd, "Sun", ayanamsa_value)
        angle, rate = sun["longitude"] % 360, sun["speed"]
        diff = ((target_deg - angle + 180) % 360) - 180
        if abs(diff) < tol_deg:
            return jd
        jd += diff / rate
    return jd


def find_new_moon(jd_now, ayanamsa_value, direction):
    """Nearest Amavasya (tithi angle == 0 / 360) before/after `jd_now`.

    A coarse guess from the average synodic rate lands within a fraction
    of a day of the true crossing -- close enough that `_solve_tithi_angle`
    (which re-evaluates the real Moon/Sun rate at each iterate, same
    pattern as core/panchang.py's boundary solver) converges to *that*
    crossing specifically, not an adjacent one ~29.5 days away.
    """
    sun_lon, _, moon_lon, _ = _positions(jd_now, ayanamsa_value)
    angle = (moon_lon - sun_lon) % 360
    if direction == "next":
        coarse_days, target = (360.0 - angle) / SYNODIC_AVG_RATE, 360.0
    elif direction == "previous":
        coarse_days, target = -(angle / SYNODIC_AVG_RATE), 0.0
    else:
        raise ValueError(f"Unknown direction: {direction!r}")
    return _solve_tithi_angle(jd_now + coarse_days, ayanamsa_value, target)


def _solar_rashi_at(jd, ayanamsa_value):
    sun = calculate_planet(jd, "Sun", ayanamsa_value)
    return int(sun["longitude"] // 30) % 12


def _amanta_month_at(jd_now, ayanamsa_value):
    """(month_index 0-11, is_adhika, prev_new_moon_jd, next_new_moon_jd)
    for the Amanta month containing `jd_now`.

    Direct port of PyJHora's `lunar_month()` (drik.py) -- see module
    docstring. `this_solar_month`/`next_solar_month` are the Sun's rashi
    at the Amavasyas bracketing `jd_now`; if they're the same rashi, the
    Sun made no Sankranti during this synodic month -- the definition of
    Adhika Masa (a lunar month with no solar-month transition inside it).
    """
    prev_nm = find_new_moon(jd_now, ayanamsa_value, "previous")
    next_nm = find_new_moon(jd_now, ayanamsa_value, "next")
    this_solar_month = _solar_rashi_at(prev_nm, ayanamsa_value)
    next_solar_month = _solar_rashi_at(next_nm, ayanamsa_value)
    is_adhika = this_solar_month == next_solar_month
    month_idx = (this_solar_month + 1) % 12
    return month_idx, is_adhika, prev_nm, next_nm


def compute_lunar_month(jd_now, ayanamsa_value, paksha):
    """Amanta and Purnimanta month name + Adhika Masa flag at `jd_now`.

    `paksha` is the already-computed Tithi paksha ("Shukla"/"Krishna") --
    reused rather than recomputed, since core.panchang already has it.

    Amanta (month = Amavasya to Amavasya) is what PyJHora's `lunar_month()`
    returns directly. Purnimanta (month = Purnima to Purnima) is not a
    separate upstream function -- derived here from the standard
    classical relationship between the two systems: both name Shukla
    Paksha identically (the fortnight right after an Amavasya), and only
    disagree during Krishna Paksha, which Purnimanta groups with the
    *upcoming* month (the one whose Shukla Paksha follows it) while
    Amanta groups it with the *current* (ending) month. So: in Shukla
    Paksha the two systems agree; in Krishna Paksha, Purnimanta's name
    and Adhika status are evaluated fresh at a moment just past the
    upcoming Amavasya, rather than assumed to match the current Amanta
    month.
    """
    amanta_idx, amanta_adhika, prev_nm, next_nm = _amanta_month_at(jd_now, ayanamsa_value)

    if paksha == "Shukla":
        purnimanta_idx, purnimanta_adhika = amanta_idx, amanta_adhika
    else:
        purnimanta_idx, purnimanta_adhika, _, _ = _amanta_month_at(next_nm + 0.5, ayanamsa_value)

    return {
        "amanta": {
            "index": amanta_idx + 1,
            "name": LUNAR_MONTH_NAMES[amanta_idx],
            "isAdhika": amanta_adhika,
        },
        "purnimanta": {
            "index": purnimanta_idx + 1,
            "name": LUNAR_MONTH_NAMES[purnimanta_idx],
            "isAdhika": purnimanta_adhika,
        },
    }


def compute_sankranti(jd_now, ayanamsa_value):
    """Next Sankranti (Sun's sidereal sign-ingress) from `jd_now`."""
    sun = calculate_planet(jd_now, "Sun", ayanamsa_value)
    current_sign = int(sun["longitude"] // 30) % 12
    next_sign_deg = ((current_sign + 1) % 12) * 30.0
    coarse_days = ((next_sign_deg - sun["longitude"]) % 360) / sun["speed"]
    sankranti_jd = _solve_solar_angle(jd_now + coarse_days, ayanamsa_value, next_sign_deg)
    return {
        "jd": sankranti_jd,
        "fromRashi": RASHIS[current_sign],
        "toRashi": RASHIS[(current_sign + 1) % 12],
    }


def compute_solar_month(sun_lon):
    idx = int(sun_lon // 30) % 12
    return {"index": idx + 1, "name": SOLAR_MONTH_NAMES[idx]}


def compute_ritu(solar_month_index_1based):
    """0=Vasanta .. 5=Shishira, two solar months per Ritu starting from
    Mesha (Aries) -- the standard six-season mapping."""
    idx = (solar_month_index_1based - 1) // 2
    return RITU_NAMES[idx]


def compute_ayana(sun_rashi_index):
    return "Uttarayana" if sun_rashi_index in UTTARAYANA_RASHIS else "Dakshinayana"


def compute_calendar(jd_now, ayanamsa_value, sun_lon, paksha):
    """Full Phase-3 calendar bundle for the birth moment.

    `sun_lon`/`paksha` are reused from the already-computed Panchang
    (core.panchang) rather than recomputed here.
    """
    solar_month = compute_solar_month(sun_lon)
    solar_rashi_idx = solar_month["index"] - 1
    lunar_month = compute_lunar_month(jd_now, ayanamsa_value, paksha)
    sankranti = compute_sankranti(jd_now, ayanamsa_value)

    return {
        "lunarMonth": lunar_month,
        "solarMonth": solar_month,
        "ritu": compute_ritu(solar_month["index"]),
        "ayana": compute_ayana(solar_rashi_idx),
        "nextSankranti": sankranti,
    }

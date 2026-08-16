# Panchang (Tithi, Vara, Nakshatra, Yoga, Karana) computation.
#
# Not part of the original core/ module set -- Astro-Engine-v2.0's mock
# data explicitly marked this as unimplemented (see mockChartData.js:
# MOCK_PANCHANG, "Panchang is NOT computed by the backend yet"). Added
# here using the standard Panchang formulas so real (non-mock) birth
# data gets a real Panchang rather than always showing the one sample
# chart's reference values regardless of input.
#
# All five limbs derive from Sun/Moon sidereal longitude and the local
# birth date -- no additional ephemeris lookups beyond what get_all_planets
# already computes.
#
# Per-limb end times (Plan 1 §10/§15/§57): a fixed duration is wrong --
# the Sun and Moon move at variable speeds through the month/year (Moon:
# ~11.8-15.4 deg/day; Sun: ~0.95-1.02 deg/day), so Tithi/Nakshatra/Yoga/
# Karana boundaries are found by solving for the moment each limb's
# defining angle crosses its next multiple, using the *actual* Sun/Moon
# speed at each iterate rather than an assumed-fixed rate. Both Sun and
# Moon are always prograde geocentrically (neither shows retrograde
# motion in ecliptic longitude), so every rate used below is guaranteed
# nonzero and positive -- the boundary search can't stall or divide by
# zero.

from core.planets import calculate_planet

TITHI_NAMES = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
    "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
    "Trayodashi", "Chaturdashi",
]

YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
    "Sukarma", "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
    "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha",
    "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra",
    "Vaidhriti",
]

MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"]

VARA_NAMES = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
]

VARA_LORDS = {
    "Sunday": "Sun", "Monday": "Moon", "Tuesday": "Mars", "Wednesday": "Mercury",
    "Thursday": "Jupiter", "Friday": "Venus", "Saturday": "Saturn",
}

SEG_27 = 360 / 27  # 13°20' -- Nakshatra and Yoga segment width


def get_tithi(sun_lon, moon_lon):
    diff = (moon_lon - sun_lon) % 360
    tithi_num = int(diff // 12) + 1  # 1..30

    if tithi_num <= 15:
        paksha, idx = "Shukla", tithi_num
        name = "Purnima" if idx == 15 else TITHI_NAMES[idx - 1]
    else:
        paksha, idx = "Krishna", tithi_num - 15
        name = "Amavasya" if idx == 15 else TITHI_NAMES[idx - 1]

    return {
        "number": tithi_num,
        "paksha": paksha,
        "name": name,
        "label": f"{paksha} {idx} ({name})",
    }


def get_yoga(sun_lon, moon_lon):
    total = (sun_lon + moon_lon) % 360
    idx = int(total // SEG_27)
    return YOGA_NAMES[idx]


def get_karana(sun_lon, moon_lon):
    diff = (moon_lon - sun_lon) % 360
    half_tithi = int(diff // 6)  # 0..59

    if half_tithi == 0:
        return "Kimstughna"
    if 1 <= half_tithi <= 56:
        return MOVABLE_KARANAS[(half_tithi - 1) % 7]
    return ["Shakuni", "Chatushpada", "Naga"][half_tithi - 57]


def _positions(jd, ayanamsa_value):
    sun = calculate_planet(jd, "Sun", ayanamsa_value)
    moon = calculate_planet(jd, "Moon", ayanamsa_value)
    return sun["longitude"], sun["speed"], moon["longitude"], moon["speed"]


def _solve_boundary(jd_guess, ayanamsa_value, kind, target_deg, max_iter=50, tol_deg=1e-7):
    """Find the JD at which `kind`'s defining angle crosses `target_deg`.

    Newton's-method-style refinement: at each iterate, re-evaluate the
    real Sun/Moon speed and step by (angular distance to target) / (local
    rate), which converges in a handful of iterations since the rate is
    nearly constant over the small angular gap involved once `jd_guess`
    is already within one segment-width of the boundary -- true for every
    caller here, since they all search from the current moment within the
    limb whose own boundary they're solving for.

    `kind` selects which angle/rate pair to use:
      "tithi"     -- (Moon - Sun) % 360, rate = moon_speed - sun_speed.
                     Also used for Karana, which shares the same angle at
                     a finer (6 deg vs 12 deg) grid.
      "nakshatra" -- Moon % 360, rate = moon_speed.
      "yoga"      -- (Sun + Moon) % 360, rate = sun_speed + moon_speed.
    """
    jd = jd_guess
    for _ in range(max_iter):
        sun_lon, sun_speed, moon_lon, moon_speed = _positions(jd, ayanamsa_value)
        if kind == "tithi":
            angle, rate = (moon_lon - sun_lon) % 360, moon_speed - sun_speed
        elif kind == "nakshatra":
            angle, rate = moon_lon % 360, moon_speed
        elif kind == "yoga":
            angle, rate = (sun_lon + moon_lon) % 360, sun_speed + moon_speed
        else:
            raise ValueError(f"Unknown boundary kind: {kind!r}")

        diff = ((target_deg - angle + 180) % 360) - 180
        if abs(diff) < tol_deg:
            return jd
        jd += diff / rate
    return jd


def _timing(jd_now, ayanamsa_value, kind, lower_deg, upper_deg):
    jd_start = _solve_boundary(jd_now, ayanamsa_value, kind, lower_deg)
    jd_end = _solve_boundary(jd_now, ayanamsa_value, kind, upper_deg)
    return {
        "start_jd": jd_start,
        "end_jd": jd_end,
        "duration_seconds": (jd_end - jd_start) * 86400.0,
        "remaining_seconds": (jd_end - jd_now) * 86400.0,
    }


def compute_panchang(jd, ayanamsa_value, sun_raw, moon_raw, local_dt):
    """Full five-limb Panchang at `jd`, each timed limb carrying its own
    start/end JD plus duration/remaining seconds (Plan 1 §57's uniform
    timing interface). `sun_raw`/`moon_raw` are the dicts core.planets
    already produces (longitude, speed, nakshatra, nakshatra_lord,
    charan) -- reused rather than recomputed. `local_dt` is a naive
    datetime local to the birthplace, used only for Vara (the weekday is
    a civil-calendar fact, not an astronomical one).
    """
    sun_lon, sun_speed = sun_raw["longitude"], sun_raw["speed"]
    moon_lon, moon_speed = moon_raw["longitude"], moon_raw["speed"]

    tithi = get_tithi(sun_lon, moon_lon)
    tithi_diff = (moon_lon - sun_lon) % 360
    tithi_timing = _timing(
        jd, ayanamsa_value, "tithi", (tithi["number"] - 1) * 12.0, tithi["number"] * 12.0
    )

    nak_idx = int(moon_lon // SEG_27)
    nak_timing = _timing(
        jd, ayanamsa_value, "nakshatra", nak_idx * SEG_27, (nak_idx + 1) * SEG_27
    )

    yoga_name = get_yoga(sun_lon, moon_lon)
    yoga_idx = int(((sun_lon + moon_lon) % 360) // SEG_27)
    yoga_timing = _timing(
        jd, ayanamsa_value, "yoga", yoga_idx * SEG_27, (yoga_idx + 1) * SEG_27
    )

    karana_name = get_karana(sun_lon, moon_lon)
    half_tithi = int(tithi_diff // 6)
    karana_timing = _timing(
        jd, ayanamsa_value, "tithi", half_tithi * 6.0, (half_tithi + 1) * 6.0
    )

    weekday_idx = int(local_dt.strftime("%w"))  # 0 = Sunday
    vara_name = VARA_NAMES[weekday_idx]

    return {
        "tithi": {**tithi, **tithi_timing},
        "vara": {"index": weekday_idx + 1, "name": vara_name, "lord": VARA_LORDS[vara_name]},
        "nakshatra": {
            "name": moon_raw["nakshatra"],
            "lord": moon_raw["nakshatra_lord"],
            "pada": moon_raw["charan"],
            **nak_timing,
        },
        "yoga": {"name": yoga_name, **yoga_timing},
        "karana": {"name": karana_name, **karana_timing},
    }

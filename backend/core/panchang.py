# Panchang (Tithi, Var, Nakshatra, Yoga, Karana) computation.
#
# Not part of the original core/ module set — Astro-Engine-v2.0's mock
# data explicitly marked this as unimplemented (see mockChartData.js:
# MOCK_PANCHANG, "Panchang is NOT computed by the backend yet"). Added
# here using the standard Panchang formulas so real (non-mock) birth
# data gets a real Panchang rather than always showing the one sample
# chart's reference values regardless of input.
#
# All five limbs derive from Sun/Moon sidereal longitude and the local
# birth date — no additional ephemeris lookups beyond what get_all_planets
# already computes.

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
    idx = int(total // (360 / 27))
    return YOGA_NAMES[idx]


def get_karana(sun_lon, moon_lon):
    diff = (moon_lon - sun_lon) % 360
    half_tithi = int(diff // 6)  # 0..59

    if half_tithi == 0:
        return "Kimstughna"
    if 1 <= half_tithi <= 56:
        return MOVABLE_KARANAS[(half_tithi - 1) % 7]
    return ["Shakuni", "Chatushpada", "Naga"][half_tithi - 57]


def compute_panchang(sun_lon, moon_lon, moon_nakshatra, birth_dt):
    tithi = get_tithi(sun_lon, moon_lon)
    return {
        "tithi": tithi["label"],
        "var": birth_dt.strftime("%A"),
        "nakshatra": moon_nakshatra,
        "yog": get_yoga(sun_lon, moon_lon),
        "karana": get_karana(sun_lon, moon_lon),
    }

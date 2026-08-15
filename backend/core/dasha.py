from datetime import timedelta

# ==============================
# BASE DATA
# ==============================
BASE_SEQUENCE = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"
]

DASHA_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17
}

TOTAL = 120
NAKSHATRA_SIZE = 13 + (20 / 60)  # 13°20'


# ==============================
# HELPERS
# ==============================
def get_sequence(start_lord):
    idx = BASE_SEQUENCE.index(start_lord)
    return BASE_SEQUENCE[idx:] + BASE_SEQUENCE[:idx]


def years_to_days(years):
    return years * 365.2425


def proportional_duration(parent_start, parent_end, factor):
    total_seconds = (parent_end - parent_start).total_seconds()
    return timedelta(seconds=total_seconds * factor)


# ==============================
# 🔥 CLASSICAL BALANCE (MINUTES BASED)
# ==============================
def calculate_mahadasha_balance(longitude, nak_lord):
    longitude = longitude % 360

    # Find Nakshatra start
    nak_index = int(longitude // NAKSHATRA_SIZE)
    nak_start = nak_index * NAKSHATRA_SIZE

    # 🔥 Convert to MINUTES (classical method)
    elapsed_deg = longitude - nak_start
    elapsed_minutes = elapsed_deg * 60

    TOTAL_MINUTES = 800  # 13°20' = 800 minutes

    remaining_minutes = TOTAL_MINUTES - elapsed_minutes
    remaining_fraction = remaining_minutes / TOTAL_MINUTES

    total_years = DASHA_YEARS[nak_lord]

    balance_years = remaining_fraction * total_years

    return nak_lord, balance_years


# ==============================
# MAHADASHA TIMELINE
# ==============================
def generate_mahadasha_timeline(start_lord, balance_years, start_dt):
    timeline = []

    balance_days = years_to_days(balance_years)
    end_dt = start_dt + timedelta(days=balance_days)

    timeline.append({
        "lord": start_lord,
        "start": start_dt,
        "end": end_dt,
        "years": balance_years
    })

    current_start = end_dt
    sequence = get_sequence(start_lord)

    for lord in sequence[1:]:
        years = DASHA_YEARS[lord]
        duration = timedelta(days=years_to_days(years))

        end = current_start + duration

        timeline.append({
            "lord": lord,
            "start": current_start,
            "end": end,
            "years": years
        })

        current_start = end

    return timeline


# ==============================
# GENERIC SPLITTER (FORMULA BASED)
# ==============================
def split_dasha(parent_lord, parent_years, parent_start, parent_end):
    results = []

    sequence = get_sequence(parent_lord)
    current_start = parent_start

    for lord in sequence:
        # 🔥 Classical ratio
        factor = DASHA_YEARS[lord] / TOTAL

        duration = proportional_duration(parent_start, parent_end, factor)
        end = current_start + duration

        results.append({
            "lord": lord,
            "start": current_start,
            "end": end,
            "years": parent_years * factor
        })

        current_start = end

    return results


# ==============================
# ANTARDASHA
# ==============================
def generate_antardasha(md_lord, md_years, md_start):
    md_end = md_start + timedelta(days=years_to_days(md_years))
    return split_dasha(md_lord, md_years, md_start, md_end)


# ==============================
# PRATYANTAR
# ==============================
def generate_pratyantar(md_lord, ad_lord, ad_years, ad_start):
    ad_end = ad_start + timedelta(days=years_to_days(ad_years))
    return split_dasha(ad_lord, ad_years, ad_start, ad_end)


# ==============================
# SUKSHMA
# ==============================
def generate_sukshma(md_lord, ad_lord, pd_lord, pd_years, pd_start):
    pd_end = pd_start + timedelta(days=years_to_days(pd_years))
    return split_dasha(pd_lord, pd_years, pd_start, pd_end)


# ==============================
# PRANA
# ==============================
def generate_prana(md_lord, ad_lord, pd_lord, sd_lord, sd_years, sd_start):
    sd_end = sd_start + timedelta(days=years_to_days(sd_years))
    return split_dasha(sd_lord, sd_years, sd_start, sd_end)


# ==============================
# FIND CURRENT
# ==============================
def find_current_dasha(dasha_list, current_dt):
    for d in dasha_list:
        if d["start"] <= current_dt < d["end"]:
            return d
    return dasha_list[-1]


# ==============================
# YEARS → Y/M/D
# ==============================
def convert_years_to_ymd(years):
    total_days = int(years * 365.2425)

    y = total_days // 365
    m = (total_days % 365) // 30
    d = (total_days % 365) % 30

    return y, m, d
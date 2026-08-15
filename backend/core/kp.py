# Vimshottari base sequence
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
NAKSHATRA_SIZE = 360 / 27


def get_kp_sequence(lord):
    idx = BASE_SEQUENCE.index(lord)
    return BASE_SEQUENCE[idx:] + BASE_SEQUENCE[:idx]


def get_lord_from_value(value, sequence):
    cumulative = 0
    for lord in sequence:
        years = DASHA_YEARS[lord]
        if cumulative <= value < cumulative + years:
            return lord, cumulative, years
        cumulative += years
    return sequence[-1], cumulative, DASHA_YEARS[sequence[-1]]


def compute_kp_levels(longitude, nakshatra_lord):
    longitude = longitude % 360

    nak_index = int(longitude // NAKSHATRA_SIZE)
    nak_start = nak_index * NAKSHATRA_SIZE
    offset = longitude - nak_start

    level1_value = (offset / NAKSHATRA_SIZE) * TOTAL

    seq1 = get_kp_sequence(nakshatra_lord)
    sub, cum1, yrs1 = get_lord_from_value(level1_value, seq1)

    level2 = ((level1_value - cum1) / yrs1) * TOTAL

    seq2 = get_kp_sequence(sub)
    sub_sub, cum2, yrs2 = get_lord_from_value(level2, seq2)

    level3 = ((level2 - cum2) / yrs2) * TOTAL

    seq3 = get_kp_sequence(sub_sub)
    sub_sub_sub, _, _ = get_lord_from_value(level3, seq3)

    return sub, sub_sub, sub_sub_sub


# 🔥 BACKWARD COMPATIBILITY (DO NOT REMOVE OLD CODE USAGE)
def get_sub_lord(longitude, nakshatra_lord):
    sub, _, _ = compute_kp_levels(longitude, nakshatra_lord)
    return sub
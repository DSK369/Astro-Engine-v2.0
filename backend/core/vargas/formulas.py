# Per-chart Varga sign formulas: each takes (sign, lon) -- sign = the
# planet's D1 sign index (0=Aries...11=Pisces), lon = longitude *within*
# that sign (0-30 deg) -- and returns the resulting Varga sign index.
#
# Every formula here is transcribed from Plan 4 (project plan folder)
# §3.2, "Traditional Parasara" (chart_method=1), which that plan documents
# as execution-verified against research/PyJHora's real running code for
# the reference chart (22 charts, several hundred planet-placement
# comparisons, zero mismatches) -- not derived from memory or guessed.
# See that plan's §3.1 for why that verification mattered (an earlier
# draft checked D3/D10 against the wrong PyJHora function and wrongly
# concluded they were unresolved).

from core.vargas.rules import MOVABLE, FIXED, ODD, triplicity, element


LEO, CANCER = 4, 3


def d2_hora(sign, lon):
    # CORRECTED (see project plan folder's Plan 1 Implementation.md §8) --
    # Plan 4 §3.3's table was wrong. Reported by the user: real D2 charts
    # only ever land planets in house 1 or house 2, which is impossible
    # under a 12-sign-pair table but is exactly what the classical rule
    # produces. Verified live against multiple independent sources
    # (Brihat Parashara Hora Shastra's own stated rule, cross-checked
    # against desiutils.in/astrology/hora-d2 and others): the Hora chart
    # occupies exactly two signs, Leo (Sun's Hora) and Cancer (Moon's
    # Hora), for every planet regardless of which D1 sign it started in.
    #   Odd sign:  first half (0-15 deg) -> Leo;    second half -> Cancer
    #   Even sign: first half (0-15 deg) -> Cancer; second half -> Leo
    first_half = lon < 15
    if sign in ODD:
        return LEO if first_half else CANCER
    return CANCER if first_half else LEO


def d3_drekkana(sign, lon):
    l = int(lon // 10)  # 0,1,2
    return (sign + l * 4) % 12


def d4_chaturthamsa(sign, lon):
    l = int(lon // 7.5)  # 0-3
    return (sign + l * 3) % 12


def d5_panchamsa(sign, lon):
    l = int(lon // 6)  # 0-4
    odd_signs = [0, 10, 8, 2, 6]     # Aries, Aquarius, Sagittarius, Gemini, Libra
    even_signs = [1, 5, 11, 9, 7]    # Taurus, Virgo, Pisces, Capricorn, Scorpio
    return odd_signs[l] if sign in ODD else even_signs[l]


def d6_shashthamsa(sign, lon):
    l = int(lon // 5)  # 0-5
    return l % 12 if sign in ODD else (l + 6) % 12


def d7_saptamsa(sign, lon):
    l = int(lon // (30 / 7))  # 0-6
    return (sign + l) % 12 if sign in ODD else (sign + l + 6) % 12


def d8_ashtamsa(sign, lon):
    l = int(lon // 3.75)  # 0-7
    t = triplicity(sign)
    if t == "movable":
        return l % 12
    if t == "dual":
        return (l + 4) % 12
    return (l + 8) % 12  # fixed


def d9_navamsa(sign, lon):
    l = int(lon // (30 / 9))  # 0-8
    seed = {"fire": 0, "water": 3, "air": 6, "earth": 9}[element(sign)]
    return (seed + l) % 12


def d10_dasamsa(sign, lon):
    l = int(lon // 3)  # 0-9
    return (sign + l) % 12 if sign in ODD else (sign + l + 8) % 12


def d11_rudramsa(sign, lon):
    l = int(lon // (30 / 11))  # 0-10
    return (12 - sign + l) % 12


def d12_dwadasamsa(sign, lon):
    l = int(lon // 2.5)  # 0-11
    return (sign + l) % 12


def d16_shodasamsa(sign, lon):
    l = int(lon // 1.875)  # 0-15
    t = triplicity(sign)
    if t == "movable":
        return l % 12
    if t == "fixed":
        return (l + 4) % 12
    return (l + 8) % 12  # dual


def d20_vimsamsa(sign, lon):
    l = int(lon // 1.5)  # 0-19
    t = triplicity(sign)
    if t == "movable":
        return l % 12
    if t == "dual":
        return (l + 4) % 12
    return (l + 8) % 12  # fixed -- swapped vs D16, verified not a slip (Plan 4 §3.2)


def d24_chaturvimsamsa(sign, lon):
    l = int(lon // 1.25)  # 0-23
    return (4 + l) % 12 if sign in ODD else (3 + l) % 12  # from Leo / from Cancer


def d27_nakshatramsa(sign, lon):
    l = int(lon // (30 / 27))  # 0-26
    e = element(sign)
    offset = {"fire": 0, "earth": 3, "air": 6, "water": 9}[e]  # Aries/Cancer/Libra/Capricorn
    return (offset + l) % 12


def d30_trimsamsa(sign, lon):
    # Boundary-table lookup, absolute sign (not sign-relative) -- Plan 4
    # §3.3. CORRECTED against real PyJHora execution (source:
    # trimsamsa_chart() in horoscope/chart/charts.py): every range is
    # inclusive on BOTH ends (`long >= l_min and long <= l_max`), and at
    # an exact shared boundary the first-listed (lower) range wins,
    # since PyJHora collects all matches and takes the first one in
    # ascending list order. A plain `lo <= lon <= hi` scanned in
    # ascending order and returning on first match reproduces this
    # exactly. (Previously this used lower-inclusive/upper-exclusive
    # ranges instead -- wrong at the exact boundary degrees, caught by
    # direct execution comparison against PyJHora, not just by testing
    # this code's own internal consistency. See Plan 1 Implementation.md.)
    if sign in ODD:
        ranges = [(0, 5, 0), (5, 10, 10), (10, 18, 8), (18, 25, 2), (25, 30, 6)]
    else:
        ranges = [(0, 5, 1), (5, 12, 5), (12, 20, 11), (20, 25, 9), (25, 30, 7)]
    for lo, hi, result_sign in ranges:
        if lo <= lon <= hi:
            return result_sign
    raise ValueError(f"D30: longitude {lon} out of the expected 0-30 range")


def d40_khavedamsa(sign, lon):
    l = int(lon // 0.75)  # 0-39
    return l % 12 if sign in ODD else (l + 6) % 12  # from Aries / from Libra


def d45_akshavedamsa(sign, lon):
    l = int(lon // (30 / 45))  # 0-44
    t = triplicity(sign)
    if t == "movable":
        return l % 12
    if t == "fixed":
        return (l + 4) % 12
    return (l + 8) % 12  # dual


def d60_shashtyamsa(sign, lon):
    l = int(lon // 0.5)  # 0-59
    return (sign + l) % 12


def d81_nava_navamsa(sign, lon):
    # NOT nested D9(D9(...)) despite the name -- Plan 4 §3.5's documented
    # pitfall. The default is parivritti_cyclic(dvf=81): amsas continue
    # counting forward around the whole zodiac in strict order, 81 per
    # sign, with no reset at sign boundaries.
    l = int(lon // (30 / 81))  # 0-80
    return (sign * 81 + l) % 12


def d108_ashtottaramsa(sign, lon):
    # = D12 applied to D9's result (Plan 4 §3.2), verified by direct
    # chaining against PyJHora's own D108 output.
    r9 = d9_navamsa(sign, lon)
    from core.vargas.rules import d_long
    return d12_dwadasamsa(r9, d_long(lon, 9))


def d144_dwadas_dwadasamsa(sign, lon):
    # = D12 applied twice in sequence, verified by direct chaining.
    r12 = d12_dwadasamsa(sign, lon)
    from core.vargas.rules import d_long
    return d12_dwadasamsa(r12, d_long(lon, 12))


def d150_nadiamsa(sign, lon):
    l = min(int(lon // 0.2), 149)  # 0-149, clamped against lon == 30 edge case
    return (sign + l) % 12  # uniform -- no movable/fixed/dual branching in the default method


VARGA_FORMULAS = {
    2: d2_hora,
    3: d3_drekkana,
    4: d4_chaturthamsa,
    5: d5_panchamsa,
    6: d6_shashthamsa,
    7: d7_saptamsa,
    8: d8_ashtamsa,
    9: d9_navamsa,
    10: d10_dasamsa,
    11: d11_rudramsa,
    12: d12_dwadasamsa,
    16: d16_shodasamsa,
    20: d20_vimsamsa,
    24: d24_chaturvimsamsa,
    27: d27_nakshatramsa,
    30: d30_trimsamsa,
    40: d40_khavedamsa,
    45: d45_akshavedamsa,
    60: d60_shashtyamsa,
    81: d81_nava_navamsa,
    108: d108_ashtottaramsa,
    144: d144_dwadas_dwadasamsa,
    150: d150_nadiamsa,
}

VARGA_NAMES = {
    2: "Hora", 3: "Drekkana", 4: "Chaturthamsa", 5: "Panchamsa",
    6: "Shashthamsa", 7: "Saptamsa", 8: "Ashtamsa", 9: "Navamsa",
    10: "Dasamsa", 11: "Rudramsa", 12: "Dwadasamsa", 16: "Shodasamsa",
    20: "Vimsamsa", 24: "Chaturvimsamsa", 27: "Nakshatramsa",
    30: "Trimsamsa", 40: "Khavedamsa", 45: "Akshavedamsa",
    60: "Shashtyamsa", 81: "Nava-Navamsa", 108: "Ashtottaramsa",
    144: "Dwadas-Dwadasamsa", 150: "Nadiamsa",
}

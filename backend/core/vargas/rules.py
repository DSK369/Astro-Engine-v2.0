# Sign-set constants and shared helpers for the Varga (divisional chart)
# formulas in formulas.py. All sign indices here are 0-indexed, Aries=0
# ... Pisces=11, matching core/astro.py's RASHIS list order.
#
# Sourced from Plan 4 (project plan folder) §3.2, cross-checked there
# against research/PyJHora's const.py and classical definitions.

MOVABLE = {0, 3, 6, 9}    # Aries, Cancer, Libra, Capricorn
FIXED = {1, 4, 7, 10}     # Taurus, Leo, Scorpio, Aquarius
DUAL = {2, 5, 8, 11}      # Gemini, Virgo, Sagittarius, Pisces

ODD = {0, 2, 4, 6, 8, 10}   # Aries, Gemini, Leo, Libra, Sagittarius, Aquarius
EVEN = {1, 3, 5, 7, 9, 11}  # Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces

FIRE = {0, 4, 8}     # Aries, Leo, Sagittarius
EARTH = {1, 5, 9}    # Taurus, Virgo, Capricorn
AIR = {2, 6, 10}     # Gemini, Libra, Aquarius
WATER = {3, 7, 11}   # Cancer, Scorpio, Pisces


def triplicity(sign):
    if sign in MOVABLE:
        return "movable"
    if sign in FIXED:
        return "fixed"
    return "dual"


def element(sign):
    if sign in FIRE:
        return "fire"
    if sign in EARTH:
        return "earth"
    if sign in AIR:
        return "air"
    return "water"


def d_long(lon, n):
    """Longitude-within-the-new-sign for an N-division Varga: the shared
    rule from Plan 4 §3.2's notation block, `(lon * N) % 30`, that applies
    to every chart unless its own row overrides it. Used both for direct
    display and to feed the second stage of the chained composites
    (D108, D144)."""
    return (lon * n) % 30

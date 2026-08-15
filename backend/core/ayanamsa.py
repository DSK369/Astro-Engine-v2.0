import swisseph as swe

# ==============================
# PREDEFINED CUSTOM
# ==============================
CUSTOM_KP_AYANAMSA = 23 + 44/60 + 18/3600  # 23:44:18 -- your own calibrated value, kept as-is

# KP has two competing standard ayanamsas in circulation, both attributed to
# Krishnamurti but computed from different base epochs/precession models:
#   OLD_KP (aka "old Krishnamurti"): 22 deg 22' 24.63" at 1900-01-01, the
#     value used in most printed KP ready-reckoners from the 1970s-80s.
#   NEW_KP: Swiss Ephemeris's own SIDM_KRISHNAMURTI (Newcomb precession,
#     recomputed ayanamsa) -- what most modern KP software defaults to,
#     including this engine's existing "KP" mode.
# Both are exposed as separate named modes below so the API/UI can offer a
# real toggle instead of silently picking one.
OLD_KP_AYAN_DEG = 22 + 22/60 + 24.63/3600  # 22.373508... deg at JD(1900-01-01)
OLD_KP_T0_JD = 2415020.5  # 1900-01-01 00:00 UT, Julian Day


# ==============================
# STANDARD MODES
# ==============================
AYANAMSA_MAP = {
    "KP": swe.SIDM_KRISHNAMURTI,       # kept for backward compatibility with existing callers
    "NEW_KP": swe.SIDM_KRISHNAMURTI,   # explicit alias -- same as "KP"
    "LAHIRI": swe.SIDM_LAHIRI,
    "RAMAN": swe.SIDM_RAMAN,
    "FAGAN": swe.SIDM_FAGAN_BRADLEY,
}


# ==============================
# HELPERS
# ==============================
def dms_to_decimal(deg, minute, second):
    return deg + (minute / 60) + (second / 3600)


# ==============================
# MAIN SETTER
# ==============================
def set_ayanamsa(mode="KP", manual_value=None):
    mode = mode.upper()

    # --------------------------
    # PREDEFINED CUSTOM KP
    # --------------------------
    if mode == "CUSTOM_KP":
        # BUGFIX: set_sid_mode(mode, t0, ayan_t0) -- the degree value belongs
        # in ayan_t0 (3rd positional arg), not t0 (2nd). Passing it as t0
        # silently made this mode a no-op ayanamsa of 0. t0=0 (default) means
        # "value given at J2000".
        swe.set_sid_mode(swe.SIDM_USER, 0, CUSTOM_KP_AYANAMSA)

        return {
            "name": "Custom KP (23:44:18)",
            "value_func": lambda jd: CUSTOM_KP_AYANAMSA
        }

    # --------------------------
    # OLD KP (1900-epoch Krishnamurti value used in printed ready-reckoners)
    # --------------------------
    if mode == "OLD_KP":
        swe.set_sid_mode(swe.SIDM_USER, OLD_KP_T0_JD, OLD_KP_AYAN_DEG)

        return {
            "name": "Old KP (22°22'24.63\" @ 1900)",
            "value_func": swe.get_ayanamsa
        }

    # --------------------------
    # MANUAL INPUT
    # --------------------------
    if mode == "CUSTOM_MANUAL":
        if manual_value is None:
            raise ValueError("Manual ayanamsa value required")

        # Same fix as CUSTOM_KP above: degree value goes in ayan_t0.
        swe.set_sid_mode(swe.SIDM_USER, 0, manual_value)

        return {
            "name": f"Custom Manual ({manual_value:.6f}°)",
            "value_func": lambda jd: manual_value
        }

    # --------------------------
    # STANDARD SWE MODES
    # --------------------------
    if mode not in AYANAMSA_MAP:
        raise ValueError(f"Unsupported ayanamsa: {mode}")

    swe.set_sid_mode(AYANAMSA_MAP[mode])

    return {
        "name": mode,
        "value_func": swe.get_ayanamsa
    }


# ==============================
# OPTIONAL: LIST MODES
# ==============================
def list_ayanamsa_modes():
    return list(AYANAMSA_MAP.keys()) + ["OLD_KP", "CUSTOM_KP", "CUSTOM_MANUAL"]
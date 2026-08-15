import swisseph as swe

# ==============================
# PREDEFINED CUSTOM
# ==============================
CUSTOM_KP_AYANAMSA = 23 + 44/60 + 18/3600  # 23:44:18


# ==============================
# STANDARD MODES
# ==============================
AYANAMSA_MAP = {
    "KP": swe.SIDM_KRISHNAMURTI,
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
        swe.set_sid_mode(swe.SIDM_USER, CUSTOM_KP_AYANAMSA)

        return {
            "name": "Custom KP (23:44:18)",
            "value_func": lambda jd: CUSTOM_KP_AYANAMSA
        }

    # --------------------------
    # MANUAL INPUT
    # --------------------------
    if mode == "CUSTOM_MANUAL":
        if manual_value is None:
            raise ValueError("Manual ayanamsa value required")

        swe.set_sid_mode(swe.SIDM_USER, manual_value)

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
    return list(AYANAMSA_MAP.keys()) + ["CUSTOM_KP", "CUSTOM_MANUAL"]
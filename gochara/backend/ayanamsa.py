"""Ayanamsa modes — same logic as astro-engine/core/ayanamsa.py.

Returns a per-jd value function rather than relying on swe.get_ayanamsa()
for the custom modes: a bare (SIDM_USER, value) call misreads `value` as
t0 (reference Julian day) instead of the ayanamsa itself, so custom modes
supply a constant lambda and never touch swisseph's internal lookup.
"""

import swisseph as swe

CUSTOM_KP_AYANAMSA = 23 + 44 / 60 + 18 / 3600  # 23:44:18

AYANAMSA_MAP = {
    "KP": swe.SIDM_KRISHNAMURTI,
    "LAHIRI": swe.SIDM_LAHIRI,
    "RAMAN": swe.SIDM_RAMAN,
    "FAGAN": swe.SIDM_FAGAN_BRADLEY,
}


def set_ayanamsa(mode="CUSTOM_KP", manual_value=None):
    mode = mode.upper()

    if mode == "CUSTOM_KP":
        swe.set_sid_mode(swe.SIDM_USER, 0, CUSTOM_KP_AYANAMSA)
        return {
            "name": "Custom KP (23:44:18)",
            "value_func": lambda jd: CUSTOM_KP_AYANAMSA,
        }

    if mode == "CUSTOM_MANUAL":
        if manual_value is None:
            raise ValueError("Manual ayanamsa value required")
        swe.set_sid_mode(swe.SIDM_USER, 0, manual_value)
        return {
            "name": f"Custom Manual ({manual_value:.6f}°)",
            "value_func": lambda jd: manual_value,
        }

    if mode not in AYANAMSA_MAP:
        raise ValueError(f"Unsupported ayanamsa: {mode}")

    swe.set_sid_mode(AYANAMSA_MAP[mode])
    return {"name": mode, "value_func": swe.get_ayanamsa}


def list_ayanamsa_modes():
    return list(AYANAMSA_MAP.keys()) + ["CUSTOM_KP", "CUSTOM_MANUAL"]

"""
Regenerates core/data/kp_horary_249.py from first principles.

Algorithm: the 360 deg zodiac is 27 nakshatras of 13d20' each. Each
nakshatra is divided among the 9 Vimshottari lords in proportion to their
dasha years (out of 120), starting from that nakshatra's own lord and
cycling through the fixed order Ketu-Venus-Sun-Moon-Mars-Rahu-Jupiter-
Saturn-Mercury. That gives 27 x 9 = 243 raw divisions. Any division whose
span crosses a rashi (30 deg) boundary is then split into two rows there,
which is what brings the count from 243 up to the traditional 249.

Two of those 249 boundaries (rows 171/172 and 201/202) were cross-checked
in the original research session against two independent, unrelated
implementations -- VedicAstro's KP_SL_Divisions.csv and PyJHora's
prasna_kp_249_dict -- which agree with each other but differ from this
pure fraction-of-120 calculation by exactly 20 arc-minutes at that one
shared boundary. That is a known historical rounding baked into the
original printed KP ready-reckoner tables, not a bug in either source, so
this generator hard-codes those two corrections (see KNOWN_BOUNDARY_FIXES
below) rather than silently disagreeing with every other KP tool.

Run: python tools/gen_kp_horary_table.py > core/data/kp_horary_249.py
(then hand-add the module docstring header -- this script prints only the
KP_249_TABLE literal)
"""

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
         "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars",
              "Jupiter", "Saturn", "Saturn", "Jupiter"]
NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
              "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
              "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
              "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
              "Uttara Bhadrapada", "Revati"]
SEQ = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18,
         "Jupiter": 16, "Saturn": 19, "Mercury": 17}
NAK_LORDS = SEQ * 3  # index 0..26 -> lord of that nakshatra
NAK_SIZE = 800.0 / 60.0  # 13.3333... deg

# (row_index_1based, corrected_from_deg_or_None, corrected_to_deg_or_None)
KNOWN_BOUNDARY_FIXES = {
    171: (None, 245.88888888888889),
    172: (245.88888888888889, None),
    201: (None, 290.77777777777777),
    202: (290.77777777777777, None),
}


def rotate(lord):
    i = SEQ.index(lord)
    return SEQ[i:] + SEQ[:i]


def generate():
    raw = []
    for nak_idx in range(27):
        nak_start = nak_idx * NAK_SIZE
        seq = rotate(NAK_LORDS[nak_idx])
        cum = 0.0
        for sub in seq:
            span = NAK_SIZE * YEARS[sub] / 120.0
            raw.append((nak_start + cum, nak_start + cum + span, sub, nak_idx))
            cum += span
    assert len(raw) == 243
    assert abs(raw[-1][1] - 360.0) < 1e-6

    rows = []
    for seg_start, seg_end, sub, nak_idx in raw:
        lo = seg_start
        pieces = []
        while True:
            next_boundary = (int(lo // 30) + 1) * 30
            if next_boundary >= seg_end - 1e-9:
                pieces.append((lo, seg_end))
                break
            pieces.append((lo, next_boundary))
            lo = next_boundary
        for a, b in pieces:
            sign_idx = int(((a + b) / 2) // 30) % 12
            rows.append({
                "from_deg": a, "to_deg": b, "sign": SIGNS[sign_idx],
                "sign_lord": SIGN_LORDS[sign_idx], "nakshatra": NAKSHATRAS[nak_idx],
                "nakshatra_lord": NAK_LORDS[nak_idx], "sub_lord": sub,
            })
    assert len(rows) == 249, f"expected 249 rows, got {len(rows)}"

    for idx1, (fix_from, fix_to) in KNOWN_BOUNDARY_FIXES.items():
        r = rows[idx1 - 1]
        if fix_from is not None:
            r["from_deg"] = fix_from
        if fix_to is not None:
            r["to_deg"] = fix_to

    for i in range(len(rows) - 1):
        assert abs(rows[i]["to_deg"] - rows[i + 1]["from_deg"]) < 1e-9, f"gap at row {i+1}"
    assert rows[0]["from_deg"] == 0.0 and rows[-1]["to_deg"] == 360.0

    return rows


if __name__ == "__main__":
    print("KP_249_TABLE = [")
    for i, r in enumerate(generate(), 1):
        print(f'    ({i}, {r["from_deg"]!r}, {r["to_deg"]!r}, "{r["sign"]}", '
              f'"{r["sign_lord"]}", "{r["nakshatra"]}", "{r["nakshatra_lord"]}", "{r["sub_lord"]}"),')
    print("]")

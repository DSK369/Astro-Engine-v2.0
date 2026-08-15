# KP 4-step significators per house. Ported from the frontend's
# lib/vedicTables.js: computeSignificators (that JS port was itself
# written to match this module's intended design before this file
# existed — see Astro-Engine-v2.0's mockChartData.js comments). Kept in
# sync deliberately: same 4-group breakdown, same field names once
# translated snake_case <-> camelCase at the API boundary.
def compute_significators(placements, cusps):
    results = []

    for cusp in cusps:
        house_num = cusp["house"]
        owner = cusp["rashi_lord"]

        occupants = [p["planet"] for p in placements if p.get("placidus_house") == house_num]

        occupant_stars = sorted(set(
            p["planet"] for p in placements
            if p["nakshatra_lord"] in occupants and p["planet"] not in occupants
        ))

        owner_placement = next((p for p in placements if p["planet"] == owner), None)
        owner_star_lord = owner_placement["nakshatra_lord"] if owner_placement else None

        owner_stars = sorted(set(
            p["planet"] for p in placements
            if owner_placement and p["nakshatra_lord"] == owner and p["planet"] != owner
        ))

        results.append({
            "house": house_num,
            "cusp_rashi": cusp["rashi"],
            "owner": owner,
            "owner_star_lord": owner_star_lord,
            "step_a_star_of_occupants": occupant_stars,
            "step_b_occupants": occupants,
            "step_c_star_of_owner": owner_stars,
            "step_d_owner": [owner] if owner else [],
        })

    return results

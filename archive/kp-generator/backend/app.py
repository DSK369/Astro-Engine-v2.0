from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import swisseph as swe
import os

app = Flask(__name__)
CORS(app)

# -----------------------------
# EPHE PATH
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EPHE_PATH = os.path.join(BASE_DIR, 'ephe')
swe.set_ephe_path(EPHE_PATH)

# -----------------------------
# CONSTANTS
# -----------------------------
IST_OFFSET = 5.5
AYAN_OFFSET = -0.1

PLANETS = {
    "Sun": swe.SUN,
    "Cha": swe.MOON,
    "Mar": swe.MARS,
    "Mer": swe.MERCURY,
    "Jup": swe.JUPITER,
    "Ven": swe.VENUS,
    "Sat": swe.SATURN,
    "Rah": swe.MEAN_NODE,
    "Ket": swe.MEAN_NODE
}

RASHI = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
]

NAK = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta",
    "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
]

# -----------------------------
# DEGREE FORMAT (0–30 FIX)
# -----------------------------
def dms_30(deg):
    sign_deg = deg % 30  # 🔥 KEY FIX

    d = int(sign_deg)
    m = int((sign_deg - d) * 60)
    s = int((((sign_deg - d) * 60) - m) * 60)

    return f"{d}°{m}'{s}\""

def get_rashi(deg):
    return RASHI[int(deg // 30)]

def get_nak(deg):
    return NAK[int(deg // (360/27))]

def get_charan(deg):
    return int((deg % (360/27)) // (360/108)) + 1

# -----------------------------
# JD (IST → UTC)
# -----------------------------
def get_jd(dt):
    hour = dt.hour + dt.minute/60 + dt.second/3600
    hour -= IST_OFFSET
    return swe.julday(dt.year, dt.month, dt.day, hour)

# -----------------------------
# AYANAMSA
# -----------------------------
def set_ayan(mode):
    if mode == "KP":
        swe.set_sid_mode(swe.SIDM_KRISHNAMURTI)
        return swe.FLG_SIDEREAL
    elif mode == "LAHIRI":
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        return swe.FLG_SIDEREAL
    else:
        return 0

# -----------------------------
# CALCULATION
# -----------------------------
def calculate(dt, lat, lon, flag):
    jd = get_jd(dt)

    result = {}

    # Lagna
    houses, ascmc = swe.houses(jd, lat, lon)
    asc_tropical = ascmc[0]
    ayan = swe.get_ayanamsa(jd)

    lag = (asc_tropical - ayan) % 360
    lag = (lag + AYAN_OFFSET) % 360

    result["D_Lag"] = dms_30(lag)
    result["R_Lag"] = get_rashi(lag)
    result["N_Lag"] = get_nak(lag)
    result["C_Lag"] = get_charan(lag)

    # Planets
    for key, p in PLANETS.items():
        pos = swe.calc_ut(jd, p, flag)[0][0]

        if key == "Ket":
            pos = (pos + 180) % 360

        pos = (pos + AYAN_OFFSET) % 360

        result[f"D_{key}"] = dms_30(pos)  # 🔥 FIX APPLIED HERE
        result[f"R_{key}"] = get_rashi(pos)
        result[f"N_{key}"] = get_nak(pos)
        result[f"C_{key}"] = get_charan(pos)

    return result

# -----------------------------
# API
# -----------------------------
@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json

        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d")
        end_date   = datetime.strptime(data["end_date"], "%Y-%m-%d")

        st = datetime.strptime(data["start_time"], "%H:%M").time()
        et = datetime.strptime(data["end_time"], "%H:%M").time()

        step = int(data["step"])
        lat = float(data["lat"])
        lon = float(data["lon"])
        ayan = data["ayanamsa"]

        flag = set_ayan(ayan)

        rows = []
        d = start_date

        while d <= end_date:

            start_dt = datetime.combine(d, st)
            end_dt   = datetime.combine(d, et)

            current = start_dt

            while current <= end_dt:

                calc = calculate(current, lat, lon, flag)

                row = {
                    "Name": "User",
                    "Date": current.strftime("%d/%m/%Y"),
                    "Time": current.strftime("%H:%M:%S"),
                    "Location": "Custom",
                    **calc
                }

                rows.append(row)
                current += timedelta(minutes=step)

            d += timedelta(days=1)

        return jsonify(rows)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
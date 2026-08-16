# 🕉️ Panchanga Engine — Full Implementation Specification

Yes. If you are building a **full-stack Panchanga/Panchang engine**, I would treat it as a separate subsystem from the horoscope/Varga engine. A production implementation should go far beyond just the five limbs.

The strongest open-source references I found are **PyJHora/PyHora** and the original **Drik Panchanga** implementation. PyJHora currently implements the five Panchanga elements, end-time calculations, sunrise/sunset, moonrise/moonset, Choghadiya, Gauri Panchanga, Rahu Kalam, Yamaganda, Gulika, Abhijit, Durmuhurta, lunar months, Sankranti, eclipses, special Muhurtas, Vrata searches and many additional calculations. ([GitHub][1])

## 1. What your Panchanga engine should actually contain

Do **not** design it as simply:

```text
Panchanga
├── Tithi
├── Nakshatra
├── Yoga
├── Karana
└── Vara
```

A serious engine should look more like:

```text
PANCHANGA ENGINE
│
├── Astronomical Core
│   ├── Julian Day
│   ├── Sun longitude
│   ├── Moon longitude
│   ├── Planet positions
│   ├── Sunrise
│   ├── Sunset
│   ├── Moonrise
│   ├── Moonset
│   └── Solar/lunar events
│
├── Five Limbs
│   ├── Tithi
│   ├── Vara
│   ├── Nakshatra
│   ├── Yoga
│   └── Karana
│
├── Solar Calendar
│   ├── Sunrise
│   ├── Sunset
│   ├── Madhyahna
│   ├── Day length
│   ├── Night length
│   └── Sankranti
│
├── Lunar Calendar
│   ├── Paksha
│   ├── Lunar month
│   ├── Amavasya
│   ├── Purnima
│   ├── Adhika Masa
│   ├── Kshaya Masa
│   └── Lunar year
│
├── Muhurta
│   ├── Hora
│   ├── Choghadiya
│   ├── Rahu Kalam
│   ├── Yamaganda
│   ├── Gulika
│   ├── Abhijit
│   ├── Durmuhurta
│   ├── Brahma Muhurta
│   ├── Nishita
│   ├── Vijaya
│   └── Godhuli
│
├── Nakshatra Systems
│   ├── Nakshatra
│   ├── Pada
│   ├── Tara Bala
│   ├── Chandrabala
│   ├── Gandanta
│   ├── Ganda Moola
│   └── Panchaka
│
├── Special Yogas
│   ├── Amrita Siddhi
│   ├── Sarvartha Siddhi
│   ├── Ravi Yoga
│   ├── Guru Pushya
│   ├── Ravi Pushya
│   ├── Tripushkara
│   ├── Dwipushkara
│   ├── Aadal
│   └── Vidaal
│
├── Vrata / Festival Engine
│   ├── Ekadashi
│   ├── Purnima
│   ├── Amavasya
│   ├── Sankashti
│   ├── Pradosha
│   ├── Shivaratri
│   ├── Chaturthi
│   ├── Navami
│   └── Regional festivals
│
├── Solar Events
│   ├── Sankranti
│   ├── Solstice
│   ├── Equinox
│   └── Solar ingress
│
├── Eclipse Engine
│   ├── Solar eclipse
│   ├── Lunar eclipse
│   ├── Visibility
│   ├── Start
│   ├── Maximum
│   └── End
│
└── Regional Calendar
    ├── Amanta
    ├── Purnimanta
    ├── Lunar month
    ├── Solar month
    ├── Tamil
    ├── Malayalam
    ├── Bengali
    ├── Kannada
    ├── Telugu
    └── Regional rules
```

That is much closer to what existing mature implementations expose. ([GitHub][1])

---

# 2. Astronomical foundation

This is the most important layer.

Your Panchanga calculations should **not** directly manipulate calendar dates and assume planetary positions.

Use an astronomical ephemeris such as **Swiss Ephemeris**.

A good open-source reference implementation is:

[Swiss Ephemeris GitHub](https://github.com/aloistr/swisseph)

And PyHora explicitly uses the Python interface to Swiss Ephemeris for its Panchanga calculations. ([GitHub][2])

Your pipeline should be:

```text
Date
+
Time
+
Latitude
+
Longitude
+
Timezone
        ↓
Julian Day
        ↓
Swiss Ephemeris
        ↓
Tropical planetary positions
        ↓
Sidereal conversion
        ↓
Sun/Moon longitude
        ↓
Panchanga calculations
```

---

# 3. Location is absolutely critical

Panchanga is **location-sensitive**.

Your request model should therefore contain:

```json
{
  "date": "2026-08-15",
  "latitude": 17.6599,
  "longitude": 75.9064,
  "timezone": "Asia/Kolkata"
}
```

Do not rely only on:

```text
country = India
```

You need:

* Latitude
* Longitude
* Timezone
* DST rules where applicable
* Elevation optionally
* Location name

Existing Panchanga implementations explicitly note that location coordinates affect accuracy and calculate local sunrise/sunset and other timings. ([GitHub][1])

---

# 4. Timezone handling

Never manually assume:

```text
India = UTC + 5:30
```

inside your core engine.

Instead use:

```text
IANA timezone database
```

For example:

```text
Asia/Kolkata
America/New_York
Europe/London
Asia/Tokyo
```

Then convert:

```text
UTC
↓
Local civil time
```

for presentation.

This becomes critical for international Panchanga.

---

# 5. Julian Day

Internally, astronomical calculations should use Julian Day / Julian Ephemeris Day as required by the ephemeris.

Your utility layer should contain:

```text
calendarDateToJD()
jdToCalendarDate()
localTimeToUTC()
utcToLocalTime()
```

Do not scatter date conversions throughout the application.

---

# 6. Ayanamsa

Your Panchanga engine should support configurable sidereal modes.

At minimum:

```text
Lahiri
KP
Raman
Custom
```

PyJHora's Panchanga module currently exposes many ayanamsa options, including Lahiri, KP, Raman, True Chitra and others. ([GitHub][3])

For Panchanga, you should make this explicit:

```json
{
  "zodiac": "sidereal",
  "ayanamsa": "lahiri"
}
```

Do **not** silently mix KP ayanamsa into a Lahiri Panchanga.

---

# 7. The Five Limbs

The core Panchanga consists of:

1. **Tithi**
2. **Vara**
3. **Nakshatra**
4. **Yoga**
5. **Karana**

This five-part definition is consistently used by the open-source implementations and Drik Panchanga. ([GitHub][1])

---

# 8. Tithi

Tithi is based on the angular separation between:

**Moon and Sun**

Calculate:

```text
Moon longitude - Sun longitude
```

Normalize to:

```text
0°–360°
```

A Tithi occupies:

**12°**

because:

```text
360° / 30 = 12°
```

Therefore:

```text
Tithi number =
floor(normalized(Moon - Sun) / 12) + 1
```

---

# 9. The 30 Tithis

### Shukla Paksha

1. Pratipada
2. Dwitiya
3. Tritiya
4. Chaturthi
5. Panchami
6. Shashthi
7. Saptami
8. Ashtami
9. Navami
10. Dashami
11. Ekadashi
12. Dwadashi
13. Trayodashi
14. Chaturdashi
15. Purnima

### Krishna Paksha

16. Pratipada
17. Dwitiya
18. Tritiya
19. Chaturthi
20. Panchami
21. Shashthi
22. Saptami
23. Ashtami
24. Navami
25. Dashami
26. Ekadashi
27. Dwadashi
28. Trayodashi
29. Chaturdashi
30. Amavasya

---

# 10. Tithi start/end time

This is where implementation becomes substantially harder.

You cannot calculate:

```text
tithi duration = fixed number of hours
```

because the Sun and Moon move at variable speeds.

Instead solve for:

```text
Moon longitude - Sun longitude
=
12° × boundary
```

For example, if the current Tithi is 7:

```text
boundary = 7 × 12°
```

Find the next time at which the angular separation reaches that boundary.

PyJHora specifically revised its Tithi calculation to use **planetary speeds** for end-time calculation rather than its older inverse-Lagrange approach. ([GitHub][1])

That is a very useful implementation reference.

---

# 11. Tithi can span sunrise

This is extremely important.

A Panchanga day isn't simply:

```text
00:00 → 23:59
```

Traditional daily Panchanga presentation commonly reports the Tithi prevailing at **local sunrise**, together with its end time. Drik Panchanga explicitly documents this convention. ([Drik Panchang][4])

Therefore your API should distinguish:

```text
tithi_at_sunrise
```

from:

```text
tithi_at(timestamp)
```

These are different queries.

---

# 12. Vara

Vara is the weekday.

You need:

```text
Sunday
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
```

But in a Panchanga engine, Vara should be associated with the **local civil date/day**, not simply a UTC weekday.

Your API could return:

```json
{
  "vara": {
    "index": 1,
    "name": "Sunday",
    "lord": "Sun"
  }
}
```

---

# 13. Nakshatra

The Moon's sidereal longitude determines Nakshatra.

There are:

**27 Nakshatras**

Each occupies:

```text
360° / 27
=
13°20′
```

So:

```text
nakshatraIndex =
floor(moonSiderealLongitude / 13°20′)
```

---

# 14. Nakshatra Pada

Each Nakshatra has:

**4 Padas**

Therefore:

```text
13°20′ / 4
=
3°20′
```

This means the same 3°20′ subdivision that appears in Navamsa calculation is also fundamental to Nakshatra Pada.

Return:

```json
{
  "nakshatra": {
    "index": 1,
    "name": "Ashwini",
    "lord": "Ketu",
    "pada": 1,
    "degree": "..."
  }
}
```

---

# 15. Nakshatra end time

Again, don't use a fixed duration.

Find when Moon crosses:

```text
next 13°20′ boundary
```

PyJHora explicitly calculates Nakshatra end times and has revised Nakshatra timing to use planetary speed calculations. ([GitHub][1])

---

# 16. Yoga

Panchanga Yoga is based on:

**Sun longitude + Moon longitude**

Normalize:

```text
(Sun + Moon) % 360
```

There are:

**27 Yogas**

Each occupies:

```text
360° / 27
=
13°20′
```

So:

```text
yogaIndex =
floor(normalized(Sun + Moon) / 13°20′)
```

Then find the next boundary for the Yoga end time.

---

# 17. The 27 Yogas

Your constants should contain:

```text
Vishkambha
Priti
Ayushman
Saubhagya
Shobhana
Atiganda
Sukarma
Dhriti
Shula
Ganda
Vriddhi
Dhruva
Vyaghata
Harshana
Vajra
Siddhi
Vyatipata
Variyana
Parigha
Shiva
Siddha
Sadhya
Shubha
Shukla
Brahma
Indra
Vaidhriti
```

Store names separately from calculation.

---

# 18. Karana

Karana is half a Tithi.

Since:

```text
Tithi = 12°
```

Karana:

```text
6°
```

There are **11 Karana names**:

### Movable Karana

* Bava
* Balava
* Kaulava
* Taitila
* Garaja
* Vanija
* Vishti/Bhadra

### Fixed Karana

* Shakuni
* Chatushpada
* Naga
* Kimstughna

There are 60 Karana occurrences across the lunar month, but only 11 names because seven repeat.

---

# 19. Karana is tricky

This is another place where a simplistic implementation can fail.

You need to account for:

* First half of Tithi
* Second half of Tithi
* Repeating Karana sequence
* Fixed Karanas near Amavasya/new lunar cycle

PyJHora recently fixed an error in its Karana calculation and specifically notes that an older version was only correctly handling one half of Tithis. ([GitHub][1])

That is a very strong warning that your Karana implementation needs dedicated tests.

---

# 20. Sunrise

Sunrise is fundamental because many Hindu calendar calculations depend on it.

Your astronomical engine should calculate:

```text
sunrise
sunset
```

for the **specific latitude/longitude/date**.

Don't implement sunrise as:

```text
6:00 AM
```

or approximate using latitude alone.

Existing implementations calculate local sunrise/sunset and explicitly treat them as foundational Panchanga data. ([GitHub][1])

---

# 21. Sunset

Same principle.

Return:

```json
{
  "sun": {
    "rise": "06:12:31",
    "set": "18:54:12"
  }
}
```

Internally retain:

```text
UTC timestamp
local timestamp
Julian Day
```

rather than only formatted strings.

---

# 22. Moonrise and Moonset

Also calculate:

* Moonrise
* Moonset

These are location-sensitive.

PyJHora and the original Drik Panchanga both expose Moonrise/Moonset calculations. ([GitHub][1])

---

# 23. Day length

Calculate:

```text
dayLength = sunset - sunrise
```

and:

```text
nightLength = nextSunrise - sunset
```

Return both.

This becomes an input to several Muhurta calculations.

---

# 24. Madhyahna

Calculate local solar midday.

Conceptually:

```text
sunrise → sunset
```

Midday is approximately the midpoint, but astronomical implementations can use the Sun's transit/culmination.

Expose:

```text
Madhyahna start
Madhyahna end
```

if your selected tradition requires a window rather than a single instant.

---

# 25. Hora

Hora divides the day and night into planetary hours.

A complete Hora engine should calculate:

```text
daytime horas
nighttime horas
```

using the local sunrise/sunset.

Don't use:

```text
1 Hora = exactly 60 minutes
```

because in the traditional day/night Hora system the durations vary with daylight/night length.

PyJHora includes Shubha Hora and other Panchanga timing features. ([GitHub][1])

---

# 26. Choghadiya

Your Choghadiya engine should calculate:

### Day Choghadiya

Divide:

```text
sunrise → sunset
```

into eight equal portions.

### Night Choghadiya

Divide:

```text
sunset → next sunrise
```

into eight equal portions.

Then assign the appropriate Choghadiya sequence based on weekday/day/night rules.

PyJHora currently exposes Choghadiya/Gauri Panchanga calculations. ([GitHub][1])

---

# 27. Rahu Kalam

Rahu Kalam is traditionally calculated from the daylight period.

The implementation needs:

```text
sunrise
sunset
weekday
```

Then divide the daytime into eight segments and select the weekday-specific segment.

Don't hard-code:

```text
Monday = 7:30–9:00
```

because that only works approximately for particular daylight conditions.

---

# 28. Yamaganda

Same architecture:

```text
sunrise
sunset
weekday
```

→ eight daytime segments

→ weekday-specific segment.

---

# 29. Gulika / Gulikai

Also calculated from the daylight period and weekday.

Again, make this a configurable rule module rather than hard-coding clock times.

---

# 30. Abhijit Muhurta

Abhijit is traditionally associated with the period around solar midday.

Your implementation should derive it from:

```text
local sunrise
local sunset
local solar midday
```

rather than from a universal clock time.

---

# 31. Durmuhurta

There can be one or more Durmuhurta intervals depending on the day/tradition.

Therefore your data model should support:

```json
{
  "durmuhurta": [
    {
      "start": "...",
      "end": "..."
    }
  ]
}
```

not:

```json
{
  "durmuhurta": "..."
}
```

---

# 32. Brahma Muhurta

This is a pre-sunrise interval traditionally calculated relative to sunrise.

Return:

```text
start
end
duration
```

and calculate it from the next sunrise rather than treating it as an absolute clock time.

---

# 33. Nishita Kala

Nishita is associated with the midnight period.

Calculate it relative to:

```text
sunset
+
next sunrise
```

rather than simply using:

```text
00:00
```

---

# 34. Other Muhurtas

For a comprehensive engine, support:

* Brahma Muhurta
* Abhijit
* Vijaya
* Godhuli
* Nishita
* Pradosha
* Sayahna
* Sandhya
* Aparahna
* Madhyahna

PyJHora's current Panchanga feature list includes multiple such Muhurta calculations. ([GitHub][1])

---

# 35. Trikalam

Implement:

* Rahu Kalam
* Yamaganda
* Gulika

as one module:

```text
trikalam/
    rahu.ts
    yamaganda.ts
    gulika.ts
```

Input:

```text
sunrise
sunset
weekday
```

Output:

```json
{
  "rahuKala": {},
  "yamaganda": {},
  "gulika": {}
}
```

---

# 36. Lunar Month

Now we move beyond the five limbs.

You need to determine:

```text
Amanta
```

and optionally:

```text
Purnimanta
```

calendar systems.

PyJHora explicitly supports both Amanta and Purnimanta lunar-month handling. ([GitHub][1])

---

# 37. Amanta vs Purnimanta

### Amanta

Month runs:

**Amavasya → Amavasya**

### Purnimanta

Month runs:

**Purnima → Purnima**

Your configuration should therefore contain:

```json
{
  "lunarMonthSystem": "amanta"
}
```

or:

```json
{
  "lunarMonthSystem": "purnimanta"
}
```

Don't bury this inside the calculation.

---

# 38. Adhika Masa

Your lunar-calendar engine should detect:

**Adhika Masa / intercalary month**

This requires comparing lunar months with solar ingress.

This is not simply:

```text
every 2–3 years add one month
```

You need astronomical determination of the relevant solar transitions and lunar month boundaries.

---

# 39. Kshaya Masa

Also consider:

**Kshaya Masa**

which is much rarer.

This requires detecting unusual solar ingress relationships within lunar months.

Treat it as a calendar-level event, not a simple month flag.

---

# 40. Sankranti

Sankranti occurs when the Sun enters a new sidereal sign.

Calculate:

```text
Sun longitude crosses:
0°
30°
60°
90°
...
330°
```

Find the exact crossing time.

Return:

```json
{
  "sankranti": {
    "fromSign": "Cancer",
    "toSign": "Leo",
    "timestamp": "..."
  }
}
```

---

# 41. Solar Month

From Sankranti, derive:

```text
Mesha Masa
Vrishabha Masa
Mithuna Masa
...
```

Your calendar engine can then expose:

```text
solar month
solar day
sankranti
```

---

# 42. Ritu

Implement the six traditional seasons:

* Vasanta
* Grishma
* Varsha
* Sharad
* Hemanta
* Shishira

But keep regional/calendar mapping configurable.

---

# 43. Ayana

Support:

* Uttarayana
* Dakshinayana

These should be derived from your selected solar-calendar convention, not hard-coded solely by Gregorian month.

---

# 44. Nakshatra-based features

Once Nakshatra is implemented, you can build:

### Tara Bala

Compare:

```text
birth Nakshatra
vs
current Nakshatra
```

and calculate the Tara category.

### Chandrabala

Evaluate Moon's relationship to the natal Moon sign.

### Ganda Moola

Detect relevant Nakshatra boundaries.

### Gandanta

Detect relevant water/fire sign and Nakshatra junctions according to your chosen tradition.

PyJHora includes Tara-related and other Nakshatra-based calculations. ([GitHub][1])

---

# 45. Panchaka

Implement detection of:

**Panchaka**

based on the relevant lunar/Nakshatra rules.

Return:

```json
{
  "panchaka": {
    "active": true,
    "type": "..."
  }
}
```

rather than only:

```text
true
```

because the user needs to know the category.

PyJHora includes next-Panchaka calculations. ([GitHub][1])

---

# 46. Special Yogas

Your engine should have a separate:

```text
special-yoga-engine
```

because these are **not the same thing as the 27 Panchanga Yogas**.

Examples supported by current Panchanga software include:

* Amrita Siddhi Yoga
* Sarvartha Siddhi Yoga
* Ravi Yoga
* Ravi Pushya Yoga
* Guru Pushya Yoga
* Dwipushkar Yoga
* Tripushkar Yoga
* Aadal Yoga
* Vidaal Yoga
* Panchaka
* Ganda Moola
* Vinchhudo
* Bhadra

Drik Panchanga lists many of these as additional daily Panchanga combinations. ([Drik Panchang][5])

---

# 47. Don't confuse Yoga types

You need separate namespaces:

```text
Panchanga Yoga
```

vs

```text
Special Yoga
```

vs

```text
Natal Raja/Dhana Yoga
```

vs

```text
Muhurta Yoga
```

For example:

**Vishkambha** is a Panchanga Yoga.

**Ravi Pushya Yoga** is a special calendrical combination.

**Raja Yoga** belongs to horoscope interpretation.

These should never be stored in one generic `Yoga` table without type information.

---

# 48. Vrata/Festival Engine

Now build a separate event engine.

Examples:

* Ekadashi
* Purnima
* Amavasya
* Pradosha
* Sankashti Chaturthi
* Vinayaka Chaturthi
* Maha Shivaratri
* Navaratri
* Janmashtami
* Rama Navami
* Dussehra
* Diwali
* Holi
* Akshaya Tritiya
* Guru Purnima
* Karva Chauth
* etc.

The key architecture:

```text
Astronomy
   ↓
Panchanga
   ↓
Festival rules
```

Do **not** calculate festivals independently from Panchanga.

---

# 49. Ekadashi

Ekadashi is a particularly important test case.

It requires:

* Lunar Tithi
* Sunrise
* Paksha
* Local date
* Tithi at sunrise
* Parana rules

Therefore the implementation should produce:

```json
{
  "ekadashi": {
    "name": "...",
    "date": "...",
    "tithi": "...",
    "parana": {
      "start": "...",
      "end": "..."
    }
  }
}
```

Different regional/traditional rules can produce differences, so your engine needs a **rule profile**.

---

# 50. Pradosha

Pradosha depends on:

* Trayodashi
* Sunset
* Local location
* Paksha

Therefore it belongs in the event-rule layer.

---

# 51. Sankashti Chaturthi

Requires:

* Krishna Paksha Chaturthi
* Local location
* Moonrise

So your festival engine must have access to astronomical rise/set data.

This illustrates why your Panchanga architecture needs to be interconnected.

---

# 52. Moonrise-dependent festivals

Some events require:

```text
moonrise
```

rather than merely Tithi.

Examples include certain Chaturthi observances.

Therefore your event engine should be able to query:

```text
getMoonrise(location, date)
```

---

# 53. Eclipse Engine

Your astronomy layer should support:

### Solar eclipse

* Start
* Maximum
* End
* Local visibility
* Magnitude
* Type

### Lunar eclipse

* Penumbral start
* Partial start
* Total start
* Maximum
* Total end
* Partial end
* Penumbral end

And determine whether the event is visible from the requested location.

---

# 54. Sankranti/Eclipse/Festival Search

Your engine should expose:

```text
nextSankranti()
previousSankranti()

nextSolarEclipse()
nextLunarEclipse()

nextEkadashi()
nextPurnima()
nextAmavasya()
nextPradosha()
```

PyJHora currently provides previous/next Sankranti, solar/lunar eclipse and several Vrata search functions. ([GitHub][1])

---

# 55. Panchanga Daily API

I'd design:

```http
GET /api/panchanga/day
```

Parameters:

```text
date
latitude
longitude
timezone
ayanamsa
lunarMonthSystem
language
region
```

Response:

```json
{
  "date": "...",
  "location": {},
  "sun": {},
  "moon": {},
  "fiveLimbs": {},
  "lunarCalendar": {},
  "muhurta": {},
  "nakshatra": {},
  "specialYogas": {},
  "festivals": {},
  "sankranti": {},
  "eclipses": {}
}
```

---

# 56. Five-Limb Response

Example architecture:

```json
{
  "tithi": {
    "number": 11,
    "name": "Ekadashi",
    "paksha": "Shukla",
    "start": "...",
    "end": "..."
  },

  "vara": {
    "number": 4,
    "name": "Wednesday",
    "lord": "Mercury"
  },

  "nakshatra": {
    "number": 18,
    "name": "Jyeshtha",
    "lord": "Mercury",
    "pada": 2,
    "start": "...",
    "end": "..."
  },

  "yoga": {
    "number": 12,
    "name": "Dhruva",
    "start": "...",
    "end": "..."
  },

  "karana": {
    "number": 22,
    "name": "Taitila",
    "start": "...",
    "end": "..."
  }
}
```

---

# 57. Every Panchanga element should have the same timing interface

This is a very useful design decision.

Instead of:

```json
"tithiEnd": "..."
```

use:

```json
{
  "name": "Ekadashi",
  "start": "...",
  "end": "...",
  "durationSeconds": 43200,
  "remainingSeconds": 1234
}
```

Then the frontend can render:

```text
Ekadashi
Ends 14:32
```

or:

```text
Ekadashi
12h 31m remaining
```

without changing the backend.

---

# 58. Current Panchanga vs Daily Panchanga

Your API should support two modes:

### Point-in-time

```text
Panchanga at 15:30
```

### Sunrise-day

```text
Panchanga for 15 Aug 2026
```

This distinction is important because the traditional daily Panchanga presentation generally identifies the elements prevailing at sunrise and their subsequent ending times. ([Drik Panchang][4])

---

# 59. Monthly Panchanga API

You also need:

```http
GET /api/panchanga/month
```

Response:

```json
{
  "month": "2026-08",
  "location": {},
  "days": [
    {},
    {},
    {}
  ]
}
```

Each day contains:

* Sunrise
* Sunset
* Tithi
* Nakshatra
* Yoga
* Karana
* Vara
* Festivals
* Rahu Kalam
* Choghadiya
* Special Yogas

---

# 60. Panchanga Calendar UI

Your frontend can display:

```text
┌─────────────────────────────────────┐
│ August 2026                         │
│ Solapur, Maharashtra                │
├─────────────────────────────────────┤
│ Sun  Mon  Tue  Wed  Thu  Fri  Sat │
│                         1            │
│ 2    3    4    5    6    7    8    │
│ 9   10   11   12   13   14   15   │
│ ...                                 │
└─────────────────────────────────────┘
```

Each day can show:

```text
15
Ekadashi
Dhanishta
Dhruva
Bava
```

Then clicking the date opens the complete Panchanga.

---

# 61. Location selector

Your frontend should allow:

```text
Search city
GPS location
Manual coordinates
Saved locations
```

Backend stores:

```text
location_id
name
latitude
longitude
timezone
country
state
```

---

# 62. Regional Profiles

This is essential if you're targeting India.

Create:

```text
CalendarProfile
```

Examples:

```text
North India
South India
Maharashtra
Gujarat
Bengal
Tamil Nadu
Kerala
Andhra Pradesh
Telangana
Karnataka
Nepal
```

The astronomical foundation remains common, while calendar/festival rules can vary.

---

# 63. Language layer

Do not store translated names directly in your calculations.

Store:

```text
tithi_id = 11
```

Then:

```text
i18n:
  en → Ekadashi
  hi → एकादशी
  mr → एकादशी
  ta → ஏகாதசி
```

This is how you avoid rewriting the engine for every language.

PyJHora itself supports multiple languages and uses separate language resources. ([GitHub][1])

---

# 64. Database design

I'd use tables roughly like:

```text
locations
calendar_profiles
tithis
nakshatras
yogas
karanas
varas
lunar_months
solar_months
festivals
special_yogas
muhurta_rules
festival_rules
ayanamsas
```

But don't store astronomical results permanently unless necessary.

---

# 65. Cache computed Panchanga

Panchanga is deterministic for:

```text
date
location
configuration
```

So cache:

```text
hash(
  date,
  latitude,
  longitude,
  timezone,
  ayanamsa,
  calendarProfile
)
```

This can dramatically reduce repeated calculations.

---

# 66. Don't cache only by date

This would be wrong:

```text
2026-08-15 → Panchanga
```

because:

```text
Solapur
Mumbai
Delhi
London
New York
```

can have different:

* Sunrise
* Sunset
* Moonrise
* Festival observance
* Muhurta
* Tithi-at-sunrise interpretation

So cache by **date + location + ruleset**.

---

# 67. Test cases you absolutely need

Create tests for:

### Tithi

* Normal Tithi
* Tithi ending before sunrise
* Tithi ending after midnight
* Long Tithi
* Short Tithi
* Kshaya/Skipped Tithi scenarios

### Nakshatra

* Normal transition
* Boundary exactly at sunrise
* Boundary near midnight

### Karana

* First half
* Second half
* Fixed Karanas
* Amavasya boundary

### Sunrise

* Equatorial location
* High latitude
* DST location
* India
* International Date Line scenarios

---

# 68. Boundary testing

For every angular boundary, test:

```text
boundary - 1 arcsecond
boundary
boundary + 1 arcsecond
```

For example:

```text
Tithi boundary = 12°
```

Test:

```text
11°59'59"
12°00'00"
12°00'01"
```

This is extremely important.

---

# 69. Independent verification

Use at least two implementations.

Recommended:

### Reference 1

[PyJHora](https://github.com/naturalstupid/PyJHora)

### Reference 2

[Drik Panchanga open-source implementation](https://github.com/webresh/drik-panchanga)

The latter is explicitly an observational Hindu lunisolar calendar using Swiss Ephemeris. ([GitHub][6])

### Reference 3

[PyHora](https://github.com/jeganad/PyHora)

It provides both Panchanga and broader horoscope functionality and includes unit/integration tests. ([GitHub][2])

---

# 70. Use test fixtures

Create:

```text
tests/
├── panchanga/
│   ├── tithi.test
│   ├── nakshatra.test
│   ├── yoga.test
│   ├── karana.test
│   ├── sunrise.test
│   ├── muhurta.test
│   ├── lunar-month.test
│   └── festivals.test
│
└── fixtures/
    ├── india/
    ├── usa/
    ├── uk/
    └── australia/
```

Then compare your engine against known results.

---

# 71. A good backend architecture

For a TypeScript/NestJS/Node backend, I'd use:

```text
src/
├── astronomy/
│   ├── ephemeris/
│   ├── julian/
│   ├── coordinates/
│   └── rise-set/
│
├── calendar/
│   ├── timezone/
│   ├── solar/
│   ├── lunar/
│   └── regional/
│
├── panchanga/
│   ├── tithi/
│   ├── nakshatra/
│   ├── yoga/
│   ├── karana/
│   ├── vara/
│   └── panchanga.service.ts
│
├── muhurta/
│   ├── hora/
│   ├── choghadiya/
│   ├── rahu-kalam/
│   ├── yamaganda/
│   ├── gulika/
│   ├── abhijit/
│   └── durmuhurta/
│
├── festivals/
│   ├── ekadashi/
│   ├── pradosha/
│   ├── chaturthi/
│   ├── amavasya/
│   └── festival-engine/
│
└── api/
    └── panchanga.controller.ts
```

---

# 72. Python microservice is another good option

If you're using:

```text
React/Next.js
+
Node/NestJS
```

you could keep the astronomical/Panchanga engine in Python because the existing ecosystem is stronger there:

```text
Next.js
    ↓
NestJS API
    ↓
Python Astrology Service
    ↓
Swiss Ephemeris
```

Or simply use Python for the whole backend.

PyJHora/PyHora give you a substantial reference implementation in Python. ([GitHub][1])

---

# 73. A cleaner production architecture

I'd actually recommend:

```text
                    FRONTEND
                       │
                       ▼
                API / BFF Layer
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Horoscope       Panchanga       Calendar
     Engine          Engine          Engine
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                Astronomy Core
                       │
                       ▼
                Swiss Ephemeris
```

Then:

```text
Horoscope
 ├── D1
 ├── Vargas
 ├── Dashas
 └── KP

Panchanga
 ├── Tithi
 ├── Nakshatra
 ├── Yoga
 ├── Karana
 ├── Vara
 └── Muhurta

Calendar
 ├── Lunar month
 ├── Festivals
 ├── Sankranti
 └── Regional rules
```

---

# 74. Very important: Separate astronomy from astrology

This will save you enormous trouble later.

### Astronomy layer

Answers:

> Where are the Sun and Moon?

### Panchanga layer

Answers:

> Given those positions, what are Tithi/Nakshatra/Yoga/Karana?

### Calendar layer

Answers:

> What lunar/solar date and festival does that imply?

### Astrology layer

Answers:

> What does this mean in a horoscope?

Don't mix these.

---

# 75. The calculation pipeline

Your final pipeline should look like:

```text
INPUT
│
├── Date
├── Time
├── Latitude
├── Longitude
├── Timezone
├── Ayanamsa
└── Calendar profile
       │
       ▼
ASTRONOMICAL ENGINE
│
├── JD
├── Sun longitude
├── Moon longitude
├── Sunrise
├── Sunset
├── Moonrise
└── Moonset
       │
       ▼
PANCHANGA ENGINE
│
├── Tithi
├── Vara
├── Nakshatra
├── Yoga
└── Karana
       │
       ▼
CALENDAR ENGINE
│
├── Paksha
├── Lunar month
├── Solar month
├── Sankranti
├── Adhika Masa
└── Ritu/Ayana
       │
       ▼
MUHURTA ENGINE
│
├── Hora
├── Choghadiya
├── Rahu Kalam
├── Yamaganda
├── Gulika
├── Abhijit
├── Durmuhurta
└── Brahma/Nishita/etc.
       │
       ▼
EVENT ENGINE
│
├── Ekadashi
├── Pradosha
├── Chaturthi
├── Purnima
├── Amavasya
├── Sankranti
├── Eclipses
└── Regional festivals
```

---

# 76. Feature roadmap

I'd implement this in **five phases**.

### Phase 1 — Core Panchanga

* [ ] Swiss Ephemeris
* [ ] Julian Day
* [ ] Timezone
* [ ] Coordinates
* [ ] Ayanamsa
* [ ] Sun longitude
* [ ] Moon longitude
* [ ] Sunrise
* [ ] Sunset
* [ ] Tithi
* [ ] Vara
* [ ] Nakshatra
* [ ] Pada
* [ ] Yoga
* [ ] Karana

### Phase 2 — Daily Muhurta

* [ ] Moonrise
* [ ] Moonset
* [ ] Day/night length
* [ ] Hora
* [ ] Choghadiya
* [ ] Rahu Kalam
* [ ] Yamaganda
* [ ] Gulika
* [ ] Abhijit
* [ ] Durmuhurta
* [ ] Brahma Muhurta
* [ ] Nishita
* [ ] Vijaya
* [ ] Godhuli

### Phase 3 — Calendar

* [ ] Paksha
* [ ] Amanta
* [ ] Purnimanta
* [ ] Lunar month
* [ ] Adhika Masa
* [ ] Kshaya Masa
* [ ] Solar month
* [ ] Sankranti
* [ ] Ritu
* [ ] Ayana

### Phase 4 — Advanced Panchanga

* [ ] Tara Bala
* [ ] Chandrabala
* [ ] Panchaka
* [ ] Ganda Moola
* [ ] Gandanta
* [ ] Special Yogas
* [ ] Pushya combinations
* [ ] Tripushkara
* [ ] Dwipushkara
* [ ] Ravi Yoga
* [ ] Sarvartha Siddhi
* [ ] Amrita Siddhi

### Phase 5 — Festival/Event Engine

* [ ] Ekadashi
* [ ] Ekadashi Parana
* [ ] Pradosha
* [ ] Sankashti
* [ ] Vinayaka Chaturthi
* [ ] Shivaratri
* [ ] Purnima
* [ ] Amavasya
* [ ] Sankranti festivals
* [ ] Solar eclipses
* [ ] Lunar eclipses
* [ ] Regional festivals
* [ ] Festival search

---

# 77. The references I'd actually use

For your project, I would keep these open while implementing:

**Primary Panchanga implementation**

[PyJHora — GitHub](https://github.com/naturalstupid/PyJHora)

Its current README is particularly valuable because it documents fixes to Tithi/Nakshatra/Yoga/Karana timing and a large number of additional Panchanga features. ([GitHub][1])

**Panchanga-specific module documentation**

[PyJHora Panchanga README](https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/panchanga/README.md)

This lists the available Panchanga functions, ayanamsa modes, rise/set calculations, lunar-calendar calculations, Upagrahas, special Lagnas, Muhurtas and other features. ([GitHub][3])

**Independent implementation**

[Drik Panchanga GitHub](https://github.com/webresh/drik-panchanga)

Useful for comparing the core five limbs, rise/set and calendar behavior. ([GitHub][6])

**Broader Vedic astrology implementation**

[PyHora GitHub](https://github.com/jeganad/PyHora)

Useful because it combines Panchanga, charts, Dashas, tests and other astrology modules. ([GitHub][2])

**PHP alternative**

[Kunjara Jyotish GitHub](https://github.com/kunjara/jyotish)

This is useful if your backend is PHP; it includes Panchanga, Muhurta, Hora, Dasha and other Vedic calculations and uses Swiss Ephemeris. ([GitHub][7])

---

## 🔥 The most important implementation principle

For your full astrology application, I would **not implement Panchanga as a collection of isolated formulas**.

Build it as:

```text
                 SWISS EPHEMERIS
                        │
                        ▼
              ┌──────────────────┐
              │ Astronomy Core   │
              └────────┬─────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        Sun           Moon       Rise/Set
          │            │            │
          └────────────┼────────────┘
                       ▼
              ┌──────────────────┐
              │ PANCHANGA CORE   │
              ├──────────────────┤
              │ Tithi            │
              │ Vara             │
              │ Nakshatra        │
              │ Yoga             │
              │ Karana           │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ CALENDAR ENGINE  │
              ├──────────────────┤
              │ Lunar Month      │
              │ Solar Month      │
              │ Sankranti        │
              │ Adhika Masa       │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ MUHURTA ENGINE    │
              ├──────────────────┤
              │ Hora             │
              │ Choghadiya       │
              │ Rahu Kalam       │
              │ etc.             │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ EVENT ENGINE      │
              ├──────────────────┤
              │ Ekadashi         │
              │ Festivals        │
              │ Vrata            │
              │ Eclipses         │
              └──────────────────┘
```

That architecture will let you later connect **Panchanga + D1 + Vargas + Dashas + KP + Muhurta + Festival Calendar** without rewriting the astronomical core.

And one particularly valuable lesson from the existing projects: **make your Panchanga calculations independently testable**. PyJHora's history itself shows that seemingly simple things such as Karana and Tithi end-times can contain subtle implementation errors, so automated comparison against independent implementations should be part of the project from day one. ([GitHub][1])

---

## References

[1]: https://github.com/naturalstupid/PyJHora/blob/main/README.md "PyJHora/README.md at main · naturalstupid/PyJHora · GitHub"
[2]: https://github.com/jeganad/PyHora "GitHub - jeganad/PyHora: Python package containing almost all the features described in the book Vedic Astrology - An Integrated Approach - by PVR Narasimha Rao"
[3]: https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/panchanga/README.md "PyJHora/src/jhora/panchanga/README.md at main · naturalstupid/PyJHora · GitHub"
[4]: https://www.drikpanchang.com/faq/faq-ans1.html "Reading Panchang Timings in Drik Panchang"
[5]: https://www.drikpanchang.com/panchang/day-panchang.html "Day Panchang — Drik Panchang"
[6]: https://github.com/webresh/drik-panchanga "GitHub - webresh/drik-panchanga: Observational Indian lunisolar calendar using the Swiss ephemeris (Hindu Drik Panchanga)"
[7]: https://github.com/kunjara/jyotish "GitHub - kunjara/jyotish: PHP library for calculations in Vedic astrology"

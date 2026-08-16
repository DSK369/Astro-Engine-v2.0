# Plan 3 — Applying Dashas In Detail, All Types, Depth 5

> ⚠️ **This document is incomplete.** The source content was truncated by a message size limit
> partway through section 6 (Sookshma Dasha). Everything below section 6's cutoff point is
> missing — including Prana Dasha, the other Dasha systems (Ashtottari, Yogini, Chara,
> Kalachakra etc.), event-specific application, timing methodology, and common mistakes.
> See the "Missing sections" note at the end before using this as a build spec.

---

Below is a **Depth-5 guide to applying Dashas in astrology**, especially from a **KP/Vedic predictive perspective**. I'll cover the major Dasha systems, what each level means, how to judge a Dasha, event-specific application, timing, and common mistakes.

> **Important:** Dashas are an astrological timing framework, not a scientifically validated method for predicting future events.

# 🌟 Applying Dashas in Astrology — Detailed Guide

## 1. What is a Dasha?

* **Dasha** means a planetary period or period of influence.
* The basic idea is that different planets become the primary **period lords** at different times of life.
* A horoscope can therefore be divided into:

  * **Mahadasha (MD)** → major period
  * **Antardasha / Bhukti (AD)** → sub-period
  * **Pratyantardasha (PD)** → sub-sub-period
  * **Sookshma Dasha**
  * **Prana Dasha**
* The deeper you go, the narrower the timing becomes.

### Basic hierarchy

**Mahadasha → Antardasha → Pratyantardasha → Sookshma → Prana**

For example:

> Jupiter MD → Saturn AD → Mercury PD → Venus Sookshma → Moon Prana

The interpretation becomes progressively more specific.

---

# 2. Why Dashas Are Used

* A natal chart describes the **potential or promise**.
* Dashas are used to determine **when that potential is likely to become active**.
* Therefore, a common predictive sequence is:

**Natal Promise → Dasha → Sub-period → Transit → Event**

* A Dasha should ideally **activate something already indicated in the horoscope**.
* It should not be treated as an independent mechanism that overrides the entire natal chart.

---

# 3. Mahadasha — Major Period

* Mahadasha is the **largest planetary period** in systems such as Vimshottari.
* It establishes the broad theme of a period of life.
* Example:

  * Jupiter Mahadasha may activate matters connected with Jupiter's house/signification.
  * Saturn Mahadasha may activate Saturn's significations.
* But you should **not** simply say:

  * "Jupiter = good"
  * "Saturn = bad."
* Instead ask:

  * Where is the planet?
  * What houses does it own?
  * What house does it occupy?
  * Which Nakshatra does it occupy?
  * Who is its Star Lord?
  * What houses does it signify?
  * What is its Sub-Lord?
  * What is its condition?
  * What does the relevant Dasha system say?

---

# 4. Antardasha / Bhukti

* Antardasha is the sub-period operating inside a Mahadasha.
* It gives greater specificity.
* Think of it as:

**Mahadasha = broad environment**

**Antardasha = active storyline**

* For example:

**Venus MD → Saturn AD**

could activate matters signified by both Venus and Saturn.

* The interaction between the two planets becomes important.
* If both signify the same event-related houses, that period becomes more interesting for that event.

---

# 5. Pratyantardasha

* Pratyantardasha is the third level.
* It operates within an Antardasha.
* It is commonly used for **more precise event timing**.
* Example:

**Venus MD → Saturn AD → Mercury PD**

Now Venus, Saturn and Mercury must be examined together.

* If all three connect with the houses relevant to the event, the period becomes stronger.
* If the PD introduces a planet connected with contradictory houses, the result may become mixed.

---

# 6. Sookshma Dasha

* Sookshma is the fourth level.
* It is used when you want a much narrower period.
* It can help distinguish:

  * which part of an Antardasha is more active,
  * approximately when an event may occur,
  * competi

---

## ⚠️ Missing sections

The source text ends abruptly at the word `competi` in section 6 above — the message
exceeded a 50,000 character limit. The following were referenced in the document's own
introduction but never arrived:

- [ ] Completion of **6. Sookshma Dasha**
- [ ] **7. Prana Dasha** (the fifth level — completing "Depth 5")
- [ ] **The major Dasha systems** beyond Vimshottari (the intro promises "all types"):
      Ashtottari, Yogini, Chara, Kalachakra, Shodashottari, Dwadashottari,
      Panchottari, Shatabdika, Chaturashiti Sama, Dwisaptati Sama, Shashtihayani etc.
- [ ] **How to judge a Dasha** (the promised methodology section)
- [ ] **Event-specific application**
- [ ] **Timing** methodology
- [ ] **Common mistakes**

To complete this plan, re-send the remainder of the Dasha content — ideally split across
two or three messages so it isn't truncated again.

---

## Implementation note (from the existing codebase)

Worth knowing before this plan is built out: the backend **already computes all five Dasha
levels**. `astro-engine/core/dasha.py` exposes:

```text
calculate_mahadasha_balance()    # balance at birth from Moon's nakshatra position
generate_mahadasha_timeline()    # MD  — level 1
generate_antardasha()            # AD  — level 2
generate_pratyantar()            # PD  — level 3
generate_sukshma()               # SD  — level 4
generate_prana()                 # PN  — level 5
find_current_dasha()             # locates the active period for a given datetime
convert_years_to_ymd()
```

So "Depth 5" for **Vimshottari** is implemented. The gap is that it is **not exposed by the
API** — `services/app.py` does not import `core/dasha.py`, so the Dasha timeline is only
printed by the console script `main.py` and never reaches the web UI.

That makes the cheapest next step clear: surface the existing five-level Vimshottari Dasha
through the `/chart` endpoint (or a dedicated `/dasha` endpoint) before implementing any
of the additional Dasha systems this plan will describe.

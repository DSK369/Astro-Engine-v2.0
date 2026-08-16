import { useState } from "react";
import BirthDataForm from "./components/BirthDataForm";
import BirthDetailsHeader from "./components/BirthDetailsHeader";
import HoraryForm from "./components/HoraryForm";
import HoraryResultHeader from "./components/HoraryResultHeader";
import RulingPlanetsStrip from "./components/RulingPlanetsStrip";
import ResultsSummary from "./components/ResultsSummary";
import PanchangDetails from "./components/PanchangDetails";
import DashaPanel from "./components/DashaPanel";
import SunMoonPanel from "./components/SunMoonPanel";
import MuhurtaPanel from "./components/MuhurtaPanel";
import CalendarPanel from "./components/CalendarPanel";
import PlanetaryTable from "./components/PlanetaryTable";
import CuspTable from "./components/CuspTable";
import SignificatorTable from "./components/SignificatorTable";
import NorthIndianChart from "./components/charts/NorthIndianChart";
import SouthIndianChart from "./components/charts/SouthIndianChart";
import { fetchChart, fetchHorary } from "./lib/api";
import { useLanguage } from "./lib/language";
import "./App.css";

// Gochara (transit timeline) runs as its own FastAPI+static-frontend
// process (gochara/backend/main.py, port 8100 by default) rather than
// being folded into this app's own build -- Plan 6 Option A. Separately
// configurable since it's deployed independently of the main API.
const GOCHARA_URL = import.meta.env.VITE_GOCHARA_URL || "http://127.0.0.1:8100";

function App() {
  const { t, lang, toggleLang } = useLanguage();
  const [mode, setMode] = useState("natal"); // "natal" | "horary"

  const [chartData, setChartData] = useState(null);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [chartStyle, setChartStyle] = useState("north");
  const [vargaView, setVargaView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [horaryData, setHoraryData] = useState(null);
  const [horaryChartStyle, setHoraryChartStyle] = useState("north");
  const [horaryLoading, setHoraryLoading] = useState(false);
  const [horaryError, setHoraryError] = useState(null);

  async function handleSubmit(formData) {
    setLoading(true);
    setFetchError(null);
    setChartStyle(formData.chartStyle);
    try {
      const result = await fetchChart(formData);
      setChartData(result);
      setSubmittedForm(formData);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleHorarySubmit(formData) {
    setHoraryLoading(true);
    setHoraryError(null);
    try {
      const result = await fetchHorary(formData);
      setHoraryData(result);
    } catch (err) {
      setHoraryError(err.message);
    } finally {
      setHoraryLoading(false);
    }
  }

  const ChartComponent = chartStyle === "south" ? SouthIndianChart : NorthIndianChart;
  const HoraryChartComponent = horaryChartStyle === "south" ? SouthIndianChart : NorthIndianChart;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>{t("appTitle")}</h1>
          <p className="app-header__subtitle">{t("appSubtitle")}</p>
        </div>
        <div className="app-header__actions">
          <a
            className="app-header__transit-link"
            href={GOCHARA_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("transitTimelineLink")}
          </a>
          <button type="button" className="app-header__lang-toggle" onClick={toggleLang} lang={lang === "en" ? "hi" : "en"}>
            {t("langToggle")}
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="mode-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "natal"}
            className={mode === "natal" ? "is-active" : ""}
            onClick={() => setMode("natal")}
          >
            {t("modeNatal")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "horary"}
            className={mode === "horary" ? "is-active" : ""}
            onClick={() => setMode("horary")}
          >
            {t("modeHorary")}
          </button>
        </div>

        {mode === "natal" && <BirthDataForm onSubmit={handleSubmit} submitting={loading} />}
        {mode === "horary" && <HoraryForm onSubmit={handleHorarySubmit} submitting={horaryLoading} />}

        {mode === "natal" && fetchError && <p className="app-error" role="alert">{fetchError}</p>}
        {mode === "horary" && horaryError && <p className="app-error" role="alert">{horaryError}</p>}

        {mode === "horary" && horaryData && (
          <div className="app-results">
            <section className="app-card">
              <h2>{t("sectionHoraryDetails")}</h2>
              <HoraryResultHeader horary={horaryData} />
            </section>

            <section className="app-card">
              <h2>{t("sectionSummary")}</h2>
              <ResultsSummary summary={horaryData.summary} />
            </section>

            <section className="app-card">
              <h2>{t("sectionRulingPlanets")}</h2>
              <RulingPlanetsStrip rulingPlanets={horaryData.rulingPlanets} />
            </section>

            <section className="app-card">
              <div className="app-card__header">
                <h2>{horaryChartStyle === "south" ? t("southIndianChart") : t("northIndianChart")}</h2>
                <div className="chart-toggle">
                  <button
                    type="button"
                    className={horaryChartStyle === "north" ? "is-active" : ""}
                    onClick={() => setHoraryChartStyle("north")}
                  >
                    {t("chartNorth")}
                  </button>
                  <button
                    type="button"
                    className={horaryChartStyle === "south" ? "is-active" : ""}
                    onClick={() => setHoraryChartStyle("south")}
                  >
                    {t("chartSouth")}
                  </button>
                </div>
              </div>
              <HoraryChartComponent placements={horaryData.allPlacements} />
            </section>

            <section className="app-card">
              <h2>{t("sectionPanchang")}</h2>
              <PanchangDetails panchang={horaryData.panchang} />
            </section>

            <section className="app-card">
              <h2>{t("sectionPlanetaryPositions")}</h2>
              <PlanetaryTable placements={horaryData.allPlacements} />
            </section>

            <section className="app-card">
              <h2>{t("sectionCusps")}</h2>
              <CuspTable cusps={horaryData.cusps} />
            </section>

            <section className="app-card">
              <h2>{t("sectionSignificators")}</h2>
              <SignificatorTable significators={horaryData.significators} />
            </section>
          </div>
        )}

        {mode === "natal" && chartData && (
          <div className="app-results">
            {chartData.warnings?.length > 0 && (
              <ul className="app-warnings" role="note">
                {chartData.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}

            {chartData._mock && (
              <p className="app-results__notice">
                Showing sample data — no backend API is wired up yet (see
                docs/API_SPECIFICATION.md). This UI is a starting point to
                iterate on.
              </p>
            )}

            <section className="app-card">
              <h2>{t("sectionBirthDetails")}</h2>
              <BirthDetailsHeader formData={submittedForm} />
            </section>

            <section className="app-card">
              <h2>{t("sectionSummary")}</h2>
              <ResultsSummary summary={chartData.summary} />
            </section>

            <section className="app-card">
              <h2>{t("sectionRulingPlanets")}</h2>
              <RulingPlanetsStrip rulingPlanets={chartData.rulingPlanets} />
            </section>

            <section className="app-card">
              <div className="app-card__header">
                <h2>{chartStyle === "south" ? t("southIndianChart") : t("northIndianChart")}</h2>
                <div className="chart-toggle">
                  <button
                    type="button"
                    className={chartStyle === "north" ? "is-active" : ""}
                    onClick={() => setChartStyle("north")}
                  >
                    {t("chartNorth")}
                  </button>
                  <button
                    type="button"
                    className={chartStyle === "south" ? "is-active" : ""}
                    onClick={() => setChartStyle("south")}
                  >
                    {t("chartSouth")}
                  </button>
                </div>
              </div>
              <ChartComponent placements={chartData.allPlacements} />
            </section>

            {chartData.vargas?.requested?.length > 0 && (() => {
              const requested = chartData.vargas.requested;
              const active = requested.includes(vargaView) ? vargaView : requested[0];
              const varga = chartData.vargas[`D${active}`];
              const vargaPlacements = [varga.lagna, ...varga.planets];
              return (
                <section className="app-card">
                  <div className="app-card__header">
                    <h2>{t("sectionVargas")} — D{varga.dNumber} {varga.name}</h2>
                    <select
                      value={active}
                      onChange={(e) => setVargaView(Number(e.target.value))}
                    >
                      {requested.map((d) => (
                        <option key={d} value={d}>
                          D{d} {chartData.vargas[`D${d}`].name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ChartComponent placements={vargaPlacements} />
                </section>
              );
            })()}

            {chartData.riseSet && (
              <section className="app-card">
                <h2>{t("sectionSunMoon")}</h2>
                <SunMoonPanel riseSet={chartData.riseSet} />
              </section>
            )}

            {chartData.muhurta && (
              <section className="app-card">
                <h2>{t("sectionMuhurta")}</h2>
                <MuhurtaPanel
                  muhurta={chartData.muhurta}
                  circumpolar={chartData.riseSet?.circumpolar}
                />
              </section>
            )}

            {chartData.calendar && (
              <section className="app-card">
                <h2>{t("sectionCalendar")}</h2>
                <CalendarPanel calendar={chartData.calendar} />
              </section>
            )}

            <section className="app-card">
              <h2>{t("sectionPanchang")}</h2>
              {chartData.panchangAtSunrise ? (
                <>
                  <h3 className="app-card__subhead">{t("panchangAtBirth")}</h3>
                  <PanchangDetails panchang={chartData.panchang} />
                  <h3 className="app-card__subhead">{t("panchangAtSunrise")}</h3>
                  <PanchangDetails panchang={chartData.panchangAtSunrise} />
                </>
              ) : (
                <PanchangDetails panchang={chartData.panchang} />
              )}
            </section>

            {chartData.dasha && (
              <section className="app-card">
                <h2>{t("sectionDasha")}</h2>
                <DashaPanel dasha={chartData.dasha} />
              </section>
            )}

            <section className="app-card">
              <h2>{t("sectionPlanetaryPositions")}</h2>
              <PlanetaryTable placements={chartData.allPlacements} />
            </section>

            <section className="app-card">
              <h2>{t("sectionCusps")}</h2>
              <CuspTable cusps={chartData.cusps} />
            </section>

            <section className="app-card">
              <h2>{t("sectionSignificators")}</h2>
              <SignificatorTable significators={chartData.significators} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

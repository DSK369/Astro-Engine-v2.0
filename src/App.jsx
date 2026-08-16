import { useState } from "react";
import BirthDataForm from "./components/BirthDataForm";
import BirthDetailsHeader from "./components/BirthDetailsHeader";
import RulingPlanetsStrip from "./components/RulingPlanetsStrip";
import ResultsSummary from "./components/ResultsSummary";
import PanchangDetails from "./components/PanchangDetails";
import DashaPanel from "./components/DashaPanel";
import SunMoonPanel from "./components/SunMoonPanel";
import MuhurtaPanel from "./components/MuhurtaPanel";
import PlanetaryTable from "./components/PlanetaryTable";
import CuspTable from "./components/CuspTable";
import SignificatorTable from "./components/SignificatorTable";
import NorthIndianChart from "./components/charts/NorthIndianChart";
import SouthIndianChart from "./components/charts/SouthIndianChart";
import { fetchChart } from "./lib/api";
import { useLanguage } from "./lib/language";
import "./App.css";

function App() {
  const { t, lang, toggleLang } = useLanguage();
  const [chartData, setChartData] = useState(null);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [chartStyle, setChartStyle] = useState("north");
  const [vargaView, setVargaView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

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

  const ChartComponent = chartStyle === "south" ? SouthIndianChart : NorthIndianChart;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>{t("appTitle")}</h1>
          <p className="app-header__subtitle">{t("appSubtitle")}</p>
        </div>
        <button type="button" className="app-header__lang-toggle" onClick={toggleLang} lang={lang === "en" ? "hi" : "en"}>
          {t("langToggle")}
        </button>
      </header>

      <main className="app-main">
        <BirthDataForm onSubmit={handleSubmit} submitting={loading} />

        {fetchError && <p className="app-error" role="alert">{fetchError}</p>}

        {chartData && (
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

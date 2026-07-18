import { useState } from "react";
import BirthDataForm from "./components/BirthDataForm";
import BirthDetailsHeader from "./components/BirthDetailsHeader";
import RulingPlanetsStrip from "./components/RulingPlanetsStrip";
import ResultsSummary from "./components/ResultsSummary";
import PanchangDetails from "./components/PanchangDetails";
import PlanetaryTable from "./components/PlanetaryTable";
import CuspTable from "./components/CuspTable";
import SignificatorTable from "./components/SignificatorTable";
import NorthIndianChart from "./components/charts/NorthIndianChart";
import SouthIndianChart from "./components/charts/SouthIndianChart";
import { fetchChart } from "./lib/api";
import "./App.css";

function App() {
  const [chartData, setChartData] = useState(null);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [chartStyle, setChartStyle] = useState("north");
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
        <h1>Astro Engine</h1>
        <p className="app-header__subtitle">Vedic &amp; KP birth chart calculator</p>
      </header>

      <main className="app-main">
        <BirthDataForm onSubmit={handleSubmit} submitting={loading} />

        {fetchError && <p className="app-error" role="alert">{fetchError}</p>}

        {chartData && (
          <div className="app-results">
            {chartData._mock && (
              <p className="app-results__notice">
                Showing sample data — no backend API is wired up yet (see
                docs/API_SPECIFICATION.md). This UI is a starting point to
                iterate on.
              </p>
            )}

            <section className="app-card">
              <h2>Birth Details</h2>
              <BirthDetailsHeader formData={submittedForm} />
            </section>

            <section className="app-card">
              <h2>Summary</h2>
              <ResultsSummary summary={chartData.summary} />
            </section>

            <section className="app-card">
              <h2>Ruling Planets</h2>
              <RulingPlanetsStrip rulingPlanets={chartData.rulingPlanets} />
            </section>

            <section className="app-card">
              <div className="app-card__header">
                <h2>{chartStyle === "south" ? "South Indian" : "North Indian"} Chart</h2>
                <div className="chart-toggle">
                  <button
                    type="button"
                    className={chartStyle === "north" ? "is-active" : ""}
                    onClick={() => setChartStyle("north")}
                  >
                    North
                  </button>
                  <button
                    type="button"
                    className={chartStyle === "south" ? "is-active" : ""}
                    onClick={() => setChartStyle("south")}
                  >
                    South
                  </button>
                </div>
              </div>
              <ChartComponent placements={chartData.allPlacements} />
            </section>

            <section className="app-card">
              <h2>Panchang Details</h2>
              <PanchangDetails panchang={chartData.panchang} />
            </section>

            <section className="app-card">
              <h2>Planetary Positions</h2>
              <PlanetaryTable placements={chartData.allPlacements} />
            </section>

            <section className="app-card">
              <h2>KP Cusps (Placidus)</h2>
              <CuspTable cusps={chartData.cusps} />
            </section>

            <section className="app-card">
              <h2>KP Significators (4-Step)</h2>
              <SignificatorTable significators={chartData.significators} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

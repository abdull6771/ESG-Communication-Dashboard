import ESGDashboard from "../ESGDashboard";
import ErrorBoundary from "./ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <ESGDashboard />
    </ErrorBoundary>
  );
}

export default App;

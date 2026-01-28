import { useEffect, useState } from "react";
import api from "../utils/api";

const DailyReport = () => {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await api.get(
        `/reports/daily-summary?date=${date}`
      );

      // backend sends: { success, date, team_summary, employees }
      if (res.data?.success) {
        setReport(res.data);
      } else {
        setError("No report data available");
      }
    } catch (err) {
      console.error("Daily report error:", err);
      setError("Failed to load daily report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">
        Daily Summary Report
      </h2>

      {/* Date Picker */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <button
          onClick={fetchReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Load
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Report */}
      {report && (
        <>
          {/* Team Summary */}
          <h3 className="text-lg font-semibold mt-6 mb-2">
            Team Summary
          </h3>
          <ul className="list-disc ml-6">
            <li>Total Employees: {report.team_summary.total_employees}</li>
            <li>Total Check-ins: {report.team_summary.total_checkins}</li>
            <li>Total Working Hours: {report.team_summary.total_working_hours}</li>
            <li>Total Clients Visited: {report.team_summary.total_clients_visited}</li>
          </ul>

          {/* Employee Breakdown */}
          <h3 className="text-lg font-semibold mt-6 mb-2">
            Employee Breakdown
          </h3>

          {report.employees.length === 0 ? (
            <p>No data available for this date</p>
          ) : (
            <table className="w-full border mt-2 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">Employee</th>
                  <th className="border px-3 py-2">Check-ins</th>
                  <th className="border px-3 py-2">Working Hours</th>
                  <th className="border px-3 py-2">Clients Visited</th>
                </tr>
              </thead>
              <tbody>
                {report.employees.map((emp) => (
                  <tr key={emp.employee_id}>
                    <td className="border px-3 py-2">{emp.employee_name}</td>
                    <td className="border px-3 py-2">{emp.total_checkins}</td>
                    <td className="border px-3 py-2">{emp.working_hours}</td>
                    <td className="border px-3 py-2">{emp.clients_visited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default DailyReport;

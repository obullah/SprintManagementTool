import { useState } from "react";
import "./App.css";

function App() {
  const [sprintName, setSprintName] = useState("");
  const [teamName, setTeamName] = useState("");

  const [totalPerson, setTotalPerson] = useState("");
  const [productiveHrs, setProductiveHrs] = useState("");
  const [workingDays, setWorkingDays] = useState("");
  const [holidays, setHolidays] = useState("");

  const [members, setMembers] = useState([
    { id: 1, name: "", role: "DEV", leaves: "" },
  ]);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleAddMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        role: "DEV",
        leaves: "",
      },
    ]);
  };

  const handleMemberChange = (id, field, value) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCalculate = () => {
    setError("");
    setResult(null);

    const p = Number(totalPerson);
    const hrs = Number(productiveHrs);
    const wd = Number(workingDays);
    const hd = Number(holidays);

    // Basic validations for main inputs
    if (!p || p <= 0) {
      setError("Please enter a valid Total Person (greater than 0).");
      return;
    }
    if (!hrs || hrs <= 0) {
      setError("Please enter valid Productive Hrs (greater than 0).");
      return;
    }
    if (isNaN(wd) || wd < 0) {
      setError("Please enter valid Working Days (0 or more).");
      return;
    }
    if (isNaN(hd) || hd < 0) {
      setError("Please enter valid No of Holidays (0 or more).");
      return;
    }

    const overallEffectiveDays = Math.max(0, wd - hd);
    const overallTotalHours = p * hrs * overallEffectiveDays;
    const overallTotalCapacityDays = overallTotalHours / 8;

    // Member-level calculations (ignore members with no name)
    const memberResults = members
      .filter((m) => m.name.trim() !== "")
      .map((m) => {
        const leaves = Number(m.leaves) || 0;
        const effectiveDays = Math.max(0, wd - hd - leaves);
        const hours = effectiveDays * hrs;
        const days = hours / 8;
        return {
          ...m,
          leaves,
          effectiveDays,
          hours,
          days,
        };
      });

    // Totals for DEV and QA
    let devHours = 0;
    let devDays = 0;
    let qaHours = 0;
    let qaDays = 0;

    memberResults.forEach((m) => {
      if (m.role === "DEV") {
        devHours += m.hours;
        devDays += m.days;
      } else if (m.role === "QA") {
        qaHours += m.hours;
        qaDays += m.days;
      }
    });

    setResult({
      sprintName,
      teamName,
      totalPerson: p,
      productiveHrs: hrs,
      workingDays: wd,
      holidays: hd,
      overallEffectiveDays,
      overallTotalHours,
      overallTotalCapacityDays,
      members: memberResults,
      devTotals: { hours: devHours, days: devDays },
      qaTotals: { hours: qaHours, days: qaDays },
    });
  };

  const handleReset = () => {
    setTotalPerson("");
    setProductiveHrs("");
    setWorkingDays("");
    setHolidays("");
    setMembers([{ id: 1, name: "", role: "DEV", leaves: "" }]);
    setResult(null);
    setError("");
  };

  const handleExport = () => {
    if (!result) return;

    const {
      sprintName,
      teamName,
      totalPerson,
      productiveHrs,
      workingDays,
      holidays,
      overallEffectiveDays,
      overallTotalHours,
      overallTotalCapacityDays,
      devTotals,
      qaTotals,
      members: memberResults,
    } = result;

    const lines = [];

    // Summary header
    lines.push(
      [
        "Sprint Name",
        "Team Name",
        "Total Person",
        "Productive Hrs",
        "Working Days",
        "Holidays",
        "Effective Days (Overall)",
        "Total Capacity (Hours)",
        "Total Capacity (Days)",
      ].join(",")
    );

    // Summary row
    lines.push(
      [
        sprintName || "",
        teamName || "",
        totalPerson,
        productiveHrs,
        workingDays,
        holidays,
        overallEffectiveDays,
        overallTotalHours,
        overallTotalCapacityDays.toFixed(2),
      ].join(",")
    );

    lines.push(""); // blank line

    // Role totals
    lines.push("Role Totals");
    lines.push(["Role", "Total Hours", "Total Days"].join(","));
    lines.push(["DEV", devTotals.hours, devTotals.days.toFixed(2)].join(","));
    lines.push(["QA", qaTotals.hours, qaTotals.days.toFixed(2)].join(","));

    lines.push(""); // blank line

    // Member details
    lines.push("Member Details");
    lines.push(
      [
        "Name",
        "Role",
        "Leaves",
        "Effective Days",
        "Capacity (Hours)",
        "Capacity (Days)",
      ].join(",")
    );

    memberResults.forEach((m) => {
      lines.push(
        [
          m.name,
          m.role,
          m.leaves,
          m.effectiveDays,
          m.hours,
          m.days.toFixed(2),
        ].join(",")
      );
    });

    const csvContent = lines.join("\n") + "\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const safeSprintName = (sprintName || "sprint")
      .replace(/\s+/g, "_")
      .toLowerCase();
    link.href = url;
    link.setAttribute("download", `${safeSprintName}_capacity.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <div className="card">
        {/* HEADER BAR */}
        <div className="header-row">
          <div className="header-main">
            <h1 className="title">Sprint Management Tool</h1>
            <p className="subtitle">
              Calculate team sprint capacity{" "}
              <span className="highlight">(8 hrs = 1 day)</span>
            </p>
          </div>

          <div className="header-meta">
            <div className="field header-field">
              <label>Sprint Name</label>
              <input
                type="text"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                placeholder="e.g. Sprint 25"
              />
            </div>
            <div className="field header-field">
              <label>Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Phoenix"
              />
            </div>
          </div>
        </div>

        {/* TOP-LEVEL INPUTS */}
        <div className="form-row">
          <div className="field">
            <label>Total Person</label>
            <input
              type="number"
              value={totalPerson}
              onChange={(e) => setTotalPerson(e.target.value)}
              placeholder="e.g. 6"
              min="1"
            />
          </div>

          <div className="field">
            <label>Productive Hrs / day</label>
            <input
              type="number"
              value={productiveHrs}
              onChange={(e) => setProductiveHrs(e.target.value)}
              placeholder="e.g. 6.5"
              step="0.5"
              min="0"
            />
          </div>

          <div className="field">
            <label>Working Days</label>
            <input
              type="number"
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              placeholder="e.g. 10"
              min="0"
            />
          </div>

          <div className="field">
            <label>No of Holidays</label>
            <input
              type="number"
              value={holidays}
              onChange={(e) => setHolidays(e.target.value)}
              placeholder="e.g. 1"
              min="0"
            />
          </div>
        </div>

        {/* TEAM MEMBERS SECTION */}
        <div className="members-section">
          <div className="members-header">
            <h2>Team Members</h2>
            <button
              type="button"
              className="small-button"
              onClick={handleAddMember}
            >
              + Add Member
            </button>
          </div>

          <div className="members-table">
            <div className="members-row members-row-header">
              <div>Member Name</div>
              <div>Role</div>
              <div>Leaves (days)</div>
              <div />
            </div>

            {members.map((member) => (
              <div key={member.id} className="members-row">
                <div>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      handleMemberChange(member.id, "name", e.target.value)
                    }
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleMemberChange(member.id, "role", e.target.value)
                    }
                  >
                    <option value="DEV">DEV</option>
                    <option value="QA">QA</option>
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    value={member.leaves}
                    onChange={(e) =>
                      handleMemberChange(member.id, "leaves", e.target.value)
                    }
                    placeholder="e.g. 1"
                    min="0"
                  />
                </div>
                <div className="members-actions">
                  {members.length > 1 && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="buttons">
          <button onClick={handleCalculate}>Calculate</button>
          <button className="secondary" onClick={handleReset}>
            Reset
          </button>
          <button onClick={handleExport} disabled={!result}>
            Export CSV
          </button>
        </div>

        {/* ERROR */}
        {error && <div className="error">{error}</div>}

        {/* RESULTS */}
        {result && (
          <div className="result">
            <div className="result-header">
              {result.sprintName && (
                <span className="result-tag">
                  Sprint: <strong>{result.sprintName}</strong>
                </span>
              )}
              {result.teamName && (
                <span className="result-tag">
                  Team: <strong>{result.teamName}</strong>
                </span>
              )}
            </div>

            <h2>Overall Capacity</h2>
            <div className="result-grid">
              <div className="result-card">
                <span className="label">Effective Days (Overall)</span>
                <span className="value">
                  {result.overallEffectiveDays}
                </span>
              </div>
              <div className="result-card">
                <span className="label">Total Capacity (hrs)</span>
                <span className="value">
                  {result.overallTotalHours}
                </span>
              </div>
              <div className="result-card">
                <span className="label">Total Capacity (days)</span>
                <span className="value">
                  {result.overallTotalCapacityDays.toFixed(2)}
                </span>
              </div>
            </div>

            <h2 className="subheading">Team Capacity by Role</h2>
            <div className="result-grid">
              <div className="result-card">
                <span className="label">DEV Capacity (hrs)</span>
                <span className="value">
                  {result.devTotals.hours}
                </span>
              </div>
              <div className="result-card">
                <span className="label">DEV Capacity (days)</span>
                <span className="value">
                  {result.devTotals.days.toFixed(2)}
                </span>
              </div>
              <div className="result-card">
                <span className="label">QA Capacity (hrs)</span>
                <span className="value">
                  {result.qaTotals.hours}
                </span>
              </div>
              <div className="result-card">
                <span className="label">QA Capacity (days)</span>
                <span className="value">
                  {result.qaTotals.days.toFixed(2)}
                </span>
              </div>
            </div>

            {result.members.length > 0 && (
              <>
                <h2 className="subheading">Individual Capacity</h2>
                <div className="members-result-table">
                  <div className="members-row members-row-header">
                    <div>Member</div>
                    <div>Role</div>
                    <div>Leaves</div>
                    <div>Effective Days</div>
                    <div>Hours</div>
                    <div>Days</div>
                  </div>
                  {result.members.map((m) => (
                    <div key={m.id} className="members-row">
                      <div>{m.name}</div>
                      <div>{m.role}</div>
                      <div>{m.leaves}</div>
                      <div>{m.effectiveDays}</div>
                      <div>{m.hours}</div>
                      <div>{m.days.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

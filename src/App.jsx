import { useState } from "react";
import "./App.css";

function App() {
  const [sprintName, setSprintName] = useState("");
  const [teamName, setTeamName] = useState("");

  // Sprint duration (dates)
  const [sprintStart, setSprintStart] = useState("");
  const [sprintEnd, setSprintEnd] = useState("");

  const [totalPerson, setTotalPerson] = useState("");
  const [productiveHrs, setProductiveHrs] = useState("");

  const [holidays, setHolidays] = useState("");
  const [regressionDays, setRegressionDays] = useState("");
  const [officialWorkingHrs, setOfficialWorkingHrs] = useState("8"); // default 8

  // Configurable roles
  const [roles, setRoles] = useState(["DEV", "QA"]);
  const [newRole, setNewRole] = useState("");

  const [members, setMembers] = useState([
    { id: 1, name: "", role: "DEV", leaves: "", hoursPerDay: "" },
  ]);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Helper: calendar days between dates (inclusive)
  const getCalendarDays = () => {
    if (!sprintStart || !sprintEnd) return null;
    const start = new Date(sprintStart);
    const end = new Date(sprintEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return null;
    }
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return days;
  };

  // Helper: working days (Mon–Fri) between dates (inclusive)
  const getWorkingDaysExclWeekends = () => {
    if (!sprintStart || !sprintEnd) return null;
    const start = new Date(sprintStart);
    const end = new Date(sprintEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return null;
    }

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay(); // 0 = Sun, 6 = Sat
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const calendarDays = getCalendarDays();
  const workingDays = getWorkingDaysExclWeekends();

  // -------- Roles handlers --------

  const handleAddRole = () => {
    const r = newRole.trim().toUpperCase();
    if (!r) return;
    if (roles.includes(r)) {
      setNewRole("");
      return;
    }
    setRoles((prev) => [...prev, r]);
    setNewRole("");
  };

  const handleRemoveRole = (role) => {
    // prevent removing roles currently in use
    const inUse = members.some((m) => m.role === role);
    if (inUse) {
      alert("Cannot remove a role that is currently assigned to a member.");
      return;
    }
    setRoles((prev) => prev.filter((r) => r !== role));
  };

  // -------- Member handlers --------

  const handleAddMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        role: roles[0] || "DEV",
        leaves: "",
        hoursPerDay: "",
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

  // -------- Calculate --------

  const handleCalculate = () => {
    setError("");
    setResult(null);

    const duration = getCalendarDays();
    const working = getWorkingDaysExclWeekends();
    if (!duration || !working) {
      setError("Please select a valid sprint start and end date.");
      return;
    }

    const p = Number(totalPerson);
    const hrs = Number(productiveHrs);
    const wd = working; // working days (Mon–Fri)
    const hd = Number(holidays) || 0;
    const reg = Number(regressionDays) || 0;
    const officialH = Number(officialWorkingHrs);

    // Basic validations
    if (!p || p <= 0) {
      setError("Please enter a valid Total Person (greater than 0).");
      return;
    }
    if (!hrs || hrs <= 0) {
      setError("Please enter valid Productive Hrs (greater than 0).");
      return;
    }
    if (hd < 0) {
      setError("Please enter valid No of Holidays (0 or more).");
      return;
    }
    if (reg < 0) {
      setError("Please enter valid Days needed for Regression (0 or more).");
      return;
    }
    if (!officialH || officialH <= 0) {
      setError("Please enter a valid Official Working hrs (greater than 0).");
      return;
    }

    // Effective days now exclude weekends AND regression days
    const baseEffectiveDays = Math.max(0, wd - hd - reg);
    const overallEffectiveDays = baseEffectiveDays;

    // Overall capacity (using global hrs & total person)
    const overallTotalHours = p * hrs * overallEffectiveDays;
    const overallTotalCapacityDays = overallTotalHours / officialH;

    // Member-level calculations (ignore members with no name)
    const memberResults = members
      .filter((m) => m.name.trim() !== "")
      .map((m) => {
        const leaves = Number(m.leaves) || 0;
        const memberHrs = Number(m.hoursPerDay) || hrs; // override or fallback
        const effectiveDays = Math.max(0, wd - hd - reg - leaves);
        const hours = effectiveDays * memberHrs;
        const days = hours / officialH;
        return {
          ...m,
          leaves,
          hoursPerDay: memberHrs,
          effectiveDays,
          hours,
          days,
        };
      });

    // Role-level totals (for ALL roles)
    const roleTotals = {};
    memberResults.forEach((m) => {
      if (!roleTotals[m.role]) {
        roleTotals[m.role] = { hours: 0, days: 0 };
      }
      roleTotals[m.role].hours += m.hours;
      roleTotals[m.role].days += m.days;
    });

    // Final team capacity = sum of all role capacities
    let finalHours = 0;
    let finalDays = 0;
    Object.values(roleTotals).forEach((t) => {
      finalHours += t.hours;
      finalDays += t.days;
    });

    setResult({
      sprintName,
      teamName,
      sprintStart,
      sprintEnd,
      sprintDurationDays: duration, // calendar days
      sprintWorkingDays: wd, // working days Mon–Fri
      totalPerson: p,
      productiveHrs: hrs,
      holidays: hd,
      regressionDays: reg,
      officialWorkingHrs: officialH,
      overallEffectiveDays,
      overallTotalHours,
      overallTotalCapacityDays,
      members: memberResults,
      roleTotals,
      finalTeamTotals: { hours: finalHours, days: finalDays },
    });
  };

  const handleReset = () => {
    setSprintName("");
    setTeamName("");
    setSprintStart("");
    setSprintEnd("");
    setTotalPerson("");
    setProductiveHrs("");
    setHolidays("");
    setRegressionDays("");
    setOfficialWorkingHrs("8");
    setMembers([
      { id: 1, name: "", role: roles[0] || "DEV", leaves: "", hoursPerDay: "" },
    ]);
    setResult(null);
    setError("");
  };

  const handleExport = () => {
    if (!result) return;

    const {
      sprintName,
      teamName,
      sprintStart,
      sprintEnd,
      sprintDurationDays,
      sprintWorkingDays,
      totalPerson,
      productiveHrs,
      holidays,
      regressionDays,
      officialWorkingHrs,
      overallEffectiveDays,
      overallTotalHours,
      overallTotalCapacityDays,
      roleTotals,
      finalTeamTotals,
      members: memberResults,
    } = result;

    const lines = [];

    // Summary header
    lines.push(
      [
        "Sprint Name",
        "Team Name",
        "Sprint Start",
        "Sprint End",
        "Sprint Duration (Calendar Days)",
        "Working Days (Mon-Fri)",
        "Total Person",
        "Productive Hrs (Default)",
        "Holidays",
        "Days needed for Regression",
        "Official Working hrs",
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
        sprintStart || "",
        sprintEnd || "",
        sprintDurationDays,
        sprintWorkingDays,
        totalPerson,
        productiveHrs,
        holidays,
        regressionDays,
        officialWorkingHrs,
        overallEffectiveDays,
        overallTotalHours,
        overallTotalCapacityDays.toFixed(2),
      ].join(",")
    );

    lines.push(""); // blank line

    // Role totals
    lines.push("Role Totals");
    lines.push(["Role", "Total Hours", "Total Days"].join(","));
    Object.entries(roleTotals).forEach(([role, t]) => {
      lines.push([role, t.hours, t.days.toFixed(2)].join(","));
    });

    lines.push(""); // blank line

    // Final team capacity
    lines.push("Final Team Capacity");
    lines.push(["Total Hours (all roles)", "Total Days (all roles)"].join(","));
    lines.push(
      [finalTeamTotals.hours, finalTeamTotals.days.toFixed(2)].join(",")
    );

    lines.push(""); // blank line

    // Member details
    lines.push("Member Details");
    lines.push(
      [
        "Name",
        "Role",
        "Hours/Day",
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
          m.hoursPerDay,
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
              <span className="highlight">(based on working days, regression & official hrs)</span>
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
            <label>Productive Hrs / day (default)</label>
            <input
              type="number"
              value={productiveHrs}
              onChange={(e) => setProductiveHrs(e.target.value)}
              placeholder="e.g. 6.5"
              step="0.5"
              min="0"
            />
          </div>

          <div className="field field-sprint-duration">
            <label>Sprint Duration</label>
            <div className="date-range">
              <input
                type="date"
                value={sprintStart}
                onChange={(e) => setSprintStart(e.target.value)}
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={sprintEnd}
                onChange={(e) => setSprintEnd(e.target.value)}
              />
            </div>
            {calendarDays && workingDays && (
              <div className="duration-hint">
                Duration: <strong>{calendarDays}</strong> days (
                <strong>{workingDays}</strong> working days, Mon–Fri)
              </div>
            )}
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

          <div className="field">
            <label>Days needed for Regression</label>
            <input
              type="number"
              value={regressionDays}
              onChange={(e) => setRegressionDays(e.target.value)}
              placeholder="e.g. 2"
              min="0"
            />
          </div>

          <div className="field">
            <label>Official Working hrs</label>
            <input
              type="number"
              value={officialWorkingHrs}
              onChange={(e) => setOfficialWorkingHrs(e.target.value)}
              placeholder="e.g. 8"
              min="1"
              step="0.5"
            />
          </div>
        </div>

        {/* ROLES CONFIG SECTION */}
        <div className="roles-section">
          <div className="roles-header">
            <h2>Roles</h2>
            <div className="roles-add">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. PO, BA"
              />
              <button type="button" className="small-button" onClick={handleAddRole}>
                + Add Role
              </button>
            </div>
          </div>
          <div className="roles-chips">
            {roles.map((role) => (
              <span key={role} className="role-chip">
                {role}
                {roles.length > 1 && (
                  <button
                    type="button"
                    className="role-remove"
                    onClick={() => handleRemoveRole(role)}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
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
              <div>Hrs / day</div>
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
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    value={member.hoursPerDay}
                    onChange={(e) =>
                      handleMemberChange(member.id, "hoursPerDay", e.target.value)
                    }
                    placeholder="e.g. 6.5"
                    min="0"
                    step="0.5"
                  />
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
              {result.sprintStart && result.sprintEnd && (
                <span className="result-tag">
                  {result.sprintStart} → {result.sprintEnd}
                </span>
              )}
            </div>

            <h2>Overall Capacity</h2>
            <div className="result-grid">
              <div className="result-card">
                <span className="label">Sprint Duration (calendar days)</span>
                <span className="value">{result.sprintDurationDays}</span>
              </div>
              <div className="result-card">
                <span className="label">Working Days (Mon–Fri)</span>
                <span className="value">{result.sprintWorkingDays}</span>
              </div>
              <div className="result-card">
                <span className="label">Holidays</span>
                <span className="value">{result.holidays}</span>
              </div>
              <div className="result-card">
                <span className="label">Regression Days</span>
                <span className="value">{result.regressionDays}</span>
              </div>
              <div className="result-card">
                <span className="label">Official Working hrs</span>
                <span className="value">{result.officialWorkingHrs}</span>
              </div>
              <div className="result-card">
                <span className="label">Effective Days (Overall)</span>
                <span className="value">{result.overallEffectiveDays}</span>
              </div>
              <div className="result-card">
                <span className="label">Total Capacity (hrs)</span>
                <span className="value">{result.overallTotalHours}</span>
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
              {Object.entries(result.roleTotals).map(([role, t]) => (
                <div className="result-card" key={role}>
                  <span className="label">{role} – Hours</span>
                  <span className="value">{t.hours}</span>
                  <span className="label" style={{ marginTop: "6px" }}>
                    {role} – Days
                  </span>
                  <span className="value">{t.days.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <h2 className="subheading">Final Team Capacity</h2>
            <div className="result-grid">
              <div className="result-card">
                <span className="label">Total Hours (all roles)</span>
                <span className="value">
                  {result.finalTeamTotals.hours}
                </span>
              </div>
              <div className="result-card">
                <span className="label">Total Days (all roles)</span>
                <span className="value">
                  {result.finalTeamTotals.days.toFixed(2)}
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
                    <div>Hrs / day</div>
                    <div>Leaves</div>
                    <div>Effective Days</div>
                    <div>Hours</div>
                    <div>Days</div>
                  </div>
                  {result.members.map((m) => (
                    <div key={m.id} className="members-row">
                      <div>{m.name}</div>
                      <div>{m.role}</div>
                      <div>{m.hoursPerDay}</div>
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

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type EmploymentType = 'staff' | 'agency' | 'travel' | 'per diem' | 'contracted'
type ShiftType = 'Day' | 'Evening' | 'Night' | 'Weekend' | 'On-call'
type LicenseType = 'RN' | 'LPN' | 'CNA' | 'CMA' | 'Other'
type PatientPopulation = 'LTC' | 'med-surg' | 'pediatrics' | 'ICU' | 'behavioral health' | 'Other'

type FormState = {
  title: string
  company: string
  employmentType: EmploymentType
  facility: string
  specialty: string
  city: string
  state: string
  licenseBody: string
  licenseNumber: string
  licenseType: LicenseType | string
  licensureState: string
  supervisingNurse: string
  patientPopulation: PatientPopulation | string
  shiftWorked: ShiftType
  scheduledShift: string
  hoursPerShift: string
  date: string
  isOngoing: boolean
  startDate: string
  endDate: string
  notes: string
}

type WorkShift = FormState & {
  id: number
  hours: number
}

const employmentTypeOptions = ['staff', 'agency', 'travel', 'per diem', 'contracted']
const licenseTypeOptions = ['RN', 'LPN', 'CNA', 'CMA', 'Other']
const patientPopulationOptions = ['LTC', 'med-surg', 'pediatrics', 'ICU', 'behavioral health', 'Other']
const usStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
]

const defaultForm: FormState = {
  title: '',
  company: '',
  employmentType: 'staff',
  facility: '',
  specialty: 'Acute care',
  city: '',
  state: 'OR',
  licenseBody: 'OSBN',
  licenseNumber: '',
  licenseType: 'RN',
  licensureState: 'Oregon',
  supervisingNurse: '',
  patientPopulation: 'med-surg',
  shiftWorked: 'Day',
  scheduledShift: '8 hours',
  hoursPerShift: '8',
  date: new Date().toISOString().slice(0, 10),
  isOngoing: false,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: '',
}

const sampleEntries: WorkShift[] = [
  {
    id: 1,
    title: 'RN',
    company: 'Portland General Hospital',
    employmentType: 'staff',
    facility: 'Portland General Hospital',
    specialty: 'Medical-Surgical',
    city: 'Portland',
    state: 'OR',
    licenseBody: 'OSBN',
    licenseNumber: 'RN-123456',
    licenseType: 'RN',
    licensureState: 'Oregon',
    supervisingNurse: 'A. Brooks',
    patientPopulation: 'med-surg',
    shiftWorked: 'Day',
    scheduledShift: '12 hours',
    hoursPerShift: '12',
    date: '2026-08-18',
    isOngoing: true,
    startDate: '2026-08-18',
    endDate: '',
    notes: 'Primary med-surg unit',
    hours: 12,
  },
  {
    id: 2,
    title: 'CNA',
    company: 'Sunrise Senior Living',
    employmentType: 'contracted',
    facility: 'Sunrise Senior Living',
    specialty: 'Long-term care',
    city: 'Beaverton',
    state: 'OR',
    licenseBody: 'Nursing Assistant Registry',
    licenseNumber: 'CNA-88942',
    licenseType: 'CNA',
    licensureState: 'Oregon',
    supervisingNurse: 'N. Martin',
    patientPopulation: 'LTC',
    shiftWorked: 'Evening',
    scheduledShift: '8 hours',
    hoursPerShift: '8',
    date: '2026-08-21',
    isOngoing: false,
    startDate: '2026-08-21',
    endDate: '2026-08-21',
    notes: 'Evening care team coverage',
    hours: 8,
  },
]

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const storageKey = 'clinical-hours-tracker-v1'
const checklistStorageKey = 'clinical-hours-checklist-v1'

const renewalChecklist = [
  'License renewed or renewal packet started',
  'Board requirements reviewed',
  'Copies of license and employment verification saved',
  'Employment history and facility list updated',
  'Required continuing education logged',
  'Hours summary reviewed for accuracy',
  'Submission deadline confirmed',
]

function App() {
  const [form, setForm] = useState<FormState>(defaultForm)
  const [entries, setEntries] = useState<WorkShift[]>(() => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      return sampleEntries
    }

    try {
      const parsed = JSON.parse(stored) as WorkShift[]
      return parsed.length > 0 ? parsed : sampleEntries
    } catch {
      return sampleEntries
    }
  })
  const [view, setView] = useState<'log' | 'report'>('log')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('clinical-hours-theme')
    return stored === 'dark' ? 'dark' : 'light'
  })
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(checklistStorageKey)
    if (!stored) {
      return renewalChecklist.reduce<Record<string, boolean>>((acc, item) => {
        acc[item] = false
        return acc
      }, {})
    }

    try {
      return JSON.parse(stored) as Record<string, boolean>
    } catch {
      return renewalChecklist.reduce<Record<string, boolean>>((acc, item) => {
        acc[item] = false
        return acc
      }, {})
    }
  })
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('clinical-hours-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(checklistStorageKey, JSON.stringify(checklist))
  }, [checklist])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const summary = useMemo(() => {
    const totalHours = entries.reduce((sum, item) => sum + item.hours, 0)
    const ongoingAssignments = entries.filter((item) => item.isOngoing).length
    const uniqueFacilities = new Set(entries.map((item) => item.facility)).size
    const thisYear = new Date().getFullYear()
    const yearHours = entries
      .filter((item) => new Date(item.date).getFullYear() === thisYear)
      .reduce((sum, item) => sum + item.hours, 0)

    return {
      totalHours,
      ongoingAssignments,
      totalShifts: entries.length,
      uniqueFacilities,
      yearHours,
      avgHours: entries.length ? totalHours / entries.length : 0,
    }
  }, [entries])

  const reportData = useMemo(() => {
    const byLicenseType = entries.reduce<Record<string, number>>((acc, item) => {
      const key = item.licenseType || 'Unspecified'
      acc[key] = (acc[key] || 0) + item.hours
      return acc
    }, {})

    const byPopulation = entries.reduce<Record<string, number>>((acc, item) => {
      const key = item.patientPopulation || 'Unspecified'
      acc[key] = (acc[key] || 0) + item.hours
      return acc
    }, {})

    const byEmployment = entries.reduce<Record<string, number>>((acc, item) => {
      const key = item.employmentType || 'Unspecified'
      acc[key] = (acc[key] || 0) + item.hours
      return acc
    }, {})

    const byFacility = entries.reduce<Record<string, number>>((acc, item) => {
      const key = item.facility || 'Unspecified'
      acc[key] = (acc[key] || 0) + item.hours
      return acc
    }, {})

    type BoardSummary = {
      hours: number
      state: string
      shifts: number
    }

    const byBoard = entries.reduce<Record<string, BoardSummary>>((acc, item) => {
      const key = `${item.licenseBody || 'Unspecified'}${item.licensureState ? ` • ${item.licensureState}` : ''}`
      const current = acc[key] || { hours: 0, state: item.licensureState || 'Unknown', shifts: 0 }

      acc[key] = {
        hours: current.hours + item.hours,
        state: item.licensureState || current.state,
        shifts: current.shifts + 1,
      }

      return acc
    }, {})

    return {
      byLicenseType,
      byPopulation,
      byEmployment,
      byFacility,
      byBoard,
    }
  }, [entries])

  const handleInput = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = event.target
    const fieldName = name as keyof FormState
    const checked = type === 'checkbox' ? (event.target as HTMLInputElement).checked : false

    setForm((current) => ({
      ...current,
      [fieldName]: type === 'checkbox' ? checked : value,
    }) as FormState)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextShift: WorkShift = {
      ...form,
      id: Date.now(),
      hours: Number(form.hoursPerShift) || 0,
    }

    setEntries((current) => [nextShift, ...current])
    setForm({
      ...defaultForm,
      date: new Date().toISOString().slice(0, 10),
      startDate: new Date().toISOString().slice(0, 10),
    })
  }

  const exportCsv = () => {
    const headers = [
      'Date',
      'Title',
      'Company',
      'Employment Type',
      'Facility',
      'Specialty',
      'Location',
      'License Body',
      'License Number',
      'License Type',
      'State of Licensure',
      'Supervising Nurse / Charge Nurse',
      'Patient Population / Unit Type',
      'Shift Worked',
      'Scheduled Shift',
      'Hours',
      'Ongoing',
      'Notes',
    ]

    const rows = entries.map((entry) => [
      entry.date,
      entry.title,
      entry.company,
      entry.employmentType,
      entry.facility,
      entry.specialty,
      `${entry.city}, ${entry.state}`,
      entry.licenseBody,
      entry.licenseNumber,
      entry.licenseType,
      entry.licensureState,
      entry.supervisingNurse,
      entry.patientPopulation,
      entry.shiftWorked,
      entry.scheduledShift,
      String(entry.hours),
      entry.isOngoing ? 'Yes' : 'No',
      entry.notes,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'clinical-hours-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    window.print()
  }

  const clearEntries = () => {
    setEntries([])
  }

  const handleChecklistToggle = (item: string) => {
    setChecklist((current) => ({
      ...current,
      [item]: !current[item],
    }))
  }

  const handleInstallApp = async () => {
    if (!installPrompt) {
      return
    }

    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">License renewal dashboard</p>
          <h1>Clinical Hours Tracker</h1>
        </div>

        <div className="header-actions">
          <div className="view-tabs" aria-label="Application views">
            <button
              type="button"
              className={view === 'log' ? 'tab-button active' : 'tab-button'}
              onClick={() => setView('log')}
            >
              Shift log
            </button>
            <button
              type="button"
              className={view === 'report' ? 'tab-button active' : 'tab-button'}
              onClick={() => setView('report')}
            >
              Renewal report
            </button>
          </div>

          <button type="button" className="secondary-button" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>

          {installPrompt && (
            <button type="button" className="secondary-button" onClick={handleInstallApp}>
              Install app
            </button>
          )}

          {view === 'log' ? (
            <button type="button" className="secondary-button" onClick={exportCsv}>
              Export CSV
            </button>
          ) : (
            <button type="button" className="secondary-button" onClick={printReport}>
              Export PDF
            </button>
          )}
        </div>
      </header>

      <main className="dashboard">
        {view === 'log' ? (
          <>
            <section className="panel form-panel">
              <div className="section-heading">
                <h2>Log a shift</h2>
                <span>Track hours for renewal</span>
              </div>

              <form onSubmit={handleSubmit} className="hours-form">
                <div className="field-grid two-up">
                  <label>
                    Title
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleInput}
                      placeholder="RN, CNA, PT, LPN..."
                    />
                  </label>

                  <label>
                    Company / Employer
                    <input
                      name="company"
                      value={form.company}
                      onChange={handleInput}
                      placeholder="Employer or agency"
                    />
                  </label>
                </div>

                <div className="field-grid two-up">
                  <label>
                    Employment type
                    <input
                      list="employmentTypeOptions"
                      name="employmentType"
                      value={form.employmentType}
                      onChange={handleInput}
                      placeholder="Select or type"
                    />
                    <datalist id="employmentTypeOptions">
                      {employmentTypeOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </label>

                  <label>
                    Facility / Unit
                    <input
                      name="facility"
                      value={form.facility}
                      onChange={handleInput}
                      placeholder="Hospital, clinic, facility name"
                    />
                  </label>
                </div>

                <div className="field-grid two-up">
                  <label>
                    Specialty
                    <input
                      name="specialty"
                      value={form.specialty}
                      onChange={handleInput}
                      placeholder="ICU, pediatrics, home health..."
                    />
                  </label>

                  <label>
                    Governing body
                    <input
                      name="licenseBody"
                      value={form.licenseBody}
                      onChange={handleInput}
                      placeholder="OSBN, board name, etc."
                    />
                  </label>
                </div>

                <div className="field-grid three-up">
                  <label>
                    License number
                    <input
                      name="licenseNumber"
                      value={form.licenseNumber}
                      onChange={handleInput}
                      placeholder="RN-123456"
                    />
                  </label>

                  <label>
                    License type
                    <input
                      list="licenseTypeOptions"
                      name="licenseType"
                      value={form.licenseType}
                      onChange={handleInput}
                      placeholder="RN"
                    />
                    <datalist id="licenseTypeOptions">
                      {licenseTypeOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </label>

                  <label>
                    State of licensure
                    <input
                      list="usStateOptions"
                      name="licensureState"
                      value={form.licensureState}
                      onChange={handleInput}
                      placeholder="Oregon"
                    />
                    <datalist id="usStateOptions">
                      {usStates.map((state) => (
                        <option key={state} value={state} />
                      ))}
                    </datalist>
                  </label>
                </div>

                <div className="field-grid two-up">
                  <label>
                    Supervising nurse / charge nurse
                    <input
                      name="supervisingNurse"
                      value={form.supervisingNurse}
                      onChange={handleInput}
                      placeholder="Name"
                    />
                  </label>

                  <label>
                    Patient population / unit type
                    <input
                      list="patientPopulationOptions"
                      name="patientPopulation"
                      value={form.patientPopulation}
                      onChange={handleInput}
                      placeholder="med-surg"
                    />
                    <datalist id="patientPopulationOptions">
                      {patientPopulationOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </label>
                </div>

                <div className="field-grid two-up">
                  <label>
                    City
                    <input name="city" value={form.city} onChange={handleInput} placeholder="Portland" />
                  </label>

                  <label>
                    State
                    <input name="state" value={form.state} onChange={handleInput} placeholder="OR" />
                  </label>
                </div>

                <div className="field-grid three-up">
                  <label>
                    Shift worked
                    <input
                      list="shiftWorkedOptions"
                      name="shiftWorked"
                      value={form.shiftWorked}
                      onChange={handleInput}
                      placeholder="Day"
                    />
                    <datalist id="shiftWorkedOptions">
                      <option value="Day" />
                      <option value="Evening" />
                      <option value="Night" />
                      <option value="Weekend" />
                      <option value="On-call" />
                    </datalist>
                  </label>

                  <label>
                    Scheduled shift
                    <input
                      list="scheduledShiftOptions"
                      name="scheduledShift"
                      value={form.scheduledShift}
                      onChange={handleInput}
                      placeholder="8 hours"
                    />
                    <datalist id="scheduledShiftOptions">
                      <option value="8 hours" />
                      <option value="10 hours" />
                      <option value="12 hours" />
                      <option value="Other" />
                    </datalist>
                  </label>

                  <label>
                    Hours worked
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      name="hoursPerShift"
                      value={form.hoursPerShift}
                      onChange={handleInput}
                    />
                  </label>
                </div>

                <div className="field-grid two-up">
                  <label>
                    Date worked
                    <input type="date" name="date" value={form.date} onChange={handleInput} />
                  </label>

                  <label>
                    Assignment start date
                    <input type="date" name="startDate" value={form.startDate} onChange={handleInput} />
                  </label>
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="isOngoing"
                    checked={form.isOngoing}
                    onChange={handleInput}
                  />
                  This assignment is ongoing
                </label>

                {!form.isOngoing && (
                  <label>
                    End date
                    <input type="date" name="endDate" value={form.endDate} onChange={handleInput} />
                  </label>
                )}

                <label>
                  Notes
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleInput}
                    rows={3}
                    placeholder="Unit, floating, orientation, special assignment, travel notes..."
                  />
                </label>

                <button type="submit" className="primary-button">
                  Save shift
                </button>
              </form>
            </section>

            <section className="panel summary-panel">
              <div className="section-heading">
                <h2>Renewal summary</h2>
                <span>Snapshot</span>
              </div>

              <div className="stat-grid">
                <article className="stat-card accent">
                  <span>Total hours</span>
                  <strong>{summary.totalHours}</strong>
                </article>
                <article className="stat-card">
                  <span>Shifts logged</span>
                  <strong>{summary.totalShifts}</strong>
                </article>
                <article className="stat-card">
                  <span>Avg. shift</span>
                  <strong>{summary.avgHours.toFixed(1)}h</strong>
                </article>
                <article className="stat-card">
                  <span>This year</span>
                  <strong>{summary.yearHours}h</strong>
                </article>
                <article className="stat-card">
                  <span>Ongoing</span>
                  <strong>{summary.ongoingAssignments}</strong>
                </article>
                <article className="stat-card">
                  <span>Locations</span>
                  <strong>{summary.uniqueFacilities}</strong>
                </article>
              </div>
            </section>

            <section className="panel entries-panel">
              <div className="section-heading entries-header">
                <h2>Recorded shifts</h2>
                <button type="button" className="link-button" onClick={clearEntries}>
                  Clear all
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="empty-state">
                  <p>No shifts logged yet.</p>
                  <small>Start by entering a recent clinical assignment.</small>
                </div>
              ) : (
                <ul className="entry-list">
                  {entries.map((entry) => (
                    <li key={entry.id} className="entry-card">
                      <div className="entry-header">
                        <div>
                          <h3>
                            {entry.title} · {entry.shiftWorked}
                          </h3>
                          <p>
                            {entry.company} · {entry.facility}
                          </p>
                        </div>
                        <span className="hours-pill">{entry.hours}h</span>
                      </div>

                      <div className="meta-row">
                        <span>{entry.date}</span>
                        <span>{entry.employmentType}</span>
                        <span>{entry.scheduledShift}</span>
                      </div>

                      <div className="meta-row location-row">
                        <span>{entry.city}, {entry.state}</span>
                        <span>{entry.specialty}</span>
                      </div>

                      {entry.notes && <p className="notes">{entry.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <section className="panel report-panel">
            <div className="section-heading">
              <h2>Renewal report</h2>
              <span>Printable summary for board renewal</span>
            </div>

            <div className="report-grid">
              <article className="report-card">
                <span>Total hours</span>
                <strong>{summary.totalHours}</strong>
              </article>
              <article className="report-card">
                <span>This year</span>
                <strong>{summary.yearHours}h</strong>
              </article>
              <article className="report-card">
                <span>Shifts</span>
                <strong>{summary.totalShifts}</strong>
              </article>
              <article className="report-card">
                <span>Ongoing</span>
                <strong>{summary.ongoingAssignments}</strong>
              </article>
            </div>

            <div className="report-breakdowns">
              <div className="breakdown-card">
                <h3>Hours by license type</h3>
                <ul>
                  {Object.entries(reportData.byLicenseType).length === 0 ? (
                    <li>No data yet</li>
                  ) : (
                    Object.entries(reportData.byLicenseType).map(([label, hours]) => (
                      <li key={label}>
                        <span>{label}</span>
                        <strong>{hours}h</strong>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="breakdown-card">
                <h3>Hours by patient population</h3>
                <ul>
                  {Object.entries(reportData.byPopulation).length === 0 ? (
                    <li>No data yet</li>
                  ) : (
                    Object.entries(reportData.byPopulation).map(([label, hours]) => (
                      <li key={label}>
                        <span>{label}</span>
                        <strong>{hours}h</strong>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="breakdown-card">
                <h3>Hours by employment</h3>
                <ul>
                  {Object.entries(reportData.byEmployment).length === 0 ? (
                    <li>No data yet</li>
                  ) : (
                    Object.entries(reportData.byEmployment).map(([label, hours]) => (
                      <li key={label}>
                        <span>{label}</span>
                        <strong>{hours}h</strong>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="board-card">
              <div className="section-heading checklist-header">
                <h3>Boards and states tracked</h3>
                <span>{Object.keys(reportData.byBoard).length} tracked</span>
              </div>

              <ul className="board-list">
                {Object.entries(reportData.byBoard).length === 0 ? (
                  <li>No board tracking data yet</li>
                ) : (
                  Object.entries(reportData.byBoard).map(([board, details]) => {
                    const boardDetails = details as { hours: number; state: string; shifts: number }
                    return (
                      <li key={board}>
                        <span>{board}</span>
                        <strong>{boardDetails.hours}h</strong>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>

            <div className="checklist-card">
              <div className="section-heading checklist-header">
                <h3>Renewal checklist</h3>
                <span>{Object.values(checklist).filter(Boolean).length}/{renewalChecklist.length} complete</span>
              </div>

              <ul className="checklist-list">
                {renewalChecklist.map((item) => (
                  <li key={item}>
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[item])}
                        onChange={() => handleChecklistToggle(item)}
                      />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Employer</th>
                    <th>Facility</th>
                    <th>License</th>
                    <th>Shift</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No shifts recorded yet.</td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.date}</td>
                        <td>{entry.title}</td>
                        <td>{entry.company}</td>
                        <td>{entry.facility}</td>
                        <td>{entry.licenseType || '—'}</td>
                        <td>{entry.shiftWorked}</td>
                        <td>{entry.hours}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type EmploymentType =
  | 'Full-time'
  | 'Part-time'
  | 'Contract'
  | 'Agency'
  | 'Per diem'
  | 'Travel'

type ShiftType = 'Day' | 'Evening' | 'Night' | 'Weekend' | 'On-call'

type FormState = {
  title: string
  company: string
  employmentType: EmploymentType
  facility: string
  specialty: string
  city: string
  state: string
  licenseBody: string
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

const defaultForm: FormState = {
  title: '',
  company: '',
  employmentType: 'Full-time',
  facility: '',
  specialty: 'Acute care',
  city: '',
  state: 'OR',
  licenseBody: 'OSBN',
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
    employmentType: 'Full-time',
    facility: 'Portland General Hospital',
    specialty: 'Medical-Surgical',
    city: 'Portland',
    state: 'OR',
    licenseBody: 'OSBN',
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
    employmentType: 'Contract',
    facility: 'Sunrise Senior Living',
    specialty: 'Long-term care',
    city: 'Beaverton',
    state: 'OR',
    licenseBody: 'Nursing Assistant Registry',
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

const storageKey = 'clinical-hours-tracker-v1'

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

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(entries))
  }, [entries])

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

  const clearEntries = () => {
    setEntries([])
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">License renewal dashboard</p>
          <h1>Clinical Hours Tracker</h1>
        </div>
        <button type="button" className="secondary-button" onClick={exportCsv}>
          Export CSV
        </button>
      </header>

      <main className="dashboard">
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
                <select name="employmentType" value={form.employmentType} onChange={handleInput}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Agency</option>
                  <option>Per diem</option>
                  <option>Travel</option>
                </select>
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
                <select name="shiftWorked" value={form.shiftWorked} onChange={handleInput}>
                  <option>Day</option>
                  <option>Evening</option>
                  <option>Night</option>
                  <option>Weekend</option>
                  <option>On-call</option>
                </select>
              </label>

              <label>
                Scheduled shift
                <select name="scheduledShift" value={form.scheduledShift} onChange={handleInput}>
                  <option>8 hours</option>
                  <option>12 hours</option>
                  <option>10 hours</option>
                  <option>Other</option>
                </select>
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
      </main>
    </div>
  )
}

export default App

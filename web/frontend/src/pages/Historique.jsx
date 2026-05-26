import { useState, useEffect } from 'react'
import { getCertitude, API } from '../data'  
import { Badge, CertitudeBadge, SectionTitle } from '../components'  

const FILTERS = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 derniers jours', value: 'week' },
  { label: 'Tout', value: 'all' },
]

export default function Historique() {
  const [detections, setDetections] = useState([])
  const [filter, setFilter] = useState('today')
  const [person, setPerson] = useState('all')
  const [persons, setPersons] = useState([])

  useEffect(() => {
    fetch(`${API}/detections`).then(r => r.json()).then(setDetections) 
    fetch(`${API}/personnes`).then(r => r.json()).then(setPersons)     
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let filtered = detections
  if (filter === 'today') filtered = filtered.filter(d => d.date === today)   
  if (filter === 'week') filtered = filtered.filter(d => d.date >= week)         
  if (filter === 'unknown') filtered = filtered.filter(d => !d.connu)            
  if (person !== 'all') filtered = filtered.filter(d => d.nom === person)      

  const grouped = filtered.reduce((acc, d) => {
    if (!acc[d.date]) acc[d.date] = []   
    acc[d.date].push(d)                   
    return acc
  }, {})

  function dateLabel(date) {
    if (date === today) return `Aujourd'hui — ${date}`
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (date === yesterday) return `Hier — ${date}`
    return date
  }

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 35, fontWeight: 500 }}>Historique</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Toutes les détections passées</p>
        </div>
        <select style={{ width: 'auto' }} value={person} onChange={e => setPerson(e.target.value)}>
          <option value="all">Toutes les personnes</option>
          {persons.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
          <option value="Inconnu">Inconnu</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            fontSize: 12, padding: '6px 14px',
            background: filter === f.value
              ? 'linear-gradient(110deg, rgba(18,130,162,0.16) 0%, rgba(244,162,97,0.2) 100%)'
              : '#fff',
            color: filter === f.value ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: `1px solid ${filter === f.value ? 'rgba(18,130,162,0.28)' : 'rgba(20,33,61,0.12)'}`,
            fontWeight: filter === f.value ? 600 : 500,
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '2rem 0' }}>
          Aucune détection pour ce filtre.
        </div>
      )}

      {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
        <div key={date} style={{ marginBottom: '1.5rem' }}>
          <SectionTitle>{dateLabel(date)}</SectionTitle>
          <div style={{
            background: 'linear-gradient(170deg, #ffffff 0%, #f8fcff 100%)',
            border: '1px solid rgba(20,33,61,0.1)',
            boxShadow: '0 14px 30px rgba(20,33,61,0.08)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Personne', 'Heure', 'Statut', 'Certitude'].map(h => (
                    <th key={h} style={{
                      fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500,
                      textAlign: 'left', padding: '8px 14px',
                      borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped[date].map((d, i) => {
                  const pct = getCertitude(d.connu, d.distance)
                  return (
                    <tr key={d.id}>
                      <td style={{ padding: '10px 14px', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13 }}>{d.nom}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>{d.heure}</td>
                      <td style={{ padding: '10px 14px', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <Badge known={d.connu} />
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <CertitudeBadge pct={pct} known={d.connu} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
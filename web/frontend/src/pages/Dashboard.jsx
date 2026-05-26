import { useState, useEffect } from 'react'
import { getCertitude, API } from '../data'
import { Badge, CertitudeBadge, Card, SectionTitle } from '../components'

export default function Dashboard() {
  const [detections, setDetections] = useState([])

  function fetchDetections() {
    fetch(`${API}/detections`)
      .then(r => r.json())
      .then(data => setDetections(data))
  }

  useEffect(() => {
    fetchDetections()
    const interval = setInterval(fetchDetections, 3000) 
    return () => clearInterval(interval)
  }, [])

  const today = new Date().toISOString().slice(0, 10) 
  const todayDetections = detections.filter(d => d.date === today) 
  const known = todayDetections.filter(d => d.connu).length
  const unknown = todayDetections.filter(d => !d.connu).length

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 35, fontWeight: 500 }}>Tableau de bord</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Détections en temps réel
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {[
          { label: "Détections aujourd'hui", value: todayDetections.length, sub: 'depuis minuit' },
          { label: 'Reconnues', value: known, sub: todayDetections.length ? `${Math.round(known / todayDetections.length * 100)}% du total` : '—' },
          { label: 'Inconnues', value: unknown, sub: 'non enregistrées' },
        ].map((m, idx) => (
          <div key={m.label} style={{
            background: idx === 0
              ? 'linear-gradient(135deg, rgba(18,130,162,0.14) 0%, rgba(255,255,255,0.9) 100%)'
              : idx === 1
                ? 'linear-gradient(135deg, rgba(29,158,117,0.16) 0%, rgba(255,255,255,0.92) 100%)'
                : 'linear-gradient(135deg, rgba(244,162,97,0.2) 0%, rgba(255,255,255,0.92) 100%)',
            border: '1px solid rgba(20,33,61,0.1)',
            boxShadow: '0 12px 26px rgba(20,33,61,0.08)',
            borderRadius: 20,
            padding: '1.25rem',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 500 }}>{m.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <SectionTitle>Dernières détections</SectionTitle>

      {detections.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '2rem 0' }}>
          Aucune détection pour l'instant...
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {detections.slice(0, 10).map((d, i) => {
          const pct = getCertitude(d.connu, d.distance)
          return (
            <Card key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderLeft: i === 0 ? '4px solid #1D9E75' : '1px solid rgba(20,33,61,0.1)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{d.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {d.date} · FaceNet512
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.heure}</div>
                <Badge known={d.connu} />
                <CertitudeBadge pct={pct} known={d.connu} />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
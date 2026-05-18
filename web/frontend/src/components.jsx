import { NavLink } from 'react-router-dom'

export function Badge({ known }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 8px', borderRadius: 6,
      background: known ? '#E1F5EE' : '#FCEBEB',
      border: `1px solid ${known ? 'rgba(15,110,86,0.18)' : 'rgba(163,45,45,0.18)'}`,
      color: known ? '#0F6E56' : '#A32D2D',
    }}>
      {known ? 'Reconnu(e)' : 'Inconnu(e)'}
    </span>
  )
}

export function CertitudeBadge({ pct, known }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 500,
      color: known ? '#0F6E56' : '#A32D2D',
    }}>
      {pct}%
    </span>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #fafdff 100%)',
      border: '1px solid rgba(20,33,61,0.1)',
      boxShadow: '0 14px 30px rgba(20,33,61,0.08)',
      borderRadius: 12, padding: '1rem 1.25rem', ...style,
    }}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
      letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

export function Navbar() {
  const linkStyle = ({ isActive }) => ({
    fontSize: 15, textDecoration: 'none', padding: '6px 14px',
    borderRadius: 8, fontWeight: isActive ? 500 : 400,
    background: isActive ? 'linear-gradient(90deg, rgba(18,130,162,0.18) 0%, rgba(244,162,97,0.2) 100%)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(18,130,162,0.24)' : 'transparent'}`,
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'all 0.15s',
  })

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid rgba(20,33,61,0.12)',
      padding: '0.65rem 2rem', display: 'flex', alignItems: 'center',
      flexWrap: 'wrap', rowGap: 8, gap: 6, minHeight: 56,
      position: 'sticky', top: 0, zIndex: 20,
      backdropFilter: 'blur(8px)',
    }}>

      <NavLink to="/" style={linkStyle}>Dashboard</NavLink>
      <NavLink to="/bd" style={linkStyle}>Base de données</NavLink>
      <NavLink to="/historique" style={linkStyle}>Historique</NavLink>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0F6E56', fontWeight: 600 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s infinite' }} />
        Caméra active
      </div>
    </nav>
  )
}

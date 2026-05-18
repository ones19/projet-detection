// ========================================
// PAGE HISTORIQUE — Affichage des détections passées
// ========================================

import { useState, useEffect } from 'react'
import { getCertitude, API } from '../data'  // getCertitude = fonction pour calculer % de certitude; API = URL backend
import { Badge, CertitudeBadge, SectionTitle } from '../components'  // Composants réutilisables

// ========================================
// CONSTANTES — Options de filtrage
// ========================================
// FILTERS: tableau d'objets pour les filtres temporels (aujourd'hui, 7j, tout)
const FILTERS = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 derniers jours', value: 'week' },
  { label: 'Tout', value: 'all' },
]

// ========================================
// COMPOSANT PRINCIPAL
// ========================================
export default function Historique() {
  // État 1: detections = liste de toutes les détections (objets { id, nom, date, heure, connu, distance })
  const [detections, setDetections] = useState([])
  // État 2: filter = filtre temporel sélectionné ('today', 'week', 'all')
  const [filter, setFilter] = useState('today')
  // État 3: person = personne filtrée ('all' ou un nom spécifique)
  const [person, setPerson] = useState('all')
  // État 4: persons = liste des personnes enregistrées depuis l'API /personnes
  const [persons, setPersons] = useState([])

  // ========================================
  // CHARGEMENT DES DONNÉES AU MONTAGE
  // ========================================
  // Une seule fois (dépendance vide []) : fetch les détections et personnes depuis le backend
  useEffect(() => {
    fetch(`${API}/detections`).then(r => r.json()).then(setDetections)  // GET /detections → met à jour l'état detections
    fetch(`${API}/personnes`).then(r => r.json()).then(setPersons)      // GET /personnes → met à jour l'état persons
  }, [])

  // ========================================
  // CALCUL DES DATES LIMITES
  // ========================================
  // today = date d'aujourd'hui au format YYYY-MM-DD (ex: "2026-05-11")
  const today = new Date().toISOString().slice(0, 10)
  // week = date d'il y a 7 jours (pour le filtre "7 derniers jours")
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // ========================================
  // LOGIQUE DE FILTRAGE
  // ========================================
  // Démarre avec toutes les détections, puis applique les filtres sélectionnés
  let filtered = detections
  // Filtre 1 : par période temporelle
  if (filter === 'today') filtered = filtered.filter(d => d.date === today)      // Seulement aujourd'hui
  if (filter === 'week') filtered = filtered.filter(d => d.date >= week)          // 7 derniers jours
  // Filtre 2 : par personne (remarque: "unknown" n'est pas implémenté, mais code présent)
  if (filter === 'unknown') filtered = filtered.filter(d => !d.connu)             // Seulement détections inconnues
  if (person !== 'all') filtered = filtered.filter(d => d.nom === person)         // Filtre par nom de personne

  // ========================================
  // GROUPEMENT PAR DATE
  // ========================================
  // Regroupe les détections filtrées par date pour affichage par sections
  // Résultat: objet { "2026-05-11": [d1, d2, ...], "2026-05-10": [...] }
  const grouped = filtered.reduce((acc, d) => {
    if (!acc[d.date]) acc[d.date] = []    // Crée un tableau pour cette date si absent
    acc[d.date].push(d)                    // Ajoute la détection au tableau de sa date
    return acc
  }, {})

  // ========================================
  // FONCTION UTILITAIRE — Formatage des dates
  // ========================================
  // Affiche "Aujourd'hui", "Hier", ou la date brute pour améliorer l'UX
  function dateLabel(date) {
    if (date === today) return `Aujourd'hui — ${date}`                             // Jour actuel
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (date === yesterday) return `Hier — ${date}`                                // Hier
    return date                                                                     // Autres jours
  }

  // ========================================
  // RENDU JSX
  // ========================================
  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* ---- HEADER : Titre + Sélecteur de personne ---- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 35, fontWeight: 500 }}>Historique</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Toutes les détections passées</p>
        </div>
        {/* Dropdown pour filtrer par personne */}
        <select style={{ width: 'auto' }} value={person} onChange={e => setPerson(e.target.value)}>
          <option value="all">Toutes les personnes</option>
          {persons.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}  {/* Énumère toutes les personnes en BD */}
          <option value="Inconnu">Inconnu</option>  {/* Option pour voir seulement les inconnus */}
        </select>
      </div>

      {/* ---- FILTRES TEMPORELS : Boutons pour aujourd'hui / 7j / tout ---- */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            fontSize: 12, padding: '6px 14px',
            background: filter === f.value
              ? 'linear-gradient(110deg, rgba(18,130,162,0.16) 0%, rgba(244,162,97,0.2) 100%)'  // Dégradé si actif
              : '#fff',  // Blanc si inactif
            color: filter === f.value ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: `1px solid ${filter === f.value ? 'rgba(18,130,162,0.28)' : 'rgba(20,33,61,0.12)'}`,
            fontWeight: filter === f.value ? 600 : 500,
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ---- MESSAGE VIDE ---- */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '2rem 0' }}>
          Aucune détection pour ce filtre.
        </div>
      )}

      {/* ---- SECTIONS PAR DATE (triées du plus récent au plus ancien) ---- */}
      {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
        <div key={date} style={{ marginBottom: '1.5rem' }}>
          <SectionTitle>{dateLabel(date)}</SectionTitle>  {/* Titre: "Aujourd'hui — 2026-05-11" etc */}
          {/* Conteneur de table avec gradient et ombre */}
          <div style={{
            background: 'linear-gradient(170deg, #ffffff 0%, #f8fcff 100%)',
            border: '1px solid rgba(20,33,61,0.1)',
            boxShadow: '0 14px 30px rgba(20,33,61,0.08)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {/* Tableau: une ligne = une détection */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* En-têtes de colonnes */}
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
              {/* Corps de la table : une ligne par détection */}
              <tbody>
                {grouped[date].map((d, i) => {
                  const pct = getCertitude(d.connu, d.distance)  // Calcule le % de confiance
                  return (
                    <tr key={d.id}>
                      {/* Colonne 1 : Nom de la personne détectée */}
                      <td style={{ padding: '10px 14px', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13 }}>{d.nom}</span>  {/* Nom ou "Inconnu" */}
                        </div>
                      </td>
                      {/* Colonne 2 : Heure de la détection */}
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>{d.heure}</td>
                      {/* Colonne 3 : Badge Reconnu/Inconnu */}
                      <td style={{ padding: '10px 14px', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <Badge known={d.connu} />  {/* Composant Badge vert ou rouge */}
                      </td>
                      {/* Colonne 4 : Pourcentage de certitude */}
                      <td style={{ padding: '10px 14px', borderBottom: i < grouped[date].length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <CertitudeBadge pct={pct} known={d.connu} />  {/* Ex: "95%" */}
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
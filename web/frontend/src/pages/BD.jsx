import { useState, useEffect, useRef } from 'react'
import { API } from '../data'
import { Card, SectionTitle } from '../components'

export default function BD() {
  const [persons, setPersons] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [photos, setPhotos] = useState([]) 
  const [mode, setMode] = useState('file')
  const [cameraActive, setCameraActive] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  function fetchPersons() {
    fetch(`${API}/personnes`)
      .then(r => r.json())
      .then(data => setPersons(data))
  }

  useEffect(() => { fetchPersons() }, [])
  useEffect(() => { if (!showForm) stopCamera() }, [showForm])

  async function ouvrirCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch (e) {
      alert("Impossible d'accéder à la caméra : " + e.message)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  function prendrePhoto() {
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      const preview = URL.createObjectURL(blob)
      setPhotos(prev => [...prev, { file, preview }])
    }, 'image/jpeg', 0.95)
  }

  function supprimerPhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files)
    const nouvelles = files.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setPhotos(prev => [...prev, ...nouvelles])
  }

  function switchMode(m) {
    setMode(m)
    if (m !== 'camera') stopCamera()
  }

  function resetForm() {
    setName('')
    setPhotos([])
    stopCamera()
    setShowForm(false)
  }

  async function addPerson() {
    if (!name.trim() || photos.length === 0) return
    try {
      for (let i = 0; i < photos.length; i++) {
        const form = new FormData()
        form.append('nom', name.trim())
        form.append('photo', photos[i].file)

        const response = await fetch(`${API}/personnes`, {
          method: 'POST',
          body: form,
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(`photo ${i + 1}: ${response.status} ${message}`)
        }
      }

      resetForm()
      fetchPersons()
    } catch (error) {
      alert(`Impossible d'enregistrer la personne : ${error.message}`)
    }
  }

  async function deletePerson(nom) {
    await fetch(`${API}/personnes/${encodeURIComponent(nom)}`, { method: 'DELETE' })
    fetchPersons()
  }

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>Base de données</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Gérer les personnes enregistrées</p>
        </div>
        <button className="primary" onClick={() => setShowForm(v => !v)}>+ Ajouter</button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <SectionTitle>Nouvelle personne</SectionTitle>

          {/* Nom */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Nom complet</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Alice Martin" />
          </div>

          {/* Toggle fichier / caméra */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Photos de référence</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => switchMode('file')} style={{
              fontSize: 12, padding: '5px 12px',
              background: mode === 'file' ? 'linear-gradient(110deg, rgba(18,130,162,0.16) 0%, rgba(244,162,97,0.2) 100%)' : '#fff',
              border: `1px solid ${mode === 'file' ? 'rgba(18,130,162,0.28)' : 'rgba(20,33,61,0.12)'}`,
              fontWeight: mode === 'file' ? 600 : 400,
            }}> Fichiers</button>
            <button onClick={() => switchMode('camera')} style={{
              fontSize: 12, padding: '5px 12px',
              background: mode === 'camera' ? 'linear-gradient(110deg, rgba(18,130,162,0.16) 0%, rgba(244,162,97,0.2) 100%)' : '#fff',
              border: `1px solid ${mode === 'camera' ? 'rgba(18,130,162,0.28)' : 'rgba(20,33,61,0.12)'}`,
              fontWeight: mode === 'camera' ? 600 : 400,
            }}>Caméra</button>
          </div>

          {/* Mode fichier */}
          {mode === 'file' && (
            <div style={{ marginBottom: 14 }}>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Tu peux sélectionner plusieurs fichiers à la fois
              </div>
            </div>
          )}

          {/* Mode caméra */}
          {mode === 'camera' && (
            <div style={{ marginBottom: 14 }}>
              {!cameraActive && (
                <button onClick={ouvrirCamera} style={{ fontSize: 13, marginBottom: 8 }}>
                  Ouvrir la caméra
                </button>
              )}
              <video ref={videoRef} autoPlay playsInline style={{
                display: cameraActive ? 'block' : 'none',
                width: '100%', maxWidth: 320, borderRadius: 10,
                border: '1px solid rgba(20,33,61,0.12)', marginBottom: 8,
              }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {cameraActive && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={prendrePhoto} className="primary" style={{ fontSize: 13 }}>
                     Capturer
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {photos.length} photo{photos.length > 1 ? 's' : ''} prise{photos.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Grille des photos */}
          {photos.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                 {photos.length} photo{photos.length > 1 ? 's' : ''} — plus t'en as, mieux c'est !
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={p.preview} alt={`photo ${i + 1}`} style={{
                      width: 80, height: 80, objectFit: 'cover',
                      borderRadius: 8, border: '1px solid rgba(20,33,61,0.12)',
                    }} />
                    <button onClick={() => supprimerPhoto(i)} style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 18, height: 18, borderRadius: '50%',
                      padding: 0, fontSize: 11, background: '#d64f4f',
                      color: '#fff', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={resetForm}>Annuler</button>
            <button className="primary" onClick={addPerson} disabled={!name.trim() || photos.length === 0}>
              Enregistrer ({photos.length} photo{photos.length > 1 ? 's' : ''})
            </button>
          </div>
        </Card>
      )}

      <SectionTitle>{persons.length} personne{persons.length > 1 ? 's' : ''} enregistrée{persons.length > 1 ? 's' : ''}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 }}>
        {persons.map(p => (
          <div key={p.id} style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #f3fbff 100%)',
            border: '1px solid rgba(20,33,61,0.1)',
            boxShadow: '0 12px 24px rgba(20,33,61,0.08)',
            borderRadius: 12, padding: '1.25rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 10, position: 'relative',
          }}>
            <button onClick={() => deletePerson(p.nom)} style={{
              position: 'absolute', top: 8, right: 8,
              width: 22, height: 22, borderRadius: '50%',
              padding: 0, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}>×</button>
            <div style={{ fontSize: 14, fontWeight: 500, textAlign: 'center' }}>{p.nom}</div>
          </div>
        ))}

        <div onClick={() => setShowForm(true)} style={{
          background: 'linear-gradient(140deg, rgba(18,130,162,0.12) 0%, rgba(244,162,97,0.18) 100%)',
          border: '1px dashed rgba(20,33,61,0.24)',
          borderRadius: 12, padding: '1.25rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 140,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '0.5px solid rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'var(--text-secondary)',
          }}>+</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ajouter</div>
        </div>
      </div>
    </div>
  )
}
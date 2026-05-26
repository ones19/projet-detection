from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os
import requests as req


app = FastAPI() 
PI_URL = "http://<IP_DE_LA_PI>:8001" 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# ── Base de données ──
engine = create_engine("sqlite:///database.db")
Base = declarative_base()
Session = sessionmaker(bind=engine)

class Personne(Base):
    __tablename__ = "personnes"
    id = Column(Integer, primary_key=True)
    nom = Column(String, unique=True)
    photo_path = Column(String)
    created_at = Column(DateTime, default=datetime.now)

class Detection(Base):
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True)
    nom = Column(String)
    connu = Column(Integer)  # 1 = connu, 0 = inconnu
    distance = Column(Float)
    date = Column(String)
    heure = Column(String)

Base.metadata.create_all(engine)

# ── Routes Personnes ──
@app.get("/personnes")
def get_personnes():
    db = Session() 
    personnes = db.query(Personne).all()
    db.close()
    return [{"id": p.id, "nom": p.nom, "photo_path": p.photo_path} for p in personnes]

@app.post("/personnes")
async def add_personne(nom: str = Form(...), photo: UploadFile = File(...)):
    os.makedirs("photos", exist_ok=True)
    contenu = await photo.read()
    path = f"photos/{nom}_{photo.filename}"
    with open(path, "wb") as f:
        f.write(contenu)

    db = Session()
    existe = db.query(Personne).filter(Personne.nom == nom).first()
    if not existe:
        db.add(Personne(nom=nom, photo_path=path))
        db.commit()
    db.close()

    try:
        req.post(
            f"{PI_URL}/bd/ajouter",
            data={"nom": nom},
            files={"photo": (photo.filename, contenu, photo.content_type)},
            timeout=5
        )
    except Exception as e:
        print(f"[PI] Erreur forward BD : {e}")

    return {"message": "Personne ajoutée", "nom": nom}

@app.delete("/personnes/{nom}")
def delete_personne(nom: str):
    # Supprime de la base de données PC
    db = Session()
    db.query(Personne).filter(Personne.nom == nom).delete()
    db.commit()
    db.close()

    try:
        req.delete(f"{PI_URL}/bd/supprimer/{nom}", timeout=5)
    except Exception as e:
        print(f"[PI] Erreur suppression BD : {e}")

    return {"message": "Personne supprimée"}

# ── Routes Détections ──
@app.get("/detections")
def get_detections():
    db = Session()
    detections = db.query(Detection).order_by(Detection.id.desc()).all()
    db.close()
    return [{"id": d.id, "nom": d.nom, "connu": d.connu, "distance": d.distance if d.distance and d.distance != float('inf') else 9.9999, "date": d.date, "heure": d.heure} for d in detections]

@app.post("/detections")
def add_detection(nom: str, connu: int, distance: float):
    now = datetime.now()
    db = Session()
    db.add(Detection(
        nom=nom, connu=connu, distance=distance,
        date=now.strftime("%Y-%m-%d"),
        heure=now.strftime("%H:%M")
    ))
    db.commit()
    db.close()
    return {"message": "Détection enregistrée"}


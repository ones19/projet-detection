from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil, os

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BD_PATH = "./BD"

@app.post("/bd/ajouter")
async def ajouter(nom: str = Form(...), photo: UploadFile = File(...)):
    dossier = f"{BD_PATH}/{nom}"
    os.makedirs(dossier, exist_ok=True)
    chemin = f"{dossier}/{photo.filename}"
    with open(chemin, "wb") as f:
        shutil.copyfileobj(photo.file, f)
    return {"message": f"{nom} ajouté dans BD"}

@app.delete("/bd/supprimer/{nom}")
def supprimer(nom: str):
    dossier = f"{BD_PATH}/{nom}"
    if os.path.exists(dossier):
        shutil.rmtree(dossier)
    return {"message": f"{nom} supprimé"}
# Projet Detection — Système de surveillance intelligent (Raspberry Pi + PC)

Architecture à 2 machines : la **Raspberry Pi** gère la caméra et le pipeline IA, le **PC** héberge le backend principal et le frontend React.

---

## Structure du repo

```
projet-detection/
├── pi/
│   ├── test_finale.py       ← pipeline caméra + détection + reconnaissance
│   └── bd_server.py         ← mini API BD (port 8001)
├── web/
│   ├── backend/
│   │   └── main.py          ← backend principal (port 8000)
│   └── frontend/
│       ├── src/
│       │   ├── pages/       ← Dashboard, BD, Historique
│       │   ├── App.jsx
│       │   ├── data.js      ← URL API à configurer
│       │   └── ...
│       └── index.html
├── requirements.txt
└── README.md
```

---

## Prérequis

| Machine | Prérequis |
|---|---|
| Raspberry Pi 4 | Python 3.10+, Picamera2, accès réseau vers le PC |
| PC | Python 3.10+, Node.js 18+, npm, accès réseau vers la Pi |

---

## Installation

### Raspberry Pi

```bash
# Copier le dossier pi/ sur la Pi
scp -r pi/ user@<IP_DE_LA_PI>:~/projet_detection/pipeline_complet/

# Sur la Pi : créer le venv et installer les dépendances
cd ~/projet_detection
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn python-multipart opencv-python numpy requests ultralytics deepface
# Pour torch, suivre les instructions officielles selon ta plateforme
```

Télécharger les modèles (trop lourds pour Git) :

```bash
# Modèle YOLO
mkdir -p ~/projet_detection/modele_yolo_320.onnx
wget -P ~/projet_detection/modele_yolo_320.onnx \
  https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx

# Modèle DNN visage
mkdir -p ~/projet_detection/pipeline_complet/dnn_config
cd ~/projet_detection/pipeline_complet/dnn_config
wget https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt
wget https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000_fp16.caffemodel
```

### PC

```bash
# Backend
cd web/backend
python3 -m venv venv
source venv/bin/activate          # Linux/macOS
# .\\venv\\Scripts\\Activate.ps1  # Windows PowerShell
pip install fastapi uvicorn sqlalchemy python-multipart requests

# Frontend
cd web/frontend
npm install
```

---

## Configuration réseau

Avant de lancer, adapter les IPs dans ces 3 fichiers :

| Fichier | Variable | Valeur |
|---|---|---|
| `pi/test_finale.py` | `backend_url` | `http://<IP_DU_PC>:8000` |
| `web/backend/main.py` | `PI_URL` | `http://<IP_DE_LA_PI>:8001` |
| `web/frontend/src/data.js` | `API` | `http://<IP_DU_PC>:8000` |

> `ipconfig` (Windows) ou `ip addr` (Linux) pour l'IP du PC  
> `hostname -I` sur la Pi pour son IP

---

## Lancement

Dans cet ordre :

```bash
# 1. Sur la Pi — mini backend BD
cd ~/projet_detection/pipeline_complet && source ../venv/bin/activate
python -m uvicorn bd_server:app --host 0.0.0.0 --port 8001

# 2. Sur le PC — backend principal
cd web/backend && uvicorn main:app --host 0.0.0.0 --port 8000

# 3. Sur le PC — frontend
cd web/frontend && npm run dev

# 4. Sur la Pi — pipeline de détection
cd ~/projet_detection/pipeline_complet && source ../venv/bin/activate
python test_finale.py
```

Ouvrir le navigateur sur : `http://localhost:5173`

---

## Tests rapides

```bash
# Vérifier le backend PC
curl http://<IP_DU_PC>:8000/personnes

# Ajouter une personne
curl -X POST "http://<IP_DU_PC>:8000/personnes" \
  -F "nom=Curtis" -F "photo=@/chemin/vers/photo.jpg"

# Supprimer une personne
curl -X DELETE "http://<IP_DU_PC>:8000/personnes/Curtis"

# Vérifier le mini-backend Pi
curl http://<IP_DE_LA_PI>:8001/docs
```

---

## Troubleshooting

- **Frontend n'affiche rien** → vérifier que `web/backend` tourne et que `GET /personnes` renvoie du JSON
- **Ajout depuis le frontend échoue** → vérifier `API` dans `data.js` et les logs uvicorn
- **Pi ne joint pas le PC** → vérifier `backend_url` dans `test_finale.py` et que le port 8000 est accessible
- **Caméra inaccessible** → vérifier les droits Picamera2 (`sudo apt install python3-picamera2`)
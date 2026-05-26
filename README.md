# Projet Detection - Guide Utilisateur (Raspberry Pi + PC)

Ce projet fonctionne avec une architecture a 2 machines:

- **Raspberry Pi**: traitement camera (detection/reconnaissance) + mini backend BD.
- **PC**: application web complete (backend principal + frontend React).


---

## 0) Recuperer le code

Cloner le repo sur le PC:

```bash
git clone https://github.com/ones19/projet-detection.git
cd projet-detection
```

Structure du repo:
```
projet-detection/
├── pi/                  ← code a deployer sur la Raspberry Pi
│   ├── test_finale.py
│   └── bd_server.py
├── web/                 ← application web a lancer sur le PC
│   ├── backend/
│   │   └── main.py
│   └── frontend/
│       ├── src/
│       │   ├── pages/
│       │   ├── App.jsx
│       │   ├── data.js
│       │   └── ...
│       └── index.html
└── README.md
```

---

## 1) Architecture

### Cote Raspberry Pi

- `pi/test_finale.py`
  - capture camera,
  - detection personnes + visages,
  - reconnaissance faciale,
  - envoi des detections au backend PC (`/detections`).

- `pi/bd_server.py`
  - mini API BD (port 8001),
  - recoit les photos envoyees par le backend PC,
  - stocke/supprime les photos dans `BD/`.

### Cote PC

- `web/backend/main.py`
  - backend principal (port 8000),
  - gere SQLite (personnes + detections),
  - recoit les detections de la Pi,
  - transfere les ajouts/suppressions de photos vers la Pi.

- `web/frontend/`
  - frontend React,
  - consomme les API du backend PC.

---

## 2) Flux de donnees

1. Ajout personne depuis frontend → backend PC → backend Pi (`/bd/ajouter`).
2. Suppression personne depuis frontend → backend PC → backend Pi (`/bd/supprimer/{nom}`).
3. Detection sur Pi → backend PC (`/detections`) → historique visible dans frontend.

---

## 3) Prerequis

### Raspberry Pi
- Raspberry Pi 4
- Camera Pi configuree (Picamera2)
- Python 3.10+
- Acces reseau vers le PC

### PC
- Python 3.10+
- Node.js 18+
- npm
- Acces reseau vers la Raspberry Pi

---

## 4) Installation Raspberry Pi

### Copier les fichiers Pi sur la Raspberry

Depuis le PC, copier le dossier `pi/` sur la Pi:

```bash
scp -r pi/ user@IP_DE_LA_PI:~/projet_detection/pipeline_complet/
```

### Creer le venv et installer les dependances

Sur la Raspberry Pi:

```bash
cd ~/projet_detection
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn python-multipart opencv-python numpy requests ultralytics deepface torch torchvision
```

### Telecharger les modeles

Les modeles ne sont pas dans Git (trop lourds). Les telecharger sur la Pi:

**Modele YOLO:**
```bash
mkdir -p ~/projet_detection/modele_yolo_320.onnx
cd ~/projet_detection/modele_yolo_320.onnx
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx
```

**Modele DNN visage:**
```bash
mkdir -p ~/projet_detection/pipeline_complet/dnn_config
cd ~/projet_detection/pipeline_complet/dnn_config
wget https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt
wget https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000_fp16.caffemodel
```

Verifier que les fichiers existent:
- `~/projet_detection/modele_yolo_320.onnx/yolov8n.onnx`
- `~/projet_detection/pipeline_complet/dnn_config/deploy.prototxt`
- `~/projet_detection/pipeline_complet/dnn_config/res10_300x300_ssd_iter_140000_fp16.caffemodel`

---

## 5) Installation PC

### Backend PC

```bash
cd web/backend

# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux/macOS
python3 -m venv venv
source venv/bin/activate

pip install fastapi uvicorn sqlalchemy python-multipart requests
```

### Frontend PC

```bash
cd web/frontend
npm install
```

---

## 6) Configuration reseau (important)

### Dans la Raspberry Pi: URL du backend PC

Dans `pi/test_finale.py`, modifier:

```python
backend_url = "http://IP_DU_PC:8000"
```

### Dans le backend PC: URL de la Raspberry Pi

Dans `web/backend/main.py`, modifier:

```python
PI_URL = "http://IP_DE_LA_PI:8001"
```

### Dans le frontend PC: URL du backend PC

Dans `web/frontend/src/data.js`, modifier:

```javascript
export const API = "http://IP_DU_PC:8000"
```

> Pour trouver l'IP du PC: `ipconfig` (Windows) ou `ip addr` (Linux)
> Pour trouver l'IP de la Pi: `hostname -I` (sur la Pi)

---

## 7) Ordre de lancement

**1. Sur Raspberry Pi: lancer le mini backend BD**
```bash
cd ~/projet_detection/pipeline_complet
source ../venv/bin/activate
python -m uvicorn bd_server:app --host 0.0.0.0 --port 8001
```

**2. Sur PC: lancer le backend principal**
```bash
cd web/backend
# activer le venv
uvicorn main:app --host 0.0.0.0 --port 8000
```

**3. Sur PC: lancer le frontend**
```bash
cd web/frontend
npm run dev
```

**4. Sur Raspberry Pi: lancer le pipeline detection**
```bash
cd ~/projet_detection/pipeline_complet
source ../venv/bin/activate
python test_finale.py
```

Ouvrir le navigateur sur: `http://localhost:5173`

---

## 8) Tests rapides

Depuis le PC, verifier que la Pi repond:
```bash
curl http://IP_DE_LA_PI:8001/docs
```

Depuis la Pi, verifier que le backend PC repond:
```bash
curl http://IP_DU_PC:8000/detections
```

## 10) Resume d'exploitation

| Composant | Machine | Commande |
|---|---|---|
| bd_server.py | Raspberry Pi | `python -m uvicorn bd_server:app --host 0.0.0.0 --port 8001` |
| test_finale.py | Raspberry Pi | `python test_finale.py` |
| main.py | PC | `uvicorn main:app --host 0.0.0.0 --port 8000` |
| Frontend React | PC | `npm run dev` |

---

## 11) Fichiers à configurer

Avant de lancer le projet, vérifie et adapte ces valeurs dans les fichiers indiqués :

- Raspberry Pi (envoi des détections vers le PC) : modifier `backend_url` dans `pi/test_finale.py`
  ```py
  backend_url = "http://<IP_DU_PC>:8000"
  ```
- Backend PC (forward vers la Pi pour la BD) : modifier `PI_URL` dans `web/backend/main.py`
  ```py
  PI_URL = "http://<IP_DE_LA_PI>:8001"
  ```
- Frontend (URL API) : modifier `API` dans `web/frontend/src/data.js`
  ```js
  export const API = "http://<IP_DU_PC>:8000"
  ```

Remplace `<IP_DU_PC>` et `<IP_DE_LA_PI>` par les adresses IP réelles de tes machines sur le réseau local.

## 12) Tests manuels (curl)

Utiles pour vérifier rapidement que chaque composant répond :

- Lister les personnes (backend PC)
```bash
curl http://<IP_DU_PC>:8000/personnes
```

- Ajouter une personne (envoi d'un fichier, test depuis PC)
```bash
curl -X POST "http://<IP_DU_PC>:8000/personnes" \
  -F "nom=Curtis" \
  -F "photo=@/chemin/vers/photo.jpg"
```

- Supprimer une personne
```bash
curl -X DELETE "http://<IP_DU_PC>:8000/personnes/Curtis"
```

- Vérifier le mini-backend sur la Pi (Swagger UI)
```bash
curl http://<IP_DE_LA_PI>:8001/docs
```



## 13) Dépendances et installation

Un fichier `requirements.txt` est fourni avec les dépendances recommandées. Pour installer :

```bash
python -m pip install -r requirements.txt
```

Remarque sur `torch` : l'installation varie selon GPU/CPU et plateforme. Si tu n'as pas besoin d'accélération GPU, installe la version CPU de torch comme indiqué dans la doc officielle.


## 14) Troubleshooting rapide

- Si le frontend n'affiche rien pour les personnes : vérifie que `web/backend` tourne et que `GET /personnes` renvoie un JSON.
- Si l'ajout depuis le frontend ne fonctionne pas : vérifier `API` dans `web/frontend/src/data.js` et regarder les logs du backend (`uvicorn main:app`).
- Si la Pi ne peut pas joindre le PC : vérifier `backend_url` dans `pi/test_finale.py` et que les ports 8000/8001 sont accessibles.
- Si appareil photo non accessible : vérifier les droits/driver (Picamera2) et essayer une photo locale.

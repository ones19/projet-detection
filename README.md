# Projet Detection - Guide Utilisateur (Raspberry Pi + PC)

Ce projet fonctionne avec une architecture a 2 machines:

- Raspberry Pi: traitement camera (detection/reconnaissance) + mini backend BD.
- PC: application Fablab complete (backend principal + frontend React).

Le frontend ne parle jamais a la Raspberry directement.
Tout passe par le backend PC.

## 0) Recuperer le code (cloner le repo)

Le meme repo doit etre clone sur les 2 machines:

- sur le PC (pour App_Fablab),
- sur la Raspberry Pi (pour le pipeline detection).

```bash
git clone <URL_DU_REPO>
cd projet_detection
```

Remarque:
- Sur PC, vous utiliserez surtout `pipeline_complet/App_Fablab`.
- Sur Raspberry Pi, vous utiliserez surtout `pipeline_complet` + `modele_yolo_320.onnx`.

## 1) Architecture

### Cote Raspberry Pi

- [pipeline_complet/test_finale.py](pipeline_complet/test_finale.py)
	- capture camera,
	- detection personnes + visages,
	- reconnaissance faciale,
	- envoi des detections au backend PC (`/detections`).

- [pipeline_complet/bd_server.py](pipeline_complet/bd_server.py)
	- mini API BD,
	- recoit les photos envoyees par le backend PC,
	- stocke/supprime les photos dans `pipeline_complet/BD`.

### Cote PC

- [pipeline_complet/App_Fablab/backend/main.py](pipeline_complet/App_Fablab/backend/main.py)
	- backend principal,
	- gere SQLite (personnes + detections),
	- recoit les detections de la Pi,
	- transfere les ajouts/suppressions de photos vers la Pi.

- [pipeline_complet/App_Fablab/files](pipeline_complet/App_Fablab/files)
	- frontend React,
	- consomme les API du backend PC.

## 2) Flux de donnees

1. Ajout personne depuis frontend PC -> backend PC -> backend Pi (`/bd/ajouter`).
2. Suppression personne depuis frontend PC -> backend PC -> backend Pi (`/bd/supprimer/{nom}`).
3. Detection sur Pi -> backend PC (`/detections`) -> historique visible dans frontend.

## 3) Prerequis

### Raspberry Pi

- Python 3.10+
- Camera configuree (Picamera2)
- Acces reseau vers le PC

### PC

- Python 3.10+
- Node.js 18+
- npm
- Acces reseau vers la Raspberry Pi

## 4) Installation Raspberry Pi

Depuis la Raspberry:

```bash
cd ~/projet_detection
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn python-multipart opencv-python numpy requests ultralytics deepface torch torchvision
```

Telecharger les modeles (ils ne sont pas dans Git car trop lourds):

### Modele YOLO (Pi)

```bash
mkdir -p modele_yolo_320.onnx
cd modele_yolo_320.onnx
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx
cd ..
```

### Modele DNN visage (Pi)

```bash
mkdir -p pipeline_complet/dnn_config
cd pipeline_complet/dnn_config
wget https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt
wget https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000_fp16.caffemodel
cd ../..
```

Verifier que les fichiers existent:

- `modele_yolo_320.onnx/yolov8n.onnx`
- `pipeline_complet/dnn_config/deploy.prototxt`
- `pipeline_complet/dnn_config/res10_300x300_ssd_iter_140000_fp16.caffemodel`

## 5) Installation PC (App Fablab)

### Backend PC

```bash
cd pipeline_complet/App_Fablab/backend
python -m venv venv
# Linux/macOS
source venv/bin/activate
# Windows PowerShell
# .\venv\Scripts\Activate.ps1

pip install fastapi uvicorn sqlalchemy python-multipart requests
```

### Frontend PC

```bash
cd pipeline_complet/App_Fablab/files
npm install
```

## 6) Configuration reseau (important)

### Dans la Raspberry: URL du backend PC

Dans [pipeline_complet/test_finale.py](pipeline_complet/test_finale.py), verifier:

```python
backend_url = "http://IP_DU_PC:8000"
```

Exemple:

```python
backend_url = "http://192.168.1.50:8000"
```

### Dans le backend PC: URL du backend Pi

Dans [pipeline_complet/App_Fablab/backend/main.py](pipeline_complet/App_Fablab/backend/main.py), verifier:

- `http://IP_DE_LA_PI:8001/bd/ajouter`
- `http://IP_DE_LA_PI:8001/bd/supprimer/{nom}`

Exemple:

```python
req.post("http://192.168.1.20:8001/bd/ajouter", ...)
req.delete("http://192.168.1.20:8001/bd/supprimer/{nom}", ...)
```

### Dans le frontend PC: URL du backend PC

Dans [pipeline_complet/App_Fablab/files/src/data.js](pipeline_complet/App_Fablab/files/src/data.js), verifier:

```javascript
export const API = "http://IP_DU_PC:8000"
```

Exemple:

```javascript
export const API = "http://192.168.1.50:8000"
```

## 7) Ordre de lancement

1. Sur Raspberry Pi: lancer mini backend BD

```bash
cd ~/projet_detection/pipeline_complet
source ../venv/bin/activate
uvicorn bd_server:app --host 0.0.0.0 --port 8001
```

2. Sur PC: lancer backend principal

```bash
cd pipeline_complet/App_Fablab/backend
# activer le venv
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

3. Sur PC: lancer frontend

```bash
cd pipeline_complet/App_Fablab/files
npm run dev -- --host 0.0.0.0 --port 5173
```

4. Sur Raspberry Pi: lancer pipeline detection

```bash
cd ~/projet_detection/pipeline_complet
source ../venv/bin/activate
python test_finale.py
```

## 8) Tests rapides

Depuis le PC, verifier que la Pi repond:

```bash
curl http://IP_DE_LA_PI:8001/docs
```

Depuis la Pi, verifier que le backend PC repond:

```bash
curl http://IP_DU_PC:8000/detections
```

## 9) Problemes frequents

- Timeout entre PC et Pi:
	- verifier les IP,
	- verifier pare-feu,
	- verifier que les ports 8000/8001 sont ouverts.

- Aucune detection remontee:
	- verifier `backend_url` dans [pipeline_complet/test_finale.py](pipeline_complet/test_finale.py),
	- verifier que backend PC tourne bien sur `0.0.0.0:8000`.

- Ajout personne OK sur PC mais pas sur Pi:
	- verifier les URLs `req.post/req.delete` dans [pipeline_complet/App_Fablab/backend/main.py](pipeline_complet/App_Fablab/backend/main.py),
	- verifier que [pipeline_complet/bd_server.py](pipeline_complet/bd_server.py) tourne sur la Pi.

## 10) Resume d'exploitation

- L'utilisateur installe et lance App_Fablab sur PC.
- L'utilisateur installe et lance les scripts Raspberry sur la Pi.
- Les deux machines communiquent via IP locale.
- Le backend PC est le point central (BD + historique + API frontend).

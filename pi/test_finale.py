import os
import sys
import time
import signal
import threading
import cv2
import numpy as np
import requests
from types import SimpleNamespace
from typing import List, Tuple, Optional
from ultralytics import YOLO

if "/usr/lib/python3/dist-packages" not in sys.path:
    sys.path.append("/usr/lib/python3/dist-packages")

try:
    from picamera2 import Picamera2
except ImportError:
    Picamera2 = None


CONFIG = SimpleNamespace(
    picam_width   = 1280,
    picam_height  = 720,
    picam_fps     = 30,
    yolo_model    = "/home/ones/projet_detection/modele_yolo_320.onnx/yolov8n.onnx",
    yolo_size     = 320,
    yolo_conf     = 0.5,
    face_dnn_prototxt = "/home/ones/projet_detection/pipeline_complet/dnn_config/deploy.prototxt",
    face_dnn_model    = "/home/ones/projet_detection/pipeline_complet/dnn_config/res10_300x300_ssd_iter_140000_fp16.caffemodel",
    face_dnn_conf     = 0.65,
    deepface_model     = "Facenet512",
    deepface_threshold = 0.5,
    bd_dir = "BD",
    process_every_n      = 6,
    startup_warmup_reads = 20,
    max_empty_reads      = 120,
    backend_url     = "http://<IP_DU_PC>:8000",
    backend_enabled = True,
    save_outputs = True,
    outputs_dir  = "outputs",
    verbose = False,
)


def send_detection(nom: str, connu: int, distance: float) -> None:
    if not CONFIG.backend_enabled:
        return
    try:
        requests.post(
            f"{CONFIG.backend_url}/detections",
            params={
                "nom"      : nom,
                "connu"    : connu,
                "distance" : round(distance, 4),
            },
            timeout=2,
        )
    except Exception as e:
        print(f"[BACKEND] Erreur : {e}")


def save_stage_image(base_dir: str, stage: str, filename: str, image: np.ndarray) -> None:
    if image is None or image.size == 0:
        return
    stage_dir = os.path.join(base_dir, stage)
    os.makedirs(stage_dir, exist_ok=True)
    out_path = os.path.join(stage_dir, filename)
    cv2.imwrite(out_path, image)


class PiCamReader:
    def __init__(self, width: int, height: int, fps: int):
        if Picamera2 is None:
            raise SystemExit("picamera2 introuvable. Installe : sudo apt install python3-picamera2")
        self._cam = Picamera2()
        cfg = self._cam.create_video_configuration(
            main={"size": (width, height), "format": "RGB888"},
            controls={"FrameDurationLimits": (int(1e6 / fps), int(1e6 / fps))},
        )
        self._cam.configure(cfg)
        self._cam.start()
        time.sleep(0.5)

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        frame = self._cam.capture_array()
        if frame is None:
            return False, None
        return True, frame

    def release(self):
        try:
            self._cam.stop()
        except Exception:
            pass


def detect_persons(
    model, frame: np.ndarray, size: int, conf: float) -> List[Tuple[int, int, int, int]]:
    results = model.predict(source=frame, imgsz=size, conf=conf, classes=[0], verbose=False)
    persons = []
    if results and results[0].boxes is not None:
        for box in results[0].boxes:
            persons.append(tuple(map(int, box.xyxy[0].tolist())))
    return persons


def clamp_box(x1: int, y1: int, x2: int, y2: int, w: int, h: int) -> Tuple[int, int, int, int]:
    return (
        max(0, min(w - 1, x1)),
        max(0, min(h - 1, y1)),
        max(0, min(w,     x2)),
        max(0, min(h,     y2)),
    )


def load_face_dnn(prototxt_path: str, model_path: str):
    if not os.path.isfile(prototxt_path):
        raise SystemExit(f"Fichier introuvable : {prototxt_path}")
    if not os.path.isfile(model_path):
        raise SystemExit(f"Fichier introuvable : {model_path}")
    return cv2.dnn.readNetFromCaffe(prototxt_path, model_path)


def extract_face_from_frame_dnn(
    frame: np.ndarray,
    face_net,
    conf_threshold: float,
) -> Optional[np.ndarray]:
    if frame is None or frame.size == 0:
        return None
    h, w = frame.shape[:2]
    if h < 20 or w < 20:
        return None
    blob = cv2.dnn.blobFromImage(
        cv2.resize(frame, (300, 300)),
        1.0, (300, 300), (104.0, 177.0, 123.0),
    )
    face_net.setInput(blob)
    detections = face_net.forward()
    best_box  = None
    best_conf = 0.0
    for i in range(detections.shape[2]):
        conf = float(detections[0, 0, i, 2])
        if conf < conf_threshold or conf <= best_conf:
            continue
        box = detections[0, 0, i, 3:7] * np.array([w, h, w, h], dtype=np.float32)
        x1, y1, x2, y2 = box.astype(np.int32).tolist()
        x1, y1, x2, y2 = clamp_box(x1, y1, x2, y2, w, h)
        if x2 <= x1 or y2 <= y1:
            continue
        best_box  = (x1, y1, x2, y2)
        best_conf = conf
    if best_box is None:
        return None
    x1, y1, x2, y2 = best_box
    face_img = frame[y1:y2, x1:x2].copy()
    return face_img if face_img.size > 0 else None


def load_bd_images(bd_dir: str) -> List[Tuple[str, str]]:
    entries = []
    if not os.path.isdir(bd_dir):
        print(f"[WARN] Dossier BD introuvable : {bd_dir}")
        return entries
    for item in os.listdir(bd_dir):
        item_path = os.path.join(bd_dir, item)
        if os.path.isdir(item_path):
            for f in os.listdir(item_path):
                if f.lower().endswith((".jpg", ".jpeg", ".png")):
                    entries.append((item, os.path.join(item_path, f)))
        elif item.lower().endswith((".jpg", ".jpeg", ".png")):
            name = os.path.splitext(item)[0]
            entries.append((name, item_path))
    print(f"[BD] {len(entries)} image(s) chargée(s) depuis '{bd_dir}'")
    return entries


def build_bd_embeddings(bd_entries, model_name, face_net, face_dnn_conf):
    from deepface import DeepFace
    db_embeddings = []
    for name, ref_path in bd_entries:
        try:
            img = cv2.imread(ref_path)
            face_crop = extract_face_from_frame_dnn(img, face_net, face_dnn_conf)
            if face_crop is None:
                print(f"[BD] Aucun visage détecté dans : {ref_path}")
                continue
            result = DeepFace.represent(
                img_path          = face_crop,
                model_name        = model_name,
                detector_backend  = "skip",
                enforce_detection = False,
            )
            if not result:
                continue
            embedding = result[0]["embedding"] if isinstance(result, list) else result["embedding"]
            db_embeddings.append((name, ref_path, np.asarray(embedding, dtype=np.float32)))
            print(f"[BD]  {name} ✓")
        except Exception as e:
            print(f"[BD]  Échec pour {ref_path} : {e}")
    return db_embeddings


def cosine_distance(vec1: np.ndarray, vec2: np.ndarray) -> float:
    denom = float(np.linalg.norm(vec1) * np.linalg.norm(vec2))
    if denom == 0.0:
        return 1.0
    return 1.0 - float(np.dot(vec1, vec2) / denom)


def recognize_face(
    face_crop    : np.ndarray,
    bd_embeddings: list,
    model_name   : str,
    threshold    : float,
) -> Tuple[Optional[str], Optional[float]]:
    from deepface import DeepFace
    try:
        query = DeepFace.represent(
            img_path          = face_crop,
            model_name        = model_name,
            detector_backend  = "skip",
            enforce_detection = False,
        )
    except Exception as e:
        print(f"[ARCFACE] Erreur : {e}")
        return None, None
    if not query:
        return None, None
    query_emb = query[0]["embedding"] if isinstance(query, list) else query["embedding"]
    query_emb = np.asarray(query_emb, dtype=np.float32)
    best_name = None
    best_dist = float("inf")
    for name, _path, ref_emb in bd_embeddings:
        dist = cosine_distance(query_emb, ref_emb)
        if dist < best_dist:
            best_dist = dist
            best_name = name
    if best_name is not None and best_dist <= threshold:
        return best_name, best_dist
    return None, best_dist


def processing_loop(args, stop_event: threading.Event) -> None:
    bd_entries = load_bd_images(args.bd_dir)
    print("[PI] Chargement DNN visage…")
    face_net = load_face_dnn(args.face_dnn_prototxt, args.face_dnn_model)
    bd_embeddings = build_bd_embeddings(bd_entries, args.deepface_model, face_net, args.face_dnn_conf)
    if not bd_embeddings:
        print("[WARN] BD vide — aucune reconnaissance possible, le pipeline continue.")
    cap = PiCamReader(args.picam_width, args.picam_height, args.picam_fps)
    print("[PI] Chargement YOLO…")
    yolo = YOLO(args.yolo_model)
    if args.save_outputs:
        os.makedirs(args.outputs_dir, exist_ok=True)
    print("[PI] Pipeline démarré \n")
    frame_idx    = 0
    empty_reads  = 0
    warmup_left  = args.startup_warmup_reads
    processed    = 0
    yolo_frames  = 0
    yolo_time    = 0.0
    started      = time.perf_counter()
    last_sent    = None
    try:
        while not stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                empty_reads += 1
                if warmup_left > 0:
                    warmup_left -= 1
                    time.sleep(0.03)
                    continue
                if empty_reads >= args.max_empty_reads:
                    print("[PI] Trop de frames vides consécutives, arrêt.")
                    break
                time.sleep(0.03)
                continue
            empty_reads = 0
            frame_idx  += 1
            if frame_idx % args.process_every_n != 0:
                continue
            processed += 1
            t0 = time.perf_counter()
            persons = detect_persons(yolo, frame, args.yolo_size, args.yolo_conf)
            yolo_time   += time.perf_counter() - t0
            yolo_frames += 1
            if not persons:
                last_sent = None
                continue
            if args.save_outputs and persons:
                yolo_vis = frame.copy()
                for (x1, y1, x2, y2) in persons:
                    cv2.rectangle(yolo_vis, (x1, y1), (x2, y2), (0, 255, 0), 2)
                yolo_file = f"frame_{frame_idx:06d}_persons_{len(persons)}.jpg"
                save_stage_image(args.outputs_dir, "yolo", yolo_file, yolo_vis)
            for person_idx, (x1, y1, x2, y2) in enumerate(persons, start=1):
                person_crop = frame[y1:y2, x1:x2].copy()
                face_crop = extract_face_from_frame_dnn(person_crop, face_net, args.face_dnn_conf)
                if face_crop is None:
                    continue
                if args.save_outputs:
                    dnn_file = f"frame_{frame_idx:06d}_person_{person_idx}_face.jpg"
                    save_stage_image(args.outputs_dir, "dnn", dnn_file, face_crop)
                name, dist = recognize_face(
                    face_crop, bd_embeddings, args.deepface_model, args.deepface_threshold
                )
                nom      = name if name else "Inconnu"
                dist_val = dist if dist is not None else 1.0
                if args.save_outputs:
                    deepface_vis = face_crop.copy()
                    cv2.putText(
                        deepface_vis,
                        f"{nom} | {dist_val:.3f}",
                        (8, 22),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (0, 255, 0) if name else (0, 0, 255),
                        2,
                        cv2.LINE_AA,
                    )
                    deepface_file = f"frame_{frame_idx:06d}_person_{person_idx}_{nom}.jpg"
                    save_stage_image(args.outputs_dir, "deepface", deepface_file, deepface_vis)
                if nom != last_sent:
                    print(f"[MATCH] {nom} | dist={dist_val:.4f}")
                    send_detection(nom=nom, connu=1 if name else 0, distance=dist_val)
                    last_sent = nom
    finally:
        cap.release()
        elapsed  = time.perf_counter() - started
        fps_pipe = processed   / elapsed   if elapsed   > 0 else 0
        fps_yolo = yolo_frames / yolo_time if yolo_time > 0 else 0
        print(f"\n[FIN] frames_traitées={processed} | fps={fps_pipe:.2f} | fps_yolo={fps_yolo:.2f}")


def main():
    stop_event = threading.Event()
    def handle_sigint(_signum, _frame):
        stop_event.set()
        print("\n[PI] Arrêt demandé (Ctrl+C).")
        raise KeyboardInterrupt
    signal.signal(signal.SIGINT, handle_sigint)
    try:
        processing_loop(CONFIG, stop_event)
    except KeyboardInterrupt:
        pass
    finally:
        stop_event.set()
        print("[PI] Pipeline arrêté proprement.")


if __name__ == "__main__":
    main()
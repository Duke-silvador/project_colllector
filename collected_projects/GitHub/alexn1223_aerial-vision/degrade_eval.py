"""Degradation-stratified evaluation for aerial detection.

Builds graded degraded variants of the VisDrone4 val split, then reports
mAP50 per degradation level instead of a single benchmark number.

    python degrade_eval.py build                 # generate degraded datasets
    python degrade_eval.py eval --weights W.pt   # val each condition, write report

Conditions (still-image; link loss is video-level and lives in the clip
harness, not here):

    clean                       reference
    jpeg_q90 / q50 / q20        compression
    blur_5px / blur_15px        directional motion blur
    lowlight_moderate / severe  gamma + additive noise
    oblique_20 / oblique_40     perspective warp from nadir (boxes re-projected)
"""

import argparse
import csv
import math
from pathlib import Path

import cv2
import numpy as np

SRC = Path.home() / "Desktop/My_Projects/datasets/VisDrone4"
DST = Path.home() / "Desktop/My_Projects/datasets/VisDrone4-degraded"
YAML_DIR = Path(__file__).parent / "degraded_yamls"
NAMES = {0: "person", 1: "two_wheeler", 2: "light_vehicle", 3: "heavy_vehicle"}

# condition -> (kind, param)
CONDITIONS = {
    "clean": ("none", None),
    "jpeg_q90": ("jpeg", 90),
    "jpeg_q50": ("jpeg", 50),
    "jpeg_q20": ("jpeg", 20),
    "blur_5px": ("blur", 5),
    "blur_15px": ("blur", 15),
    "lowlight_moderate": ("lowlight", (2.0, 8.0)),   # (gamma, noise sigma)
    "lowlight_severe": ("lowlight", (3.0, 18.0)),
    "oblique_20": ("oblique", 20),
    "oblique_40": ("oblique", 40),
}


def seeded_rng(name: str) -> np.random.Generator:
    return np.random.default_rng(abs(hash(name)) % (2**32))


def apply_jpeg(img: np.ndarray, q: int) -> np.ndarray:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, q])
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def apply_blur(img: np.ndarray, length: int, rng: np.random.Generator) -> np.ndarray:
    angle = rng.uniform(0, 180)
    k = np.zeros((length, length), np.float32)
    k[length // 2, :] = 1.0
    rot = cv2.getRotationMatrix2D((length / 2 - 0.5, length / 2 - 0.5), angle, 1.0)
    k = cv2.warpAffine(k, rot, (length, length))
    k /= k.sum()
    return cv2.filter2D(img, -1, k)


def apply_lowlight(img: np.ndarray, gamma: float, sigma: float,
                   rng: np.random.Generator) -> np.ndarray:
    dark = (255.0 * (img.astype(np.float32) / 255.0) ** gamma)
    noisy = dark + rng.normal(0, sigma, img.shape)
    return np.clip(noisy, 0, 255).astype(np.uint8)


def oblique_homography(w: int, h: int, deg: float) -> np.ndarray:
    """Pinhole camera tilted `deg` from nadir about the horizontal axis (f = w)."""
    f = float(w)
    t = math.radians(deg)
    K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]])
    R = np.array([[1, 0, 0],
                  [0, math.cos(t), -math.sin(t)],
                  [0, math.sin(t), math.cos(t)]])
    H = K @ R @ np.linalg.inv(K)
    # renormalize so the warped frame's bounding box maps back into (w, h)
    corners = np.array([[0, 0], [w, 0], [w, h], [0, h]], np.float32).reshape(-1, 1, 2)
    warped = cv2.perspectiveTransform(corners, H).reshape(-1, 2)
    x0, y0 = warped.min(axis=0)
    x1, y1 = warped.max(axis=0)
    S = np.array([[w / (x1 - x0), 0, -x0 * w / (x1 - x0)],
                  [0, h / (y1 - y0), -y0 * h / (y1 - y0)],
                  [0, 0, 1]])
    return S @ H


def warp_boxes(lines: list[str], H: np.ndarray, w: int, h: int) -> list[str]:
    out = []
    for line in lines:
        p = line.split()
        if len(p) != 5:
            continue
        cls = p[0]
        cx, cy, bw, bh = (float(v) for v in p[1:])
        x0, y0 = (cx - bw / 2) * w, (cy - bh / 2) * h
        x1, y1 = (cx + bw / 2) * w, (cy + bh / 2) * h
        pts = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
                       np.float32).reshape(-1, 1, 2)
        wp = cv2.perspectiveTransform(pts, H).reshape(-1, 2)
        nx0, ny0 = wp.min(axis=0)
        nx1, ny1 = wp.max(axis=0)
        area_before = (nx1 - nx0) * (ny1 - ny0)
        nx0, ny0 = max(nx0, 0), max(ny0, 0)
        nx1, ny1 = min(nx1, w), min(ny1, h)
        if nx1 - nx0 < 2 or ny1 - ny0 < 2:
            continue
        if area_before > 0 and (nx1 - nx0) * (ny1 - ny0) / area_before < 0.2:
            continue  # box mostly warped out of frame
        out.append(
            f"{cls} {(nx0 + nx1) / 2 / w:.6f} {(ny0 + ny1) / 2 / h:.6f} "
            f"{(nx1 - nx0) / w:.6f} {(ny1 - ny0) / h:.6f}"
        )
    return out


def build() -> None:
    img_dir = SRC / "images/val"
    lbl_dir = SRC / "labels/val"
    images = sorted(img_dir.glob("*.jpg"))
    print(f"{len(images)} val images -> {len(CONDITIONS)} conditions")
    YAML_DIR.mkdir(exist_ok=True)

    for cond, (kind, param) in CONDITIONS.items():
        ci = DST / cond / "images/val"
        cl = DST / cond / "labels/val"
        ci.mkdir(parents=True, exist_ok=True)
        cl.mkdir(parents=True, exist_ok=True)

        for img_path in images:
            lbl_path = lbl_dir / (img_path.stem + ".txt")
            lines = lbl_path.read_text().splitlines() if lbl_path.exists() else []
            rng = seeded_rng(cond + img_path.stem)

            if kind == "none":
                img = None  # hard-link instead of re-encoding
                out_lines = lines
            else:
                src_img = cv2.imread(str(img_path))
                h, w = src_img.shape[:2]
                out_lines = lines
                if kind == "jpeg":
                    img = apply_jpeg(src_img, param)
                elif kind == "blur":
                    img = apply_blur(src_img, param, rng)
                elif kind == "lowlight":
                    img = apply_lowlight(src_img, *param, rng)
                elif kind == "oblique":
                    H = oblique_homography(w, h, param)
                    img = cv2.warpPerspective(src_img, H, (w, h))
                    out_lines = warp_boxes(lines, H, w, h)

            dst_img = ci / img_path.name
            if img is None:
                if not dst_img.exists():
                    dst_img.hardlink_to(img_path)
            else:
                cv2.imwrite(str(dst_img), img,
                            [cv2.IMWRITE_JPEG_QUALITY, 95] if kind != "jpeg" else
                            [cv2.IMWRITE_JPEG_QUALITY, param])
            (cl / (img_path.stem + ".txt")).write_text(
                "\n".join(out_lines) + ("\n" if out_lines else "")
            )

        (YAML_DIR / f"{cond}.yaml").write_text(
            f"path: {DST / cond}\ntrain: images/val\nval: images/val\n\nnames:\n"
            + "".join(f"  {k}: {v}\n" for k, v in NAMES.items())
        )
        print(f"  built {cond}")


def evaluate(weights: str, out_csv: str, imgsz: int) -> None:
    from ultralytics import YOLO

    model = YOLO(weights)
    rows = []
    for cond in CONDITIONS:
        yaml = YAML_DIR / f"{cond}.yaml"
        m = model.val(data=str(yaml), imgsz=imgsz, device="mps",
                      plots=False, verbose=False)
        row = {
            "condition": cond,
            "mAP50": round(m.box.map50, 4),
            "mAP50_95": round(m.box.map, 4),
            "precision": round(m.box.mp, 4),
            "recall": round(m.box.mr, 4),
        }
        for i, name in NAMES.items():
            idx = list(m.box.ap_class_index).index(i) if i in m.box.ap_class_index else None
            row[f"mAP50_{name}"] = round(m.box.ap50[idx], 4) if idx is not None else ""
        rows.append(row)
        print(f"{cond:20s} mAP50={row['mAP50']:.3f}")

    with open(out_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {out_csv}")
    print("note: link-loss (frame drop) degradation is video-level; "
          "it is measured in the clip/tracking harness, not per-frame mAP.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("build")
    ev = sub.add_parser("eval")
    ev.add_argument("--weights", required=True)
    ev.add_argument("--imgsz", type=int, default=640)
    ev.add_argument("--out", default="degradation_report.csv")
    args = ap.parse_args()
    if args.cmd == "build":
        build()
    else:
        evaluate(args.weights, args.out, args.imgsz)

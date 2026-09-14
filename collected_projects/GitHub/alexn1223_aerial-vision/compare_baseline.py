"""Baseline (10-class) vs new (4-class) model, per degradation level.

The baseline predicts VisDrone's 10 classes; its predictions are remapped to
the 4-class taxonomy (tricycle predictions dropped) so both models are scored
by the same mAP50 code against the same 4-class ground truth. Deltas are then
model-vs-model, not taxonomy-vs-taxonomy.

    python compare_baseline.py \
        --baseline runs/detect/runs/visdrone_ft/weights/best.pt \
        --new runs/detect/runs/visdrone4_n640/weights/best.pt
"""

import argparse
from pathlib import Path

import numpy as np

from calibrate_confidence import iou_matrix, load_gt

DEGRADED = Path.home() / "Desktop/My_Projects/datasets/VisDrone4-degraded"
CONDITIONS = ["clean", "jpeg_q90", "jpeg_q50", "jpeg_q20", "blur_5px",
              "blur_15px", "lowlight_moderate", "lowlight_severe",
              "oblique_20", "oblique_40"]
NAMES = {0: "person", 1: "two_wheeler", 2: "light_vehicle", 3: "heavy_vehicle"}
PRED_REMAP = {0: 0, 1: 0, 2: 1, 9: 1, 3: 2, 4: 2, 5: 3, 8: 3}  # 10-cls -> 4-cls


def collect(model, root: Path, imgsz: int, remap: bool,
            device: str = "mps", limit: int = 0):
    """Per class: list of (conf, matched) over all images, plus GT counts."""
    images = sorted((root / "images/val").glob("*.jpg"))
    if limit:
        images = images[:limit]
    per_class = {c: [] for c in NAMES}
    n_gt = {c: 0 for c in NAMES}
    # zip with our own ordered list: r.path is unreliable for list sources
    # conf=0.05: at 0.001 VisDrone's dense scenes overwhelm NMS (time-limit
    # truncation -> corrupted AP) and balloon MPS memory; the truncated AP
    # tail affects both models identically so deltas stay valid
    stream = model.predict(source=[str(p) for p in images], imgsz=imgsz,
                           conf=0.05, device=device, stream=True,
                           verbose=False)
    for i, (img_path, r) in enumerate(zip(images, stream)):
        if device == "mps" and i % 50 == 49:
            import torch
            torch.mps.empty_cache()  # streaming predict leaks MPS memory
        if i % 200 == 0:
            print(f"    {i}/{len(images)}", flush=True)
        h, w = r.orig_shape
        gt = load_gt(root / "labels/val" / (img_path.stem + ".txt"), w, h)
        for c in NAMES:
            n_gt[c] += int((gt[:, 0] == c).sum()) if len(gt) else 0

        boxes = r.boxes.xyxy.cpu().numpy()
        cls = r.boxes.cls.cpu().numpy().astype(int)
        conf = r.boxes.conf.cpu().numpy()
        if remap:
            keep = np.array([c in PRED_REMAP for c in cls], bool)
            boxes, conf = boxes[keep], conf[keep]
            cls = np.array([PRED_REMAP[c] for c in cls[keep]], int)
        else:
            keep = np.array([c in NAMES for c in cls], bool)
            boxes, conf, cls = boxes[keep], conf[keep], cls[keep]

        taken = np.zeros(len(gt), bool)
        for i in np.argsort(-conf):
            same = np.where((gt[:, 0] == cls[i]) & ~taken)[0] if len(gt) else []
            matched = False
            if len(same):
                ious = iou_matrix(boxes[i:i + 1], gt[same, 1:5])[0]
                j = ious.argmax()
                if ious[j] >= 0.5:
                    taken[same[j]] = True
                    matched = True
            per_class[cls[i]].append((conf[i], matched))
    return per_class, n_gt


def average_precision(entries, n_gt: int) -> float:
    """All-point interpolated AP at IoU 0.5."""
    if n_gt == 0 or not entries:
        return float("nan")
    entries = sorted(entries, key=lambda e: -e[0])
    tp = np.cumsum([e[1] for e in entries])
    fp = np.cumsum([not e[1] for e in entries])
    recall = tp / n_gt
    precision = tp / (tp + fp)
    # precision envelope, then area under PR curve
    prec = np.concatenate(([0.0], precision, [0.0]))
    rec = np.concatenate(([0.0], recall, [1.0]))
    for i in range(len(prec) - 2, -1, -1):
        prec[i] = max(prec[i], prec[i + 1])
    idx = np.where(rec[1:] != rec[:-1])[0]
    return float(np.sum((rec[idx + 1] - rec[idx]) * prec[idx + 1]))


def map50(model, root: Path, imgsz: int, remap: bool,
          device: str = "mps", limit: int = 0) -> dict:
    per_class, n_gt = collect(model, root, imgsz, remap, device, limit)
    aps = {c: average_precision(per_class[c], n_gt[c]) for c in NAMES}
    valid = [v for v in aps.values() if not np.isnan(v)]
    overall = float(np.mean(valid)) if valid else float("nan")
    return {"mAP50": overall, **{NAMES[c]: aps[c] for c in NAMES}}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True)
    ap.add_argument("--new", required=True)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--device", default="mps")
    ap.add_argument("--limit", type=int, default=0, help="cap image count (0 = all)")
    ap.add_argument("--out", default="comparison_report.md")
    args = ap.parse_args()

    from ultralytics import YOLO

    models = {"baseline": (YOLO(args.baseline), True),
              "new": (YOLO(args.new), False)}
    results = {}
    for cond in CONDITIONS:
        root = DEGRADED / cond
        results[cond] = {}
        for tag, (model, remap) in models.items():
            results[cond][tag] = map50(model, root, args.imgsz, remap,
                                       args.device, args.limit)
            if args.device == "mps":
                import torch
                torch.mps.empty_cache()  # keep the Metal allocator flat
        b, n = results[cond]["baseline"]["mAP50"], results[cond]["new"]["mAP50"]
        print(f"{cond:20s} baseline={b:.3f}  new={n:.3f}  delta={n - b:+.3f}")

    lines = [
        "# Baseline vs new model, mAP50 per degradation level",
        "",
        "Baseline predictions remapped 10->4 classes; same GT, same AP code.",
        "",
        "| condition | baseline | new | delta | " +
        " | ".join(f"new {v}" for v in NAMES.values()) + " |",
        "|---|---|---|---|" + "---|" * len(NAMES),
    ]
    for cond, r in results.items():
        row = (f"| {cond} | {r['baseline']['mAP50']:.3f} "
               f"| {r['new']['mAP50']:.3f} "
               f"| {r['new']['mAP50'] - r['baseline']['mAP50']:+.3f} |")
        row += "".join(f" {r['new'][v]:.3f} |" for v in NAMES.values())
        lines.append(row)
    lines += ["", "Link-loss (frame drops) is video-level and is evaluated in "
              "the clip/tracking harness, not per-frame mAP."]
    Path(args.out).write_text("\n".join(lines) + "\n")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()

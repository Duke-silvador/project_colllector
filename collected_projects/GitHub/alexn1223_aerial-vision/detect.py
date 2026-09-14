"""Detect objects in a video or image with YOLO and save an annotated copy.

Usage:
    uv run detect.py <path-to-video-or-image> [--model yolo11n.pt] [--conf 0.25]

Output lands next to the input as <name>_detected.<ext>.
"""

import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="YOLO detection on a video or image")
    parser.add_argument("source", help="path to a video or image")
    parser.add_argument("--model", default="yolo11n.pt", help="YOLO weights (auto-downloads)")
    parser.add_argument("--conf", type=float, default=0.25, help="confidence threshold")
    parser.add_argument("--imgsz", type=int, default=640, help="inference resolution; raise for aerial shots with small objects")
    parser.add_argument("--track", action="store_true", help="track objects across frames (ByteTrack): one ID per object instead of per-frame recounting")
    args = parser.parse_args()

    source = Path(args.source).expanduser()
    if not source.exists():
        raise SystemExit(f"not found: {source}")

    model = YOLO(args.model)
    # resolve() keeps output next to the input; a relative project path would
    # otherwise be rebased under ultralytics' runs/detect/
    out_dir = source.parent.resolve()

    run = model.track if args.track else model.predict
    results = run(
        source=str(source),
        conf=args.conf,
        imgsz=args.imgsz,
        save=True,
        project=str(out_dir),
        name=f"{source.stem}_{'tracked' if args.track else 'detected'}",
        exist_ok=True,
    )

    if args.track:
        # a (class, track_id) pair is one real object, however many frames it lives
        unique: dict[str, set[int]] = {}
        for r in results:
            if r.boxes.id is None:
                continue
            for cls_id, tid in zip(r.boxes.cls.tolist(), r.boxes.id.tolist()):
                unique.setdefault(model.names[int(cls_id)], set()).add(int(tid))
        print("\n=== unique objects (tracked) ===")
        for name, ids in sorted(unique.items(), key=lambda kv: -len(kv[1])):
            print(f"{name:20s} {len(ids)}")
    else:
        counts: dict[str, int] = {}
        for r in results:
            for cls_id in r.boxes.cls.tolist():
                name = model.names[int(cls_id)]
                counts[name] = counts.get(name, 0) + 1
        print("\n=== detections (total across frames) ===")
        for name, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f"{name:20s} {n}")
    print(f"\nannotated output: {results[0].save_dir if results else out_dir}")


if __name__ == "__main__":
    main()

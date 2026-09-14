"""Collapse VisDrone's 10 classes to 4 for the ISR counting use case.

Writes remapped labels to a parallel dataset dir (VisDrone4) and hard-links
the image files, leaving the original 10-class dataset untouched and
trainable. Hard links, not symlinks: ultralytics resolves symlinks when
scanning and would derive label paths from the original tree.

    0 pedestrian, 1 people          -> 0 person
    2 bicycle,    9 motor           -> 1 two_wheeler
    3 car,        4 van             -> 2 light_vehicle
    5 truck,      8 bus             -> 3 heavy_vehicle
    6 tricycle,   7 awning-tricycle -> dropped
"""

from pathlib import Path

SRC = Path.home() / "Desktop/My_Projects/datasets/VisDrone"
DST = Path.home() / "Desktop/My_Projects/datasets/VisDrone4"
REMAP = {0: 0, 1: 0, 2: 1, 9: 1, 3: 2, 4: 2, 5: 3, 8: 3}
SPLITS = ["train", "val", "test"]

YAML = """\
path: {dst}
train: images/train
val: images/val
test: images/test

names:
  0: person
  1: two_wheeler
  2: light_vehicle
  3: heavy_vehicle
"""


def main() -> None:
    total = {"files": 0, "kept": 0, "dropped": 0}
    for split in SPLITS:
        (DST / "labels" / split).mkdir(parents=True, exist_ok=True)
        img_dst = DST / "images" / split
        if img_dst.is_symlink():
            img_dst.unlink()
        img_dst.mkdir(parents=True, exist_ok=True)
        for src_img in (SRC / "images" / split).glob("*.jpg"):
            target = img_dst / src_img.name
            if not target.exists():
                target.hardlink_to(src_img)

        for src_file in sorted((SRC / "labels" / split).glob("*.txt")):
            lines_out = []
            for line in src_file.read_text().splitlines():
                parts = line.split()
                if not parts:
                    continue
                cls = int(parts[0])
                if cls in REMAP:
                    lines_out.append(" ".join([str(REMAP[cls])] + parts[1:]))
                    total["kept"] += 1
                else:
                    total["dropped"] += 1
            (DST / "labels" / split / src_file.name).write_text(
                "\n".join(lines_out) + ("\n" if lines_out else "")
            )
            total["files"] += 1

    yaml_path = Path(__file__).parent / "visdrone4.yaml"
    yaml_path.write_text(YAML.format(dst=DST))
    print(f"{total['files']} label files -> {DST}")
    print(f"kept {total['kept']} boxes, dropped {total['dropped']} (tricycle classes)")
    print(f"wrote {yaml_path}")


if __name__ == "__main__":
    main()

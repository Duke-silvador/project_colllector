"""
I/O adapter for the FLARE Task1 evaluation harness.

The eval harness mounts *.npz files (key 'imgs') at /workspace/inputs and
expects one *.npz file per case (key 'segs') at /workspace/outputs, with
segs.shape == imgs.shape.

Our nnU-Net model was trained on *.nii.gz and predict.sh originally called
nnUNetv2_predict directly on /workspace/inputs. This script leaves the
nnU-Net inference call completely unchanged -- it only converts npz -> nii.gz
before, and nii.gz -> npz after.
"""

import os
import glob
import shutil
import subprocess
import tempfile

import numpy as np
import SimpleITK as sitk

INPUT_DIR = "/workspace/inputs"
OUTPUT_DIR = "/workspace/outputs"

# nnU-Net inference call -- identical to the original predict.sh
NNUNET_CMD = [
    "nnUNetv2_predict",
    "-d", "701",
    "-c", "3d_fullres_2mm",
    "-f", "all",
    "-tr", "nnUNetTrainer_Tversky",
    "--disable_tta",
]

IMG_KEY_CANDIDATES = ("imgs", "image", "img", "data")
DEFAULT_SPACING_ZYX = (1.0, 1.0, 1.0)  # fallback only if npz has no spacing


def _load_imgs_and_spacing(npz_path):
    data = np.load(npz_path, allow_pickle=True)
    img_key = next((k for k in IMG_KEY_CANDIDATES if k in data.files), None)
    if img_key is None:
        raise KeyError(
            f"{npz_path}: none of {IMG_KEY_CANDIDATES} found, "
            f"got keys {data.files}"
        )
    imgs = data[img_key]

    if "spacing" in data.files:
        spacing_zyx = tuple(float(s) for s in data["spacing"])
    else:
        spacing_zyx = DEFAULT_SPACING_ZYX

    return imgs, spacing_zyx


def npz_to_nii(npz_path, nii_path):
    imgs, spacing_zyx = _load_imgs_and_spacing(npz_path)
    img = sitk.GetImageFromArray(imgs.astype(np.float32))
    # SimpleITK spacing is (x, y, z); numpy array is (z, y, x)
    img.SetSpacing(tuple(reversed(spacing_zyx)))
    sitk.WriteImage(img, nii_path)
    return imgs.shape


def nii_to_npz(nii_path, npz_path, expected_shape):
    seg_img = sitk.ReadImage(nii_path)
    seg = sitk.GetArrayFromImage(seg_img)
    if seg.shape != expected_shape:
        raise ValueError(
            f"{npz_path}: predicted shape {seg.shape} != "
            f"input imgs shape {expected_shape}"
        )
    np.savez_compressed(npz_path, segs=seg.astype(np.uint8))


def _case_id_from_nii(path):
    name = os.path.basename(path)
    if name.endswith(".nii.gz"):
        name = name[: -len(".nii.gz")]
    else:
        name = os.path.splitext(name)[0]
    if name.endswith("_0000"):
        name = name[: -len("_0000")]
    return name


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    npz_paths = sorted(glob.glob(os.path.join(INPUT_DIR, "*.npz")))
    nii_paths = sorted(glob.glob(os.path.join(INPUT_DIR, "*.nii.gz")))

    if npz_paths and nii_paths:
        raise RuntimeError(
            f"{INPUT_DIR} has both .npz and .nii.gz files -- "
            "expected exactly one input format."
        )
    if not npz_paths and not nii_paths:
        raise RuntimeError(f"No .npz or .nii.gz files found in {INPUT_DIR}")

    input_is_npz = bool(npz_paths)
    print(f"Detected input format: {'npz' if input_is_npz else 'nii.gz'}",
          flush=True)

    with tempfile.TemporaryDirectory() as tmp_in, \
         tempfile.TemporaryDirectory() as tmp_out:

        if input_is_npz:
            # Convert each npz -> nii.gz for nnU-Net, remember shape for
            # the reverse conversion afterwards.
            case_shapes = {}
            for npz_path in npz_paths:
                case_id = os.path.splitext(os.path.basename(npz_path))[0]
                nii_path = os.path.join(tmp_in, f"{case_id}_0000.nii.gz")
                case_shapes[case_id] = npz_to_nii(npz_path, nii_path)
            predict_input_dir = tmp_in
        else:
            # Already nii.gz -- run nnU-Net directly on the mounted input dir,
            # no conversion needed on the way in.
            predict_input_dir = INPUT_DIR
            case_shapes = {
                _case_id_from_nii(p): sitk.GetArrayFromImage(
                    sitk.ReadImage(p)
                ).shape
                for p in nii_paths
            }

        cmd = NNUNET_CMD + ["-i", predict_input_dir, "-o", tmp_out]
        print("Running:", " ".join(cmd), flush=True)
        subprocess.run(cmd, check=True)

        for case_id, shape in case_shapes.items():
            nii_out = os.path.join(tmp_out, f"{case_id}.nii.gz")
            if not os.path.exists(nii_out):
                raise FileNotFoundError(
                    f"Expected nnU-Net output {nii_out} not found"
                )
            if input_is_npz:
                # Eval harness wants .npz with key 'segs' back.
                npz_out = os.path.join(OUTPUT_DIR, f"{case_id}.npz")
                nii_to_npz(nii_out, npz_out, shape)
                print(f"Wrote {npz_out}", flush=True)
            else:
                # Eval harness gave nii.gz in -> give nii.gz prediction back.
                nii_final = os.path.join(OUTPUT_DIR, f"{case_id}.nii.gz")
                shutil.copy(nii_out, nii_final)
                print(f"Wrote {nii_final}", flush=True)


if __name__ == "__main__":
    main()

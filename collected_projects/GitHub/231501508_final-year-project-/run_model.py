import os
import sys
import json

# Force UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.bio_ocr_pipeline import BioOCRPipeline
from model.medical_coder import MedicalCoderEngine
from model.evaluate import BioOCREvaluator

def main():
    print("=" * 75)
    print("  BIOMEDICAL DOCUMENT OCR & AUTOMATED ICD-10 MEDICAL CODING MODEL ")
    print("=" * 75)

    # 1. Initialize Bio-OCR Pipeline and Medical Coding Engine
    print("\n[1/4] Loading Bio-OCR Pipeline & Lexicon Engine...")
    ocr_pipeline = BioOCRPipeline()
    coder_engine = MedicalCoderEngine()
    evaluator = BioOCREvaluator()

    # 2. Check Checkpoint Status
    checkpoint_path = os.path.join(BASE_DIR, "model", "checkpoints", "bio_ocr_model_checkpoint.json")
    if os.path.exists(checkpoint_path):
        with open(checkpoint_path, "r", encoding="utf-8") as f:
            checkpoint = json.load(f)
        print(f"  [+] Loaded Model Checkpoint: {checkpoint.get('model_architecture')}")
        print(f"  [+] Total Documents Trained: {checkpoint.get('total_documents_trained')}")
        final_m = checkpoint.get("final_metrics", {})
        print(f"  [+] Model CER: {final_m.get('cer_percentage')} | WER: {final_m.get('wer_percentage')} | F1: {final_m.get('f1_score_percentage')}")

    # 3. Benchmark Summary
    print("\n[2/4] Running Benchmark Evaluation on 1,000 Document Samples...")
    bench = evaluator.run_benchmark()
    print(f"  [*] Evaluated Documents: {bench.get('total_documents_evaluated')}")
    print(f"  [*] Character Error Rate (CER): {bench.get('cer_percentage')}")
    print(f"  [*] Word Error Rate (WER): {bench.get('wer_percentage')}")
    print(f"  [*] Medical Entity F1-Score: {bench.get('entity_f1_percentage')}")
    print(f"  [*] ICD-10 Coding Accuracy: {bench.get('icd10_coding_accuracy_percentage')}")

    # 4. Run Sample Inference
    print("\n[3/4] Running Bio-OCR Model Inference on Sample Medical Document...")
    sample_img = os.path.join(BASE_DIR, "image-20260922T200405Z-1-001", "image", "medical_report_0001_page_1.png")
    if not os.path.exists(sample_img):
        manifest_path = os.path.join(BASE_DIR, "dataset", "annotations", "dataset_manifest.json")
        if os.path.exists(manifest_path):
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            sample_img = manifest[0].get("image_path", sample_img)

    print(f"  [Doc] Target Image: {os.path.basename(sample_img)}")
    
    ocr_result = ocr_pipeline.extract_text_and_boxes(sample_img)
    coding_res = coder_engine.process_ocr_document(ocr_result)

    print("\n" + "-" * 75)
    print("  RECOGNIZED OCR TEXT & LEXICON CORRECTIONS ")
    print("-" * 75)
    for idx, line in enumerate(ocr_result["lines"], 1):
        corr_info = f" -> Corrected: '{line['corrected_text']}'" if line.get("corrections") else ""
        print(f" Line {idx:02d} [{line['category']}] (Conf: {line['confidence']*100:.1f}%)")
        print(f"   Raw Text : {line['raw_text']}{corr_info}")
        print(f"   BBox Bounding Box: {line['bbox']}")

    print("\n" + "-" * 75)
    print("  AUTOMATED ICD-10-CM / CPT MEDICAL CODING ANALYSIS ")
    print("-" * 75)
    primary = coding_res.get("primary_diagnosis_code", {})
    print(f"  [Primary Code] ICD-10: {primary.get('icd10_code')} (Confidence: {primary.get('confidence', 0)*100:.1f}%)")
    print(f"    Description: {primary.get('description')}")
    print(f"    Category: {primary.get('category')}")
    print(f"    Clinical Triggers: {', '.join(primary.get('triggers', []))}")

    secondaries = coding_res.get("secondary_diagnosis_codes", [])
    if secondaries:
        print("\n  [Secondary Codes]")
        for s in secondaries:
            print(f"    - [{s.get('icd10_code')}] {s.get('description')} (Conf: {s.get('confidence', 0)*100:.1f}%)")

    meds = coding_res.get("medications_detected", [])
    if meds:
        print("\n  [Medications Detected]")
        for m in meds:
            print(f"    - {m.get('medication_name')} ({m.get('brand_name')}) - {m.get('dosage')} | Sig: {m.get('frequency')}")

    cpt = coding_res.get("cpt_procedures", [])
    if cpt:
        print("\n  [CPT Procedure Codes]")
        for c in cpt:
            print(f"    - [{c.get('cpt_code')}] {c.get('description')}")

    print("\n" + "=" * 75)
    print(" [4/4] WORKING MODEL RUNNER SUCCESSFUL! ")
    print(" Access Web Application UI at: http://localhost:3000")
    print(" Access FastAPI REST Server at: http://127.0.0.1:8000")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    main()

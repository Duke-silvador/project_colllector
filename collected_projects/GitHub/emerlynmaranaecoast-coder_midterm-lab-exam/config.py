"""Configuration loader."""

import json
import os


def load_config(path="config/config.json"):
    with open(path, "r", encoding="utf-8") as file:
        config = json.load(file)

    # Resolve paths relative to the project root.
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    for key in ("data_file", "log_file", "export_directory"):
        config[key] = os.path.join(root, config[key])
    return config

#!/usr/bin/env python3
"""SMS spam classifier: Multinomial Naive Bayes on word/bigram counts.

Run:
    python spam_classifier.py

What it does, in order:
  1. Downloads the UCI SMS Spam Collection (first run only) and removes duplicates.
  2. Preprocesses the text (lowercase, placeholders, tokenize, stop words, stemming).
  3. Splits 80/20 (stratified), tunes `alpha` with 5-fold GridSearchCV (F1) on the training part.
  4. Evaluates once on the held-out test part.
  5. Refits the best model on all data and saves it to spam_detection_model.joblib.
  6. Reloads the saved model and classifies a few example messages.
"""
from __future__ import annotations

import argparse
import io
import re
import zipfile
from pathlib import Path

import joblib
import nltk
import pandas as pd
import requests
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.tokenize import word_tokenize
from sklearn.base import clone
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

DATA_URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"
RANDOM_STATE = 42

EXAMPLE_MESSAGES = [
    "Congratulations! You've won a $1000 Walmart gift card. Go to http://bit.ly/1234 to claim now.",
    "Hey, are we still meeting up for lunch today?",
    "Urgent! Your account has been compromised. Verify your details here: www.fakebank.com/verify",
    "Reminder: Your appointment is scheduled for tomorrow at 10am.",
    "FREE entry in a weekly competition to win an iPad. Just text WIN to 80085 now!",
]


# --------------------------------------------------------------------------- data
def load_dataset(data_dir: Path) -> pd.DataFrame:
    """Load the SMS Spam Collection (download it if needed) and drop duplicates."""
    data_file = data_dir / "SMSSpamCollection"
    if not data_file.exists():
        print(f"Downloading dataset to {data_dir}/ ...")
        response = requests.get(DATA_URL, timeout=30)
        response.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(response.content)) as z:
            z.extractall(data_dir)

    df = pd.read_csv(data_file, sep="\t", header=None, names=["label", "message"])
    total = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    print(f"Loaded {total} messages, removed {total - len(df)} duplicates -> {len(df)} left")
    print(df["label"].value_counts().to_string())
    return df


# ------------------------------------------------------------------ preprocessing
class Preprocessor:
    """Lowercase -> placeholders -> tokenize -> stop words -> stem.

    URLs and numbers become placeholder words (they are spam signals);
    `$` and `!` are kept for the same reason.
    """

    def __init__(self) -> None:
        for package in ("punkt", "punkt_tab", "stopwords"):
            nltk.download(package, quiet=True)
        self.stop_words = set(stopwords.words("english"))
        self.stemmer = PorterStemmer()

    @staticmethod
    def clean(text: str) -> str:
        text = re.sub(r"http\S+|www\.\S+", " urltoken ", text)  # links
        text = re.sub(r"\d+", " numtoken ", text)                # numbers
        return re.sub(r"[^a-z\s$!]", "", text)                   # everything else

    def __call__(self, message: str) -> str:
        tokens = word_tokenize(self.clean(message.lower()))
        tokens = [t for t in tokens if t not in self.stop_words]
        return " ".join(self.stemmer.stem(t) for t in tokens)


# -------------------------------------------------------------------------- model
def build_search() -> GridSearchCV:
    pipeline = Pipeline([
        ("vectorizer", CountVectorizer(min_df=1, max_df=0.9, ngram_range=(1, 2))),
        ("classifier", MultinomialNB(fit_prior=False)),
    ])
    grid = {"classifier__alpha": [0.01, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1.0]}
    return GridSearchCV(pipeline, grid, cv=5, scoring="f1")


def classify(model: Pipeline, preprocess: Preprocessor, messages: list[str], threshold: float):
    """Preprocess raw messages and return (is_spam, spam_probability) for each.

    The saved pipeline does NOT contain the preprocessing, so always go through here.
    """
    probs = model.predict_proba([preprocess(m) for m in messages])[:, 1]
    return [(p > threshold, p) for p in probs]


# --------------------------------------------------------------------------- main
def main() -> None:
    parser = argparse.ArgumentParser(description="Train and evaluate an SMS spam classifier.")
    parser.add_argument("--data-dir", type=Path, default=Path("sms_spam_collection"))
    parser.add_argument("--model-path", type=Path, default=Path("spam_detection_model.joblib"))
    parser.add_argument("--threshold", type=float, default=0.5,
                        help="a message is flagged when p(spam) is above this value (default 0.5)")
    args = parser.parse_args()

    df = load_dataset(args.data_dir)
    preprocess = Preprocessor()
    texts = df["message"].apply(preprocess)
    y = (df["label"] == "spam").astype(int)

    # Split first, then tune on the training part only, so the test part stays untouched.
    X_train, X_test, y_train, y_test = train_test_split(
        texts, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    search = build_search()
    search.fit(X_train, y_train)
    print(f"\nBest parameters: {search.best_params_}  (cv F1 = {search.best_score_:.3f})")

    probs = search.predict_proba(X_test)[:, 1]
    predictions = (probs > args.threshold).astype(int)
    print(f"\nHeld-out test set ({len(y_test)} messages), threshold {args.threshold}:")
    print(classification_report(y_test, predictions, target_names=["ham", "spam"]))
    print("Confusion matrix (rows = actual, columns = predicted):")
    print(confusion_matrix(y_test, predictions))

    # Final model: same settings, refit on all the data.
    final_model = clone(search.best_estimator_).fit(texts, y)
    joblib.dump(final_model, args.model_path)
    print(f"\nModel saved to {args.model_path}")

    # Reload and check that the saved model behaves like the in-memory one.
    loaded = joblib.load(args.model_path)
    results = classify(loaded, preprocess, EXAMPLE_MESSAGES, args.threshold)
    assert [r[0] for r in results] == [r[0] for r in classify(final_model, preprocess, EXAMPLE_MESSAGES, args.threshold)]

    print("\nExample messages:")
    for message, (is_spam, prob) in zip(EXAMPLE_MESSAGES, results):
        print(f"  {'SPAM' if is_spam else 'ham ':4}  p(spam)={prob:.2f}  {message}")
    print("\nNote: Naive Bayes probabilities are extreme (close to 0 or 1); "
          "do not read them as real confidence.")


if __name__ == "__main__":
    main()

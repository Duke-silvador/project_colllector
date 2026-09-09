from flask import Flask, render_template, request, jsonify
import json
import re

import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ---------------------------------------------------
# Flask application
# ---------------------------------------------------

app = Flask(__name__)


# ---------------------------------------------------
# NLTK setup
# ---------------------------------------------------

try:
    stop_words = set(stopwords.words("english"))
except LookupError:
    nltk.download("stopwords")
    stop_words = set(stopwords.words("english"))

stemmer = PorterStemmer()


# ---------------------------------------------------
# Load FAQ knowledge base
# ---------------------------------------------------

with open("faqs.json", "r", encoding="utf-8") as file:
    faqs = json.load(file)


# ---------------------------------------------------
# Text preprocessing
# ---------------------------------------------------

def preprocess_text(text):
    """
    Clean and normalize user questions and FAQ questions.
    """

    text = text.lower()

    # Remove punctuation and special characters
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    words = text.split()

    processed_words = []

    for word in words:

        if word in stop_words:
            continue

        word = stemmer.stem(word)

        processed_words.append(word)

    return " ".join(processed_words)


# ---------------------------------------------------
# Prepare FAQ questions
# ---------------------------------------------------

question_variants = []
faq_indexes = []

for index, faq in enumerate(faqs):

    # Main question
    question_variants.append(faq["question"])
    faq_indexes.append(index)

    # Alternative questions
    for alternative in faq.get("alternatives", []):
        question_variants.append(alternative)
        faq_indexes.append(index)


processed_questions = [
    preprocess_text(question)
    for question in question_variants
]


# ---------------------------------------------------
# TF-IDF model
# ---------------------------------------------------

vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    sublinear_tf=True
)

faq_vectors = vectorizer.fit_transform(processed_questions)


# ---------------------------------------------------
# Find best FAQ
# ---------------------------------------------------
def find_answer(user_question):
    user_question = user_question.strip()

    if not user_question:
        return {
            "matched": False,
            "answer": "Please enter a question so I can help you.",
            "confidence": 0,
            "risk": "UNKNOWN",
            "category": "General",
            "recommendation": "Try asking about internship payments, recruiters, offer letters, or scam warning signs."
        }

    # Preprocess the user's question
    processed_question = preprocess_text(user_question)

    # Convert the question into TF-IDF vector
    user_vector = vectorizer.transform([processed_question])

    # Calculate similarity with every FAQ variation
    similarities = cosine_similarity(user_vector, faq_vectors)[0]

    # Find the best matching FAQ variation
    best_index = similarities.argmax()
    best_score = float(similarities[best_index])

    # Convert the matched variation back to its original FAQ
    faq_index = faq_indexes[best_index]
    best_faq = faqs[faq_index]

    # Minimum similarity required for a valid answer
    THRESHOLD = 0.50

    # Reject unrelated questions
    if best_score < THRESHOLD:
        return {
            "matched": False,
            "answer": (
                "I'm sorry, but I couldn't find a reliable answer to that question. "
                "I specialize in internship and job safety, scam detection, recruiter "
                "verification, suspicious offers, and online safety."
            ),
            "confidence": round(best_score * 100, 2),
            "risk": "UNKNOWN",
            "category": "Unknown",
            "recommendation": (
                "Try asking about internship fees, recruiter verification, "
                "fake offer letters, OTP requests, or suspicious job offers."
            )
        }

    # Valid FAQ match
    return {
        "matched": True,
        "answer": best_faq["answer"],
        "confidence": round(best_score * 100, 2),
        "risk": best_faq["risk"],
        "category": best_faq["category"],
        "recommendation": best_faq["recommendation"]
    }



# ---------------------------------------------------
# Home page
# ---------------------------------------------------

@app.route("/")
def home():
    return render_template("index.html")


# ---------------------------------------------------
# Chatbot API
# ---------------------------------------------------

@app.route("/ask", methods=["POST"])
def ask():

    data = request.get_json()

    if not data or "question" not in data:

        return jsonify({
            "error": "Question is required."
        }), 400

    question = data["question"].strip()

    result = find_answer(question)

    return jsonify(result)


# ---------------------------------------------------
# Offer Risk Analyzer
# ---------------------------------------------------

RISK_RULES = {

    "payment_request": {
        "keywords": [
            "registration fee",
            "registration charge",
            "registration payment",
            "pay money",
            "pay rs",
            "pay ₹",
            "training fee",
            "joining fee",
            "security deposit",
            "processing fee",
            "certificate fee",
            "application fee",
            "pay upfront",
            "pay before joining",
            "pay 5000",
            "pay 1000",
            "pay 2000"
        ],
        "score": 40,
        "message": "Payment or fee request detected"
    },

    "urgency": {
        "keywords": [
            "pay today",
            "pay now",
            "immediately",
            "urgent",
            "within 24 hours",
            "limited seats",
            "last chance",
            "act now",
            "offer expires today",
            "respond immediately"
        ],
        "score": 20,
        "message": "Urgency or pressure detected"
    },

    "sensitive_information": {
        "keywords": [
            "otp",
            "one time password",
            "password",
            "upi pin",
            "pin",
            "bank account",
            "bank details",
            "account number",
            "card number",
            "cvv",
            "aadhaar",
            "pan card"
        ],
        "score": 70,
        "message": "Sensitive personal or financial information request detected"
    },

    "fake_check": {
        "keywords": [
            "cheque",
            "check",
            "deposit the check",
            "deposit the cheque",
            "send money back",
            "transfer money back",
            "refund the remaining amount"
        ],
        "score": 35,
        "message": "Potential fake-check or money-transfer pattern detected"
    },

    "unrealistic_offer": {
        "keywords": [
            "earn huge",
            "easy money",
            "guaranteed income",
            "guaranteed job",
            "earn lakhs",
            "earn ₹",
            "no experience required",
            "work from home and earn",
            "high salary",
            "huge salary"
        ],
        "score": 15,
        "message": "Potentially unrealistic job or internship promise detected"
    },

    "no_interview": {
        "keywords": [
            "no interview",
            "without interview",
            "no interview required",
            "selected without interview",
            "direct selection",
            "instant selection"
        ],
        "score": 20,
        "message": "No-interview or instant-selection pattern detected"
    },

    "suspicious_platform": {
        "keywords": [
            "telegram",
            "whatsapp",
            "instagram dm",
            "instagram message",
            "unknown website",
            "unknown link",
            "google form",
            "download this app"
        ],
        "score": 15,
        "message": "Potentially suspicious communication platform or link detected"
    }
}



def analyze_offer(text):

    text_lower = text.lower()

    score = 0
    indicators = []

    # Phrases that explicitly indicate there is NO payment requirement
    no_payment_phrases = [
        "no payment",
        "no fee",
        "without payment",
        "no registration fee",
        "no joining fee",
        "no processing fee",
        "no payment is required",
        "no fee is required",
        "no payment required"
    ]

    payment_is_not_required = any(
        phrase in text_lower
        for phrase in no_payment_phrases
    )

    for rule_name, rule in RISK_RULES.items():

        detected = False

        for keyword in rule["keywords"]:

            if keyword in text_lower:

                # Ignore payment rule when the text clearly says
                # that payment is NOT required
                if rule_name == "payment_request" and payment_is_not_required:
                    continue

                detected = True
                break

        if detected:

            score += rule["score"]

            indicators.append({
                "name": rule_name,
                "message": rule["message"]
            })

    # Never allow the score to exceed 100
    score = min(score, 100)

    # Determine risk level
    if score >= 70:
        level = "HIGH RISK"

    elif score >= 35:
        level = "CAUTION"

    else:
        level = "LOW RISK"

    # Recommendation
    if level == "HIGH RISK":

        recommendation = (
            "Do not make payments or share sensitive information. "
            "Independently verify the organization before proceeding."
        )

    elif level == "CAUTION":

        recommendation = (
            "Pause and verify the organization, recruiter, "
            "and offer using independent sources."
        )

    else:

        recommendation = (
            "No major warning indicators were detected by the current rule set. "
            "However, this does not guarantee that the offer is legitimate. "
            "Verify the company, recruiter, website, and offer independently "
            "before proceeding."
        )

    return {
        "score": score,
        "level": level,
        "indicators": indicators,
        "recommendation": recommendation
    }


# ---------------------------------------------------
# Offer analyzer API
# ---------------------------------------------------

@app.route("/analyze", methods=["POST"])
def analyze():

    data = request.get_json()

    if not data or "offer" not in data:

        return jsonify({
            "error": "Offer text is required."
        }), 400

    offer = data["offer"].strip()

    if not offer:

        return jsonify({
            "error": "Please enter an internship or job offer."
        }), 400

    result = analyze_offer(offer)

    return jsonify(result)


# ---------------------------------------------------
# Run application
# ---------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
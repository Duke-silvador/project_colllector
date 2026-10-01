from database import get_all_resources


# Topic aliases for flexible matching
TOPIC_ALIASES = {
    "dsa": "Data Structures",
    "data structures and algorithms": "Data Structures",
    "algorithms": "Data Structures",
    "database": "DBMS",
    "databases": "DBMS",
    "db": "DBMS",
    "networking": "Computer Networks",
    "networks": "Computer Networks",
    "os": "Operating Systems",
    "ai": "Artificial Intelligence",
    "ml": "Artificial Intelligence",
    "machine learning": "Artificial Intelligence",
}


def normalize_topic(topic):
    """
    Normalize the topic input by:
    - Converting to lowercase
    - Stripping extra spaces
    - Checking for aliases
    - Returning a clean topic string
    """
    cleaned = topic.strip().lower()

    # Check if there's an alias match
    if cleaned in TOPIC_ALIASES:
        return TOPIC_ALIASES[cleaned]

    # Return capitalized version for standard matching
    return topic.strip()


def calculate_match_score(resource, user_topic, user_level, user_goal):
    """
    Calculate match score for a resource based on user preferences.

    Scoring system:
    - Topic match: 50 points
    - Level match: 25 points
    - Goal match: 25 points
    Total: 100 points
    """
    score = 0

    # Topic matching (case-insensitive)
    if resource["topic"].lower() == user_topic.lower():
        score += 50

    # Level matching (exact match)
    if resource["level"] == user_level:
        score += 25

    # Goal matching (exact match)
    if resource["goal"] == user_goal:
        score += 25

    return score


def generate_explanation(score):
    """Generate a simple explanation based on the match score."""
    if score == 100:
        return "Perfect match for your topic, level, and learning goal."
    elif score >= 75:
        return "Strong match for your requirements."
    elif score >= 50:
        return "Good topic match - may fit your learning needs."
    else:
        return "Partial match - consider if it fits your goals."


def recommend_resources(topic, level, goal):
    """
    Main recommendation function.

    Args:
        topic (str): User's topic of interest
        level (str): User's knowledge level (Beginner/Intermediate/Advanced)
        goal (str): User's learning goal

    Returns:
        list: Top 3-5 recommended resources with match scores
    """
    # Normalize the topic
    normalized_topic = normalize_topic(topic)

    # Get all resources from database
    all_resources = get_all_resources()

    # Calculate scores for each resource
    scored_resources = []

    for resource in all_resources:
        score = calculate_match_score(resource, normalized_topic, level, goal)

        # Only include resources with at least a topic match (score >= 50)
        if score >= 50:
            resource_with_score = resource.copy()
            resource_with_score["match_score"] = score
            resource_with_score["explanation"] = generate_explanation(score)
            scored_resources.append(resource_with_score)

    # Sort by score (highest first)
    scored_resources.sort(key=lambda x: x["match_score"], reverse=True)

    # Return top 5 recommendations
    return scored_resources[:5]
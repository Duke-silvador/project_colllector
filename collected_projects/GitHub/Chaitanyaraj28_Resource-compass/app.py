import streamlit as st
from recommender import recommend_resources
from database import init_db, seed_resources

# Initialize database on app start
try:
    init_db()
    seed_resources()
except Exception as e:
    st.error(f"Database initialization error: {e}")
# -----------------------------
# PAGE CONFIGURATION
# -----------------------------

st.set_page_config(
    page_title="Resource Compass",
    page_icon="📚",
    layout="centered"
)


# -----------------------------
# HEADER
# -----------------------------

st.title("📚 Resource Compass")

st.write(
    "Find the right learning resource based on your "
    "topic, knowledge level, and learning goal."
)

st.divider()


# -----------------------------
# USER INPUT
# -----------------------------

st.subheader("🎯 Tell us what you're looking for")

topic = st.text_input(
    "📖 Topic",
    placeholder="Example: Data Structures, Python, DBMS..."
)

col1, col2 = st.columns(2)

with col1:
    level = st.selectbox(
        "🎓 Knowledge Level",
        [
            "Beginner",
            "Intermediate",
            "Advanced"
        ]
    )

with col2:
    goal = st.selectbox(
        "📌 Learning Goal",
        [
            "Understand Concepts",
            "Practice",
            "Revision"
        ]
    )


st.write("")


# -----------------------------
# SEARCH BUTTON
# -----------------------------

search = st.button(
    "🔍 Find Resources",
    use_container_width=True
)


# -----------------------------
# RECOMMENDATIONS
# -----------------------------

if search:

    if topic.strip() == "":
        st.warning("Please enter a topic first.")

    else:
        recommendations = recommend_resources(topic, level, goal)

        st.divider()

        st.subheader("✨ Recommended for You")

        st.caption(
            f"Based on: {topic} • {level} • {goal}"
        )

        if not recommendations:
            st.info("No matching resources found. Try a different topic, level, or learning goal.")
        else:
            # Display dynamic recommendation cards
            for resource in recommendations:
                with st.container(border=True):
                    # Title and Type
                    st.markdown(f"### 📘 {resource['title']}")
                    st.caption(f"**Author:** {resource['author']} | **Type:** {resource['resource_type']}")

                    # Match Score
                    st.markdown(f"**⭐ {resource['match_score']}% Match**")

                    # Description
                    st.write(resource['description'])

                    # Match details
                    match_topic = "✓" if resource['topic'].lower() == topic.strip().lower() or resource['topic'].lower() in topic.strip().lower() else "~"
                    match_level = "✓" if resource['level'] == level else "✗"
                    match_goal = "✓" if resource['goal'] == goal else "✗"

                    st.markdown(
                        f"{match_topic} Topic: {resource['topic']}  \n"
                        f"{match_level} Level: {resource['level']}  \n"
                        f"{match_goal} Goal: {resource['goal']}"
                    )

                    # Explanation
                    st.caption(f"💡 Why recommended: {resource['explanation']}")
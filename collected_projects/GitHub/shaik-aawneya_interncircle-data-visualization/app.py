
import streamlit as st
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

st.set_page_config(
    page_title="Restaurant Tips Analytics",
    page_icon="📊",
    layout="wide"
)

@st.cache_data
def load_data():
    return sns.load_dataset("tips")

df = load_data()

st.title("Restaurant Tips Analytics Dashboard")
st.caption("Project 2 | Data Visualization | InternCircle")

st.sidebar.header("Dashboard Filters")

selected_day = st.sidebar.multiselect(
    "Select Day",
    options=df["day"].unique(),
    default=df["day"].unique()
)

selected_time = st.sidebar.multiselect(
    "Select Meal Time",
    options=df["time"].unique(),
    default=df["time"].unique()
)

filtered_df = df[
    df["day"].isin(selected_day) &
    df["time"].isin(selected_time)
]

if filtered_df.empty:
    st.warning("No data available for the selected filters.")
    st.stop()

col1, col2, col3 = st.columns(3)
col1.metric("Total Bills", len(filtered_df))
col2.metric("Average Bill", f"${filtered_df['total_bill'].mean():.2f}")
col3.metric("Average Tip", f"${filtered_df['tip'].mean():.2f}")

st.divider()

left, right = st.columns(2)

with left:
    st.subheader("1. Total Bill Distribution")
    fig, ax = plt.subplots()
    sns.histplot(filtered_df["total_bill"], bins=20, kde=True, ax=ax)
    ax.set_xlabel("Total Bill")
    ax.set_ylabel("Frequency")
    st.pyplot(fig)
    plt.close(fig)

with right:
    st.subheader("2. Tips Across Days")
    fig, ax = plt.subplots()
    sns.boxplot(data=filtered_df, x="day", y="tip", ax=ax)
    ax.set_xlabel("Day")
    ax.set_ylabel("Tip")
    st.pyplot(fig)
    plt.close(fig)

left, right = st.columns(2)

with left:
    st.subheader("3. Bill Amount vs Tip")
    fig, ax = plt.subplots()
    sns.scatterplot(
        data=filtered_df,
        x="total_bill",
        y="tip",
        hue="time",
        ax=ax
    )
    ax.set_xlabel("Total Bill")
    ax.set_ylabel("Tip")
    st.pyplot(fig)
    plt.close(fig)

with right:
    st.subheader("4. Correlation Heatmap")
    numeric_data = filtered_df.select_dtypes(include="number")
    fig, ax = plt.subplots()
    sns.heatmap(
        numeric_data.corr(),
        annot=True,
        cmap="coolwarm",
        fmt=".2f",
        ax=ax
    )
    st.pyplot(fig)
    plt.close(fig)

st.divider()
st.subheader("Data Preview")
st.dataframe(filtered_df, use_container_width=True)

st.caption("Dataset: Seaborn Tips dataset | Educational analysis")

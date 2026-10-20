import streamlit as st
from rag_pipeline import build_rag_pipeline

st.title("📚 RAG Knowledge Assistant")


pdf_file = st.file_uploader("Upload a PDF", type="pdf")
if pdf_file:
    with open("data/temp.pdf", "wb") as f:
        f.write(pdf_file.read())
    qa = build_rag_pipeline("data/temp.pdf")

    query = st.text_input("Ask a question:")
    if query:
        answer = qa.run(query)
        st.write("### Answer:")
        st.write(answer)
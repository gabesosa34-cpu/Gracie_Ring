"""Streamlit host for The Grace Collection engagement ring customizer.

The customizer itself is a self-contained React app (index.html) built
with app.css + app.js + build.py. This file just embeds it.
"""
import pathlib
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="The Grace Collection — Design Your Engagement Ring",
    page_icon="💍",
    layout="wide",
)

st.markdown(
    """
    <style>
      #MainMenu, header, footer { visibility: hidden; }
      .block-container { padding: 0 !important; max-width: 100% !important; }
      iframe { border: none; }
    </style>
    """,
    unsafe_allow_html=True,
)

html_path = pathlib.Path(__file__).parent / "index.html"
html = html_path.read_text(encoding="utf-8")

components.html(html, height=1500, scrolling=True)

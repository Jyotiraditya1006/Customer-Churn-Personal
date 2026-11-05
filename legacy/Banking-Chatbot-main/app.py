import streamlit as st
import json
import pickle
import random

# 1. Load the trained model and vectorizer
with open('model.pkl', 'rb') as f:
    vectorizer, model = pickle.load(f)

# 2. Load the intents for responses
with open('data/intents.json') as file:
    intents_data = json.load(file)

# --- Streamlit UI Setup ---
st.set_page_config(page_title="Apex Banking Chatbot", page_icon="🏦")

st.title("🏦 Apex Bank AI Assistant")
st.markdown("Welcome! I am your AI banking assistant. How can I help you today?")
st.divider()

# Initialize chat history for the session
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display previous chat messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# --- Chat Interaction ---
if prompt := st.chat_input("Ask me about your balance or transferring funds..."):
    # 1. Display User Message
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    # 2. Predict Intent using NLP Model
    input_text = [prompt.lower()]
    input_vector = vectorizer.transform(input_text)
    prediction = model.predict(input_vector)

    # 3. Get Response from JSON
    final_response = "I'm sorry, I'm still learning. Could you rephrase that?"
    for intent in intents_data['intents']:
        if intent['tag'] == prediction:
            final_response = random.choice(intent['responses'])
            break

    # 4. Display Assistant Response
    with st.chat_message("assistant"):
        st.markdown(final_response)
    st.session_state.messages.append({"role": "assistant", "content": final_response})
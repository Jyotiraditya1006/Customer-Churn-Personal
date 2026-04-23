import json
import pickle
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression

# 1. Load Data
with open('data/intents.json') as file:
    data = json.load(file)

patterns = []
tags = []

for intent in data['intents']:
    for pattern in intent['patterns']:
        patterns.append(pattern.lower())
        tags.append(intent['tag'])

# 2. Vectorize Text (Convert words to numbers)
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(patterns)
y = tags

# 3. Train Model
model = LogisticRegression()
model.fit(X, y)

# 4. Save the model and vectorizer
with open('model.pkl', 'wb') as f:
    pickle.dump((vectorizer, model), f)

print("Model trained and saved as model.pkl!")
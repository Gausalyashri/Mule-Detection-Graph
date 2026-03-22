# Mule-Detection-Graph
Fraud Detection System

1.Overview

Mule-Detection-Graph is an AI-powered financial fraud detection platform that identifies suspicious transactions and mule account networks using graph analysis and machine learning.



2.Key Features

 Transaction network visualization
 AI-based anomaly detection (Isolation Forest)
 Dynamic risk scoring for accounts
 Mule chain detection (A → B → C patterns)
 High-value transaction alerts


3.Tech Stack

 Frontend: React.js, Recharts
 Backend: FastAPI, SQLAlchemy
 Database: SQLite
 AI/ML: Scikit-learn (Isolation Forest)


4.AI Explanation

The system uses Isolation Forest to detect unusual transaction behavior based on amount, frequency, and account activity.Higher anomaly score = higher fraud risk


5.Run Locally

Backend=uvicorn main:app --reload

6.Frontend

cd frontend
npm install
npm start



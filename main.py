from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
from sklearn.ensemble import IsolationForest
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import numpy as np
from models import Base, Transaction


app = FastAPI()

# create tables
Base.metadata.create_all(bind=engine)

# allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Add transaction
# -----------------------------


@app.get("/anomaly")
def detect_anomaly():
    db = SessionLocal()
    transactions = db.query(Transaction).all()
    db.close()

    if len(transactions) < 2:
        return {"anomalies": []}

    # Features: amount, how many times sender appears, how many times receiver appears
    sender_counts = {}
    receiver_counts = {}
    for t in transactions:
        sender_counts[t.sender] = sender_counts.get(t.sender, 0) + 1
        receiver_counts[t.receiver] = receiver_counts.get(t.receiver, 0) + 1

    X = []
    meta = []
    for t in transactions:
        X.append([
            t.amount,
            sender_counts.get(t.sender, 1),
            receiver_counts.get(t.receiver, 1)
        ])
        meta.append({"sender": t.sender, "receiver": t.receiver, "amount": t.amount})

    model = IsolationForest(contamination=0.3, random_state=42)
    preds = model.fit_predict(np.array(X))
    scores = model.decision_function(np.array(X))

    anomalies = []
    for i, pred in enumerate(preds):
        if pred == -1:
            anomalies.append({
                "sender": meta[i]["sender"],
                "receiver": meta[i]["receiver"],
                "amount": meta[i]["amount"],
                "anomaly_score": round(float(-scores[i]), 3)
            })

    return {"anomalies": sorted(anomalies, key=lambda x: x["anomaly_score"], reverse=True)}
@app.post("/transaction")
def add_transaction(sender: str, receiver: str, amount: float):

    db = SessionLocal()

    tx = Transaction(
        sender=sender,
        receiver=receiver,
        amount=amount
    )

    db.add(tx)
    db.commit()
    db.close()

    return {"message": "Transaction stored successfully"}


# -----------------------------
# Home endpoint
# -----------------------------
@app.get("/")
def home():
    return {"message": "Mule Detection Backend Running"}


# -----------------------------
# Graph Data
# -----------------------------
@app.get("/graph")
def get_graph():

    db = SessionLocal()
    transactions = db.query(Transaction).all()

    nodes = {}
    links = []

    for t in transactions:

        nodes[t.sender] = {"id": t.sender}
        nodes[t.receiver] = {"id": t.receiver}

        links.append({
            "source": t.sender,
            "target": t.receiver,
            "amount": t.amount
        })

    db.close()

    return {
        "nodes": list(nodes.values()),
        "links": links
    }


# -----------------------------
# Risk Table
# -----------------------------


@app.get("/risk-table")
def risk_table():
    db = SessionLocal()
    transactions = db.query(Transaction).all()
    db.close()

    if not transactions:
        return []

    # Build per-account features
    accounts = {}
    for t in transactions:
        for acc, role in [(t.sender, "sender"), (t.receiver, "receiver")]:
            if acc not in accounts:
                accounts[acc] = {
                    "total_sent": 0, "total_received": 0,
                    "send_count": 0, "receive_count": 0,
                    "max_sent": 0, "max_received": 0
                }
        accounts[t.sender]["total_sent"] += t.amount
        accounts[t.sender]["send_count"] += 1
        accounts[t.sender]["max_sent"] = max(accounts[t.sender]["max_sent"], t.amount)
        accounts[t.receiver]["total_received"] += t.amount
        accounts[t.receiver]["receive_count"] += 1
        accounts[t.receiver]["max_received"] = max(accounts[t.receiver]["max_received"], t.amount)

    acc_ids = list(accounts.keys())
    X = []
    for acc in acc_ids:
        a = accounts[acc]
        X.append([
            a["total_sent"],
            a["total_received"],
            a["send_count"],
            a["receive_count"],
            a["max_sent"],
            a["max_received"],
            a["total_sent"] / (a["send_count"] or 1),      # avg sent
            a["total_received"] / (a["receive_count"] or 1) # avg received
        ])

    X = np.array(X)

    if len(X) < 2:
        # Not enough data to model — fall back to rule-based
        result = []
        for acc in acc_ids:
            a = accounts[acc]
            score = min((a["total_sent"] + a["total_received"]) / 500000, 1.0)
            result.append({"account": acc, "risk_score": round(score, 3)})
        return result

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(contamination=0.3, random_state=42)
    model.fit(X_scaled)

    # decision_function: more negative = more anomalous
    raw_scores = model.decision_function(X_scaled)

    # Normalize to 0-1 risk score (invert so anomalous = high risk)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s == min_s:
        normalized = [0.5] * len(raw_scores)
    else:
        normalized = [(max_s - s) / (max_s - min_s) for s in raw_scores]

    result = []
    for i, acc in enumerate(acc_ids):
        result.append({
            "account": acc,
            "risk_score": round(normalized[i], 3)
        })

    return sorted(result, key=lambda x: x["risk_score"], reverse=True)
# -----------------------------
# Fraud Trend
# -----------------------------
@app.get("/fraud-trend")
def fraud_trend():

    return [
        {"month": "Jan", "cases": 5},
        {"month": "Feb", "cases": 12},
        {"month": "Mar", "cases": 8},
        {"month": "Apr", "cases": 20}
    ]


# -----------------------------
# Alerts
# -----------------------------
@app.get("/alerts")
def alerts():

    db = SessionLocal()
    transactions = db.query(Transaction).all()
    db.close()

    alerts = []

    for t in transactions:

        if t.amount > 80000:

            alerts.append({
                "account": t.sender,
                "alert": "Large suspicious transaction"
            })

    return alerts


# -----------------------------
# Mule Chains
# -----------------------------
@app.get("/mule-chains")
def mule_chains():

    db = SessionLocal()
    transactions = db.query(Transaction).all()

    graph = {}

    for t in transactions:
        graph.setdefault(t.sender, []).append(t.receiver)

    chains = []

    for sender in graph:
        for receiver in graph[sender]:
            if receiver in graph:
                for third in graph[receiver]:
                    chains.append([sender, receiver, third])
            else:
                chains.append([sender, receiver])

    db.close()

    return {"mule_networks": chains}
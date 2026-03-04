
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
transactions = [
    {"from": "A1", "to": "A2", "amount": 50000},
    {"from": "A2", "to": "A3", "amount": 30000},
    {"from": "A3", "to": "A4", "amount": 90000},
    {"from": "A5", "to": "A1", "amount": 70000},
]
def calculate_risk(transactions):
    risk_scores = {}

    for t in transactions:
        sender = t["from"]
        receiver = t["to"]
        amount = t["amount"]

        if sender not in risk_scores:
            risk_scores[sender] = 0

        if receiver not in risk_scores:
            risk_scores[receiver] = 0

        if amount > 40000:
            risk_scores[sender] += 0.3
            risk_scores[receiver] += 0.2

    for acc in risk_scores:
        risk_scores[acc] = min(risk_scores[acc], 1)

    return risk_scores
def detect_mule_chains(transactions):

    graph = {}

    for t in transactions:
        sender = t["from"]
        receiver = t["to"]

        if sender not in graph:
            graph[sender] = []

        graph[sender].append(receiver)

    visited = set()
    chains = []

    def dfs(node, path):

        if node in visited:
            return

        visited.add(node)
        path.append(node)

        if node not in graph:
            chains.append(path.copy())

        else:
            for neighbor in graph[node]:
                dfs(neighbor, path)

        path.pop()

    for node in graph:
        dfs(node, [])

    return chains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Mule Detection Backend Running"}


@app.get("/graph")
def get_graph():

    transactions = [
        {"from": "A1", "to": "A2", "amount": 50000},
        {"from": "A2", "to": "A3", "amount": 20000},
        {"from": "A3", "to": "A4", "amount": 70000},
        {"from": "A1", "to": "A3", "amount": 10000}
    ]

    nodes = set()
    links = []

    for t in transactions:
        nodes.add(t["from"])
        nodes.add(t["to"])

        links.append({
            "source": t["from"],
            "target": t["to"]
        })

    return {
        "nodes": [{"id": n} for n in nodes],
        "links": links
    }


@app.get("/risk-table")
def risk_table():

    risk_scores = calculate_risk(transactions)

    result = []
    for acc, score in risk_scores.items():
        result.append({
            "account": acc,
            "risk_score": score
        })

    return result


@app.get("/fraud-trend")
def fraud_trend():
    return {
        "months": ["Jan", "Feb", "Mar", "Apr"],
        "fraud_cases": [5, 12, 8, 20]
    }


@app.get("/alerts")
def alerts():
    return [
        {"account": "A1", "alert": "High velocity transactions"},
        {"account": "A3", "alert": "Linked to known mule account"}
    ]
@app.get("/mule-chains")
def mule_chains():
    chains = detect_mule_chains(transactions)
    return {"mule_networks": chains}
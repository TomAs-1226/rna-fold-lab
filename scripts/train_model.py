"""
Trains a small neural network to predict CRISPR guide editing efficiency, and exports
its weights as JSON so the website can run it in the browser (no server, no ML runtime).

Data: the 881 real guides in public/data/guides.json (Doench 2014, measured efficiency).
Features per guide (82 numbers):
  - 20 positions x 4 bases = 80 one-hot values (which letter is at each spot)
  - GC fraction
  - seed openness from OUR folder (ties the project's folding work into the model)
Model: a 2-layer MLP  (82 -> H hidden, ReLU -> 1, sigmoid).  Honest train/test split.

Run:  pip install numpy   then   python scripts/train_model.py
"""
import json
import os
import numpy as np

np.random.seed(0)
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "public", "data")
BASES = "ACGT"
H = 12  # hidden units


def featurize(spacer, gc_frac, openness):
    x = np.zeros(82)
    for p, ch in enumerate(spacer[:20]):
        idx = BASES.find(ch)
        if idx >= 0:
            x[p * 4 + idx] = 1.0
    x[80] = gc_frac
    x[81] = openness
    return x


def rankdata(a):
    order = np.argsort(a, kind="mergesort")
    ranks = np.empty(len(a))
    i = 0
    while i < len(a):
        j = i
        while j + 1 < len(a) and a[order[j + 1]] == a[order[i]]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def pearson(a, b):
    a = np.asarray(a); b = np.asarray(b)
    a = a - a.mean(); b = b - b.mean()
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d else 0.0


def spearman(a, b):
    return pearson(rankdata(np.asarray(a)), rankdata(np.asarray(b)))


guides = json.load(open(os.path.join(DATA, "guides.json"), encoding="utf-8"))
X = np.array([featurize(g["spacer"], g["gcPercent"] / 100.0, g["seedOpenness"]) for g in guides])
y = np.array([g["activity"] for g in guides], dtype=float)

idx = np.arange(len(X))
test_mask = idx % 5 == 0  # every 5th guide is held out for testing
Xtr, ytr = X[~test_mask].copy(), y[~test_mask]
Xte, yte = X[test_mask].copy(), y[test_mask]

# standardize the two continuous features using TRAIN stats only
mean = Xtr[:, 80:82].mean(0)
std = Xtr[:, 80:82].std(0) + 1e-6
Xtr[:, 80:82] = (Xtr[:, 80:82] - mean) / std
Xte[:, 80:82] = (Xte[:, 80:82] - mean) / std

# init
W1 = np.random.randn(82, H) * 0.1
b1 = np.zeros(H)
W2 = np.random.randn(H, 1) * 0.1
b2 = np.zeros(1)
lr, l2, epochs = 0.08, 5e-4, 6000
n = len(Xtr)


def forward(Xb):
    z1 = Xb @ W1 + b1
    a1 = np.maximum(0, z1)
    z2 = a1 @ W2 + b2
    pred = 1 / (1 + np.exp(-z2))
    return z1, a1, pred


for ep in range(epochs):
    z1, a1, pred = forward(Xtr)
    dz2 = (pred - ytr[:, None]) * pred * (1 - pred) * (2 / n)
    dW2 = a1.T @ dz2 + l2 * W2
    db2 = dz2.sum(0)
    da1 = dz2 @ W2.T
    dz1 = da1 * (z1 > 0)
    dW1 = Xtr.T @ dz1 + l2 * W1
    db1 = dz1.sum(0)
    W1 -= lr * dW1; b1 -= lr * db1; W2 -= lr * dW2; b2 -= lr * db2

pred_tr = forward(Xtr)[2][:, 0]
pred_te = forward(Xte)[2][:, 0]
train_sp = spearman(pred_tr, ytr)
test_sp = spearman(pred_te, yte)
# baseline: seed openness alone (our folding feature) on the test set
base_sp = spearman(Xte[:, 81], yte)

model = {
    "W1": W1.tolist(), "b1": b1.tolist(), "W2": W2.tolist(), "b2": b2.tolist(),
    "contMean": mean.tolist(), "contStd": std.tolist(),
    "meta": {
        "hidden": H,
        "params": int(W1.size + b1.size + W2.size + b2.size),
        "trainN": int(n), "testN": int(len(Xte)),
        "trainSpearman": round(train_sp, 3),
        "testSpearman": round(test_sp, 3),
        "baselineOpennessSpearman": round(base_sp, 3),
        "features": "20x4 one-hot + GC + seed openness (our folder)",
        "trainedOn": "Doench 2014 human guides (881), measured efficiency",
    },
}
json.dump(model, open(os.path.join(DATA, "model.json"), "w", encoding="utf-8"))
print("Wrote model.json")
print(f"params={model['meta']['params']}  train ρ={train_sp:.3f}  TEST ρ={test_sp:.3f}  (openness-only baseline ρ={base_sp:.3f})")

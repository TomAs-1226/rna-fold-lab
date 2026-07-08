"""
Trains a small neural network to predict CRISPR guide editing efficiency, exports its
weights as JSON so the website runs it in the browser (no server, no ML runtime).

Data: public/data/guides.json (Doench 2016 Rule Set 2, 3,804 real guides; activity is a
0-1 percentile). Features per guide (386 numbers):
  - 20 x 4 one-hot for the letter at each position                 (80)
  - 19 x 16 one-hot for the pair of letters at each step           (304)
  - GC fraction                                                     (1)
  - seed openness from OUR folder                                   (1)
Model: 2-layer MLP (386 -> H hidden ReLU -> 1 sigmoid), Adam + early stopping.

Split: 60% train / 20% validation (early stopping) / 20% test (honest, never trained on).
We also report an ABLATION: how much does OUR folding feature actually add?
Run:  pip install numpy;  python scripts/train_model.py
"""
import json
import os
import numpy as np

np.random.seed(0)
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "public", "data")
BASES = "ACGT"
H = 32
NFEAT = 386


def featurize(spacer, gc_frac, openness):
    x = np.zeros(NFEAT)
    for p in range(min(20, len(spacer))):
        b = BASES.find(spacer[p])
        if b >= 0:
            x[p * 4 + b] = 1.0
    for p in range(min(19, len(spacer) - 1)):
        b1 = BASES.find(spacer[p]); b2 = BASES.find(spacer[p + 1])
        if b1 >= 0 and b2 >= 0:
            x[80 + p * 16 + b1 * 4 + b2] = 1.0
    x[384] = gc_frac
    x[385] = openness
    return x


def rankdata(a):
    order = np.argsort(a, kind="mergesort")
    r = np.empty(len(a))
    i = 0
    while i < len(a):
        j = i
        while j + 1 < len(a) and a[order[j + 1]] == a[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2
        i = j + 1
    return r


def pearson(a, b):
    a = np.asarray(a, float) - np.mean(a); b = np.asarray(b, float) - np.mean(b)
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d else 0.0


def spearman(a, b):
    return pearson(rankdata(np.asarray(a, float)), rankdata(np.asarray(b, float)))


def forward(P, X):
    z1 = X @ P[0] + P[1]; a1 = np.maximum(0, z1)
    pred = 1 / (1 + np.exp(-(a1 @ P[2] + P[3])))
    return z1, a1, pred


def train(Xtr, ytr, Xval, yval, max_epochs=12000, lr=0.008, l2=6e-4, check=150, patience=25):
    d = Xtr.shape[1]
    P = [np.random.randn(d, H) * 0.1, np.zeros(H), np.random.randn(H, 1) * 0.1, np.zeros(1)]
    M = [np.zeros_like(p) for p in P]; Vm = [np.zeros_like(p) for p in P]
    b1a, b2a, eps = 0.9, 0.999, 1e-8
    n = len(Xtr)
    best_val = -2.0; best_P = [p.copy() for p in P]; no_imp = 0
    for t in range(1, max_epochs + 1):
        z1, a1, pred = forward(P, Xtr)
        dz2 = (pred - ytr[:, None]) * pred * (1 - pred) * (2 / n)
        dz1 = (dz2 @ P[2].T) * (z1 > 0)
        g = [Xtr.T @ dz1 + l2 * P[0], dz1.sum(0), a1.T @ dz2 + l2 * P[2], dz2.sum(0)]
        for i in range(4):
            M[i] = b1a * M[i] + (1 - b1a) * g[i]
            Vm[i] = b2a * Vm[i] + (1 - b2a) * (g[i] ** 2)
            P[i] -= lr * (M[i] / (1 - b1a ** t)) / (np.sqrt(Vm[i] / (1 - b2a ** t)) + eps)
        if t % check == 0:
            vr = spearman(forward(P, Xval)[2][:, 0], yval)
            if vr > best_val + 1e-4:
                best_val = vr; best_P = [p.copy() for p in P]; no_imp = 0
            else:
                no_imp += 1
                if no_imp >= patience:
                    break
    return best_P, best_val


guides = json.load(open(os.path.join(DATA, "guides.json"), encoding="utf-8"))
X = np.array([featurize(g["spacer"], g["gcPercent"] / 100.0, g["seedOpenness"]) for g in guides])
y = np.array([g["activity"] for g in guides], dtype=float)

m5 = np.arange(len(X)) % 5
test_mask = m5 == 0            # 20% held-out test
val_mask = m5 == 4            # 20% validation (early stopping)
train_mask = (m5 >= 1) & (m5 <= 3)  # 60% train


def run(use_openness):
    Xa = X.copy()
    if not use_openness:
        Xa[:, 385] = 0.0
    Xtr, Xval, Xte = Xa[train_mask].copy(), Xa[val_mask].copy(), Xa[test_mask].copy()
    mean = Xtr[:, 384:386].mean(0); std = Xtr[:, 384:386].std(0) + 1e-6
    for Xs in (Xtr, Xval, Xte):
        Xs[:, 384:386] = (Xs[:, 384:386] - mean) / std
    P, _ = train(Xtr, y[train_mask], Xval, y[val_mask])
    test_rho = spearman(forward(P, Xte)[2][:, 0], y[test_mask])
    return test_rho, P, mean, std


test_with, P, mean, std = run(True)
test_without, _, _, _ = run(False)
# baselines on the SAME held-out test set, for a fair comparison
base_open = spearman(X[test_mask, 385], y[test_mask])
base_gc = spearman(X[test_mask, 384], y[test_mask])

W1, b1, W2, b2 = P
model = {
    "W1": W1.tolist(), "b1": b1.tolist(), "W2": W2.tolist(), "b2": b2.tolist(),
    "contMean": mean.tolist(), "contStd": std.tolist(),
    "meta": {
        "hidden": H, "nfeat": NFEAT,
        "params": int(W1.size + b1.size + W2.size + b2.size),
        "trainN": int(train_mask.sum()), "testN": int(test_mask.sum()),
        "testSpearman": round(test_with, 3),
        "testSpearmanNoOpenness": round(test_without, 3),
        "baselineOpennessSpearman": round(base_open, 3),
        "baselineGcSpearman": round(base_gc, 3),
        "features": "position one-hot + dinucleotide one-hot + GC + seed openness (our folder)",
        "trainedOn": "Doench 2016 Rule Set 2 (3,804 real guides), efficiency as percentile",
    },
}
json.dump(model, open(os.path.join(DATA, "model.json"), "w", encoding="utf-8"))
print("Wrote model.json")
print(f"params={model['meta']['params']}  TEST rho={test_with:.3f}  (without our openness feature: {test_without:.3f})")
print(f"baselines: openness-alone={base_open:.3f}  GC-alone={base_gc:.3f}")

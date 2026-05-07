export function aggregateScore(scoresByMetric, metricsConfig) {
  if (metricsConfig.aggregation !== "weighted_mean") {
    throw new Error(`unsupported aggregation: ${metricsConfig.aggregation}`);
  }
  if (metricsConfig.scale && metricsConfig.scale !== "0_to_100") {
    throw new Error(`unsupported score scale: ${metricsConfig.scale} (expected 0_to_100)`);
  }
  let weighted = 0;
  let totalWeight = 0;
  for (const m of metricsConfig.metrics) {
    if (!(m.id in scoresByMetric)) {
      throw new Error(`missing score for metric: ${m.id}`);
    }
    const value = scoresByMetric[m.id];
    if (typeof value !== "number" || value < 0 || value > 100) {
      throw new Error(`score out of range for ${m.id}: ${value} (expected 0..100)`);
    }
    if (m.scoring === "binary" && value !== 0 && value !== 100) {
      throw new Error(`binary score out of range for ${m.id}: ${value} (expected 0 or 100)`);
    }
    weighted += value * m.weight;
    totalWeight += m.weight;
  }
  if (totalWeight === 0) {
    throw new Error("total weight is zero");
  }
  return Math.round((weighted / totalWeight) * 100) / 100;
}

export function decideStop({ state, history }) {
  const scores = history.map((h) => h.score);
  const bestScore = scores.length === 0 ? null : Math.max(...scores);

  if (bestScore !== null && bestScore >= state.threshold) {
    return {
      decision: "stop:threshold",
      reason: `best ${bestScore} >= threshold ${state.threshold}`,
      best_score: bestScore,
    };
  }

  const window = state.plateau_window;
  if (history.length > window) {
    const recent = scores.slice(-window);
    const prior = scores.slice(0, -window);
    const recentMax = Math.max(...recent);
    const priorMax = Math.max(...prior);
    if (recentMax <= priorMax) {
      return {
        decision: "stop:plateau",
        reason: `no improvement in last ${window} (max ${recentMax} <= prior max ${priorMax})`,
        best_score: bestScore,
      };
    }
  }

  if (state.iter >= state.max_iter) {
    return {
      decision: "stop:max_iter",
      reason: `iter ${state.iter} >= max_iter ${state.max_iter}`,
      best_score: bestScore,
    };
  }

  return { decision: "continue", reason: null, best_score: bestScore };
}

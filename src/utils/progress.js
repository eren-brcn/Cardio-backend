const summarizeProgress = (workouts = []) => {
  const byExercise = new Map();

  workouts.forEach((entry) => {
    const key = String(entry.exerciseName || "").trim();
    if (!key) {
      return;
    }

    const history = byExercise.get(key) || [];
    history.push(entry);
    byExercise.set(key, history);
  });

  const exerciseProgress = [];

  byExercise.forEach((history, exerciseName) => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime()
    );

    const firstWeight = Number(sorted[0]?.currentWeight || 0);
    const latestWeight = Number(sorted[sorted.length - 1]?.currentWeight || 0);

    exerciseProgress.push({
      exerciseName,
      sessions: sorted.length,
      firstWeight,
      latestWeight,
      improvementKg: Number((latestWeight - firstWeight).toFixed(2))
    });
  });

  const totalImprovementKg = exerciseProgress.reduce(
    (sum, item) => sum + item.improvementKg,
    0
  );

  return {
    totalImprovementKg: Number(totalImprovementKg.toFixed(2)),
    exerciseProgress
  };
};

module.exports = { summarizeProgress };

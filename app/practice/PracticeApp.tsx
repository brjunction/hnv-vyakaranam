"use client";

import { useState } from "react";
import PracticeSetup from "@/components/practice/PracticeSetup";
import QuizRunner, { type AnsweredQuestion } from "@/components/practice/QuizRunner";
import Results from "@/components/practice/Results";
import { questionsFor, type Difficulty, type PracticeType, type Question } from "@/lib/practiceData";

type Stage = { step: "setup" } | { step: "quiz"; questions: Question[] } | { step: "results"; answers: AnsweredQuestion[] };

export default function PracticeApp() {
  const [stage, setStage] = useState<Stage>({ step: "setup" });

  function start(opts: { topicSlug: string | "all"; difficulty: Difficulty | "all"; type: PracticeType | "all" }) {
    const qs = questionsFor(opts.topicSlug, opts.difficulty).filter(
      (q) => opts.type === "all" || q.type === opts.type
    );
    setStage({ step: "quiz", questions: qs });
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      {stage.step === "setup" && <PracticeSetup onStart={start} />}
      {stage.step === "quiz" && (
        <QuizRunner questions={stage.questions} onFinish={(answers) => setStage({ step: "results", answers })} />
      )}
      {stage.step === "results" && (
        <Results answers={stage.answers} onRetry={() => setStage({ step: "setup" })} />
      )}
    </div>
  );
}

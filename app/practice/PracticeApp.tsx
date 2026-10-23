"use client";

import { useState } from "react";
import PracticeSetup from "@/components/practice/PracticeSetup";
import QuizRunner, { type AnsweredQuestion } from "@/components/practice/QuizRunner";
import Results from "@/components/practice/Results";
import type { PracticeChapter, Question } from "@/lib/practiceData";

type Stage = { step: "setup" } | { step: "quiz"; questions: Question[] } | { step: "results"; answers: AnsweredQuestion[] };

export default function PracticeApp({ chapters, questions }: { chapters: PracticeChapter[]; questions: Question[] }) {
  const [stage, setStage] = useState<Stage>({ step: "setup" });

  function start(qs: Question[]) {
    setStage({ step: "quiz", questions: qs });
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      {stage.step === "setup" && <PracticeSetup chapters={chapters} questions={questions} onStart={start} />}
      {stage.step === "quiz" && (
        <QuizRunner questions={stage.questions} onFinish={(answers) => setStage({ step: "results", answers })} />
      )}
      {stage.step === "results" && (
        <Results answers={stage.answers} onRetry={() => setStage({ step: "setup" })} />
      )}
    </div>
  );
}

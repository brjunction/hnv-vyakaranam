import { Field, inputCls } from "@/components/admin/ActionForm";
import OptionsEditor from "@/components/admin/practice/OptionsEditor";

type Q = {
  difficulty: string;
  type: string;
  prompt: string;
  promptSub: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sutraRefs: string[];
  status: string;
};

export default function QuestionFields({ q, canPublish }: { q: Q; canPublish: boolean }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kind">
          <select name="type" defaultValue={q.type} className={inputCls}>
            <option value="sandhi">Sandhi (join)</option>
            <option value="viccheda">Sandhi-viccheda (split)</option>
          </select>
        </Field>
        <Field label="Difficulty">
          <select name="difficulty" defaultValue={q.difficulty} className={inputCls}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>
        <Field label="Status" hint={canPublish ? undefined : "Contributors save drafts; an editor publishes."}>
          <select name="status" defaultValue={q.status} className={inputCls} disabled={!canPublish}>
            <option value="published">Published</option>
            <option value="draft">Draft (hidden)</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </Field>
      </div>
      <Field label="Question (Devanagari)" hint="e.g. राम + अर्जुन">
        <input name="prompt" required defaultValue={q.prompt} className={`${inputCls} font-devanagari text-lg`} />
      </Field>
      <Field label="Transliteration under the question" hint="Optional, e.g. rāma + arjuna">
        <input name="promptSub" defaultValue={q.promptSub} className={`${inputCls} italic`} />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Answer options</span>
        <OptionsEditor initial={q.options} initialCorrect={q.correctIndex} />
      </div>
      <Field label="Explanation" hint="Shown after answering. Name the rule and the sūtra.">
        <textarea name="explanation" rows={3} required defaultValue={q.explanation} className={inputCls} />
      </Field>
      <Field
        label="Sūtra reference"
        hint="Written exactly as you want it shown, for any edition — e.g. “B 15 / M 12 / L 9” (B = Bṛhat, M = Madhyama, L = Laghu). Separate different sūtras with commas."
      >
        <input name="sutraRefs" required defaultValue={q.sutraRefs.join(", ")} className={inputCls} placeholder="B 15 / M 12 / L 9" />
      </Field>
    </div>
  );
}

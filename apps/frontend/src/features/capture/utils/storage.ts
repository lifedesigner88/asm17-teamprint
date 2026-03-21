import { EMPTY_DRAFT, type CaptureCompletion, type CaptureDraft } from "./types";

let captureDraft: CaptureDraft = cloneDraft(EMPTY_DRAFT);

function cloneDraft(draft: CaptureDraft): CaptureDraft {
  return {
    interview: {
      messages: [...draft.interview.messages],
      isComplete: draft.interview.isComplete,
    },
    voice: { ...draft.voice },
    image: { ...draft.image },
    updatedAt: draft.updatedAt,
  };
}

export function readCaptureDraft(): CaptureDraft {
  return cloneDraft(captureDraft);
}

export function writeCaptureDraft(draft: CaptureDraft) {
  captureDraft = cloneDraft(draft);
}

export function clearCaptureDraft() {
  captureDraft = cloneDraft(EMPTY_DRAFT);
}

export function saveDraft(nextDraft: CaptureDraft) {
  writeCaptureDraft({
    ...nextDraft,
    updatedAt: new Date().toISOString(),
  });
}

export function getCompletion(draft: CaptureDraft): CaptureCompletion {
  return {
    interview: draft.interview.isComplete,
    voice: false,  // coming soon
    image: false,  // coming soon
  };
}

export function getNextPath(completion: CaptureCompletion) {
  if (!completion.interview) {
    return "/capture/interview";
  }
  return "/capture/review";
}

export function readFileName(entry: FormDataEntryValue | null, fallback = "") {
  if (entry instanceof File && entry.size > 0) {
    return entry.name;
  }
  return fallback;
}

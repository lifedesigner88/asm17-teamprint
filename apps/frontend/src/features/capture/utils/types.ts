export type CaptureStep = "interview" | "voice" | "image";

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export type CaptureDraft = {
  interview: {
    messages: ChatMessage[];
    isComplete: boolean;
  };
  voice: {
    inputMode: "upload" | "record" | "later";
    sampleFileName: string;
    toneNotes: string;
    deliveryGoal: string;
  };
  image: {
    inputMode: "upload" | "camera" | "later";
    referenceFileName: string;
    visualDirection: string;
    framingNotes: string;
  };
  updatedAt: string | null;
};

export type CaptureCompletion = Record<CaptureStep, boolean>;

export type CaptureLoaderData = {
  draft: CaptureDraft;
  completion: CaptureCompletion;
  progressCount: number;
  nextPath: string;
};

export type CaptureSubmitActionData = {
  error?: string;
};

export type PersonaResult = {
  persona_id: string; // 6-digit UUID — used for the public /persona/:personId URL
  archetype: string;
  top3_values: string[];
  one_liner: string;
};

export type CaptureJob = {
  id: string;
  owner_user_id: string;
  status: "pending" | "processing" | "done" | "failed";
  payload: CaptureDraft;
  result?: PersonaResult | null;
  created_at: string;
  updated_at: string;
};

export type CaptureJobsLoaderData = {
  jobs: CaptureJob[];
  deletedJobId: string | null;
};

export type CaptureJobDetailLoaderData = {
  job: CaptureJob;
  created: boolean;
};

export type CaptureJobActionData = {
  error?: string;
};

export const EMPTY_DRAFT: CaptureDraft = {
  interview: {
    messages: [],
    isComplete: false,
  },
  voice: {
    inputMode: "later",
    sampleFileName: "",
    toneNotes: "",
    deliveryGoal: "",
  },
  image: {
    inputMode: "later",
    referenceFileName: "",
    visualDirection: "",
    framingNotes: "",
  },
  updatedAt: null,
};

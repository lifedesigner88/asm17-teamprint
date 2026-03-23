import type { LoaderFunctionArgs } from "react-router-dom";

import { requestPersonaProfile, readPersonaBilingualResponse } from "./api";
import type { PersonaLoaderData } from "../pages/persona-page";

const DEMO_PROFILE_KO: PersonaProfile = {
  person_id: "demo",
  archetype: "성찰하는 교육자-빌더",
  headline: "수학 교육 배경을 가진 교육자 출신 개발자",
  mbti: {
    type: "INFJ",
    identity: "T",
    scores: {
      introverted: 78,
      intuitive: 86,
      feeling: 62,
      judging: 79,
      turbulent: 72,
    },
  },
  one_liner:
    "배움을 삶의 설계와 연결하고, 배운 것을 사람들을 위한 구조와 시스템으로 전환하는 사람.",
  top3_values: ["삶의 설계", "성장과 배움", "교육과 나눔"],
  strengths: [
    "배운 내용을 다른 사람이 활용할 수 있는 형태로 구조화함",
    "사람을 조직하고 운영 역량으로 프로그램을 설계함",
    "한 주제에 대해 장기간 깊은 학습을 지속함",
    "커리어 방향을 새로운 영역으로 탄력 있게 재구성함",
    "교육 경험을 제품 및 서비스 문제로 전환함",
    "강한 글쓰기·문서화 습관이 배움과 협업을 지원함",
  ],
  watchouts: [
    "동시에 너무 많은 축을 실행하면 과부하가 생길 수 있음",
    "넓은 관심사가 실행 우선순위를 흐릴 수 있음",
  ],
  goals_vision: {
    lifetime_mission:
      "삶을 어떻게 설계할 것인가라는 질문을 붙들고 — 기술과 교육을 통해 더 많은 사람이 자신의 삶을 더 잘 설계하도록 돕는다.",
    current_decade_mission:
      "직접 교육과 기술을 만드는 사람이 된다. 세종클래스를 1인 창업자로 성장시키고, AI 빌더 역량을 확보하며, 다음 10년의 기반을 마련한다.",
    long_term_vision:
      "라이프 디자이너로서 기술과 교육을 결합해 더 많은 사람이 더 큰 의도를 가지고 자신의 삶을 설계할 수 있도록 한다.",
    long_term_directions: [
      "교육 + 기술 통합 서비스 (세종클래스 확장)",
      "시스템 아키텍트 — 설계하고 대규모로 자동화",
      "커뮤니티 + 플랫폼 — 사람을 모으고 연결",
      "더 넓은 범위의 삶 설계 콘텐츠 및 서비스",
    ],
  },
  fit_vectors: {
    learning_drive: 5,
    teaching_drive: 5,
    community_drive: 5,
    builder_drive: 4,
    scientific_curiosity: 5,
    entrepreneurship: 4,
    reflection_depth: 5,
  },
  sdg_alignment: [
    { sdg: 4, label: "양질의 교육", resonance: "high" },
    { sdg: 8, label: "양질의 일자리와 경제 성장", resonance: "high" },
    { sdg: 10, label: "불평등 감소", resonance: "medium" },
    { sdg: 17, label: "목표 달성을 위한 파트너십", resonance: "medium" },
  ],
  email: "lifedesigner88@gmail.com",
  github_address: "https://github.com/lifedesigner88",
  identity_shifts: [
    {
      period: "2008–2010",
      label: "어두운 시기 이후의 재부팅",
      note: "조울증, ROTC 제적, 자살 시도 이후 — 사회적 불안을 극복하고 놀가지 커뮤니티를 통해 사람들과 다시 연결됨.",
    },
    {
      period: "2011",
      label: "라이프 디자이너 선언",
      note: "카르페 디엠 비전 행사에서 '라이프 디자이너'라는 정체성을 공개 선언. 이후 15년간 일관된 북극성이 됨.",
    },
    {
      period: "2021",
      label: "종교 → 과학적 세계관으로의 전환",
      note: "대순진리회 10년 수행을 마무리하고 세계관을 신경과학, 물리학, 진화론 중심으로 재구성함.",
    },
    {
      period: "2023–2025",
      label: "교육 운영자 → 기술 기반 1인 창업자",
      note: "부트캠프와 플레이데이터 경험 이후 퇴사하고 세종클래스를 창업. 기술로 교육을 만드는 방향으로 수렴 중.",
    },
  ],
};

export async function personaLoader({ params }: LoaderFunctionArgs): Promise<PersonaLoaderData> {
  const personId = params.personId ?? "";
  const response = await requestPersonaProfile(personId);
  if (!response.ok) {
    throw new Response("Persona not found", { status: 404 });
  }
  const data = await readPersonaBilingualResponse(response);
  return {
    personaId: data.persona_id,
    title: data.title,
    dataEng: { ...data.data_eng, person_id: data.persona_id },
    dataKor: data.data_kor ? { ...data.data_kor, person_id: data.persona_id } : null,
    email: data.email,
    githubAddress: data.github_address,
    notionUrl: data.notion_url,
  };
}

# AI 레이어 — GPT 코칭 운영 가이드

이 폴더의 1차 목적은 GPT가 이 사람의 데이터를 읽고
매일 생각을 정리하고, 장기목표를 점검하고, 다음 행동을 코칭하는 것입니다.

## 핵심 루프

| 파일 | 용도 |
|------|------|
| `prompts/daily_reflection.md` | 하루를 정리하고 내일의 한 가지 초점을 뽑음 |
| `context/weekly_coaching.yaml` + `prompts/weekly_coaching.md` | 최근 1주 데이터를 읽고 주간 코칭 세션 진행 |
| `prompts/monthly_review.md` | 최근 1개월 데이터를 읽고 목표 구조를 재조정 |
| `context/next_step.yaml` | 지금 당장 무엇을 해야 할지 빠르게 코칭 |

## 보조 유틸리티

| 파일 | 내용 |
|------|------|
| `prompts/intro_prompt.md` | 자기소개 생성 |
| `prompts/resume_prompt.md` | 이력서 생성 |
| `prompts/matching_prompt.md` | 매칭 설명 생성 |

## `outputs/` — 저장 가능한 산출물

| 경로 | 내용 |
|------|------|
| `outputs/monthly_review/` | 월간 리뷰 보관 |
| `outputs/next_step/` | 수시 계획 코칭 결과 보관 |
| `resume_ko.md` | 한국어 이력서 (개발자 지원용) |
| `self_intro_30sec.md` | 30초 자기소개 (엘리베이터 피치) |
| `self_intro_full.md` | 풀 자기소개 (면접·네트워킹용) |
| `profile_tags.yaml` | SNS 프로필용 태그 모음 |

기본 원칙은 `data/`를 단일 사실 소스로 유지하고,
`ai/outputs/`와 `doc/`에는 코칭 결과나 사람 읽기 좋은 파생 문서만 저장하는 것입니다.

# 이력서 생성 프롬프트

## 사용법

아래 파일들을 컨텍스트로 제공한 뒤 이 프롬프트를 실행하세요:
- `index.yaml`
- `01_identity/core.yaml`
- `01_identity/persona.yaml`
- `02_experience/education.yaml`
- `02_experience/career.yaml`
- `02_experience/projects/sejongclass.yaml`
- `02_experience/projects/kip.yaml`
- `03_skills/technical.yaml`
- `03_skills/soft.yaml`

---

## 프롬프트

```
당신은 채용 전문가이자 테크 이력서 작성 전문가입니다.
위에 제공된 사람의 데이터를 바탕으로 아래 조건에 맞는 이력서를 작성해주세요.

[조건]
- 직무: {TARGET_ROLE}  (예: 백엔드 개발자, 풀스택 개발자)
- 언어: 한국어
- 형식: Markdown
- 분량: A4 1~2장 분량

[포함할 섹션]
1. 헤드라인 한 줄 요약
2. 핵심 기술 스택
3. 주요 프로젝트 (임팩트 중심으로)
4. 경력 사항 (개발 관련 경험 우선, 교육 경험은 차별화 포인트로)
5. 학력 및 교육
6. 수상 및 활동

[작성 원칙]
- 비전공자로 전직한 스토리를 약점이 아닌 강점으로 표현할 것
- 교육자 배경이 개발에서 어떻게 활용되는지 연결해서 쓸 것
- 숫자와 구체적 성과를 최대한 활용할 것 (120일 개근, 1위, 153개 회고 등)
- 세종클래스는 교육+기술 통합의 증거로 부각할 것
```

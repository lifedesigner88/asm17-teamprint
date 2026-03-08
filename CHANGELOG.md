# CHANGELOG

## 2026-03-09

### 1) 초기 세팅
- Git 저장소 초기화, 첫 커밋 생성
- `README.md`, `AGENTS.md` 작성
- GitHub 원격 연결 및 `main` 푸시 완료

### 2) 브랜치 전략 문서화
- `README.md`에 Git Workflow 추가
- `AGENTS.md`에 Workflow 준수 규칙 추가

### 3) Phase 0 부트스트랩
- 기본 구조 생성: `apps/`, `libs/`, `infrastructure/`
- 설정 파일 추가: `.gitignore`, `.nvmrc`, `.python-version`, `docker-compose.yml`, `nx.json`
- 폴더 안내 문서 추가 및 `README.md` 체크리스트 일부 갱신

### 4) 학습용 병렬 작업 환경
- `git worktree`로 분리:
  - `/home/sejong/new_project` (`feat/phase0-project-bootstrap`)
  - `/home/sejong/new_project-main` (`main`)

### 5) 런타임 정책 정리
- Node 기준을 최신 LTS(`24`)로 통일
- `.nvmrc`, `docker-compose.yml`, `AGENTS.md`에 반영

# Tetris (GitHub Pages용)

간단한 `HTML/CSS/JS` 기반 테트리스 게임입니다. 로컬에서 바로 열어 플레이하거나 GitHub에 푸시해 Pages로 호스팅할 수 있습니다.

## 특징
- 순수 JavaScript(의존성 없음)
- 점수, 레벨, `Hold` 기능, 다음 블록 표시
- 키보드, 터치(스와이프/탭) 및 모바일 버튼 지원
- 사운드 효과 및 최고점(localStorage) 저장

## 모바일/추가 컨트롤
- 터치: 좌/우 스와이프 = 이동, 탭 = 회전, 아래로 스와이프 = 하드 드롭
- 키보드: C = Hold, Space = 하드드롭, P = 일시정지, R = 재시작

## 실행 방법
- 로컬: 프로젝트 폴더에서 `index.html`을 더블클릭해서 열거나 간단한 서버 실행:
  - python: `python -m http.server 8000`
  - VS Code: Live Server 확장 사용

## GitHub Pages에 배포
1. 새 리포지토리 생성
2. 로컬에서 Git 초기화 및 푸시:
   ```bash
   git init
   git add .
   git commit -m "Initial Tetris"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. GitHub 리포지토리의 Settings → Pages에서 `main` 브랜치와 `/ (root)`를 선택하면 자동으로 사이트가 공개됩니다.

원하시면 자동 배포용 GitHub Actions 워크플로우도 추가해 드립니다.

---

License: MIT

// main.js — 화면 담당. P1 ~ P5, P7 에서 이어서 채웁니다.
//
// 상황: index.html 에 폼과 빈 표가 있고, 이 파일이 <script type="module"> 로 연결되어 있습니다.
//       아직 코드가 없어서 Check 를 누르면 페이지가 새로 고쳐지기만 합니다.
// 할 일: P1 Check 에 반응하기 → P2 예보 받기 → P3 표 그리기 → P4 좋은 날 표시
//       → P5 기준을 바꾸면 바로 다시 그리기 → P7 Why not 칸
// 실행: 터미널에서 npx serve . → 브라우저에서 http://localhost:3000
// 확인: 문제마다 problems/ 의 문제 파일 "확인"
// 커밋 메시지: p1: submit / p2: fetch / p3: rows / p4: rule / p5: live / p7: reasons
//
// 받아 오는 일은 api.js, 판단하는 규칙은 logic.js 에 둡니다. 이 파일에는 화면을 읽고 그리는 코드만.

// 주어짐: 도시 세 곳의 위도·경도. 키는 index.html <select> 의 option value 와 같습니다.
const CITIES = {
  seoul: { name: "Seoul", lat: 37.566, lon: 126.9784 },
  daejeon: { name: "Daejeon", lat: 36.3504, lon: 127.3845 },
  gangneung: { name: "Gangneung", lat: 37.7519, lon: 128.8761 },
};

// P1 부터 여기 아래에 씁니다.

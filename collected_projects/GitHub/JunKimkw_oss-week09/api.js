// api.js — 예보 받아 오기. P2 에서 채웁니다.
//
// 상황: Open-Meteo 에서 7일 예보를 받아야 합니다. 이 파일은 화면(document)도 규칙도 모릅니다.
// 할 일: getForecast({ lat, lon }) 를 만들어 export 합니다. 응답 JSON 의 daily 를 돌려줍니다.
//       daily 에 필요한 항목은 세 가지: 그날 최고기온, 그날 최대 강수확률, 그날 최대 풍속(지상 10 m).
//       시간대는 Asia/Seoul, 기간은 7일. 응답이 실패(200 대가 아님)면 throw 합니다.
// 확인: problems/P2_fetch.md 의 "확인"
// 커밋 메시지: p2: fetch

const BASE = "https://api.open-meteo.com/v1/forecast";

// P2: 여기에 getForecast 를 씁니다.

// ---- 주어짐: 인터넷이 안 될 때만 씁니다 (README 부록 E5) ----
// data/ 폴더에 저장해 둔 실제 응답(11/5 받은 것)을 getForecast 와 같은 모양으로 돌려줍니다.
export async function getSampleForecast(cityKey) {
  const res = await fetch(`./data/${cityKey}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.daily;
}

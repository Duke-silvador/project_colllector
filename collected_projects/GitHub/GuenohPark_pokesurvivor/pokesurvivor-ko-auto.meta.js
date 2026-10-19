// ==UserScript==
// @name PokéSurvivor 한국어 자동 업데이트
// @namespace pokesurvivor-ko-auto
// @version 0.1.1
// @description 접속 시 GitHub 버전 확인, 새 번역팩만 다운로드, 오프라인 캐시와 플레이 중 교체 방지.
// @match https://pokesurvivor.org/*
// @match https://www.pokesurvivor.org/*
// @match https://pokesurvivor.com/*
// @match https://www.pokesurvivor.com/*
// @homepageURL https://github.com/GuenohPark/pokesurvivor
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js
// @run-at document-end
// @inject-into content
// @grant GM.getValue
// @grant GM.setValue
// @grant GM.xmlHttpRequest
// @connect raw.githubusercontent.com
// ==/UserScript==

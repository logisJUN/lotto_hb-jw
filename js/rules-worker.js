/* 패턴 분석 계산(js/rules.js)을 화면과 따로 백그라운드에서 돌립니다. 결과는 app.js의 showRules가 받아 그립니다. */
importScripts('rules.js');
self.onmessage = function (e) { self.postMessage(self.LottoRules.evaluate(e.data)); };

// 2026 함께하는 장날 초대장: 사운드 효과 모듈 (ElevenLabs 생성 음원, 2026-07-05)
// 음원 출처: 앱 UI(잔치 초대장 톤)에 맞춰 ElevenLabs text_to_sound_effects로 생성
//   unfold  "한지가 부드럽게 펼쳐지는" 짧은 상승음 — 접이식 펼침 전용
//   fold    "한지가 부드럽게 접히는" 짧은 하강음 — 접이식 접힘 전용
//   success "따뜻하고 은은한 완료 종소리" — 응답 접수 완료
// 재생 실패(파일 누락·미지원) 시 Web Audio 임시 톤으로 폴백한다.
// 소리는 기본 '꺼짐'. 상단 토글로 켠 뒤에만, 그리고 사용자 첫 조작 이후에만 재생된다.
(function () {
  "use strict";

  var KEY = "jangnal2026_sound";
  var ctx = null;
  // 기본값은 '꺼짐'. 사용자가 명시적으로 켠 경우("on")에만 소리를 낸다.
  var enabled;
  try { enabled = localStorage.getItem(KEY) === "on"; } catch (e) { enabled = false; }

  // 볼륨은 낮게 유지해 스크린 리더 음성과 겹쳐도 방해하지 않게 한다.
  var FILES = {
    unfold: { src: "assets/sfx/unfold.mp3", vol: 0.5 },
    fold: { src: "assets/sfx/fold.mp3", vol: 0.5 },
    success: { src: "assets/sfx/success.mp3", vol: 0.5 },
  };

  var players = {};
  function player(name) {
    if (!players[name]) {
      var a = new Audio(FILES[name].src);
      a.preload = "auto";
      a.volume = FILES[name].vol;
      players[name] = a;
    }
    return players[name];
  }
  // 첫 조작에서 바로 재생되도록 미리 버퍼링
  Object.keys(FILES).forEach(player);

  // ---- Web Audio 톤 폴백 ----
  function audioCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(c, freq, start, dur, type, peak) {
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    var t0 = c.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.1, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  var TONES = {
    // 펼침: 낮게 부풀었다 잦아드는 완전5도 배음 (부드럽고 자연스럽게)
    unfold: function (c) { tone(c, 392.0, 0, 0.4, "sine", 0.06); tone(c, 587.33, 0.08, 0.44, "sine", 0.05); },
    // 접힘: 펼침의 역방향으로 내려앉는 완전5도 (더 짧고 여리게)
    fold: function (c) { tone(c, 587.33, 0, 0.32, "sine", 0.05); tone(c, 392.0, 0.06, 0.4, "sine", 0.05); },
    success: function (c) { tone(c, 523.25, 0, 0.3); tone(c, 659.25, 0.11, 0.3); tone(c, 783.99, 0.22, 0.5); },
  };

  function fallback(name) {
    if (!TONES[name]) return;
    var c = audioCtx();
    if (!c) return;
    try { TONES[name](c); } catch (e) { /* 무시 */ }
  }

  window.JangnalSound = {
    isEnabled: function () { return enabled; },
    setEnabled: function (v) {
      enabled = !!v;
      try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch (e) { /* 무시 */ }
    },
    play: function (name) {
      if (!enabled || !FILES[name]) return;
      var a = player(name);
      try {
        a.currentTime = 0;
        var p = a.play();
        if (p && p.catch) p.catch(function () { fallback(name); });
      } catch (e) {
        fallback(name);
      }
    },
  };
})();

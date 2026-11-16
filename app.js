"use strict";

const canvas = document.querySelector("#preview");
const context = canvas.getContext("2d", { alpha: false });
const save = document.querySelector("#save");
const status = document.querySelector("#status");
const presets = document.querySelector("#presets");
const effectSelect = document.querySelector("#effect");
const fontSelect = document.querySelector("#font");
const logo = new Image();
let logoReady = false;
let background = null;
let activePreset = 0;
let exporting = false;
const pending = new Set();

const themes = [
  { name: "ルビー", colors: ["#230d24", "#8c2345", "#fa5278", "#ffb676"], seed: 9 },
  { name: "オーロラ", colors: ["#11152e", "#443784", "#ac79ff", "#7ce7fc"], seed: 17 },
  { name: "ラグーン", colors: ["#0c2432", "#16566d", "#5aebd7", "#80ddff"], seed: 22 },
  { name: "ミッドナイト", colors: ["#0c1129", "#25356b", "#727ff8", "#cabaed"], seed: 39 },
  { name: "アンバー", colors: ["#281320", "#8d432c", "#ffc165", "#ffe1a0"], seed: 50 }
];

const effects = {
  sweep: drawSweep,
  beam: drawBeam,
  haze: drawHaze,
  prism: drawPrism,
  sparkles: drawSparkles
};

const fonts = {
  sans: { family: '"Hiragino Sans", Meiryo, system-ui, sans-serif', weight: 750 },
  serif: { family: 'Georgia, "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", serif', weight: 600 },
  rounded: { family: 'ui-rounded, "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif', weight: 700 },
  mono: { family: 'ui-monospace, "SFMono-Regular", Consolas, "Courier New", monospace', weight: 700 }
};

const roleFont = "system-ui, sans-serif";
const bottomLine = 865;
const composerSize = 460;
const performers = [
  { id: "vocal", label: "Vocal", icon: drawMicrophone, x: 172, y: 91, size: 620, nameSize: 96, roleSize: 50 },
  { id: "composer", label: "Composer", icon: drawNote, x: 1215, y: bottomLine - composerSize, size: composerSize, nameSize: 70, roleSize: 44, textAbove: true }
].map(performer => ({
  ...performer,
  image: null,
  name: document.querySelector(`#${performer.id}-name`)
}));

function cover(image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  context.drawImage(image, (image.naturalWidth - cropWidth) / 2,
    (image.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, x, y, width, height);
}

function glow(target, x, y, radius, color, opacity) {
  const light = target.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color + opacity);
  light.addColorStop(1, color + "00");
  target.fillStyle = light;
  target.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
}

function drawTheme(theme, target = context) {
  const [dark, middle, light, accent] = theme.colors;
  const gradient = target.createLinearGradient(95, 980, 1790, 100);
  gradient.addColorStop(0, dark);
  gradient.addColorStop(0.52, middle);
  gradient.addColorStop(1, dark);
  target.fillStyle = gradient;
  target.fillRect(0, 0, canvas.width, canvas.height);
  glow(target, 290, 230, 770, light, "75");
  glow(target, 1595, 465, 660, accent, "54");
  glow(target, 1190, 1080, 520, light, "48");
}

function drawSweep(theme) {
  const accent = theme.colors[3];
  context.beginPath();
  context.moveTo(-20, 1070);
  context.bezierCurveTo(175, 860, 730, 990, 1000, 590);
  context.bezierCurveTo(1280, 175, 1720, 330, 1920, -25);
  context.shadowColor = accent;
  context.shadowBlur = 22;
  context.strokeStyle = accent + "ae";
  context.lineWidth = 2;
  context.stroke();
  context.shadowBlur = 0;
  for (const [x, y] of [[117, 985], [820, 767], [1757, 147]]) {
    glow(context, x, y, 20, accent, "a8");
    context.beginPath();
    context.arc(x, y, 3.5, 0, Math.PI * 2);
    context.fillStyle = "#fffaf6";
    context.fill();
  }
}

function drawBeam(theme) {
  const accent = theme.colors[3];
  glow(context, 1540, 198, 555, accent, "64");
  glow(context, 304, 990, 340, accent, "30");
  context.translate(960, 541);
  context.rotate(0.50);
  const band = context.createLinearGradient(0, -76, 0, 76);
  band.addColorStop(0, accent + "00");
  band.addColorStop(0.4, accent + "32");
  band.addColorStop(0.5, accent + "ae");
  band.addColorStop(0.55, accent + "24");
  band.addColorStop(1, accent + "00");
  context.fillStyle = band;
  context.fillRect(-1190, -76, 2380, 152);
}

function drawHaze(theme) {
  const [, , light, accent] = theme.colors;
  glow(context, 1470, 175, 660, accent, "8b");
  glow(context, 372, 918, 470, light, "74");
  glow(context, 966, 532, 420, accent, "25");
}

function drawPrism(theme) {
  const [, , light, accent] = theme.colors;
  for (const [x, y, angle] of [[1430, 180, -0.41], [340, 944, -0.22]]) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    const band = context.createLinearGradient(0, -88, 0, 88);
    band.addColorStop(0, light + "00");
    band.addColorStop(0.28, light + "70");
    band.addColorStop(0.54, accent + "60");
    band.addColorStop(0.72, "#fff2ba46");
    band.addColorStop(1, accent + "00");
    context.fillStyle = band;
    context.beginPath();
    context.moveTo(-630, -94);
    context.lineTo(535, -55);
    context.lineTo(620, 75);
    context.lineTo(-515, 105);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function drawSparkles(theme, target = context) {
  const accent = theme.colors[3];
  let seed = theme.seed;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 86; i++) {
    const x = 42 + random() * 1836;
    const y = 42 + random() * 996;
    const radius = 2 + random() * 6;
    const color = i % 2 ? accent : "#fffcf1";
    if (i % 5 === 0) {
      drawSparkle(target, x, y, radius * 2.5, color + "ce");
    } else if (i % 3 === 0) {
      target.save();
      target.translate(x, y);
      target.rotate(random() * Math.PI);
      target.fillStyle = color + "7a";
      target.fillRect(-radius / 2, -radius / 2, radius, radius * 1.8);
      target.restore();
    } else {
      target.beginPath();
      target.arc(x, y, radius / 2, 0, Math.PI * 2);
      target.fillStyle = color + "80";
      target.fill();
    }
  }
}

function drawSparkle(target, x, y, radius, color) {
  const inset = radius * 0.18;
  target.beginPath();
  target.moveTo(x, y - radius);
  target.lineTo(x + inset, y - inset);
  target.lineTo(x + radius, y);
  target.lineTo(x + inset, y + inset);
  target.lineTo(x, y + radius);
  target.lineTo(x - inset, y + inset);
  target.lineTo(x - radius, y);
  target.lineTo(x - inset, y - inset);
  target.closePath();
  target.fillStyle = color;
  target.fill();
}

function drawMicrophone() {
  context.beginPath();
  context.roundRect(9, 2, 12, 20, 6);
  context.moveTo(5, 16);
  context.arc(15, 16, 10, Math.PI, 0, true);
  context.moveTo(15, 26);
  context.lineTo(15, 31);
  context.moveTo(10, 31);
  context.lineTo(20, 31);
  context.stroke();
}

function drawNote() {
  context.beginPath();
  context.moveTo(13, 24);
  context.lineTo(13, 7);
  context.lineTo(28, 3);
  context.lineTo(28, 20);
  context.moveTo(13, 12);
  context.lineTo(28, 8);
  context.stroke();
  for (const [x, y] of [[8, 25], [23, 21]]) {
    context.beginPath();
    context.ellipse(x, y, 5.5, 3.7, -0.36, 0, Math.PI * 2);
    context.fill();
  }
}

function drawRole(performer, accent, baseline) {
  const { x, label, roleSize, icon } = performer;
  context.font = `600 ${roleSize}px ${roleFont}`;
  context.fillStyle = accent;
  context.fillText(label, x + roleSize, baseline);

  const scale = roleSize / 38;
  context.save();
  context.translate(x, baseline - 31 * scale);
  context.scale(scale, scale);
  context.strokeStyle = accent;
  context.lineWidth = 2.4;
  context.lineCap = "round";
  context.lineJoin = "round";
  icon();
  context.restore();
}

function drawPerformer(performer, font, accent) {
  const { image, x, y, size, label, nameSize, roleSize, name } = performer;
  context.save();
  if (image) {
    cover(image, x, y, size, size);
  } else {
    context.fillStyle = "#171326b3";
    context.fillRect(x, y, size, size);
    context.fillStyle = "#f4eefe";
    context.font = `500 34px ${roleFont}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, x + size / 2, y + size / 2);
  }

  const value = name.value.trim();
  let fontSize = nameSize;
  do {
    context.font = `${font.weight} ${fontSize}px ${font.family}`;
    const metrics = context.measureText(value);
    if (Math.max(metrics.width, metrics.actualBoundingBoxRight ?? 0) <= size + 18) break;
    fontSize -= 2;
  } while (fontSize >= 30);

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.shadowColor = "#110b22";
  context.shadowBlur = 10;
  context.shadowOffsetY = 2;
  context.fillStyle = "#fff";
  const nameBaseline = performer.textAbove ? y - 22 : bottomLine - roleSize - 10;
  if (fontSize >= 30) context.fillText(value, x, nameBaseline);
  const roleBaseline = performer.textAbove ? nameBaseline - nameSize - 9 : bottomLine;
  drawRole(performer, accent, roleBaseline);
  context.restore();
  return fontSize >= 30;
}

function drawCollaborationMark(accent) {
  const x = 985;
  const y = 544;
  context.save();
  context.shadowColor = "#181023";
  context.shadowBlur = 6;
  context.beginPath();
  context.moveTo(x - 155, y);
  context.lineTo(x - 62, y);
  context.moveTo(x + 62, y);
  context.lineTo(x + 155, y);
  context.strokeStyle = accent + "c0";
  context.lineWidth = 2;
  context.stroke();

  context.beginPath();
  context.moveTo(x - 20, y - 20);
  context.lineTo(x + 20, y + 20);
  context.moveTo(x + 20, y - 20);
  context.lineTo(x - 20, y + 20);
  context.strokeStyle = "#fffaf6";
  context.lineWidth = 3;
  context.stroke();
  context.restore();
}

function render() {
  const theme = themes[activePreset];
  const font = fonts[fontSelect.value] || fonts.sans;
  const effectTheme = background ? themes[1] : theme;
  const accent = effectTheme.colors[3];
  if (background) cover(background, 0, 0, canvas.width, canvas.height);
  else drawTheme(theme);

  const drawEffect = effects[effectSelect.value];
  if (drawEffect) {
    context.save();
    drawEffect(effectTheme);
    context.restore();
  }
  drawCollaborationMark(accent);
  let ready = true;
  let longName = false;
  for (const performer of performers) {
    const name = performer.name.value.trim();
    const fits = drawPerformer(performer, font, accent);
    longName ||= !fits;
    ready &&= Boolean(performer.image && name && fits);
    performer.name.setCustomValidity(fits ? "" : "画像に収まるよう名前を短くしてください。");
  }

  if (logoReady) {
    const scale = Math.min(136 / logo.naturalWidth, 122 / logo.naturalHeight);
    const width = logo.naturalWidth * scale;
    const height = logo.naturalHeight * scale;
    context.drawImage(logo, canvas.width - 24 - width, canvas.height - 24 - height, width, height);
  }
  save.disabled = !ready || !logoReady || pending.size > 0 || exporting;
  return longName;
}

function selectPreset(index) {
  activePreset = index;
  background = null;
  document.querySelector("#background").value = "";
  pending.delete("background");
  updatePresetButtons();
  status.textContent = "";
  render();
}

function updatePresetButtons() {
  [...presets.children].forEach((button, index) => {
    button.setAttribute("aria-pressed", String(!background && index === activePreset));
  });
}

function bindImage(id, acceptImage) {
  const input = document.querySelector(`#${id}`);
  let request = 0;
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const version = ++request;
    pending.add(id);
    status.textContent = "";
    render();
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (version === request && input.files[0] === file) acceptImage(image);
    } catch {
      if (version === request && input.files[0] === file) {
        input.value = "";
        status.textContent = "画像を読み込めませんでした。PNGやJPEGなどの画像を選んでください。";
      }
    } finally {
      URL.revokeObjectURL(url);
      if (version === request) {
        pending.delete(id);
        render();
      }
    }
  });
}

const thumbnail = document.createElement("canvas");
thumbnail.width = 192;
thumbnail.height = 108;
const thumbnailContext = thumbnail.getContext("2d");
thumbnailContext.scale(0.1, 0.1);
for (const [index, theme] of themes.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = theme.name;
  drawTheme(theme, thumbnailContext);
  button.style.background = `center / cover url("${thumbnail.toDataURL()}")`;
  button.addEventListener("click", () => selectPreset(index));
  presets.append(button);
}
updatePresetButtons();
effectSelect.addEventListener("change", render);
fontSelect.addEventListener("change", () => {
  status.textContent = render() ? "画像に収まるよう名前を短くしてください。" : "";
});
bindImage("background", image => {
  background = image;
  updatePresetButtons();
});

for (const performer of performers) {
  bindImage(performer.id, image => { performer.image = image; });
  performer.name.addEventListener("input", () => {
    status.textContent = render() ? "画像に収まるよう名前を短くしてください。" : "";
  });
}

logo.addEventListener("load", () => {
  logoReady = true;
  render();
});
logo.addEventListener("error", () => {
  status.textContent = "ロゴを読み込めませんでした。ページを再読み込みしてください。";
});
logo.src = "assets/logo.png";

save.addEventListener("click", () => {
  exporting = true;
  render();
  canvas.toBlob(blob => {
    exporting = false;
    render();
    if (!blob) {
      status.textContent = "画像を保存できませんでした。もう一度お試しください。";
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "first-step-project.png";
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = "PNGのダウンロードを開始しました。";
  }, "image/png");
});

window.addEventListener("pageshow", () => {
  for (const input of document.querySelectorAll("input")) input.value = "";
  effectSelect.value = "";
  fontSelect.value = "sans";
  render();
}, { once: true });
render();

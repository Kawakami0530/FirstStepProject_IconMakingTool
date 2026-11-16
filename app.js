"use strict";

const canvas = document.querySelector("#preview");
const context = canvas.getContext("2d", { alpha: false });
const save = document.querySelector("#save");
const status = document.querySelector("#status");
const presets = document.querySelector("#presets");
const logo = new Image();
let logoReady = false;
let background = null;
let activePreset = 0;
let exporting = false;
const pending = new Set();

const themes = [
  { name: "ルビー", colors: ["#230d24", "#8c2345", "#fa5278", "#ffb676"], origin: [1130, 410], angle: -0.38, seed: 9 },
  { name: "オーロラ", colors: ["#11152e", "#443784", "#ac79ff", "#7ce7fc"], origin: [780, 340], angle: 0.48, seed: 17 },
  { name: "ラグーン", colors: ["#0c2432", "#16566d", "#5aebd7", "#80ddff"], origin: [990, 600], angle: -0.66, seed: 22 },
  { name: "ミッドナイト", colors: ["#0c1129", "#25356b", "#727ff8", "#cabaed"], origin: [1200, 460], angle: 0.28, seed: 39 },
  { name: "アンバー", colors: ["#281320", "#8d432c", "#ffc165", "#ffe1a0"], origin: [930, 370], angle: -0.22, seed: 50 }
];

const performers = [
  { id: "vocal", label: "ボーカル", x: 220, y: 140, size: 600, nameSize: 86, maxWidth: 730 },
  { id: "composer", label: "コンポーザー", x: 1175, y: 238, size: 500, nameSize: 64, maxWidth: 580 }
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

function drawTheme(theme, target = context) {
  const [dark, middle, light, accent] = theme.colors;
  const gradient = target.createLinearGradient(95, 980, 1790, 100);
  gradient.addColorStop(0, dark);
  gradient.addColorStop(0.52, middle);
  gradient.addColorStop(1, dark);
  target.fillStyle = gradient;
  target.fillRect(0, 0, canvas.width, canvas.height);

  for (const [x, y, radius, color] of [
    [290, 230, 770, light], [1595, 465, 660, accent], [1190, 1080, 520, light]
  ]) {
    const glow = target.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color + "a8");
    glow.addColorStop(1, color + "00");
    target.fillStyle = glow;
    target.fillRect(0, 0, canvas.width, canvas.height);
  }

  target.save();
  target.translate(...theme.origin);
  target.rotate(theme.angle);
  for (let i = 0; i < 8; i++) {
    target.strokeStyle = (i % 2 ? accent : light) + (i % 3 === 0 ? "68" : "3d");
    target.lineWidth = i % 3 === 0 ? 4 : 1.5;
    target.beginPath();
    target.ellipse(0, 0, 610 + 58 * i, 190 + 28 * i, 0, 0, Math.PI * 2);
    target.stroke();
  }
  target.restore();

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
  target.strokeStyle = accent + "85";
  target.lineWidth = 2;
  target.strokeRect(37, 37, 1846, 1006);
  target.strokeStyle = accent + "36";
  target.lineWidth = 1;
  target.strokeRect(49, 49, 1822, 982);
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

function roundedBox(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawPerformer(performer, accent) {
  const { image, x, y, size, label, maxWidth, nameSize, name } = performer;
  const center = x + size / 2;
  const frame = context.createLinearGradient(x, y, x + size, y + size);
  frame.addColorStop(0, "#fff6e6");
  frame.addColorStop(0.5, accent);
  frame.addColorStop(1, "#fff6e6");

  context.save();
  roundedBox(x - 14, y - 14, size + 28, size + 28, 32);
  context.fillStyle = "#171226";
  context.shadowColor = "#1009169c";
  context.shadowBlur = 42;
  context.shadowOffsetY = 15;
  context.fill();
  context.restore();
  roundedBox(x - 14, y - 14, size + 28, size + 28, 32);
  context.lineWidth = 3;
  context.strokeStyle = frame;
  context.stroke();

  context.save();
  roundedBox(x, y, size, size, 20);
  context.clip();
  context.fillStyle = "#21192f";
  context.fillRect(x, y, size, size);
  if (image) cover(image, x, y, size, size);
  else {
    context.fillStyle = "#e6daf8";
    context.font = "600 36px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, center, y + size / 2);
  }
  context.restore();

  const plateY = y + size - 20;
  const plateHeight = nameSize + 68;
  const plateWidth = maxWidth + 50;
  roundedBox(center - plateWidth / 2, plateY, plateWidth, plateHeight, 24);
  const plate = context.createLinearGradient(center, plateY, center, plateY + plateHeight);
  plate.addColorStop(0, "#30243b");
  plate.addColorStop(1, "#120f1c");
  context.fillStyle = plate;
  context.fill();
  context.strokeStyle = frame;
  context.lineWidth = 2;
  context.stroke();
  drawSparkle(context, center, plateY + 14, 9, accent);
  return drawName(name.value.trim(), performer, plateY + (plateHeight + 10) / 2);
}

function drawCollaborationMark(accent) {
  const x = 988;
  const y = 457;
  context.beginPath();
  context.arc(x, y, 58, 0, Math.PI * 2);
  context.fillStyle = "#1c1529";
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 2.5;
  context.stroke();

  context.beginPath();
  context.moveTo(x - 18, y - 18);
  context.lineTo(x + 18, y + 18);
  context.moveTo(x + 18, y - 18);
  context.lineTo(x - 18, y + 18);
  context.lineCap = "round";
  context.lineWidth = 7;
  context.strokeStyle = "#fff6e6";
  context.stroke();
  drawSparkle(context, x, y - 58, 10, accent);
  drawSparkle(context, x, y + 58, 10, accent);
}

function drawName(name, performer, y) {
  let size = performer.nameSize;
  do {
    context.font = `800 ${size}px "Hiragino Sans", Meiryo, system-ui, sans-serif`;
    if (context.measureText(name).width <= performer.maxWidth) break;
    size -= 2;
  } while (size >= 30);

  if (size < 30) return false;
  const x = performer.x + performer.size / 2;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "#100d18";
  context.lineWidth = Math.max(3, size / 18);
  context.fillStyle = "#fff";
  context.strokeText(name, x, y);
  context.fillText(name, x, y);
  return true;
}

function render() {
  const theme = themes[activePreset];
  const accent = background ? "#eed3a0" : theme.colors[3];
  if (background) cover(background, 0, 0, canvas.width, canvas.height);
  else drawTheme(theme);

  drawCollaborationMark(accent);
  let ready = true;
  let longName = false;
  for (const performer of performers) {
    const name = performer.name.value.trim();
    const fits = drawPerformer(performer, accent);
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
  render();
}, { once: true });
render();

let canvas;
let context;
let loMidi = 40;
let vertexIndex = 0;
let t;
let lastTime;
let speed = 0.01;
let oscillator;
let audioContext;

// --------------------------------------------------------------------------- 

class Vector2 {
  constructor(x = 0, y = 0) {
    this.xy = [x, y];
  }
 
  get x() {
    return this.xy[0];
  }

  get y() {
    return this.xy[1];
  }

  set x(value) {
    this.xy[0] = value;
  }

  set y(value) {
    this.xy[1] = value;
  }

  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  add(that) {
    return new Vector2(this.x + that.x, this.y + that.y);
  }

  subtract(that) {
    return new Vector2(this.x - that.x, this.y - that.y);
  }

  flipAround(that) {
    return this.subtract(that).negate().add(that);
  }

  negate() {
    return new Vector2(-this.x, -this.y);
  }

  distance(that) {
    return this.subtract(that).magnitude;
  }

  diagonalDistance(that) {
    let diffX = that.x - this.x;
    let diffY = that.y - this.y;
    return Math.max(Math.abs(diffX), Math.abs(diffY));
  }

  round() {
    return new Vector2(Math.round(this.x), Math.round(this.y));
  }

  lerp(that, t) {
    return new Vector2((1 - t) * this.x + t * that.x, (1 - t) * this.y + t * that.y);
  }

  toString() {
    return `[${this.x}, ${this.y}]`;
  }
}

// --------------------------------------------------------------------------- 

class Polygon {
  constructor(vertices = []) {
    this.vertices = vertices;
  }
}

// --------------------------------------------------------------------------- 

function midiToFrequency(midi) {
  let diff = midi - 69;
  return 440 * Math.pow(2, diff / 12.0);
}

// --------------------------------------------------------------------------- 

let quad = new Polygon([
  new Vector2(0, 60),
  new Vector2(2, 64),
  new Vector2(8, 67),
  new Vector2(10, 64),
  new Vector2(4, 55),
]);

// --------------------------------------------------------------------------- 

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // draw labels on y-axis
  let nsteps = 50;
  let stepHeight = Math.floor(canvas.height / nsteps);

  context.font = '8px sans-serif';
  for (let y = 0, i = 0; y < canvas.height; y += stepHeight, ++i) {
    context.fillText(i + loMidi, 0, y);
  }

  let columnWidth = 50;
  context.beginPath();
  for (let vertex of quad.vertices) {
    context.lineTo(vertex.x * columnWidth + 100, (vertex.y - loMidi) * stepHeight);
  }
  context.closePath();
  context.stroke();

  context.beginPath();
  let from = quad.vertices[vertexIndex];
  let to = quad.vertices[(vertexIndex + 1) % quad.vertices.length];
  let distance = from.distance(to);
  let timeLength = distance / speed;
  let position = from.lerp(to, t / timeLength);
  context.arc(position.x * columnWidth + 100, (position.y - loMidi) * stepHeight, 6, 0, 2 * Math.PI, true);
  context.closePath();
  context.fill();
}

// --------------------------------------------------------------------------- 

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.requestAnimationFrame(draw);
}

// --------------------------------------------------------------------------- 

function initializeAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContext();
  oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.connect(audioContext.destination);
}

// --------------------------------------------------------------------------- 

function initialize() {
  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');
  window.addEventListener('resize', resize);
  // window.addEventListener('mousedown', mouseDown);
  // window.addEventListener('mouseup', mouseUp);
  // window.addEventListener('mousemove', mouseMove);
  resize();

  let playButton = document.getElementById('play-button');
  playButton.addEventListener('click', animate);
}

// --------------------------------------------------------------------------- 

function animate() {
  if (!audioContext) {
    initializeAudio();
  }

  vertexIndex = 0;
  lastTime = Date.now();
  t = 0;
  oscillator.frequency.setValueAtTime(midiToFrequency(quad.vertices[vertexIndex].y), audioContext.currentTime);
  oscillator.start();
  tick();
}

// --------------------------------------------------------------------------- 

function tick() {
  let nowTime = Date.now();
  t = nowTime - lastTime;

  let from = quad.vertices[vertexIndex];
  let to = quad.vertices[(vertexIndex + 1) % quad.vertices.length];
  let distance = from.distance(to);
  let timeLength = distance / speed;

  if (t > timeLength) {
    vertexIndex = (vertexIndex + 1) % quad.vertices.length;
    t -= timeLength;
    lastTime = nowTime;
  }

  oscillator.frequency.setValueAtTime(midiToFrequency(quad.vertices[vertexIndex].y), audioContext.currentTime);

  window.requestAnimationFrame(draw);

  setTimeout(tick, 16);
}

// --------------------------------------------------------------------------- 

window.addEventListener('load', initialize);

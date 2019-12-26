let canvas;
let context;
let loMidi = 40;
let vertexIndex = 0;
let t;
let lastTime;
let speed = 0.01;
let oscillator;
let audioContext;
let selectButton;
let extendButton;
let splitButton;
let moveButton;
let polygons = [];
let selection = null;

let margins = {
  left: 50,
  right: 0,
  top: 0,
  bottom: 20,
};

let hgap = 30;
let vgap = 30;

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

  addVertex(vertex) {
    this.vertices.push(vertex);
  }
}

// --------------------------------------------------------------------------- 

function midiToFrequency(midi) {
  let diff = midi - 69;
  return 440 * Math.pow(2, diff / 12.0);
}

// --------------------------------------------------------------------------- 

// let quad = new Polygon([
  // new Vector2(0, 60),
  // new Vector2(2, 64),
  // new Vector2(8, 67),
  // new Vector2(10, 64),
  // new Vector2(4, 55),
// ]);

// --------------------------------------------------------------------------- 

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = margins.bottom; y < canvas.height - margins.top; y += vgap) {
    for (let x = margins.left; x < canvas.width - margins.right; x += hgap) {
      context.fillStyle = "rgb(200, 200, 200)";

      context.beginPath();
      context.arc(x, canvas.height - y, 6, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();

      context.fillStyle = "rgb(230, 230, 230)";

      context.beginPath();
      context.arc(x, canvas.height - y, 5, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();

      // context.beginPath();
      // context.moveTo(x, canvas.height - y);
      // context.lineTo(x + 10, canvas.height - y);
      // context.stroke();
    }
  }

  // draw labels on y-axis
  let nsteps = 50;
  let stepHeight = Math.floor(canvas.height / nsteps);

  context.font = '8px sans-serif';
  for (let y = 0, i = 0; y < canvas.height; y += stepHeight, ++i) {
    context.fillText(i + loMidi, 0, y);
  }

  for (let polygon of polygons) {
    let vertices = polygon.vertices;

    // Plot edges.
    if (vertices.length > 1) {
      let first = vertices[0];
      let last = vertices[vertices.length - 1];

      // Show path to next in solid stroke.
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(first.x * hgap + margins.left, canvas.height - 1 - (first.y * vgap + margins.bottom));
      for (let i = 1; i < vertices.length; ++i) {
        let vertex = vertices[i];
        context.lineTo(vertex.x * hgap + margins.left, canvas.height - 1 - (vertex.y * vgap + margins.bottom));
      }
      context.stroke();

      // Show return in dashed stroke.
      if (polygon.vertices.length > 2) {
        context.setLineDash([4, 2]);
        context.beginPath();
        context.moveTo(last.x * hgap + margins.left, canvas.height - (last.y * vgap + margins.bottom));
        context.lineTo(first.x * hgap + margins.left, canvas.height - (first.y * vgap + margins.bottom));
        context.stroke();
      }
    }

    // Plot vertices.
    context.fillStyle = "black";
    for (let vertex of vertices) {
      context.beginPath();
      context.arc(vertex.x * hgap + margins.left, canvas.height - (vertex.y * vgap + margins.bottom), 3, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();
    }
  }

  // let columnWidth = 50;
  // context.beginPath();
  // for (let vertex of quad.vertices) {
    // context.lineTo(vertex.x * columnWidth + 100, (vertex.y - loMidi) * stepHeight);
  // }
  // context.closePath();
  // context.stroke();

  // context.beginPath();
  // let from = quad.vertices[vertexIndex];
  // let to = quad.vertices[(vertexIndex + 1) % quad.vertices.length];
  // let distance = from.distance(to);
  // let timeLength = distance / speed;
  // let position = from.lerp(to, t / timeLength);
  // context.arc(position.x * columnWidth + 100, (position.y - loMidi) * stepHeight, 6, 0, 2 * Math.PI, true);
  // context.closePath();
  // context.fill();
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
  window.addEventListener('mouseup', mouseUp);
  // window.addEventListener('mousemove', mouseMove);
  resize();

  let playButton = document.getElementById('play-button');
  playButton.addEventListener('click', animate);

  // selectButton = document.getElementById('hand');
  // extendButton = document.getElementById('extend');
  // splitButton = document.getElementById('split');
  // moveButton = document.getElementById('move');

  // let buttons = [selectButton, extendButton, splitButton, moveButton];
  // for (let button of buttons) {
    // button.addEventListener('click', function() {
      // deselectButtons();
      // this.classList.add('selected');
    // });
  // }
}

// --------------------------------------------------------------------------- 

function deselectButtons() {
  selectButton.classList.remove('selected');
  extendButton.classList.remove('selected');
  splitButton.classList.remove('selected');
  moveButton.classList.remove('selected');
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

function mouseUp(event) {
  let vertex = new Vector2(
    parseInt(Math.round((event.clientX - margins.left) / hgap)),
    parseInt(Math.round((canvas.height - event.clientY - margins.bottom) / vgap))
  );

  if (!selection) {
    polygons.push(new Polygon());
    selection = {
      polygonIndex: polygons.length - 1,
    };
  }

  let selectedPolygon = polygons[selection.polygonIndex];
  selectedPolygon.addVertex(vertex);
  selection.vertexIndex = selectedPolygon.vertices.length - 1;

  draw();
}

// --------------------------------------------------------------------------- 

window.addEventListener('load', initialize);

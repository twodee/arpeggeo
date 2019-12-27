let canvas;
let context;
let speed = 0.01;
let audioContext;
let polygons = [];
let selection = [];
let mouseDownAt = {x: 0, y: 0};
let isPlaying = false;
let playButton;

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

  equals(that) {
    return this.x == that.x && this.y == that.y;
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

  deleteVertex(i) {
    this.vertices.splice(i, 1);
  }

  start() {
    this.playbackIndex = 0;
    this.t = 0;
    this.lastTime = 0;
    this.lastTime = Date.now();

    let frequency = midiToFrequency(this.vertices[0].y + 48)

    this.oscillator = audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.connect(gainNode);
    this.oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    this.oscillator.start();
  }

  stop() {
    this.oscillator.stop();
    this.oscillator.disconnect();
  }
}

// --------------------------------------------------------------------------- 

function midiToFrequency(midi) {
  let diff = midi - 69;
  return 440 * Math.pow(2, diff / 12.0);
}

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
    }
  }

  // draw labels on y-axis

  context.font = '8px sans-serif';
  // for (let y = 0, i = 0; y < canvas.height; y += stepHeight, ++i) {
    // context.fillText(i + loMidi, 0, y);
  // }

  for (let [polygonIndex, polygon] of polygons.entries()) {
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
    for (let [vertexIndex, vertex] of vertices.entries()) {
      let isSelected = selection.some(s => s.vertexIndex == vertexIndex && s.polygonIndex == polygonIndex);
      context.fillStyle = isSelected ? 'orange' : 'black';
      context.beginPath();
      context.arc(vertex.x * hgap + margins.left, canvas.height - (vertex.y * vgap + margins.bottom), isSelected ? 5 : 3, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();
    }

    // Plot scrubbex.
    if (isPlaying) {
      context.fillStyle = 'black';
      for (let polygon of polygons) {
        context.beginPath();
        let from = polygon.vertices[polygon.playbackIndex];
        let to = polygon.vertices[(polygon.playbackIndex + 1) % polygon.vertices.length];
        let distance = from.distance(to);
        let timeLength = distance / speed;
        let position = from.lerp(to, polygon.t / timeLength);
        context.arc(position.x * hgap + margins.left, canvas.height - (position.y * vgap + margins.bottom), 6, 0, 2 * Math.PI, true);
        context.closePath();
        context.fill();
      }
    }
  }
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
  gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
}

// --------------------------------------------------------------------------- 

function initialize() {
  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  document.addEventListener('keydown', keyDown);
  // window.addEventListener('mousemove', mouseMove);
  resize();

  playButton = document.getElementById('play-button');
  playButton.addEventListener('click', animate);
}

// --------------------------------------------------------------------------- 

function keyDown(event) {
  if (event.keyCode == 8) {
    event.preventDefault(); 
    selection.forEach(s => polygons[s.polygonIndex].deleteVertex(s.vertexIndex));
    selection = [];
    polygons = polygons.filter(p => p.vertices.length > 0);
    draw();
  }
}

// --------------------------------------------------------------------------- 

function animate() {
  if (isPlaying) {
    clearTimeout(tick);
    isPlaying = false;
    playButton.innerText = 'Play';
    for (let polygon of polygons) {
      polygon.stop();
    }
  } else {
    isPlaying = true;
    gainNode.gain.value = 1 / polygons.length;
    playButton.innerText = 'Stop';
    for (let polygon of polygons) {
      polygon.start();
    }
    tick();
  }
}

// --------------------------------------------------------------------------- 

function tick() {
  let nowTime = Date.now();

  for (let polygon of polygons) {
    polygon.t = nowTime - polygon.lastTime;
    let from = polygon.vertices[polygon.playbackIndex];
    let to = polygon.vertices[(polygon.playbackIndex + 1) % polygon.vertices.length];
    let distance = from.distance(to);
    let timeLength = distance / speed;

    if (polygon.t > timeLength) {
      polygon.playbackIndex = (polygon.playbackIndex + 1) % polygon.vertices.length;
      polygon.t -= timeLength;
      polygon.lastTime = nowTime;
    }

    polygon.oscillator.frequency.setValueAtTime(midiToFrequency(polygon.vertices[polygon.playbackIndex].y + 48), audioContext.currentTime);
  }

  window.requestAnimationFrame(draw);

  setTimeout(tick, 16);
}

// --------------------------------------------------------------------------- 

function mouseDown(event) {
  if (!audioContext) {
    initializeAudio();
  }

  mouseDownAt.x = event.clientX;
  mouseDownAt.y = canvas.height - event.clientY;
}

// --------------------------------------------------------------------------- 

function mouseUp(event) {
  let mouseAt = {
    x: event.clientX,
    y: canvas.height - event.clientY
  };

  if (Math.abs(mouseAt.x - mouseDownAt.x) < 2 && Math.abs(mouseAt.y - mouseDownAt.y) < 2) {
    let vertex = new Vector2(
      parseInt(Math.round((mouseAt.x - margins.left) / hgap)),
      parseInt(Math.round((mouseAt.y - margins.bottom) / vgap))
    );

    // See if any vertices match.
    let matchPolygonIndex = -1;
    let matchVertexIndex = -1;
    for (let [polygonIndex, p] of polygons.entries()) {
      for (let [vertexIndex, v] of p.vertices.entries()) {
        if (vertex.equals(v)) {
          matchPolygonIndex = polygonIndex;
          matchVertexIndex = vertexIndex;
        }
      }
    }

    // The user clicked on an exist vertex.
    if (matchPolygonIndex >= 0) {
      // If the match was selected, deselect it. If not, select it.
      let selectionIndex = selection.findIndex(s => s.polygonIndex == matchPolygonIndex && s.vertexIndex == matchVertexIndex);
      if (selectionIndex >= 0) {
        selection.splice(selectionIndex, 1);  
      } else {
        if (!event.shiftKey) {
          selection = [];
        }
        selection.push({
          polygonIndex: matchPolygonIndex,
          vertexIndex: matchVertexIndex
        });
      }
    }

    // The user didn't click on an existing vertex.
    else {
      // No previous selection, so this must be the start of a new polygon.
      if (selection.length == 0) {
        polygons.push(new Polygon());
        selection.push({
          polygonIndex: polygons.length - 1,
          vertexIndex: -1,
        });
      }

      // If only one vertex is selected and it's the last one of its polygon,
      // let's extend the polygon.
      if (selection.length == 1) {
        let selectedPolygon = polygons[selection[0].polygonIndex];
        if (selection[0].vertexIndex == selectedPolygon.vertices.length - 1) {
          selectedPolygon.addVertex(vertex);
          selection[0].vertexIndex = selectedPolygon.vertices.length - 1;
        } else {
          selection = [];
        }
      } else {
        selection = [];
      }
    }
  } else {
    selection = [];
  }

  draw();
}

// --------------------------------------------------------------------------- 

window.addEventListener('load', initialize);

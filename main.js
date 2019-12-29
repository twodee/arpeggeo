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

  clone() {
    return new Vector2(this.x, this.y);
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

  for (let y = margins.bottom, i = 0; y < canvas.height - margins.top; y += vgap, i += 1) {
    for (let x = margins.left; x < canvas.width - margins.right; x += hgap) {
      context.fillStyle = (i % 2 == 0) ? 'rgb(240, 240, 240)' : 'rgb(250, 250, 250)';
      context.fillRect(0, canvas.height - y - vgap / 2, canvas.width, vgap);
    }
  }

  for (let y = margins.bottom; y < canvas.height - margins.top; y += vgap) {
    for (let x = margins.left; x < canvas.width - margins.right; x += hgap) {
      context.fillStyle = "rgb(200, 200, 200)";

      context.beginPath();
      context.arc(x, canvas.height - y, gridNodeRadius, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();

      context.fillStyle = "rgb(230, 230, 230)";

      context.beginPath();
      context.arc(x, canvas.height - y, gridNodeRadius - 1, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();
    }
  }

  // Draw labels.
  context.fillStyle = 'black';
  context.font = '14px sans-serif';
  context.textBaseline = 'middle';
  context.textAlign = 'start';
  for (let y = margins.bottom, i = 0; y < canvas.height; y += vgap, ++i) {
    context.fillText(labels[i % 12], 10, canvas.height - y);
  }

  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.fillText('\u0394 = duration', canvas.width / 2, canvas.height - (margins.bottom - vgap / 2) / 2);

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
      context.fillStyle = isSelected ? '#EA80FF' : 'black';
      // context.fillStyle = isSelected ? '#6495ed' : 'black';

      if (vertexIndex == 0) {
        let radius = isSelected ? gridNodeRadius : 4;
        context.fillStyle = isSelected ? '#EA80FF' : 'crimson';
        context.fillRect(vertex.x * hgap + margins.left - radius, canvas.height - (vertex.y * vgap + margins.bottom + radius), 2 * radius, 2 * radius);
      } else {
        context.fillStyle = isSelected ? '#EA80FF' : 'black';
        context.beginPath();
        context.arc(vertex.x * hgap + margins.left, canvas.height - (vertex.y * vgap + margins.bottom), isSelected ? gridNodeRadius : 4, 0, 2 * Math.PI, true);
        context.closePath();
        context.fill();
      }
    }

    // Plot scrubbex.
    if (isPlaying) {
      context.fillStyle = 'black';
      for (let polygon of polygons) {
        context.beginPath();
        let from = polygon.vertices[polygon.playbackIndex];
        let to = polygon.vertices[(polygon.playbackIndex + 1) % polygon.vertices.length];
        let distance = Math.abs(to.x - from.x);
        let timeLength = distance / speed;
        let position = from.lerp(to, polygon.t / timeLength);
        context.arc(position.x * hgap + margins.left, canvas.height - (position.y * vgap + margins.bottom), gridNodeRadius, 0, 2 * Math.PI, true);
        context.closePath();
        context.fill();
      }
    }
  }

  // context.strokeStyle = 'black';
  // context.beginPath();
  // context.moveTo(0, canvas.height - (margins.bottom - vgap / 2) / 2);
  // context.lineTo(canvas.width, canvas.height - (margins.bottom - vgap / 2) / 2);
  // context.arc(canvas.width / 2, canvas.height - margins.bottom, gridNodeRadius, 0, 2 * Math.PI, true);
  // context.closePath();
  // context.stroke();
}

// --------------------------------------------------------------------------- 

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gridResolution = new Vector2(
    parseInt(Math.floor((canvas.width - margins.left - margins.right) / hgap)),
    parseInt(Math.floor((canvas.height - margins.top - margins.bottom) / vgap)),
  );
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
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mouseup', mouseUp);
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', keyDown);
  resize();

  playButton = document.getElementById('play-button');
  playButton.addEventListener('click', play);

  let clearButton = document.getElementById('clear-button');
  clearButton.addEventListener('click', clear);

  let saveAsButton = document.getElementById('save-as-button');
  saveAsButton.addEventListener('click', saveAs);

  loadMenu = document.getElementById('load-menu');
  loadMenu.addEventListener('change', event => {
    if (isPlaying) {
      play();
    }
    load(event.target.value);
  });

  populateLoadMenu();
}

// --------------------------------------------------------------------------- 

function load(key) {
  if (isPlaying) {

  }

  if (key) {
    clear();
    jsonToPolygons(localStorage.getItem(key));
    draw();
  }
}

// --------------------------------------------------------------------------- 

function clear() {
  if (isPlaying) {
    play();
  }
  polygons = [];
  selection = [];
  draw();
}

// --------------------------------------------------------------------------- 

function keyDown(event) {
  if (event.keyCode == 8) {
    event.preventDefault(); 
    if (!isPlaying) {
      selection.forEach(s => polygons[s.polygonIndex].deleteVertex(s.vertexIndex));
      selection = [];
      polygons = polygons.filter(p => p.vertices.length > 0);
      draw();
    }
  }
}

// --------------------------------------------------------------------------- 

function play() {
  if (!audioContext) {
    initializeAudio();
  }

  if (polygons.length > 0) {
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
}

// --------------------------------------------------------------------------- 

function tick() {
  let nowTime = Date.now();

  for (let polygon of polygons) {
    polygon.t = nowTime - polygon.lastTime;
    let from = polygon.vertices[polygon.playbackIndex];
    let to = polygon.vertices[(polygon.playbackIndex + 1) % polygon.vertices.length];
    let distance = Math.abs(to.x - from.x);
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
  let hit = classifyMouse(event, true);
  mouseDownAtPixels = hit.mousePixels;
  mouseDownAtGrid = hit.mouseGrid;
  isMouseDown = true;
  if (hit.match) {
    let selectionIndex = selection.findIndex(s => s.polygonIndex == hit.match.polygonIndex && s.vertexIndex == hit.match.vertexIndex);
    isMouseDownOnSelected = selectionIndex >= 0;
    downOnVertex = hit.match;
  } else {
    isMouseDownOnSelected = false;
  }
}

// --------------------------------------------------------------------------- 

function clamp(lo, hi, x) {
  return x < lo ? lo : (x > hi ? hi : x);
}

// --------------------------------------------------------------------------- 

function mouseMove(event) {
  let hit = classifyMouse(event, false);
  if (isMouseDown && hit.hasMovedFromDown) {
    isDragging = true;
    if (isMouseDownOnSelected || downOnVertex) {
      // Change selection.
      if (!isMouseDownOnSelected) {
        if (!event.shiftKey) {
          selection = [];
        }
        let vertex = polygons[downOnVertex.polygonIndex].vertices[downOnVertex.vertexIndex];
        selection.push({
          polygonIndex: downOnVertex.polygonIndex,
          vertexIndex: downOnVertex.vertexIndex,
          originalPosition: vertex.clone()
        });
        downOnVertex = null;
        isMouseDownOnSelected = true;
      }

      let delta = hit.mouseGrid.subtract(mouseDownAtGrid);
      selection.forEach(s => {
        let vertex = polygons[s.polygonIndex].vertices[s.vertexIndex];
        vertex.x = clamp(0, gridResolution.x, s.originalPosition.x + delta.x);
        vertex.y = clamp(0, gridResolution.y, s.originalPosition.y + delta.y);
      });
      draw();
    }
  }
}

// --------------------------------------------------------------------------- 

function populateLoadMenu() {
  // Clear old options.
  while (loadMenu.options.length > 0) {
    loadMenu.options.remove(loadMenu.options.length - 1);
  }

  let option = document.createElement('option');
  option.text = 'Load...';
  option.value = null;
  loadMenu.options.add(option, null);

  // Add new ones using keys from localStorage.
  for (let i = 0; i < localStorage.length; ++i) {
    option = document.createElement('option');
    option.text = localStorage.key(i);
    option.value = localStorage.key(i);
    loadMenu.options.add(option, null);
  }
}

// --------------------------------------------------------------------------- 

function polygonsToJson() {
  return JSON.stringify(polygons.map(polygon => polygon.vertices.map(vertex => [vertex.x, vertex.y])));
}

// --------------------------------------------------------------------------- 

function jsonToPolygons(json) {
  let object = JSON.parse(json);
  polygons = object.map(vertices => new Polygon(vertices.map(vertex => new Vector2(vertex[0], vertex[1]))));
}

// --------------------------------------------------------------------------- 

function saveAs() {
  if (isPlaying) {
    play();
  }

  let name = prompt('Save under what name?');
  if (name && name.length > 0) {
    localStorage.setItem(name, polygonsToJson());
    populateLoadMenu();
  }
}

// --------------------------------------------------------------------------- 

function classifyMouse(event, intersectVertices) {
  let hit = {
    mousePixels: new Vector2(event.clientX, canvas.height - event.clientY),
    type: null,
    match: null,
  };

  hit.hasMovedFromDown = hit.mousePixels.distance(mouseDownAtPixels) > 2;

  hit.mouseGrid = new Vector2(
    parseInt(Math.round((hit.mousePixels.x - margins.left) / hgap)),
    parseInt(Math.round((hit.mousePixels.y - margins.bottom) / vgap))
  );

  // See if any vertices match.
  if (intersectVertices) {
    for (let [polygonIndex, polygon] of polygons.entries()) {
      for (let [vertexIndex, vertex] of polygon.vertices.entries()) {
        if (hit.mouseGrid.equals(vertex)) {
          hit.match = {
            polygonIndex: polygonIndex,
            vertexIndex: vertexIndex,
          };
        }
      }
    }
  }

  return hit;
}

// --------------------------------------------------------------------------- 

function mouseUp(event) {
  isMouseDown = false;
  let hit = classifyMouse(event, true);

  if (isDragging) {
    selection.forEach(s => {
      let vertex = polygons[s.polygonIndex].vertices[s.vertexIndex];
      s.originalPosition = vertex.clone();
    });
  } else {
    // The user clicked on an existing vertex.
    if (hit.match) {
      // If the match was selected, deselect it. If not, select it.
      let selectionIndex = selection.findIndex(s => s.polygonIndex == hit.match.polygonIndex && s.vertexIndex == hit.match.vertexIndex);
      if (selectionIndex >= 0) {
        selection.splice(selectionIndex, 1);  
      } else {
        if (!event.shiftKey) {
          selection = [];
        }
        selection.push({
          polygonIndex: hit.match.polygonIndex,
          vertexIndex: hit.match.vertexIndex,
          originalPosition: polygons[hit.match.polygonIndex].vertices[hit.match.vertexIndex].clone()
        });
      }
    }

    // The user didn't click on an existing vertex.
    else if (!isPlaying) {
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
          selectedPolygon.addVertex(hit.mouseGrid.clone());
          selection[0].vertexIndex = selectedPolygon.vertices.length - 1;
          selection[0].originalPosition = hit.mouseGrid.clone();
        } else {
          selection = [];
        }
      } else {
        selection = [];
      }
    }
  }

  isDragging = false;
  draw();
}

// --------------------------------------------------------------------------- 

let canvas;
let context;
let audioContext;
let playButton;
let loadMenu;

let speed = 0.01;
let polygons = [];
let selection = [];
let mouseDownAtPixels = new Vector2(0, 0);
let mouseDownAtGrid = new Vector2(0, 0);
let gridResolution = new Vector2(0, 0);
let isPlaying = false;
let isMouseDown = false;
let isMouseDownOnSelected = false;
let isDragging = false;
let downOnVertex = null;
let gridNodeRadius = 8;

let margins = {
  left: 50,
  right: 0,
  top: 0,
  bottom: 40,
};

let hgap = 25;
let vgap = 25;

let labels = ['C', 'C#', 'D', 'E\u266d', 'E', 'F', 'F\u266f', 'G', 'A\u266d', 'A', 'B\u266d', 'B'];

window.addEventListener('load', initialize);

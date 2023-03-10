// import { VRButton } from 'vrButton';

import * as model from 'model';
import parts from 'parts';

const taElement = document.querySelector('#ta');
const loaderEl = document.querySelector('.loader');
const plDialog = document.querySelector('#plDialog');
const helpDialog = document.querySelector('#helpDialog');
const exportDialog = document.querySelector('#exportDialog');
const partsHelpEl = document.querySelector('#partsUl');
const modelSelectEl = document.querySelector('#model-select');
const plTextEl = document.querySelector('#plText');


parts.load(partsLoaded);

function partsLoaded() {
  let html = '';
  Object.keys(parts).forEach(model => {
  if(typeof parts[model] !== 'function')
    html += `<li>"${model}": ${parts[model].name} (${parts[model].type})</li>\n`;
  });
  partsHelpEl.innerHTML = html;
}

modelSelectEl.onchange = () => {
  getCSV(modelSelectEl.value);
};

const modelBase = './models/';
      
function getCSV(name) {
  fetch(modelBase + name)
    .then((response) => response.text())
    .then((text) => {
      taElement.value = text;
      model.setSpec(text);
  });  
}

getCSV(modelSelectEl.value);


window.dlCSV = () => {
  downloadText('model.csv', taElement.value);
}

window.dlParts = () => {
  const txt = getBOMText();
  downloadText('model.txt', txt);
}

window.dlSTL = () => {
  const stl = model.exportSTL();
  save(new Blob([stl]), 'model.stl');
}

function save(blob, filename) {
  const link = document.createElement( 'a' );
  link.style.display = 'none';
  document.body.appendChild( link );
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function downloadText(name, text) {
  const hiddenElement = document.createElement('a');
  hiddenElement.href = 'data:attachment/text,' + encodeURI(text);
  hiddenElement.target = '_blank';
  hiddenElement.download = name;
  hiddenElement.click();
}

const fileInput = document.getElementById('input-file');
fileInput.addEventListener('change', getFile);

document.getElementById('importButton').addEventListener('click', (e) => { 
  fileInput.click();
}, false);

function getFile(event) {
	const input = event.target;
  if ('files' in input && input.files.length > 0) {
	  placeFileContent(taElement, input.files[0]);
  }
}

function placeFileContent(target, file) {
	readFileContent(file).then(content => {
  	target.value = content;
    model.setSpec(content);
  }).catch(error => console.log(error));
}

function readFileContent(file) {
	const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  })
}

let loadingCount = 0;

// renderer.xr.enabled = true;
// document.body.appendChild(VRButton.createButton(renderer));

const urlParams = new URLSearchParams(window.location.hash.replace("#","?"));


document.querySelector('#helpButton').addEventListener('click', (event) => {
  helpDialog.showModal();
});

document.querySelector('#expButton').addEventListener('click', (event) => {
  exportDialog.showModal();
});

document.querySelector('#listButton').addEventListener('click', (event) => {
  plTextEl.innerText = getBOMText();
  plDialog.showModal();
});

function getBOMText() {
  let list = '';
  let accessories = {};
  const meshes = model.getAllMeshInstances();
  meshes.forEach(mesh => {
    const part = parts[mesh.name];
    list += part.name;
    if(part.type === 'Extruded')
      list += ` (${mesh.userData.scaleZ}mm)\n`;
    else if(mesh.scale.x !== 1 || mesh.scale.y !== 1 || mesh.scale.z !== 1) 
      list += ` (scaled)\n`;
    else 
      list += `\n`;
  });

  const partNames = model.getAllMeshProps('name');
  partNames.forEach(name => {
    const part = parts[name];
    if(part && part.accessories) {
      part.accessories.forEach(acc => {
      if(accessories[acc.id]) {
        accessories[acc.id].count += acc.count;
      }
      else
        accessories[acc.id] = { name: acc.name, count: acc.count };
    });
    }
  });
  
  const counts = {};
  const pList = list.split('\n');
  pList.forEach(x => { counts[x] = (counts[x] || 0) + 1; });

  list = '';
  Object.keys(counts).forEach(i => {
    if(i.trim().length > 0)
      list += i + ' x' + counts[i] + '\n';
  });
  
  Object.keys(accessories).forEach(key => {
    const acc = accessories[key];
    list += `${acc.name} x${acc.count}\n`;
  });

  return list;
}

taElement.onkeyup = (e) => {
  model.setSpec(taElement.value);
  updateSelection();
if(e.keyCode === 32 && e.ctrlKey) 
    lineComplete();
}

taElement.onkeydown = (e) => {
  if(e.keyCode === 9) {
    wordComplete();
    e.preventDefault();
  }
}

taElement.addEventListener('click', () => {
  model.setSpec(taElement.value);
  updateSelection();
});


function updateSelection() {
  const row = getCaretRow(taElement);
  if(row > -1) 
    model.highlightRow(row);  
}

function lineComplete() {
  console.log('@ToDo lineComplete');
}

function wordComplete() {
  console.log('@ToDo wordComplete');
}

function getCaretRow(el) {
  const pos = el.selectionStart;
  const rows = el.value.split('\n');
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    count += (rows[i].length + 1);
    if(count > pos)
      return i;
  }
  return -1;
}

let isDown = false;
let isDrag = false;

function onPointerMove(event) {
  model.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  model.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

  if(isDown)
    isDrag = true;
  else
    isDrag = false;
}
window.addEventListener('pointermove', onPointerMove);

function onPointerUp() {
  isDown = false;
  if(isDrag)
    return;
}
window.addEventListener('pointerup', onPointerUp);

function onPointerDown() {
  isDown = true;
}      
window.addEventListener('pointerdown', onPointerDown);

function startLoad() {
  loadingCount++;
  loaderEl.style.display = 'block';
}

function endLoad() {
  loadingCount--;
  if(loadingCount === 0) {
    model.loaded = true;
    loaderEl.style.display = 'none';
  }
}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  model.camera.aspect = window.innerWidth / window.innerHeight;
  model.camera.updateProjectionMatrix();
  model.renderer.setSize(window.innerWidth, window.innerHeight);
}
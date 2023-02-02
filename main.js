import * as THREE from 'three';
import { OrbitControls } from 'orbitControls';
import { STLLoader } from './lib/STLLoader.js';
import { STLExporter } from './lib/STLExporter.js';

// import { VRButton } from 'vrButton';

const taElement = document.querySelector('#ta');
const loaderEl = document.querySelector('.loader');
const plDialog = document.querySelector('#plDialog');
const helpDialog = document.querySelector('#helpDialog');
const exportDialog = document.querySelector('#exportDialog');
const plText = document.querySelector('#plText');

const gui = new dat.GUI({ autoPlace: false });
gui.domElement.id = 'guiContainer';
document.querySelector('#guiContainer').appendChild(gui.domElement);
gui.close();

window.dlCSV = () => {
  downloadText('rig.csv', taElement.value);
}

window.dlParts = () => {
  const txt = getPartsListText();
  downloadText('parts.txt', txt);
}

window.dlSTL = () => {
  const exporter = new STLExporter();
  const result = exporter.parse(scene, {binary: true});
  save(new Blob([result]), 'rig.stl');
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
    rebuild();
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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// renderer.xr.enabled = true;
// document.body.appendChild(VRButton.createButton(renderer));

const controls = new OrbitControls(camera, renderer.domElement);

const wireMaterial = new THREE.MeshPhongMaterial({
  color: 0x88ff88,
  transparent: true,
  opacity: 0.2,
});

const plColor = 0xffff00;

// prettier-ignore
const urlParams = new URLSearchParams(window.location.hash.replace("#","?"));

const camTarget = [0, 150, 0];

const cams = {
  leftShoulder: { pos: [-250, 1000, 1200], target: camTarget },
  rightShoulder: { pos: [250, 1000, 1200], target: camTarget },
  top: { pos: [200, 2000, -200], target: [200, 0, -200] },
  driver: { pos: [200, 700, 500], target: [200, 700, 499] },        
};
setCamera(Object.values(cams)[0]);

const pLight = new THREE.PointLight(0xffffff, 5, 1000);
pLight.position.set(100, 100, 100);
scene.add(pLight);

const aLight = new THREE.AmbientLight(0x404040, 3);
scene.add(aLight);

const sceneConfig = {
  wireframe: false,
  wireMaterial: wireMaterial,
};

const sceneGUI = gui.addFolder('Scene');
sceneGUI.add(sceneConfig, 'wireframe').name('X-Ray').onChange((value) => { setXRay(value); });;
sceneGUI.add(sceneConfig.wireMaterial, 'opacity', 0.1, 0.5, 0.01).name('Opacity');
sceneGUI.add(aLight, 'intensity', 0, 5, 0.01).name('Ambient Light');

const pLightGUI = sceneGUI.addFolder('Point Light');
pLightGUI.add(pLight, 'intensity', 0, 5, 0.01).name('Intensity');
pLightGUI.add(pLight.position, 'x', -100, 100, 0.1).name('X');
pLightGUI.add(pLight.position, 'y', -100, 100, 0.1).name('Y');
pLightGUI.add(pLight.position, 'z', -100, 100, 0.1).name('Z');
pLightGUI.addColor(pLight, 'color').name('Color');

const camGUI = gui.addFolder('Camera');

const camSelect = { view: Object.keys(cams)[0] };
camGUI.add(camSelect, 'view', Object.keys(cams)).name('View').onChange((value) => {
  setCamera(cams[value]);
});
camGUI.add(camera, 'fov', 20, 120).name('FoV').onChange((value) => {
  camera.updateProjectionMatrix();
});

const camPosGUI = camGUI.addFolder('Position');
camPosGUI.add(camera.position, 'x', -2500, 2500).name('X').listen();
camPosGUI.add(camera.position, 'y', -2500, 2500).name('Y').listen();
camPosGUI.add(camera.position, 'z', -2500, 2500).name('Z').listen();

const camRotGUI = camGUI.addFolder('Rotation');
camRotGUI.add(camera.rotation, 'x', -Math.PI, Math.PI).name('Z').listen();
camRotGUI.add(camera.rotation, 'y', -Math.PI, Math.PI).name('Y').listen();
camRotGUI.add(camera.rotation, 'z', -Math.PI, Math.PI).name('Z').listen();

const plasticMaterial = new THREE.MeshPhongMaterial({
  color: 0x222222,
});

document.querySelector('#helpButton').addEventListener('click', (event) => {
  helpDialog.showModal();
});

document.querySelector('#expButton').addEventListener('click', (event) => {
  rebuild(); // I don't know why this is needed but it is 
  exportDialog.showModal();
});

document.querySelector('#listButton').addEventListener('click', (event) => {
  plText.innerText = getPartsListText();
  plDialog.showModal();
});

function getPartsListText() {
  let list = '';
  let nuts = 0;
  const rows = taElement.value.split('\n');
  rows.forEach(row => {
    if(row.trim().length > 0) {
      const items = row.split(',');           
      const model = models[items[0]];

      list += model.name;
      if(items[3] > 1)
        list += ` (${items[3].trim()}mm)`;
      list += '\n';
      if(model.nuts)
        nuts += model.nuts;
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

  list += 'T-slot nuts and bolts x' + nuts;
  return list;
}

taElement.onkeyup = () => {
  rebuild();
}

function rebuild() {
  for (let i = scene.children.length - 1; i >= 0; i--) {
    if(scene.children[i].type === "Mesh")
      scene.remove(scene.children[i]);
  }        
  buildRig();
}

const c4040Shape = new THREE.Shape();      
c4040Shape.lineTo(40, 0);      
c4040Shape.lineTo(0, 40);

const c4040Geom = new THREE.ExtrudeGeometry( c4040Shape, { depth: 40, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 } );
const c8040Geom = new THREE.ExtrudeGeometry( c4040Shape, { depth: 80, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 } );

const models = {
  "8040": { name: '8040 profile', geom: null, adjust: [1,1,0.01,0,0,0,0,0,0] },   //https://www.thingiverse.com/thing:4261766
  "4040": { name: '4040 profile', geom: null, adjust: [1,1,1/120,-20,0,0,0,0,0] },  //https://www.thingiverse.com/thing:2944815
  "c4040": { name: '4040 corner', geom: c4040Geom, nuts: 2 },
  "c8040": { name: '8040 corner', geom: c8040Geom, nuts: 4 }
};

const baseURL = './assets/';

const stlLoader = new STLLoader();

function getGeometry(name) {
  stlLoader.load(
    `${baseURL}${name}.stl`,
    (geometry) => {
      models[name].geom = geometry;
      buildRig();
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
      console.log(`Error loading profile STL: ${name}`);
    }
  );
}

Object.keys(models).forEach(model => {
  if(!models[model].geom) 
    getGeometry(model);
});

function getPart(name) {
  const part = new THREE.Mesh();
  const model = models[name];
  if(!model)
    return null;
  if(model.geom)
    part.geometry = model.geom.clone();
  // part.geometry.center();

  if(model.adjust) {
    const a = model.adjust;
    part.scale.set(a[0], a[1], a[2]);
    part.geometry.translate(a[3], a[4], a[5]);
    part.rotation.set(a[6], a[7], a[8]);
  }

  part.material = plasticMaterial;
  return part;
}

function buildRig() {
  const rig = [];      
  const rows = taElement.value.split('\n');
  rows.forEach(row => {
    rig.push(row.split(','));
  });
  rig.forEach(p => {
    try {
      if(p.length > 8) {
        const part = getPart(p[0]);
        part.scale.set(p[1] * part.scale.x, p[2] * part.scale.y, p[3] * part.scale.z);
        part.position.set(p[4], p[5], p[6]); 
        part.rotation.set(p[7] * (Math.PI / 180), p[8] * (Math.PI / 180), p[9] * (Math.PI / 180)); 
        scene.add(part);
      }
    }
    catch(e) { console.log(e); };
  });
}      

function setXRay(on) {
  scene.children.forEach(p => {
    if(on) {
      p.material = wireMaterial;
    }
    else {
      p.material = plasticMaterial;
    }
  });
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let isDown = false;
let isDrag = false;

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

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

let loaded = false;

function endLoad() {
  loadingCount--;
  if(loadingCount === 0) {
    loaded = true;
    loaderEl.style.display = 'none';
  }
}

function setCamera(cam) {
  camera.position.set(...cam.pos);
  controls.target.set(...cam.target);
  controls.update();

  gui.updateDisplay();
  document.activeElement.blur();
}

function animate() {
  renderer.render(scene, camera);
}

function updateRaycaster() {
  raycaster.setFromCamera(pointer, camera);

  let intersects = [];        
}

renderer.setAnimationLoop(() => {
  if(loaded)
    updateRaycaster();
  animate();
});

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
import * as THREE from "three";
import { STLLoader } from "./lib/STLLoader.js";

export default class STLProfile extends THREE.Mesh {
  constructor(spec, length) {
    super();
    const baseURL = 'https://cdn.glitch.global/986c5687-2972-46f0-b0ff-7b262f434b83/';
    const plasticMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const stlLoader = new STLLoader();
    stlLoader.load(
      `${baseURL}${spec}.stl`,
      (geometry) => {
        this.geometry = geometry;
        this.material = plasticMaterial;
        this.scale.set(1, 1, length / 100);
        this.rotation.z += Math.PI / 2;
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.log(`Error loading profile STL: ${spec}`);
      }
    );
  }
}

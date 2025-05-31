import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, avatar;

function setupAvatar() {
  const canvas = document.getElementById('avatarCanvas');
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  const loader = new GLTFLoader();
  loader.load(chrome.runtime.getURL('assets/character_avatar.glb'), (gltf) => {
    avatar = gltf.scene;
    avatar.scale.set(0.5, 0.5, 0.5); // Adjust scale if the model is too large/small
    scene.add(avatar);
    camera.position.z = 3; // Adjust camera distance based on model size
    animate();

    // Log the model's structure to identify bone names
    console.log('Loaded avatar:', avatar);
    avatar.traverse((child) => {
      if (child.isBone) {
        console.log('Bone found:', child.name);
      }
    });
  }, undefined, (error) => {
    console.error('Error loading GLB model:', error);
  });

  const light = new THREE.AmbientLight(0xffffff);
  scene.add(light);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function renderSignLanguage(gestures) {
  if (!avatar) return;
  gestures.forEach(gesture => {
    if (gesture.animation) {
      console.log(`Animating: ${gesture.gesture}`);
      const bone = avatar.getObjectByName(gesture.animation.bone);
      if (bone) {
        bone.rotation.set(
          gesture.animation.rotation.x,
          gesture.animation.rotation.y,
          gesture.animation.rotation.z
        );
        bone.position.set(
          gesture.animation.position.x,
          gesture.animation.position.y,
          gesture.animation.position.z
        );
      } else {
        console.log(`Bone ${gesture.animation.bone} not found`);
      }
    } else {
      console.log(`No animation for gesture: ${gesture.gesture}`);
    }
  });
}

setupAvatar();
window.renderSignLanguage = renderSignLanguage;
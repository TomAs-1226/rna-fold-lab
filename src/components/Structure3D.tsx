import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Pair } from "../engine";
import { layoutStructure } from "../lib/layout";

// A real 3D view of the fold: bases are spheres, the backbone and base pairs are
// tubes/lines. Drag to rotate, scroll to zoom. It is a 3D LAYOUT of the predicted
// secondary structure (not a physics-based tertiary model), so you can see the
// stems and loops in space. Lazy-loaded so Three.js only downloads when opened.
export default function Structure3D({
  sequence,
  pairs,
  seedStart,
}: {
  sequence: string;
  pairs: Pair[];
  seedStart?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const n = sequence.length;
    if (!n) return;

    const width = mount.clientWidth;
    const height = 360;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 4000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(40, 60, 80);
    scene.add(key);

    const pos = layoutStructure(n, pairs, 3, 340);
    const V = pos.map((p) => new THREE.Vector3(p.x, p.y, p.z));

    // center + scale to fit camera
    const box = new THREE.Box3().setFromPoints(V);
    const center = box.getCenter(new THREE.Vector3());
    V.forEach((v) => v.sub(center));
    const radius = Math.max(1, box.getSize(new THREE.Vector3()).length() / 2);

    const sphereGeo = new THREE.SphereGeometry(radius * 0.02, 12, 12);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2b3f63, roughness: 0.55 });
    const seedMat = new THREE.MeshStandardMaterial({ color: 0xf5b056, roughness: 0.45, emissive: 0x3a2708 });
    V.forEach((v, i) => {
      const m = new THREE.Mesh(sphereGeo, seedStart !== undefined && i >= seedStart ? seedMat : baseMat);
      m.position.copy(v);
      scene.add(m);
    });

    // backbone
    const bbPts: THREE.Vector3[] = [];
    for (let i = 0; i < V.length - 1; i += 1) bbPts.push(V[i], V[i + 1]);
    const bb = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(bbPts),
      new THREE.LineBasicMaterial({ color: 0x4a5f86 }),
    );
    scene.add(bb);

    // base pairs
    const pairPts: THREE.Vector3[] = [];
    for (const [i, j] of pairs) pairPts.push(V[i], V[j]);
    if (pairPts.length) {
      const pl = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pairPts),
        new THREE.LineBasicMaterial({ color: 0x2dd4bf }),
      );
      scene.add(pl);
    }

    camera.position.set(0, 0, radius * 2.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      sphereGeo.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [sequence, pairs, seedStart]);

  return <div ref={mountRef} className="w-full cursor-grab active:cursor-grabbing" style={{ height: 360 }} aria-label="3D structure — drag to rotate" />;
}

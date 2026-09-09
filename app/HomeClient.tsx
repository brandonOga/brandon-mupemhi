'use client';
import Image from "next/image";
import Link from "next/link";
import {useRef, useLayoutEffect} from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import customEase from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { vertexShader, fragmentShader } from "./components/shaders";
import { SQUIGGLE_PATH_D, SQUIGGLE_VIEWBOX, SQUIGGLE_STROKE_THIN, SQUIGGLE_STROKE_THICK } from "./components/squiggle";
import { IoIosMail } from "react-icons/io";
import { IoLogoLinkedin } from "react-icons/io";
import { PiDribbbleLogoFill } from "react-icons/pi";
import { LiaAsteriskSolid } from "react-icons/lia";
import { FaArrowRight, FaGithub } from "react-icons/fa";
import type { ProjectCard } from "@/lib/projects";
gsap.registerPlugin(customEase, SplitText, DrawSVGPlugin);

let preloaderHasPlayed = false;

export default function HomeClient({ projects }: { projects: ProjectCard[] }) {
  const root = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const sectionCountRef = useRef<HTMLSpanElement>(null);
  const preloaderSquiggleRef = useRef<HTMLDivElement>(null);
  const preloaderSquigglePathRef = useRef<SVGPathElement>(null);

  const threeCamera      = useRef<THREE.PerspectiveCamera | null>(null);
  const threeRenderer    = useRef<THREE.WebGLRenderer | null>(null);
  const monitorScreen    = useRef<THREE.Mesh | null>(null);
  const monitorGroupRef  = useRef<THREE.Group | null>(null);


  function normalizeModel(
    model: THREE.Object3D,
    targetSize: number = 2,
    focus: THREE.Object3D = model
  ) {
    const box = new THREE.Box3().setFromObject(focus);
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxDim;
    
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    
    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(focus).getCenter(center);
    model.position.sub(center);
    
  }
  
  useLayoutEffect(() => {
    if (!projectsRef.current || !scrollRef.current) return;

    const createCounterDigits = () => {
      const counter1 = document.querySelector(".counter-1") as Element;
      const num0 = document.createElement("div");
      num0.className = "num";
      num0.textContent = "0";
      counter1.appendChild(num0);

      const num1 = document.createElement("div");
      num1.className = "num num1offset1";
      num1.textContent = "1";
      counter1.appendChild(num1);

      const counter2 = document.querySelector(".counter-2") as Element;
      for (let i = 0; i <= 10; i++) {
        const numDiv = document.createElement("div");
        numDiv.className = i === 10 ? "num num1offset2" : "num";
        numDiv.textContent = i === 10 ? "0" : String(i);
        counter2.appendChild(numDiv)
      }

      const counter3 = document.querySelector(".counter-3") as Element;
      for (let i = 0; i < 30; i++) {
        const numDiv = document.createElement("div");
        numDiv.className = "num";
        numDiv.textContent = String(i % 10);
        counter3.appendChild(numDiv)
      }

      const finalNum = document.createElement("div");
      finalNum.className = "num";
      finalNum.textContent = "0";
      counter3.appendChild(finalNum);
    };

    const scrollContainer = scrollRef.current;
    const projectsContainer = projectsRef.current;
    const shaderRippleCleanups: Array<() => void> = [];

    const xPos = { target: 0, current: 0 };
    const scrollMultiplier = 1.5;
    const scrollEase = 0.08;
    const sections = Array.from(scrollContainer.querySelectorAll(':scope > section'));
    const getMaxScroll = () => Math.max(0, scrollContainer.scrollWidth - window.innerWidth);

    // Header nav: scroll to a section by id. Dispatched from the Header when
    // already on the homepage, or stashed in sessionStorage when navigating
    // home from another page.
    const scrollToSection = (id: string) => {
      const target = sections.find((s) => s.id === id) as HTMLElement | undefined;
      if (target) {
        xPos.target = Math.max(0, Math.min(getMaxScroll(), target.offsetLeft));
      }
    };

    const handleSectionNav = (event: Event) => {
      scrollToSection((event as CustomEvent<string>).detail);
    };
    window.addEventListener('navigate-section', handleSectionNav);

    const pendingSection = sessionStorage.getItem('scroll-to-section');
    if (pendingSection) {
      sessionStorage.removeItem('scroll-to-section');
      scrollToSection(pendingSection);
    }

    const aboutSection = sections.find((s) => s.id === 'about') as HTMLElement | undefined;
    const workSection = sections.find((s) => s.id === 'work') as HTMLElement | undefined;
    let workEntryState: 'idle' | 'settling' | 'released' = 'idle';

    const handleWheel = (event: WheelEvent) => {
      // Hand the wheel to the About panel's vertical scroll only once the panel
      // has actually settled into full view. Detected as a *crossing* of the
      // panel's boundary (this event's delta would carry the target from one
      // side of it to the other) rather than a proximity check on the eased
      // xPos.current — a proximity check can be blown past entirely by one
      // large/fast wheel event before easing ever catches up, skipping the
      // panel without its vertical scroll ever engaging.
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

      // On every entry, stop exactly at Work's leading edge so its full
      // 100vw is presented before later wheel input moves onward.
      if (workSection) {
        const workStart = workSection.offsetLeft;

        if (
          workEntryState === 'released' &&
          Math.abs(xPos.target - workStart) > 1
        ) {
          workEntryState = 'idle';
        }

        if (workEntryState === 'settling') {
          if (Math.abs(xPos.current - workStart) > 1) {
            xPos.target = workStart;
            event.preventDefault();
            return;
          }
          workEntryState = 'released';
        } else if (workEntryState === 'idle') {
          const prospective = xPos.target + delta * scrollMultiplier;
          const enteringForward =
            delta > 0 && xPos.target < workStart && prospective >= workStart;
          const enteringBackward =
            delta < 0 && xPos.target > workStart && prospective <= workStart;

          if (enteringForward || enteringBackward) {
            workEntryState = 'settling';
            xPos.target = workStart;
            event.preventDefault();
            return;
          }
        }
      }

      if (aboutSection) {
        const aboutStart = aboutSection.offsetLeft;
        const atTop = aboutSection.scrollTop <= 0;
        const atBottom =
          aboutSection.scrollTop + aboutSection.clientHeight >= aboutSection.scrollHeight - 1;
        const canScrollY = aboutSection.scrollHeight > aboutSection.clientHeight + 1;

        if (canScrollY) {
          const prospective = xPos.target + delta * scrollMultiplier;
          const enteringForward =
            delta > 0 && xPos.target <= aboutStart && prospective > aboutStart && !atBottom;
          const enteringBackward =
            delta < 0 && xPos.target >= aboutStart && prospective < aboutStart && !atTop;

          if (enteringForward || enteringBackward) {
            xPos.target = aboutStart; // clamp — never let one event skip past the panel
            if (Math.abs(xPos.current - aboutStart) > 1) {
              event.preventDefault(); // still easing in; hold off native scroll until settled
              return;
            }
            // Drive the panel explicitly once settled. This is reliable even
            // for diagonal trackpad gestures or when the wheel event target
            // is a fixed navigation element rather than the About panel.
            event.preventDefault();
            aboutSection.scrollTop += delta;
            return;
          }
        }
      }

      event.preventDefault();
      xPos.target = Math.max(
        0,
        Math.min(getMaxScroll(), xPos.target + delta * scrollMultiplier)
      );
    };

    const totalSections = sections.length;

    let lerpRafId: number;
    const lerpScroll = () => {
      xPos.current += (xPos.target - xPos.current) * scrollEase;
      if (Math.abs(xPos.target - xPos.current) < 0.05) {
        xPos.current = xPos.target;
      }
      scrollContainer.style.transform = `translateX(-${xPos.current}px)`;

      const maxScroll = getMaxScroll();
      const progress = maxScroll > 0 ? xPos.current / maxScroll : 0;
      if (scrollBarRef.current) {
        scrollBarRef.current.style.transform = `scaleX(${progress})`;
      }
      if (sectionCountRef.current) {
        const idx = Math.min(
          Math.round(xPos.current / window.innerWidth) + 1,
          totalSections
        );
        sectionCountRef.current.textContent = String(idx).padStart(2, '0');
      }

      lerpRafId = requestAnimationFrame(lerpScroll);
    };
    lerpRafId = requestAnimationFrame(lerpScroll);

    window.addEventListener("wheel", handleWheel, { passive: false });

    const skillPillContainer = root.current?.querySelector('.skill-pill-wrapper') as HTMLElement | null;
    const skillPillEls = skillPillContainer
      ? Array.from(skillPillContainer.querySelectorAll<HTMLParagraphElement>('.skill-pill'))
      : [];
    const skillPillAnchors = skillPillEls.map(() => ({ x: 0, y: 0 }));
    const skillPillPositions = skillPillEls.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));

    let dragRafId: number | null = null;
    let physicsRafId: number | null = null;
    const dragState = {
      activeIndex: -1,
      startX: 0,
      startY: 0,
      pillX: 0,
      pillY: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      vx: 0,
      vy: 0,
    };

    const getWrapperBounds = () => {
      if (!skillPillContainer) return null;
      const rect = skillPillContainer.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    const clampPill = (index: number, bounce = false) => {
      const pill = skillPillEls[index];
      const position = skillPillPositions[index];
      const wrapperBounds = getWrapperBounds();
      if (!pill || !wrapperBounds) return;

      const pillRect = pill.getBoundingClientRect();
      const pillWidth = pillRect.width;
      const pillHeight = pillRect.height;
      const localLeft = pill.offsetLeft;
      const localTop = pill.offsetTop;
      const minX = -localLeft;
      const maxX = wrapperBounds.width - pillWidth - localLeft;
      const minY = -localTop;
      const maxY = wrapperBounds.height - pillHeight - localTop;

      let bounced = false;
      if (position.x < minX) {
        position.x = minX;
        if (bounce) {
          dragState.vx *= -0.65;
          bounced = true;
        } else {
          dragState.vx = 0;
        }
      } else if (position.x > maxX) {
        position.x = maxX;
        if (bounce) {
          dragState.vx *= -0.65;
          bounced = true;
        } else {
          dragState.vx = 0;
        }
      }

      if (position.y < minY) {
        position.y = minY;
        if (bounce) {
          dragState.vy *= -0.65;
          bounced = true;
        } else {
          dragState.vy = 0;
        }
      } else if (position.y > maxY) {
        position.y = maxY;
        if (bounce) {
          dragState.vy *= -0.65;
          bounced = true;
        } else {
          dragState.vy = 0;
        }
      }

      return bounced;
    };

    const updateSkillPillTransform = (index: number) => {
      const pill = skillPillEls[index];
      if (!pill) return;
      const { x, y } = skillPillPositions[index];
      pill.style.transform = `translate(${x}px, ${y}px)`;
    };

    const stopDrag = () => {
      const index = dragState.activeIndex;
      if (index === -1) return;
      const pill = skillPillEls[index];
      if (pill) {
        pill.classList.remove('cursor-grabbing');
        pill.style.zIndex = '';
      }
      dragState.activeIndex = -1;

      const decay = () => {
        if (dragState.activeIndex !== -1) return;
        const position = skillPillPositions[index];
        position.x += dragState.vx;
        position.y += dragState.vy;
        dragState.vx *= 0.92;
        dragState.vy *= 0.92;
        const bounced = clampPill(index, true);
        if (bounced) {
          dragState.vx *= 0.8;
          dragState.vy *= 0.8;
        }
        updateSkillPillTransform(index);

        if (Math.abs(dragState.vx) > 0.2 || Math.abs(dragState.vy) > 0.2) {
          dragRafId = requestAnimationFrame(decay);
        } else {
          dragRafId = null;
        }
      };

      if (dragRafId) cancelAnimationFrame(dragRafId);
      dragRafId = requestAnimationFrame(decay);
    };

    const animatePills = () => {
      skillPillEls.forEach((pill, index) => {
        if (dragState.activeIndex === index) return;
        const position = skillPillPositions[index];
        const anchor = skillPillAnchors[index];

        const time = performance.now() * 0.001;
        const dx = anchor.x - position.x;
        const dy = anchor.y - position.y;
        const spring = 0.04;
        const friction = 0.92;
        const driftX = Math.sin(time + index * 1.3) * 0.02;
        const driftY = Math.cos(time + index * 0.9) * 0.02;

        position.vx += dx * spring + driftX;
        position.vy += dy * spring + driftY;
        position.vx *= friction;
        position.vy *= friction;
        position.x += position.vx;
        position.y += position.vy;

        clampPill(index, true);
        updateSkillPillTransform(index);
      });

      physicsRafId = requestAnimationFrame(animatePills);
    };
    physicsRafId = requestAnimationFrame(animatePills);

    const handleSkillPointerMove = (event: PointerEvent) => {
      const index = dragState.activeIndex;
      if (index === -1) return;
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const position = skillPillPositions[index];
      position.x = dragState.pillX + deltaX;
      position.y = dragState.pillY + deltaY;
      clampPill(index);
      updateSkillPillTransform(index);

      const timeDelta = Math.max(1, event.timeStamp - dragState.lastTime);
      dragState.vx = ((event.clientX - dragState.lastX) / timeDelta) * 16;
      dragState.vy = ((event.clientY - dragState.lastY) / timeDelta) * 16;
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      dragState.lastTime = event.timeStamp;
    };

    const handleSkillPointerUp = (event: PointerEvent) => {
      if (dragState.activeIndex === -1) return;
      const pill = skillPillEls[dragState.activeIndex];
      if (pill) pill.releasePointerCapture(event.pointerId);
      stopDrag();
    };

    const skillListeners: Array<() => void> = [];
    skillPillEls.forEach((pill, index) => {
      const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();
        dragState.activeIndex = index;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.pillX = skillPillPositions[index].x;
        dragState.pillY = skillPillPositions[index].y;
        dragState.lastX = event.clientX;
        dragState.lastY = event.clientY;
        dragState.lastTime = event.timeStamp;
        dragState.vx = 0;
        dragState.vy = 0;
        pill.setPointerCapture(event.pointerId);
        pill.classList.add('cursor-grabbing');
        pill.style.zIndex = '10';
      };

      pill.addEventListener('pointerdown', onPointerDown);
      skillListeners.push(() => pill.removeEventListener('pointerdown', onPointerDown));
    });

    window.addEventListener('pointermove', handleSkillPointerMove, { passive: false });
    window.addEventListener('pointerup', handleSkillPointerUp);
    window.addEventListener('pointercancel', handleSkillPointerUp);

    let threeRafId = 0;

    const ctx = gsap.context(() => {
      const container = projectsRef.current!;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        60, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
      );
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
      threeCamera.current   = camera;
      threeRenderer.current = renderer;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.VSMShadowMap;

      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.pointerEvents = 'none';
      
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1));

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(15, 10, -5);
      scene.add(directionalLight);

      // Dedicated light purely for the cast shadow — kept
      // separate from directionalLight (which comes in from a steep side
      // angle for its rim-light look). This light sits to camera-right, so
      // the model's projected shadow falls naturally toward the left.
      const shadowLight = new THREE.DirectionalLight(0xffffff, 1.4);
      shadowLight.position.set(5, 10, 2);
      shadowLight.castShadow = true;
      shadowLight.shadow.mapSize.set(2048, 2048);
      shadowLight.shadow.radius = 18;
      shadowLight.shadow.bias = -1e-4;
      shadowLight.shadow.normalBias = 0.02;
      shadowLight.shadow.camera.near = 0.1;
      shadowLight.shadow.camera.far = 30;
      shadowLight.shadow.camera.left = -4;
      shadowLight.shadow.camera.right = 4;
      shadowLight.shadow.camera.top = 4;
      shadowLight.shadow.camera.bottom = -4;

      scene.add(shadowLight);

      const topLight = new THREE.DirectionalLight(0xffffff, 1);
      topLight.position.set(-5, -2.5, 0);
      scene.add(topLight);

      const monitorGroup = new THREE.Group();
      monitorGroupRef.current = monitorGroup;
      scene.add(monitorGroup);

      // Radial alpha map gives the circular tabletop a soft edge so it fades
      // away before the horizontal scroll reaches the next section.
      const floorAlphaCanvas = document.createElement('canvas');
      floorAlphaCanvas.width = 256;
      floorAlphaCanvas.height = 256;
      const floorAlphaContext = floorAlphaCanvas.getContext('2d');
      if (floorAlphaContext) {
        const floorFade = floorAlphaContext.createRadialGradient(
          128, 128, 128 * 0.62,
          128, 128, 128
        );
        floorFade.addColorStop(0, '#ffffff');
        floorFade.addColorStop(1, '#000000');
        floorAlphaContext.fillStyle = floorFade;
        floorAlphaContext.fillRect(0, 0, 256, 256);
      }
      const floorAlphaMap = new THREE.CanvasTexture(floorAlphaCanvas);

      // Visible circular tabletop surface and shadow receiver. It stays in
      // the scene root so it remains level while the monitor tilts on hover.
      const shadowFloor = new THREE.Mesh(
        new THREE.CircleGeometry(1.9, 128),
        new THREE.MeshStandardMaterial({
          color: 0xd9dcde,
          roughness: 1,
          metalness: 0,
          alphaMap: floorAlphaMap,
          opacity: 0.85,
          transparent: true,
          depthWrite: false,
        })
      );
      // Fill the viewport horizontally and extend toward the camera. The
      // radial alpha map is transparent where the surface meets the section
      // edges, avoiding a hard cutoff during horizontal scrolling.
      const floorRadius = 1.9;
      const updateFloorSize = () => {
        const cameraDistance = Math.abs(
          camera.position.z - shadowFloor.position.z
        );
        const visibleHeight =
          2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cameraDistance;
        const visibleWidth = visibleHeight * camera.aspect;

        shadowFloor.scale.set(visibleWidth / (floorRadius * 2), 1.15, 1);
      };
      updateFloorSize();
      shadowFloor.rotation.x = -Math.PI / 2;
      shadowFloor.position.y = -0.9;
      shadowFloor.receiveShadow = true;
      scene.add(shadowFloor);

      let modelIsLoaded = false;
      let restingModelY = 0;

      const updateModelScale = () => {
        // Build the replacement screen while the group is still at its
        // identity scale. Its geometry and transform are measured in world
        // space, so scaling the parent beforehand would apply that scale a
        // second time when the screen is added to monitorGroup.
        if (!modelIsLoaded) return;

        const cssScale = Number.parseFloat(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--project-model-scale')
        );
        const cssY = Number.parseFloat(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--project-model-y')
        );

        monitorGroup.scale.setScalar(Number.isFinite(cssScale) ? cssScale : 1);
        restingModelY = Number.isFinite(cssY) ? cssY : 0;
        monitorGroup.position.y = restingModelY;
        monitorGroup.updateMatrixWorld(true);

        const scaledModelBox = new THREE.Box3().setFromObject(monitorGroup);
        shadowFloor.position.y = scaledModelBox.min.y - 0.01;
      };


      const textureLoader = new THREE.TextureLoader();
      const textureCache: { [key: string]: THREE.Texture } = {};

      function loadTexture(src: string): THREE.Texture {
        if (textureCache[src]) return textureCache[src];

        const texture = textureLoader.load(src, () => {
          if (displayMaterial) {
            displayMaterial.uniforms.imageAspect.value =
              (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height;
          }
        });

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        textureCache[src] = texture;

        return texture;
      }

      const defaultDisplayImage = "/images/brandon.jpg";
      const defaultTexture = loadTexture(defaultDisplayImage);

      let displayMaterial: THREE.ShaderMaterial | null = null;

      displayMaterial = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: defaultTexture },
          imageAspect: { value: 1 },
          planeAspect: { value: 1.07999 },
          iResolution: { value: new THREE.Vector2(512, 512) },
          glitchIntensity: { value: 0.0 },
          time: { value: 0.0 },
        },
        vertexShader,      
        fragmentShader,    
        transparent: true,
      });

      // Load model FIRST
      new GLTFLoader().load("/models/macintosh_128k_computer_1984/scene.gltf", (gltf) => {
        const model = gltf.scene;

        // The keyboard body, cable, and individual keys are exported as
        // separate meshes. Remove all of them before sizing and centering the
        // remaining computer setup.
        const keyboardMeshes: THREE.Object3D[] = [];
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;

          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          const usesKeyMaterial = materials.some(
            (material) => material.name.toLowerCase() === 'keys'
          );
          const isKeyboardPart =
            mesh.name.toLowerCase().startsWith('keyboard') || usesKeyMaterial;

          if (isKeyboardPart) keyboardMeshes.push(mesh);
        });
        keyboardMeshes.forEach((mesh) => mesh.parent?.remove(mesh));

        // Pull the mouse assembly inward and slightly back toward the
        // computer. Moving the top-level groups keeps the mouse, cable, and
        // plug aligned with one another.
        const mousePartNames = new Set(['Mouse', 'Mousechord', 'Mouseplug']);
        model.traverse((child) => {
          if (!mousePartNames.has(child.name)) return;
          child.position.x -= 10;
          child.position.z -= 15;
        });

        // Keep the computer—not the movable mouse/cables—as the fixed sizing
        // and camera anchor. Mouse coordinate edits no longer shift or zoom
        // the computer indirectly through the combined bounding box.
        const computer = model.getObjectByName('Computer') ?? model;
        normalizeModel(model, 1.5, computer);

        monitorGroup.add(model);
        model.updateMatrixWorld(true);

        // Locate this model's dedicated screen mesh without using a generic
        // texture-map fallback (all of this asset's materials are textured).
        let foundScreenMesh: THREE.Mesh | null = null;
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          const isScreen = materials.some((material) => {
            const materialName = material.name.toLowerCase();
            return materialName === 'screen' ||
              materialName.includes('screen') ||
              mesh.name.toLowerCase().includes('screen');
          });
          if (!foundScreenMesh && isScreen) {
            foundScreenMesh = mesh;
          }
        });
        // TS narrows a `let` mutated only inside a closure back to its
        // pre-call type (null) rather than widening to THREE.Mesh | null,
        // and treats a bare `const x = foundScreenMesh` as a transparent
        // alias that inherits that same bad narrowing — the `as` cast
        // (not just the copy) is what breaks the alias tracking.
        const screenMesh = foundScreenMesh as THREE.Mesh | null;

        // Drop the fade-floor to sit exactly under the model's base now that
        // its real (post-normalize, post-offset) bounding box is known.
        const modelBox = new THREE.Box3().setFromObject(model);
        shadowFloor.position.y = modelBox.min.y - 0.01;

        if (screenMesh && displayMaterial) {
          // Apply the shader directly so the authored curved CRT geometry,
          // UVs, position, and bezel fit remain intact.
          // This asset stores its display UVs rotated: V runs horizontally
          // and reversed U runs vertically. Normalize the partial atlas range
          // and rotate it back before sampling project images.
          screenMesh.geometry = screenMesh.geometry.clone();
          const screenUv = screenMesh.geometry.getAttribute('uv');
          if (screenUv) {
            let minU = Infinity;
            let maxU = -Infinity;
            let minV = Infinity;
            let maxV = -Infinity;

            for (let index = 0; index < screenUv.count; index += 1) {
              minU = Math.min(minU, screenUv.getX(index));
              maxU = Math.max(maxU, screenUv.getX(index));
              minV = Math.min(minV, screenUv.getY(index));
              maxV = Math.max(maxV, screenUv.getY(index));
            }

            const rangeU = maxU - minU || 1;
            const rangeV = maxV - minV || 1;
            for (let index = 0; index < screenUv.count; index += 1) {
              const normalizedU = (screenUv.getX(index) - minU) / rangeU;
              const normalizedV = (screenUv.getY(index) - minV) / rangeV;
              screenUv.setXY(index, normalizedV, 1 - normalizedU);
            }
            screenUv.needsUpdate = true;
          }

          screenMesh.geometry.computeBoundingBox();
          const screenBounds = screenMesh.geometry.boundingBox;
          if (!screenBounds) return;

          const localSize = screenBounds.getSize(new THREE.Vector3());
          displayMaterial.side = THREE.DoubleSide;
          screenMesh.material = displayMaterial;
          monitorScreen.current = screenMesh;

          const worldScale = screenMesh.getWorldScale(new THREE.Vector3());
          // This screen's broad axes are local X/Y; local Z is only its CRT
          // curvature depth. Account for inherited scale in the image ratio.
          if (localSize.y !== 0 && worldScale.y !== 0) {
            displayMaterial.uniforms.planeAspect.value =
              (localSize.x * Math.abs(worldScale.x)) /
              (localSize.y * Math.abs(worldScale.y));
          }
        }

        modelIsLoaded = true;
        updateModelScale();
      });
      
      const mouse = { x: 0, y: 0 };
      const lerpedMouse = { x: 0, y: 0 };
      const timer = new THREE.Timer();

      function animateThree() {
        threeRafId = requestAnimationFrame(animateThree);

        timer.update();
        if (displayMaterial) {
          displayMaterial.uniforms.time.value = timer.getElapsed();
        }

        lerpedMouse.x = gsap.utils.interpolate(lerpedMouse.x, mouse.x, 0.05);
        lerpedMouse.y = gsap.utils.interpolate(lerpedMouse.y, mouse.y, 0.05);
        monitorGroup.rotation.x = lerpedMouse.y * 0.35;
        monitorGroup.rotation.y = lerpedMouse.x * 0.3;
        monitorGroup.position.x = 0;
        monitorGroup.position.y = restingModelY;
        shadowFloor.position.x = 0;
        // Follow only vertical pointer movement. The tabletop does not inherit
        // the monitor's left/right rotation.
        shadowFloor.rotation.x = -Math.PI / 2 + lerpedMouse.y * 0.35;

        // Apply same mouse tracking to description element
        const descElement = document.querySelector('.project-description') as HTMLElement;
        if (descElement) {
          descElement.style.transform = `rotateX(${lerpedMouse.y * 0.35}rad) rotateY(${-(lerpedMouse.x * 0.3)}rad)`;
        }

        renderer.render(scene, camera);
      }

      animateThree();

      // Scoped to the section itself (not window) so the model rests
      // centered by default and only tracks the cursor while it's actually
      // over this section.
      container.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        mouse.x = x * 2;
        mouse.y = y * 1;
      });

      container.addEventListener("mouseleave", () => {
        mouse.x = 0;
        mouse.y = 0;
      });

      window.addEventListener("resize", () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        if (newWidth === 0 || newHeight === 0) return;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        updateFloorSize();
        updateModelScale();
      });
      
      const glitchState = { intensity: 0 };
      let glitchAnimation: gsap.core.Tween | null = null;

      function setDisplayImage(src: string) {
        const texture = loadTexture(src);

        if (displayMaterial) {
          displayMaterial.uniforms.map.value = texture;

          if (texture.image && (texture.image as HTMLImageElement).width > 0) {
            const img = texture.image as HTMLImageElement;
            displayMaterial.uniforms.imageAspect.value = img.width / img.height;
          }
        }

        if (glitchAnimation) glitchAnimation.kill();
        glitchState.intensity = 1.0;

        glitchAnimation = gsap.to(glitchState, {
          intensity: 0,
          duration: 0.75,
          ease: "power3.out",
          onUpdate() {
            if (displayMaterial) {
              displayMaterial.uniforms.glitchIntensity.value = glitchState.intensity;
            }
          }
        });
      }

      document.querySelectorAll('.projects li').forEach(li => {
        li.addEventListener('mouseover', (e) => {
          const imgSrc = (e.currentTarget as HTMLElement).getAttribute('data-img');
          const item = e.currentTarget as HTMLElement;
          const projectName = item.getAttribute('data-name');
          const projectType = item.getAttribute('data-project-type');
          const disciplines = item.getAttribute('data-disciplines');
          const year = item.getAttribute('data-year');
          const position = item.getAttribute('data-position');
          if (imgSrc) setDisplayImage(imgSrc);

          const titleElement = document.querySelector('.project-description h3') as HTMLElement;
          const positionElement = document.querySelector<HTMLElement>('.project-description [data-project-position]');
          const detailElements = document.querySelectorAll<HTMLElement>('.project-description [data-project-detail]');

          if (positionElement) positionElement.textContent = position || '';

          if (titleElement && projectName) {
            titleElement.textContent = projectName;

            // Split title into characters for typing animation
            const titleSplit = SplitText.create(titleElement, {
              type: "chars",
              charsClass: "char"
            });

            gsap.set(titleSplit.chars, { opacity: 0 });
            gsap.to(titleSplit.chars, {
              opacity: 1,
              duration: 0.05,
              stagger: 0.05,
              onComplete: () => titleSplit.revert()
            });
          }

          [projectType, disciplines, year].forEach((value, index) => {
            if (detailElements[index]) detailElements[index].textContent = value || '—';
          });
          gsap.to('.project-description', { opacity: 1, duration: 0.3, ease: "power2.out" });
        });

        li.addEventListener('mouseout', () => {
          setDisplayImage(defaultDisplayImage);

          // Kill any ongoing character animations
          gsap.killTweensOf('.project-description h3 .char');

          gsap.to('.project-description', {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in"
          });
        });
      });

      customEase.create("hop", "0.9, 0, 0.1, 1");

      // ── Char hover helper (defined early so animateHeroEntrance can call it) ──
      const setupCharHover = (heading: HTMLElement) => {
        const split = SplitText.create(heading, {
          type: "chars,words",
          charsClass: "slide-char",
          mask: "chars",
        });
        const splitChars = split.chars as HTMLElement[];
        gsap.set(splitChars, { display: "inline-block" });

        const charHandlers: Array<{ char: HTMLElement; onEnter: () => void }> = [];

        const animateChar = (char: HTMLElement) => {
          if (char.dataset.animating === "1") return;
          char.dataset.animating = "1";
          gsap.killTweensOf(char);
          gsap.to(char, {
            xPercent: -110,
            duration: 0.35,
            ease: "power2.in",
            onComplete: () => {
              gsap.set(char, { xPercent: 110 });
              gsap.to(char, {
                xPercent: 0,
                duration: 0.4,
                ease: "power3.out",
                onComplete: () => { delete char.dataset.animating; },
              });
            },
          });
        };

        splitChars.forEach((char) => {
          if (!char.textContent || char.textContent.trim().length === 0) return;
          const onEnter = () => animateChar(char);
          char.addEventListener("mouseenter", onEnter);
          charHandlers.push({ char, onEnter });
        });

        shaderRippleCleanups.push(() => {
          charHandlers.forEach(({ char, onEnter }) => {
            char.removeEventListener("mouseenter", onEnter);
            gsap.killTweensOf(char);
          });
          gsap.killTweensOf(splitChars);
          split.revert();
        });
      };

      // Skill pills: clip-path inset reveal directly on .skill-pill — clip-path
      // doesn't touch `transform`, so it's safe even though the drag physics
      // loop writes style.transform on the same element every frame. Each
      // pill's JSX default state is already clipped (inset(100% ...)) so
      // there's no flash before this code runs. Collected once up front so
      // both the first-load entrance and the later scroll-into-view observer
      // can reuse the same `pillSlides`.
      const pillSlides = Array.from(document.querySelectorAll<HTMLElement>(".hero .skill-pill"));

      // ── Hero entrance (called from preloader timeline on first visit) ─────────
      const animateHeroEntrance = () => {
        const heroHeadings = Array.from(document.querySelectorAll<HTMLElement>(".hero h1"));
        const heroTexts    = Array.from(document.querySelectorAll<HTMLElement>(".hero p:not(.skill-pill)"));
        const heroImageReveal = document.querySelector<HTMLElement>('.hero-image-reveal');
        const heroImage = heroImageReveal?.querySelector<HTMLElement>('img');

        const tl = gsap.timeline();

        // h1s: stagger characters, then hand off to char hover
        heroHeadings.forEach((heading, i) => {
          gsap.set(heading, { autoAlpha: 1 });
          const split = SplitText.create(heading, { type: "chars" });
          const chars = split.chars as HTMLElement[];
          gsap.set(chars, { y: 50, autoAlpha: 0 });
          tl.to(chars, {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "back.out(1.7)",
            stagger: 0.07,
            onComplete: () => { split.revert(); setupCharHover(heading); },
          }, i * 0.2);
          shaderRippleCleanups.push(() => { gsap.killTweensOf(chars); split.revert(); });
        });

        // Let both title staggers finish before introducing supporting copy,
        // the portrait, or skill pills. Their simultaneous motion previously
        // made the heading entrance feel rushed.
        const heroSupportStart = tl.duration() + 0.15;

        // Paragraphs: split into rendered lines and stagger each line.
        const heroTextSplits = heroTexts.map((el) => {
          gsap.set(el, { autoAlpha: 1 });
          const split = SplitText.create(el, { type: 'lines' });
          const lines = split.lines as HTMLElement[];
          gsap.set(lines, { y: 30, autoAlpha: 0 });
          return { split, lines };
        });
        const heroTextLines = heroTextSplits.flatMap(({ lines }) => lines);
        tl.to(heroTextLines, {
          y: 0,
          autoAlpha: 1,
          stagger: 0.2,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            heroTextSplits.forEach(({ split }) => split.revert());
          },
        }, heroSupportStart);
        shaderRippleCleanups.push(() => {
          gsap.killTweensOf(heroTextLines);
          heroTextSplits.forEach(({ split }) => split.revert());
        });

        if (heroImageReveal && heroImage) {
          tl.to(heroImageReveal, {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            duration: 1,
            ease: 'hop',
          }, heroSupportStart);
          tl.to(heroImage, {
            scale: 1,
            duration: 1.5,
            ease: 'hop',
          }, heroSupportStart);
        }

        // skill pills: clip-path inset reveal from bottom (bottom edge
        // appears first, then upward), staggered individually.
        if (pillSlides.length) {
          gsap.set(pillSlides, { clipPath: "inset(100% 0% 0% 0%)" });
          tl.to(pillSlides, {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.1,
          }, heroSupportStart + 0.25);
        }
      };

      if (preloaderHasPlayed) {
        gsap.set(".preloader", { autoAlpha: 0 });
        // On return visits skip the entrance reveal — instantly show the
        // pills (default JSX state hides them via inline style for the
        // first-load case) and just wire up hover.
        gsap.set(pillSlides, { clipPath: "inset(0% 0% 0% 0%)" });
        Array.from(document.querySelectorAll<HTMLElement>(".hero h1")).forEach(setupCharHover);
      } else {
        preloaderHasPlayed = true;

        // Pre-hide hero content so it's invisible until the preloader exits
        gsap.set([".hero h1", ".hero p:not(.skill-pill)"], { autoAlpha: 0 });
        gsap.set('.hero-image-reveal', {
          clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
        });
        gsap.set('.hero-image-reveal img', { scale: 1.2 });
        // Skill pill lines were already pre-hidden (yPercent 110) above, right
        // after the SplitText split.

        createCounterDigits();

        const preLoaderImages = gsap.utils.toArray<HTMLElement>(".preloader-images .img-wrap");
        const preLoaderImagesInner = gsap.utils.toArray<HTMLElement>(".preloader-images .img-wrap .img");

        gsap.set(".preloader-images", { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", autoAlpha: 1 });
        gsap.set(preLoaderImages, { clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)" });
        gsap.set(preLoaderImagesInner, { scale: 2 });

        const scrollDist = (el: HTMLElement) => {
          const h = (el.querySelector(".num") as HTMLElement).clientHeight;
          return (el.querySelectorAll(".num").length - 1) * h;
        };

        const c1 = document.querySelector(".counter-1") as HTMLElement;
        const c2 = document.querySelector(".counter-2") as HTMLElement;
        const c3 = document.querySelector(".counter-3") as HTMLElement;

        // counter-1 sits at position 1.5 with duration 2 → finishes at t=3.5 within the timeline
        const counterEnd = 3.5;

        const preloaderTL = gsap.timeline({ delay: 0.25, timeScale: 0.6 });

        // counters — wired into the timeline so they're in sync with everything else
        preloaderTL.to(c3, { y: -scrollDist(c3), duration: 2.5, ease: "power2.inOut" }, 0);
        preloaderTL.to(c2, { y: -scrollDist(c2), duration: 3,   ease: "power2.inOut" }, 0);
        preloaderTL.to(c1, { y: -scrollDist(c1), duration: 2,   ease: "power2.inOut" }, 1.5);

        // images staggered so the last one finishes exactly at counterEnd
        // 4 images × 1s duration: last starts at counterEnd-1=2.5 → stagger 2.5/3 ≈ 0.833
        preLoaderImages.forEach((imgWrap, i) => {
          preloaderTL.to(imgWrap, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", ease: "hop", duration: 1 }, i * 0.833);
        });

        // 4 inner images × 1.5s duration: last starts at counterEnd-1.5=2 → stagger 2/3 ≈ 0.667
        preLoaderImagesInner.forEach((imgWrap, i) => {
          preloaderTL.to(imgWrap, { scale: 1, ease: "hop", duration: 1.5 }, i * 0.667);
        });

        // exit fires the moment counter reads 100 — the preloader's own
        // curtain-close (image stack collapsing away) plays out fully first.
        preloaderTL.to(".preloader-images", { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 1, ease: "hop" }, counterEnd);

        // Squiggle exit — only starts once the preloader has fully closed,
        // not layered on top of it. Starts already fully formed (swapped in
        // for the preloader instantly), then only animates the erase that
        // reveals the hero.
        const squiggleStart = counterEnd + 1;
        preloaderTL.set(preloaderSquigglePathRef.current, {
          drawSVG: "100%",
          strokeWidth: SQUIGGLE_STROKE_THICK,
        }, squiggleStart);
        preloaderTL.set(preloaderSquiggleRef.current, { opacity: 1 }, squiggleStart);
        preloaderTL.set(".preloader", { autoAlpha: 0 }, squiggleStart);
        preloaderTL.to(preloaderSquigglePathRef.current, {
          drawSVG: "100% 100%",
          strokeWidth: SQUIGGLE_STROKE_THIN,
          duration: 2.6,
          ease: "power2.inOut",
        }, squiggleStart);
        preloaderTL.to(preloaderSquiggleRef.current, {
          opacity: 0,
          duration: 1.5,
          ease: "power2.inOut",
        }, squiggleStart + 1.2);
        // Fire hero entrance 0.5 timeline-seconds before the squiggle finishes erasing
        preloaderTL.call(animateHeroEntrance, [], ">-0.5");
      } // end preloader

      // Skill pills: clip-path inset reveal whenever they scroll into view.
      const pillWrapperEl = document.querySelector<HTMLElement>(".skill-pill-wrapper");
      if (pillWrapperEl && pillSlides.length) {
        let firstEntryHandled = false;
        const pillObserver = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          if (!firstEntryHandled) {
            firstEntryHandled = true;
            return;
          }
          gsap.killTweensOf(pillSlides);
          gsap.fromTo(
            pillSlides,
            { clipPath: "inset(100% 0% 0% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.1,
            }
          );
        }, { threshold: 0.3 });
        pillObserver.observe(pillWrapperEl);

        shaderRippleCleanups.push(() => {
          pillObserver.disconnect();
          gsap.killTweensOf(pillSlides);
        });
      }

      // ── Entrance + hover animations ──────────────────────────────────────────

      // Non-hero headings: staggered character reveal, then char hover once done
      const entranceHeadings = Array.from(document.querySelectorAll<HTMLElement>(
        "main > section:not(.hero) h1, main > section:not(.hero) h2, main > section:not(.hero) h3"
      ));
      entranceHeadings.forEach((heading) => {
        gsap.set(heading, { autoAlpha: 0 });
        const split = SplitText.create(heading, { type: "chars" });
        const chars = split.chars as HTMLElement[];
        gsap.set(chars, { y: 50, autoAlpha: 0 });

        const obs = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          gsap.set(heading, { autoAlpha: 1 });
          gsap.to(chars, {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "back.out(1.7)",
            stagger: 0.07,
            onComplete: () => {
              split.revert();
              setupCharHover(heading);
            },
          });
        }, { threshold: 0.2 });
        obs.observe(heading);

        shaderRippleCleanups.push(() => {
          obs.disconnect();
          gsap.killTweensOf(chars);
          split.revert();
        });
      });

      // Paragraphs and list items: stagger their rendered lines per section.
      const entranceTexts = Array.from(document.querySelectorAll<HTMLElement>(
        "main > section:not(.hero) p, main > section:not(.hero) li"
      )).filter(
        (el) => !el.closest('.projects') && !el.matches('#about p.font-mono')
      );
      const entranceTextSplits = entranceTexts.map((el) => {
        gsap.set(el, { autoAlpha: 0 });
        const split = SplitText.create(el, { type: 'lines' });
        const lines = split.lines as HTMLElement[];
        gsap.set(lines, { y: 30, autoAlpha: 0 });
        return { el, split, lines };
      });
      const textSections = Array.from(
        new Set(entranceTexts.map((el) => el.closest('section')).filter(Boolean))
      ) as HTMLElement[];
      textSections.forEach((section) => {
        const sectionEntries = entranceTextSplits.filter(
          ({ el }) => el.closest('section') === section
        );
        const sectionLines = sectionEntries.flatMap(({ lines }) => lines);
        const obs = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          gsap.set(sectionEntries.map(({ el }) => el), { autoAlpha: 1 });
          gsap.to(sectionLines, {
            y: 0,
            autoAlpha: 1,
            stagger: 0.2,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: () => {
              sectionEntries.forEach(({ split }) => split.revert());
            },
          });
        }, { threshold: 0.15 });
        obs.observe(section);

        shaderRippleCleanups.push(() => {
          obs.disconnect();
          gsap.killTweensOf(sectionLines);
          sectionEntries.forEach(({ split }) => split.revert());
        });
      });

      // About section numbers use a compact horizontal entrance so labels,
      // body copy, and headings do not all share the same motion.
      const aboutLabels = Array.from(
        document.querySelectorAll<HTMLElement>('#about p.font-mono')
      );
      aboutLabels.forEach((label) => {
        gsap.set(label, { x: -12, autoAlpha: 0 });

        const obs = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          gsap.to(label, {
            x: 0,
            autoAlpha: 1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, { threshold: 0.25 });
        obs.observe(label);

        shaderRippleCleanups.push(() => {
          obs.disconnect();
          gsap.killTweensOf(label);
          gsap.set(label, { clearProps: 'transform,opacity,visibility' });
        });
      });

      // About portrait: match the preloader's upward polygon wipe and inner
      // image descale, triggered when the portrait enters the viewport.
      const aboutImageReveal = document.querySelector<HTMLElement>(
        '.about-image-reveal'
      );
      const aboutImage = aboutImageReveal?.querySelector<HTMLElement>('img');
      if (aboutImageReveal && aboutImage) {
        gsap.set(aboutImageReveal, {
          clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
        });
        gsap.set(aboutImage, { scale: 1.2 });

        const obs = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          const tl = gsap.timeline();
          tl.to(aboutImageReveal, {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            duration: 1,
            ease: 'hop',
          });
          tl.to(aboutImage, {
            scale: 1,
            duration: 1.5,
            ease: 'hop',
          }, 0);
        }, { threshold: 0.15 });
        obs.observe(aboutImageReveal);

        shaderRippleCleanups.push(() => {
          obs.disconnect();
          gsap.killTweensOf([aboutImageReveal, aboutImage]);
          gsap.set([aboutImageReveal, aboutImage], {
            clearProps: 'clipPath,scale',
          });
        });
      }

    }, root);

    return () => {
      cancelAnimationFrame(threeRafId);
      shaderRippleCleanups.forEach(fn => fn());
      ctx.revert();
      cancelAnimationFrame(lerpRafId);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener('navigate-section', handleSectionNav);
      window.removeEventListener('pointermove', handleSkillPointerMove);
      window.removeEventListener('pointerup', handleSkillPointerUp);
      window.removeEventListener('pointercancel', handleSkillPointerUp);
      skillListeners.forEach((remove) => remove());
      if (dragRafId) cancelAnimationFrame(dragRafId);
      if (physicsRafId) cancelAnimationFrame(physicsRafId);
      projectsContainer?.querySelectorAll('canvas').forEach(canvas => {
        canvas.remove();
      });
    };
  }, []);

  return (
    <div ref={root} className="w-full h-screen overflow-hidden bg-background">
        {/* Preloader */}
        <section className={`preloader w-full h-screen bg-black fixed top-0 left-0 flex flex-col justify-center items-center gap-10 overflow-hidden z-50 ${preloaderHasPlayed ? 'opacity-0 pointer-events-none' : ''}`}>
          <div>
            <div className="preloader-images relative w-75 h-87.5 opacity-0 will-change-[clip-path] overflow-hidden">
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image className="img object-cover will-change-transform" src="/images/brandon.jpg" alt="Brandon" priority fill sizes="300px" />
              </div>
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image className="img object-cover will-change-transform" src="/images/brandon2.jpg" alt="Brandon" fill sizes="300px" />
              </div>
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image className="img object-cover will-change-transform" src="/images/brandon3.jpg" alt="Brandon" fill sizes="300px" />
              </div>
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image className="img object-cover will-change-transform" src="/images/brandon5.jpg" alt="Brandon" fill sizes="300px" />
              </div>
            </div>
          </div>
          <div className="counter absolute right-10 bottom-10 flex items-start gap-2 text-[120px] h-30 leading-37.5 [clip-path:polygon(0_0,100%_0,100%_120px,0_120px)] font-bold uppercase text-white">
            <div className="counter-1 digit"></div>
            <div className="counter-2 digit"></div>
            <div className="counter-3 digit"></div>
          </div>
        </section>

        {/* Preloader exit squiggle — draws/erases the same shape as the page transition */}
        <div
          ref={preloaderSquiggleRef}
          aria-hidden
          className="fixed inset-0 z-[51] flex items-center justify-center opacity-0 pointer-events-none"
        >
          <svg
            width="100%"
            height="100%"
            viewBox={SQUIGGLE_VIEWBOX}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            style={{ transform: 'scale(1.3)' }}
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              ref={preloaderSquigglePathRef}
              d={SQUIGGLE_PATH_D}
              stroke="#000000"
              strokeWidth={SQUIGGLE_STROKE_THIN}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

      <main
        ref={scrollRef}
        className="flex flex-row will-change-transform"
      >
        {/* Hero Section */}
        <section id="home" className="hero w-screen h-screen shrink-0 flex flex-col overflow-hidden relative">
          <div className="h-full w-full flex items-end pb-15 pt-20 gap-5">
            <div className = "w-1/2  flex flex-col justify-between h-full gap-10 px-7">
              <div className="flex flex-col gap-5">
                <h1 className="font-bold uppercase whitespace-nowrap">Creative <br/> Designer</h1>
                <p className="w-7/10 uppercase">I blend design and code to create digital experiences that look sharp, feel intuitive, and work beautifully.</p>
              </div>
              <div className="w-[60vw] relative flex flex-wrap justify-start items-center gap-3 touch-none skill-pill-wrapper">
                <p className="skill-pill cursor-grab active:cursor-grabbing  py-3 px-5 border bg-background rounded-full uppercase" style={{ clipPath: "inset(100% 0% 0% 0%)" }}>UI/UX Designer</p>
                <p className="skill-pill cursor-grab active:cursor-grabbing bg-black text-white p-3 rounded-full uppercase" style={{ clipPath: "inset(100% 0% 0% 0%)" }}><LiaAsteriskSolid className="text-2xl"/></p>
                <p className="skill-pill cursor-grab active:cursor-grabbing  py-3 px-5 border bg-background rounded-2xl uppercase" style={{ clipPath: "inset(100% 0% 0% 0%)" }}>Frontend Developer</p>
                <p className="skill-pill cursor-grab active:cursor-grabbing bg-black text-white p-3 rounded-full uppercase" style={{ clipPath: "inset(100% 0% 0% 0%)" }}><FaArrowRight className="text-2xl"/></p>
                <p className="skill-pill cursor-grab active:cursor-grabbing  py-3 px-5 border bg-background rounded-full uppercase" style={{ clipPath: "inset(100% 0% 0% 0%)" }}>Wordpress Developer</p>
              </div>
            </div>
            <div className = "w-1/2  h-full flex flex-col items-end justify-end gap-10 px-7">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4)' }}></div>
                <p className="text-xs uppercase">Available for Work</p>
              </div>
              <div className="relative w-full h-[40vh]">
                <div className="hero-image-reveal absolute inset-0 overflow-hidden will-change-[clip-path]">
                  <Image
                    className="img object-cover will-change-transform"
                    src="/images/contact.jpg"
                    alt="Brandon"
                    priority
                    fill
                    sizes="50vw"
                  />
                </div>
              </div>
              <h1 className="font-bold uppercase text-right whitespace-nowrap">Mupemhi<br/>Brandon</h1>
            </div>
          </div>
        </section>

        {/*About Section — numbered grid around a centered portrait. Scrolls
            vertically when its content is taller than the viewport (see the
            wheel handler, which yields to it before resuming horizontal). */}
        <section id="about" className="w-screen h-screen shrink-0 relative overflow-x-hidden overflow-y-auto  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* DEBUG grid lines — amber outline = grid bounds, dashed blue = each
              cell/item span. Remove this row of outline-* utilities when done. */}
          <div className="grid min-h-full w-full grid-cols-[1fr_1.5fr_1fr] grid-rows-[auto_auto_1fr_auto] gap-x-12 gap-y-15 px-16 pt-24 pb-16 outline-[2px] outline-dashed outline-amber-500/70 [&>*]:outline-[1px] [&>*]:outline-dashed [&>*]:outline-blue-500/70">
            {/* Headline */}
            <h2 className="col-span-2 row-start-1 self-start font-heading font-bold uppercase leading-none whitespace-nowrap  text-foreground">
              About Me
            </h2>

            {/* 01 — Who I Am */}
            <div className="col-start-3 row-start-1 max-w-[20rem]">
              <p className="font-mono text-sm text-primary-color mb-3">01</p>
              <p className="text-sm font-bold uppercase mb-2 text-foreground">Who I Am</p>
              <p className="text-sm uppercase leading-relaxed text-foreground/70">
                UI/UX designer and frontend developer creating thoughtful digital experiences where design, usability, and code come together.
              </p>
            </div>

            {/* 02 — My Journey */}
            <div className="col-start-2 row-start-2 max-w-[24rem]">
              <p className="font-mono text-sm text-primary-color mb-3">02</p>
              <p className="text-sm font-bold uppercase mb-2 text-foreground">My Journey</p>
              <p className="text-sm uppercase leading-relaxed text-foreground/70">
                I started my design journey in 2022, and have since grown across UI/UX, web design, and frontend development — turning ideas into real digital products.
              </p>
            </div>

            {/* Tagline motif */}
            <div className="col-start-1 row-start-3 self-center">
              <p className="font-bold uppercase text-primary-color">Think. Design. Build.</p>
            </div>

            {/* 03 — Approach */}
            <div className="col-start-3 row-start-3 max-w-[20rem]">
              <p className="font-mono text-sm text-primary-color mb-3">03</p>
              <p className="text-sm font-bold uppercase mb-2 text-foreground">Approach</p>
              <p className="text-sm uppercase leading-relaxed text-foreground/70">
                I design with development in mind — balancing visual detail, usability, and technical feasibility to create experiences that work beyond the mockup.
              </p>
            </div>

            {/* Centered portrait — spans the middle column; taller than its
                cell, anchored to the top so it grows downward (the side
                columns hold 04/05, so the extra height never overlaps text). */}
            <div className="about-image-reveal col-start-2 row-start-3 row-span-2 self-start relative min-h-175 overflow-hidden will-change-[clip-path]">
              <Image
                className="object-cover grayscale will-change-transform"
                src="/images/brandon4.jpg"
                alt="Brandon Mupemhi"
                priority
                fill
                sizes="34vw"
              />
            </div>

            {/* 04 — Experience */}
            <div className="col-start-1 row-start-4 self-end max-w-[20rem]">
              <p className="font-mono text-sm text-primary-color mb-3">04</p>
              <p className="text-sm font-bold uppercase mb-2 text-foreground">Experience</p>
              <p className="text-sm uppercase leading-relaxed text-foreground/70">
                I&apos;ve worked across websites and digital products for organisations in education, agriculture, technology, and other industries.
              </p>
            </div>

            {/* 05 — Off Screen */}
            <div className="col-start-3 row-start-4 self-end max-w-[20rem]">
              <p className="font-mono text-sm text-primary-color mb-3">05</p>
              <p className="text-sm font-bold uppercase mb-2 text-foreground">Off Screen</p>
              <p className="text-sm uppercase leading-relaxed text-foreground/70">
                When I&apos;m not designing or building, I&apos;m usually exploring new ideas, experimenting with motion, or finding inspiration far away from Figma.
              </p>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="work" ref={projectsRef} className="w-screen h-screen shrink-0 relative overflow-hidden">
          <div className="absolute left-20 top-20 z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-0">
              <h2 className="font-bold uppercase ">Selected</h2>
              <h2 className="font-bold uppercase ">Work</h2>
            </div>
            {/** 
            <p className="uppercase leading-relaxed text-foreground/70">
                Selected projects across UI/UX, web design and creative development.
            </p>
            */}
          </div>
          <ul className="projects absolute bottom-12.5 left-1/2 -translate-x-1/2 z-10 flex gap-5 text-black uppercase">
            {projects.map((project, index) => (
              <li key={project.name} data-img={project.cover_image} data-name={project.name} data-project-type={project.description} data-disciplines={[project.role, ...project.tags].filter(Boolean).join('\n')} data-year={project.year} data-position={`${String(index + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`}>
                <Link href={`/projects/${project.slug}`}>
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="project-description absolute left-[70%] top-3/10 -translate-y-7/10 opacity-0 pointer-events-none">
            <p data-project-position></p>
            <h3></h3>
            <p data-project-detail></p>
            <p data-project-detail></p>
            <p data-project-detail></p>
          </div>
        </section>
        
        <section id="say-hello" className="w-screen h-screen shrink-0 flex flex-col gap-30 justify-center items-center">
          <div className="flex flex-col gap-8 items-center">
            <div className="w-full flex items-center justify-center gap-2">
              <h2 className="text-[clamp(3rem,10vw,15.625rem)] whitespace-nowrap uppercase">Say</h2>
              <div className="w-[20vw] h-35 rounded-full relative overflow-hidden ring-5 rotate-10 ring-secondary-color">
                  <Image
                    className="img object-cover will-change-transform"
                    src="/images/contact.jpg"
                    alt="Placeholder"
                    priority
                    fill
                    sizes="20vw"
                  />
              </div>
              <h2 className="text-[clamp(3rem,10vw,15.625rem)] whitespace-nowrap uppercase">Hello</h2>
            </div>
            <p className="max-w-2xl text-center uppercase leading-relaxed text-foreground/70">
              Have a project, opportunity, or idea in mind? I&apos;m always open to a good conversation — let&apos;s talk.
            </p>
          </div>
          <div className="w-full flex flex-wrap xl:flex-row  justify-center  items-center gap-5 xl:gap-1.25">

            {/*Email */}
            <div className="w-full md:w-auto border-2 border-foreground rounded-full hover:bg-accent">
              <div className="w-full md:w-auto p-1 animate-rotate-border rounded-full bg-conic/[from_var(--border-angle)] from-transparent via-primary-color to-transparent from-80% via-90% to-100%">
                  <a
                  href="mailto:brandoneemupemhi@gmail.com" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-5 py-1.5 xl:px-6.25 xl:py-3 bg-background uppercase items-center text-base xl:text-2xl  flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white">
                  Drop me a line
                  <IoIosMail className="text-[28px] xl:text-[40px]" />
                  </a>
              </div>
            </div>

            {/*Github */}
            <div className="w-full md:w-auto xl:rotate-[-14deg] origin-left border-2 border-foreground rounded-full hover:bg-accent">
              <div className="p-1.25 w-full md:w-auto ">
                  <a href="https://github.com/brandonOga" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-5 py-1.5 xl:px-6.25 xl:py-3 bg-background uppercase items-center text-base xl:text-2xl   flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white">
                  Github
                  <FaGithub className="text-[24px] xl:text-[40px]" />
                  </a>
              </div>
            </div>
                    
            {/*Linkedin */}
            <div className="w-full md:w-auto border-2 border-(--foreground) rounded-full hover:bg-(--accent) hover:border-(--accent) xl:-ml-2.5 ">
              <div className="p-1.25 w-full md:w-auto ">
                  <a 
                  href="https://www.linkedin.com/in/brandon-mupemhi-697007230/" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-5 py-1.5 xl:px-6.25 xl:py-3 bg-background uppercase items-center text-base xl:text-2xl   flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white"> 
                  Linkedin
                  <IoLogoLinkedin  className="text-[28px] xl:text-[40px]" />
                  </a>
              </div>
            </div>
                    
            {/*Dribbble */}
            <div className="w-full md:w-auto xl:w-auto xl:rotate-18 origin-right border-2 border-(--foreground) rounded-full hover:bg-(--accent) hover:border-(--accent) xl:-ml-10 ">
              <div className="p-1.25 w-full md:w-auto">
                <a 
                  href="https://dribbble.com/OGA_01" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-5 py-1.5 xl:px-6.25 xl:py-3 bg-background uppercase items-center text-base xl:text-2xl   flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white"> 
                  Dribbble
                  <PiDribbbleLogoFill className="text-[28px] xl:text-[40px]" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Scroll progress bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-1/5 z-40 flex items-center gap-4 px-8 py-3 pointer-events-none mix-blend-difference">
        <span ref={sectionCountRef} className="text-xs font-mono text-white tabular-nums w-5 shrink-0">01</span>
        <div className="flex-1 h-px bg-white/30 relative overflow-hidden">
          <div
            ref={scrollBarRef}
            className="absolute inset-0 bg-white origin-left will-change-transform"
            style={{ transform: 'scaleX(0)' }}
          /> 
        </div>
        <span className="text-xs font-mono text-white tabular-nums w-5 shrink-0 text-right">04</span>
      </div>
    </div>
  );
}

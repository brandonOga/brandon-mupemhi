'use client';
import Image from "next/image";
import Link from "next/link";
import { usePageTransition } from "./components/TransitionOverlay";
import {useRef, useLayoutEffect} from "react";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import customEase from "gsap/CustomEase";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { vertexShader, fragmentShader } from "./components/shaders";
import { IoIosMail } from "react-icons/io";
import { MdPhoneEnabled } from "react-icons/md";
import { IoLogoLinkedin } from "react-icons/io";
import { PiDribbbleLogoFill } from "react-icons/pi";
import { LiaAsteriskSolid } from "react-icons/lia";
import { FaArrowRight } from "react-icons/fa";
import { projects } from "./data/projects";
gsap.registerPlugin(customEase, ScrollTrigger, SplitText);

let preloaderHasPlayed = false;

export default function Home() {
  const { navigateTo, showOverlay } = usePageTransition();
  const root = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroRingRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const sectionCountRef = useRef<HTMLSpanElement>(null);

  const threeCamera      = useRef<THREE.PerspectiveCamera | null>(null);
  const threeRenderer    = useRef<THREE.WebGLRenderer | null>(null);
  const monitorScreen    = useRef<THREE.Mesh | null>(null);
  const monitorGroupRef  = useRef<THREE.Group | null>(null);
  const isZoomingRef     = useRef(false);
  const scrollPosRef     = useRef(0);

  const firstText = useRef(null);
  const secondText = useRef(null);
  const slider = useRef(null);
  const xPercent = useRef(0);
  const direction = useRef(-1);

  

  function normalizeModel(model: THREE.Object3D, targetSize: number = 2) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxDim;
    
    model.scale.multiplyScalar(scale);
    
    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(model).getCenter(center);
    model.position.sub(center);
    
    console.log(`Model normalized: Scale factor=${scale.toFixed(3)}, Size=[${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}]`);
  }
  
  useLayoutEffect(() => {
    if (!projectsRef.current || !scrollRef.current) return;

    const animate = () => {
      if (xPercent.current < -100) {
        xPercent.current = 0;
      } else if (xPercent.current > 0) {
        xPercent.current = -100;
      }

      gsap.set(firstText.current, { xPercent: xPercent.current });
      gsap.set(secondText.current, { xPercent: xPercent.current });
      requestAnimationFrame(animate);
      xPercent.current += 0.1 * direction.current;
    };

    const scrollContainer = scrollRef.current;
    const projectsContainer = projectsRef.current;
    let cleanupOrbitLabels: (() => void) | null = null;
    const shaderRippleCleanups: Array<() => void> = [];

    const cameFromProject = sessionStorage.getItem('return-from-project') === 'true';
    const savedScroll     = cameFromProject ? parseFloat(sessionStorage.getItem('return-scroll-pos') || '0') : 0;
    if (cameFromProject) {
      sessionStorage.removeItem('return-from-project');
      sessionStorage.removeItem('return-scroll-pos');
    }

    const xPos = { target: savedScroll, current: savedScroll };
    const sections = Array.from(scrollContainer.querySelectorAll(':scope > section'));
    const getMaxScroll = () => Math.max(0, scrollContainer.scrollWidth - window.innerWidth);

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      xPos.target = Math.max(0, Math.min(getMaxScroll(), xPos.target + delta * 1.5));
    };

    const totalSections = sections.length;

    let lerpRafId: number;
    const lerpScroll = () => {
      xPos.current += (xPos.target - xPos.current) * 0.08;
      if (Math.abs(xPos.target - xPos.current) < 0.05) {
        xPos.current = xPos.target;
      }
      scrollPosRef.current = xPos.target;
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
    let marqueeRafId = 0;

    const ctx = gsap.context(() => {
      const heroRing = heroRingRef.current;
      const orbitLabels = heroRing
        ? Array.from(heroRing.querySelectorAll<HTMLElement>('.orbit-label'))
        : [];

      if (heroRing && orbitLabels.length > 0) {
        const orbitState = { angle: 180 };
        const angleStep = 360 / orbitLabels.length;
        const ringStroke = 5;

        const updateOrbit = () => {
          const radiusX = heroRing.clientWidth * 0.5 - ringStroke * 0.5;
          const radiusY = heroRing.clientHeight * 0.5 - ringStroke * 0.5;
          orbitState.angle = (orbitState.angle + 0.12 * gsap.ticker.deltaRatio()) % 360;

          orbitLabels.forEach((label, index) => {
            const angle = orbitState.angle + index * angleStep;
            const radians = (angle * Math.PI) / 180;

            gsap.set(label, {
              x: Math.cos(radians) * radiusX,
              y: Math.sin(radians) * radiusY,
              rotation: 0,
            });
          });
        };

        gsap.ticker.add(updateOrbit);
        updateOrbit();

        cleanupOrbitLabels = () => {
          gsap.ticker.remove(updateOrbit);
        };
      }

      const container = projectsRef.current!;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        60, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
      );
      camera.position.set(0, 0, 3);
      camera.lookAt(0, -0.25, 0);
      
      camera.position.set(0, 0, cameFromProject ? 0.8 : 3);

      const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
      threeCamera.current   = camera;
      threeRenderer.current = renderer;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      
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

      const topLight = new THREE.DirectionalLight(0xffffff, 1);
      topLight.position.set(-5, -2.5, 0);
      scene.add(topLight);

      const monitorGroup = new THREE.Group();
      monitorGroupRef.current = monitorGroup;
      scene.add(monitorGroup);


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
      new GLTFLoader().load("/models/old_pc/scene.gltf", (gltf) => {
        const model = gltf.scene;
        normalizeModel(model, 2);

        monitorGroup.add(model);

        const screenMesh = model.getObjectByName("Cube124_Material001_0") as THREE.Mesh;

        if (screenMesh && displayMaterial) {
          // 1. Get the dimensions of the screen
          const box = new THREE.Box3().setFromObject(screenMesh);
          const size = new THREE.Vector3();
          box.getSize(size);
          
          // 2. Create the Plane
          const customGeometry = new THREE.PlaneGeometry(size.x, size.y);
          const customScreen = new THREE.Mesh(customGeometry, displayMaterial);

          // 3. Match Position and Rotation locally
          // We get the world position/rotation but convert it so it fits in the group
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          screenMesh.getWorldPosition(worldPos);
          screenMesh.getWorldQuaternion(worldQuat);

          customScreen.position.copy(worldPos);
          customScreen.quaternion.copy(worldQuat);
          customScreen.rotateX(Math.PI / 2)
          customScreen.position.z += 0.50;
          customScreen.translateY(0.274);

          // 4. Offset to prevent Z-Fighting (flickering)
          customScreen.translateZ(0.01); 

          // 5. Hide the old and add the new to the monitorGroup
          screenMesh.visible = false;
          monitorGroup.add(customScreen);
          monitorScreen.current = customScreen;

          // Zoom out from inside the screen when returning from a project page
          if (cameFromProject) {
            setTimeout(() => {
              gsap.to(camera.position, { z: 3, duration: 1.0, ease: 'power3.out' });
            }, 300);
          }

          // Update aspect ratio
          displayMaterial.uniforms.planeAspect.value = size.x / size.y;
        }
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
        monitorGroup.rotation.x = lerpedMouse.y * 0.15;
        monitorGroup.rotation.y = lerpedMouse.x * 0.3;

        // Apply same mouse tracking to description element
        const descElement = document.querySelector('.project-description') as HTMLElement;
        if (descElement) {
          descElement.style.transform = `rotateX(${lerpedMouse.y * 0.15}rad) rotateY(${-(lerpedMouse.x * 0.3)}rad)`;
        }

        renderer.render(scene, camera);
      }

      animateThree();

      window.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        mouse.x = x * 2;
        mouse.y = y * 1;
      });

      window.addEventListener("resize", () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        if (newWidth === 0 || newHeight === 0) return;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
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
          const description = (e.currentTarget as HTMLElement).getAttribute('data-description');
          const projectName = (e.currentTarget as HTMLElement).textContent;
          if (imgSrc) setDisplayImage(imgSrc);

          const titleElement = document.querySelector('.project-description h3') as HTMLElement;
          const descElement = document.querySelector('.project-description p') as HTMLElement;

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

          if (descElement && description) {
            descElement.textContent = description;

            // Split description into characters for typing animation
            const descSplit = SplitText.create(descElement, {
              type: "chars",
              charsClass: "char"
            });

            gsap.set(descSplit.chars, { opacity: 0 });
            gsap.to(descSplit.chars, {
              opacity: 1,
              duration: 0.05,
              stagger: 0.02,
              onComplete: () => descSplit.revert()
            });

            gsap.to('.project-description', {
              opacity: 1,
              duration: 0.3,
              ease: "power2.out"
            });
          }
        });

        li.addEventListener('mouseout', () => {
          setDisplayImage(defaultDisplayImage);

          // Kill any ongoing character animations
          gsap.killTweensOf('.project-description h3 .char, .project-description p .char');

          gsap.to('.project-description', {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in"
          });
        });
      });

      // GSAP animations (rest of your code remains the same...)
      customEase.create("hop", "0.9, 0, 0.1, 1");

      const createSplit = (selector: string, type: string, className: string) => {
        return SplitText.create(selector, {
          type: type,
          [type + "ClassName"]: className,
          mask: type === "lines" ? "lines" : undefined,
        });
      }

      if (preloaderHasPlayed) {
        gsap.set(".preloader", { autoAlpha: 0 });
        gsap.set(".preloader-header", { autoAlpha: 0 });
        const skipHeaderRow = createSplit(".header-row h1", "lines", "line");
        gsap.set(skipHeaderRow.lines, { yPercent: 0 });
      } else {
        preloaderHasPlayed = true;

      const preLoaderHeader = createSplit(".preloader-header a", "chars", "char");
      const splitPreLoaderCopy = createSplit(".preloader-copy p", "lines", "line");
      const splitHeaderRow = createSplit(".header-row h1", "lines", "line");

      const chars = preLoaderHeader.chars;
      const lines = splitPreLoaderCopy.lines;
      const headerLines = splitHeaderRow.lines;
      const initialChar = chars[0];
      const lastChar = chars[7];

      chars.forEach((char, index) => {
        gsap.set(char, {
          yPercent: index % 2 === 0 ? -100 : 100,
        });
      });

      gsap.set(lines, {yPercent: 100});
      gsap.set(headerLines, {yPercent: 100});

      const preLoaderImages = gsap.utils.toArray<HTMLElement>(".preloader-images .img-wrap");
      const preLoaderImagesInner = gsap.utils.toArray<HTMLElement>(".preloader-images .img-wrap .img");

      gsap.set(".preloader-images", {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", 
        autoAlpha: 1
      });

      gsap.set(".preloader", {
        autoAlpha: 1,
      });

      gsap.set(".preloader-header", {
        autoAlpha: 1,
      })

      gsap.set(".preloader-copy", {
        opacity: 1,
      });

      gsap.set(preLoaderImages, {
        clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
      });

      gsap.set(preLoaderImagesInner, {
        scale: 2
      });

      const preloaderTL = gsap.timeline({ delay: 0.25 });

      preloaderTL
        .to(".progress-bar", {
          scaleX: 1,
          duration: 4,
          ease: "power3.inOut"
        })
        .to(".progress-bar", {
          scaleX: 0,
          duration: 1,
          ease: "power3.in"
        })

      preLoaderImages.forEach((imgWrap, i) => {
        preloaderTL.to(imgWrap, {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          ease: "hop",
          duration: 1,
          delay: i * 1, 
        }, "-=5");
      });

      preLoaderImagesInner.forEach((imgWrap, i) => {
        preloaderTL.to(imgWrap, {
          scale: 1,
          ease: "hop",
          duration: 1.5,
          delay: i * 1, 
        }, "-=5.5");
      });

      preloaderTL.to(lines, {
        yPercent: 0,
        duration: 2,
        ease: "hop",
        stagger: 0.1,
      }, "-=5.5");

      preloaderTL.to(chars, {
        yPercent: 0,
        duration: 1,
        ease: "hop",
        stagger: 0.025,
      }, "-=5");

      preloaderTL.to(".preloader-images", {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
        duration: 1,
        ease: "hop"
      }, "exit");

      preloaderTL.to(lines, {
        y: "125%",
        duration: 2,
        ease: "hop",
        stagger: 0.1,
      }, "exit")

      preloaderTL.to(chars, {
        yPercent: (index) => {
          if (index === 0 || index === 7) {
            return 0;
          }
          return index % 2 === 0 ? 100 : -100 
        },
        duration: 1,
        ease: "hop",
        stagger: 0.025,
        delay: 0.5,
        onStart: () => {
          const initialCharMask = initialChar.parentElement;

          if (
            initialCharMask && 
            initialCharMask.classList.contains("char-mask")
          ) {
            initialCharMask.style.overflow = "visible";
          }

          const viewportWidth = window.innerWidth;
          const centerX = viewportWidth / 2;
          const initialCharRect = initialChar.getBoundingClientRect();
          const lastCharRect = lastChar.getBoundingClientRect();

          gsap.to([initialChar, lastChar], {
            duration: 1,
            ease: "hop",
            delay: 0.5,
            x: (i) => {
              if (i === 0) {
                return centerX - initialCharRect.left - initialCharRect.width
              }else{
                return centerX - lastCharRect.left
              }
            },
            onComplete: () => {
              gsap.set(".preloader-header", {mixBlendMode: "difference"});
              gsap.to(".preloader-header", {
                y: 0,
                x: "0",
                top: "2rem",
                left: "50%",
                scale: 0.35,
                duration: 1.75,
                ease: "hop"
              });
            },
          });
        },
      }, "-=2.5");

      preloaderTL.to(".preloader", {
        scaleY: 0,
        duration: 1.75,
        ease: "hop",
        transformOrigin: "top center",
      }, "-=0.5");

      preloaderTL.to(headerLines, {
        yPercent: 0,
        duration: 1.2,
        ease: "power4.out",
        stagger: 0.1,
      });

      } // end preloader

      if (slider.current) {
        gsap.to(slider.current, {
          scrollTrigger: {
            trigger: document.documentElement,
            scrub: 0.25,
            start: 0,
            end: window.innerHeight,
            onUpdate: (e) => (direction.current = e.direction * -1),
          },
          x: "-500px",
        });
      }

      // ── Per-character slide hover on headings ──────────────────────────
      const slideEls = Array.from(document.querySelectorAll<HTMLElement>(
        ".hero h1, .hero h2, main > section h1, main > section h2"
      ));

      slideEls.forEach((heading) => {
        const split = SplitText.create(heading, {
          type: "chars,words,lines",
          charsClass: "slide-char",
          mask: "chars",
        });

        const splitChars = split.chars as HTMLElement[];
        gsap.set(splitChars, { display: "inline-block" });

        const charHandlers: Array<{ char: HTMLElement; onEnter: () => void }> = [];

        const animateCharEntrance = (char: HTMLElement) => {
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
                onComplete: () => {
                  delete char.dataset.animating;
                },
              });
            },
          });
        };

        splitChars.forEach((char) => {
          if (!char.textContent || char.textContent.trim().length === 0) return;
          const onEnter = () => animateCharEntrance(char);
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
      });

    }, root);

    marqueeRafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(threeRafId);
      cancelAnimationFrame(marqueeRafId);
      shaderRippleCleanups.forEach(fn => fn());
      cleanupOrbitLabels?.();
      ctx.revert();
      cancelAnimationFrame(lerpRafId);
      window.removeEventListener("wheel", handleWheel);
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

  const zoomIntoScreen = (href: string) => {
    if (isZoomingRef.current) return;
    const cam = threeCamera.current;
    const grp = monitorGroupRef.current;

    if (!cam || !grp) {
      navigateTo(href, 'enter-zoomed');
      return;
    }

    isZoomingRef.current = true;
    sessionStorage.setItem('return-from-project', 'true');
    sessionStorage.setItem('return-scroll-pos', scrollPosRef.current.toString());

    // Straighten the monitor so the zoom flies straight in
    gsap.to(grp.rotation, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });

    // Fly the camera toward the screen — stop before entering the model geometry
    gsap.to(cam.position, { z: 0.8, duration: 0.7, ease: 'power3.in' });

    // Halfway through the zoom, fade the overlay in to cover the entry moment
    gsap.delayedCall(0.42, () => {
      showOverlay();
      gsap.delayedCall(0.3, () => {
        isZoomingRef.current = false;
        navigateTo(href, 'enter-zoomed');
      });
    });
  };

  const getMonitorScreenRect = (): DOMRect | null => {
    const cam  = threeCamera.current;
    const ren  = threeRenderer.current;
    const mesh = monitorScreen.current;
    if (!cam || !ren || !mesh) return null;

    mesh.updateMatrixWorld(true);
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const canvasRect = ren.domElement.getBoundingClientRect();
    const xs: number[] = [];
    const ys: number[] = [];

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.applyMatrix4(mesh.matrixWorld).project(cam);
      xs.push((v.x + 1) / 2 * canvasRect.width  + canvasRect.left);
      ys.push(-(v.y - 1) / 2 * canvasRect.height + canvasRect.top);
    }

    const left   = Math.min(...xs);
    const top    = Math.min(...ys);
    const right  = Math.max(...xs);
    const bottom = Math.max(...ys);
    return new DOMRect(left, top, right - left, bottom - top);
  };

  return (
    <div ref={root} className="w-full h-screen overflow-hidden bg-background">
        {/* Preloader */}
        <section className="preloader invisible w-full h-screen bg-black fixed top-0 left-0 flex flex-col justify-center items-center gap-10 overflow-hidden z-50">
          <div className="progress-bar absolute bg-white top-0 left-0 w-full h-2 bg-red scale-x-0 origin-left will-change-transform"></div>
          <div>
            <div className="preloader-images relative w-75 h-87.5 opacity-0 will-change-[clip-path] overflow-hidden">
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image
                  className="img object-cover will-change-transform"
                  src="/images/brandon.jpg"
                  alt="Brandon"
                  priority
                  fill
                  sizes="300px"
                />
              </div>
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image
                  className="img object-cover will-change-transform"
                  src="/images/brandon2.jpg"
                  alt="Brandon"
                  fill
                  sizes="300px"
                />
              </div>
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image
                  className="img object-cover will-change-transform"
                  src="/images/brandon3.jpg"
                  alt="Brandon"
                  fill
                  sizes="300px"
                />
              </div>
              <div className="img-wrap w-full h-full absolute inset-0 overflow-hidden">
                <Image
                  className="img object-cover will-change-transform"
                  src="/images/brandon5.jpg"
                  alt="Brandon"
                  fill
                  sizes="300px"
                />
              </div>
            </div>
          </div>
          <div className="preloader-copy w-150 opacity-0 mt-12 will-change-opacity">
            <p className="text-white uppercase text-center">I design memorable, user-centered digital experiences that help brands of all sizes stand out and perform.</p>
          </div>
        </section>

        {/* Preloader Header */}
        <div className="preloader-header invisible fixed top-63/100 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 overflow-hidden z-50">
          <a href="#" className="text-white font-heading font-bold text-8xl uppercase whitespace-nowrap">Brandon Mupemhi </a>
        </div>

      <main
        ref={scrollRef}
        className="flex flex-row will-change-transform"
      >
        {/* Hero Section */}
        <section className="hero  w-screen h-screen shrink-0 flex flex-col overflow-hidden relative" ref={heroRef}>
          <div className="h-full w-full flex items-end pb-15 pt-20 gap-5">
            <div className = "w-1/2  flex flex-col justify-between h-full gap-10 px-7">
              <div className="flex flex-col gap-5">
                <h1 className=" font-bold uppercase">Creative <br/> Designer</h1>
                <p className="w-7/10 uppercase">I’m an experienced Web & UI/UX Designer who creates memorable digital experiences for brands of all sizes.</p>
              </div>
              <div className="w-[60vw] relative flex justify-start items-center gap-3 touch-none skill-pill-wrapper">
                <p className="skill-pill cursor-grab active:cursor-grabbing text-xl py-3 px-5 border bg-background rounded-full uppercase">UI/UX Designer</p>
                <p className="skill-pill cursor-grab active:cursor-grabbing bg-black text-white p-3 rounded-full uppercase"><LiaAsteriskSolid className="text-2xl"/></p>
                <p className="skill-pill cursor-grab active:cursor-grabbing text-xl py-3 px-5 border bg-background rounded-2xl uppercase">Frontend Developer</p>
                <p className="skill-pill cursor-grab active:cursor-grabbing bg-black text-white p-3 rounded-full uppercase"><FaArrowRight className="text-2xl"/></p>
                <p className="skill-pill cursor-grab active:cursor-grabbing text-xl py-3 px-5 border bg-background rounded-full uppercase">Wordpress Developer</p>
              </div>
            </div>
            <div className = "w-1/2  h-full flex flex-col items-end justify-end gap-10 px-7">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4)' }}></div>
                <p className="text-xs uppercase">Open for Work</p>
              </div>
              <div className="relative w-full h-[40vh]">
                {/* Image clipped to pill shape */}
                <div className="absolute inset-0  overflow-hidden">
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
              <h1 className=" font-bold uppercase text-right">Mupemhi<br/>Brandon</h1>
            </div>
          </div>
        </section>

        {/*About Section */}
        <section className="w-[130vw] h-screen pb-15 pt-20 pl-37.5 flex flex-col shrink-0 relative overflow-hidden">
          {/* Content: image floated left, large text wraps around + below */}
          <div className="flex-1 mt-4">
            <div className="float-left w-100 h-100 relative mr-14">
              <Image
                className="img object-cover will-change-transform"
                src="/images/brandon4.jpg"
                alt="Brandon"
                fill
                sizes="36vw"
              />
            </div>
            <p className="text-2xl leading-[1.15] font-bold">
              I&apos;m Brandon, a passionate visual storyteller dedicated to crafting memorable digital experiences. With bold design, engaging visuals, and thoughtful user-focused interactions, I create work that feels alive, cinematic, and impossible to ignore.
            </p>
          </div>
        </section>

        {/* Projects Section */}
        <section className="w-auto h-screen -mr-[20vw] shrink-0  flex flex-col justify-end items-end pl-25  p-20 gap-0 z-1">
          <div className = "flex flex-col h-full ">
            <h2 className="font-bold uppercase ">Creative</h2>
            <h2 className="font-bold uppercase ">Showcase</h2>
          </div>
        </section>
        <section ref={projectsRef} className="w-screen h-screen shrink-0 relative overflow-hidden">
          <ul className="projects absolute bottom-12.5 left-1/2 -translate-x-1/2 z-10 flex gap-5 text-black uppercase">
            {projects.map((project) => (
              <li key={project.name} data-img={project.image} data-description={project.description}>
                <a
                  href={`/projects/${project.slug}`}
                  onClick={(e) => { e.preventDefault(); zoomIntoScreen(`/projects/${project.slug}`); }}
                >
                  {project.name}
                </a>
              </li>
            ))}
          </ul>
          <div className="project-description absolute left-3/5 top-3/10 -translate-y-7/10 text-black opacity-0 pointer-events-none">
            <h3 className="text-xl uppercase mb-2"></h3>
            <p className="text-base"></p>
          </div>
        </section>
        
        <section className="w-screen h-screen shrink-0 flex flex-col gap-30 justify-center items-center">
          <div className="w-full flex items-center justify-center gap-0">
            <h2 className="text-[250px] uppercase">Say</h2>
            <div className="w-[20vw] h-40 rounded-full relative overflow-hidden ring-5 rotate-10 ring-secondary-color">
                <Image
                  className="img object-cover will-change-transform"
                  src="/images/contact.jpg"
                  alt="Placeholder"
                  fill
                  sizes="20vw"
                />
            </div>
            <h2 className="text-[250px] uppercase">Hello</h2>
          </div>
          <div className="w-full flex flex-wrap xl:flex-row  justify-center  items-center gap-5 xl:gap-1.25">

            {/*Email */}
            <div className="w-full md:w-auto border-2 border-foreground rounded-full hover:bg-accent">
              <div className="w-full md:w-auto p-1 animate-rotate-border rounded-full bg-conic/[from_var(--border-angle)] from-transparent via-primary-color to-transparent from-80% via-90% to-100%">
                  <a 
                  href="mailto:brandoneemupemhi@gmail.com" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-6.25 py-3 bg-background uppercase items-center text-lg md:text-2xl  flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white"> 
                  Drop me a line
                  <IoIosMail className="text-[30px] md:text-[40px]" />
                  </a>
              </div>
            </div>

            {/*Phone */}
            <div className="w-full md:w-auto xl:rotate-[-14deg] origin-left border-2 border-foreground rounded-full hover:bg-accent">
              <div className="p-1.25 w-full md:w-auto ">
                  <a href="tel:+263776382111" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-6.25 py-2.5 bg-background uppercase items-center text-lg md:text-2xl   flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white"> 
                  Ring me up
                  <MdPhoneEnabled className="text-[30px] md:text-[40px]" />
                  </a>
              </div>
            </div>
                    
            {/*Linkedin */}
            <div className="w-full md:w-auto border-2 border-(--foreground) rounded-full hover:bg-(--accent) hover:border-(--accent) xl:-ml-7.5 ">
              <div className="p-1.25 w-full md:w-auto ">
                  <a 
                  href="https://www.linkedin.com/in/brandon-mupemhi-697007230/" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-6.25 py-2.5 bg-background uppercase items-center text-lg md:text-2xl   flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white"> 
                  Linkedin
                  <IoLogoLinkedin  className="text-[30px] md:text-[40px]" />
                  </a>
              </div>
            </div>
                    
            {/*Dribbble */}
            <div className="w-full md:w-auto xl:w-auto xl:rotate-18 origin-right border-2 border-(--foreground) rounded-full hover:bg-(--accent) hover:border-(--accent) xl:-ml-10 ">
              <div className="p-1.25 w-full md:w-auto">
                <a 
                  href="https://dribbble.com/OGA_01" target="_blank" rel="noopener noreferrer"
                  className="w-full md:w-auto justify-center px-6.25 py-2.5 bg-background uppercase items-center text-lg md:text-2xl   flex gap-5 text-foreground rounded-full hover:bg-primary-color hover:text-white"> 
                  Dribbble
                  <PiDribbbleLogoFill className="text-[30px] md:text-[40px]" />
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
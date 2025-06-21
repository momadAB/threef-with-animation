import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import React, { Suspense, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei/native";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import { useSpring, animated } from "@react-spring/three";
import {
  PanGestureHandler,
  State,
  TapGestureHandler,
} from "react-native-gesture-handler";
import Box from "../box";
import fox from "../../assets/models/Fox.glb";
import { useAnimations } from "@react-three/drei/native";
import { INITIAL_ZOOM_DISTANCE, ZOOM_CONSTS } from "../../constants/model";
import { useNavigation } from "@react-navigation/native";

// Camera Controls Component
const CameraControls = ({ rotationData, targetRadius, velocityData }) => {
  const { camera } = useThree();
  const radius = useRef(8);

  useFrame((state, delta) => {
    // Smooth zoom animation
    const zoomSpeed = 0.1;
    radius.current += (targetRadius.current - radius.current) * zoomSpeed;

    // Apply velocity with damping only if velocityData exists
    if (
      velocityData &&
      velocityData.current &&
      !rotationData.current.isActive
    ) {
      // Apply momentum when not actively dragging
      const damping = 0.95; // Adjust for more/less momentum (0.9-0.98 works well)
      velocityData.current.vx *= damping;
      velocityData.current.vy *= damping;

      // Apply velocity to rotation
      rotationData.current.theta += velocityData.current.vx * delta * 60;
      rotationData.current.phi -= velocityData.current.vy * delta * 60;

      // Clamp phi
      rotationData.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, rotationData.current.phi)
      );

      // Stop tiny movements
      if (Math.abs(velocityData.current.vx) < 0.0001)
        velocityData.current.vx = 0;
      if (Math.abs(velocityData.current.vy) < 0.0001)
        velocityData.current.vy = 0;
    }

    // Smooth interpolation to target rotation
    const smoothing = 0.12; // Adjust for smoother/snappier movement (0.05-0.2)
    const currentTheta = camera.userData.theta || rotationData.current.theta;
    const currentPhi = camera.userData.phi || rotationData.current.phi;

    camera.userData.theta =
      currentTheta + (rotationData.current.theta - currentTheta) * smoothing;
    camera.userData.phi =
      currentPhi + (rotationData.current.phi - currentPhi) * smoothing;

    // Update camera position based on smoothed spherical coordinates
    const x =
      radius.current *
      Math.sin(camera.userData.phi) *
      Math.cos(camera.userData.theta);
    const y = radius.current * Math.cos(camera.userData.phi);
    const z =
      radius.current *
      Math.sin(camera.userData.phi) *
      Math.sin(camera.userData.theta);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Fox Model Component - Remove onClick handler since we disabled canvas events
const FoxModel = (props) => {
  const { nodes, materials, animations, scene } = useGLTF(fox);
  const [active, setActive] = useState(false);
  const { scale } = useSpring({ scale: active ? 1.5 : 1 });
  const meshRef = useRef();
  const groupRef = useRef();
  const animationTarget = nodes._rootJoint || nodes.root || groupRef;
  const { actions } = useAnimations(animations, animationTarget);

  // Debug: Print all available nodes/bones
  React.useEffect(() => {
    console.log("=== FOX MODEL DEBUG INFO ===");
    console.log("Available nodes:", Object.keys(nodes));
    console.log("Nodes detail:", nodes);

    // Print animation tracks and their targets
    console.log("Animation tracks:");
    animations.forEach((animation, index) => {
      console.log(`Animation ${index} (${animation.name || "unnamed"}):`);
      animation.tracks.forEach((track, trackIndex) => {
        const nodeName = track.name.split(".")[0];
        const property = track.name.split(".").slice(1).join(".");
        const nodeExists = nodes[nodeName] !== undefined;
        console.log(
          `  Track ${trackIndex}: ${track.name} -> Node: ${nodeName}, Property: ${property}, Exists: ${nodeExists}`
        );
      });
    });

    // Print materials
    console.log("Available materials:", Object.keys(materials));

    // If you want to see the full scene graph structure
    console.log("=== SCENE GRAPH STRUCTURE ===");
    const printSceneGraph = (object, depth = 0) => {
      const indent = "  ".repeat(depth);
      console.log(`${indent}${object.name || object.type} (${object.type})`);
      if (object.children) {
        object.children.forEach((child) => printSceneGraph(child, depth + 1));
      }
    };

    // This will print after the model loads
    if (groupRef.current) {
      printSceneGraph(groupRef.current);
    }
  }, [nodes, materials, animations]);

  // Play animations:
  React.useEffect(() => {
    if (actions) {
      console.log("Available actions:", Object.keys(actions));
      const actionIndex = 1;

      // Try playing multiple animations to see if any work
      const actionNames = Object.keys(actions);
      if (actionNames.length > 0) {
        const action = actions[actionNames[actionIndex]];
        action?.reset().play();
        console.log(
          `Playing animation: ${actionNames[actionIndex]}, enabled: ${action?.enabled}`
        );
      }
    }
  }, [actions]);

  return (
    <group {...props} ref={groupRef} dispose={null}>
      <animated.group scale={scale}>
        <primitive object={scene} />
      </animated.group>
    </group>
  );
};

const Fox = () => {
  const navigation = useNavigation();
  const targetRadius = useRef(ZOOM_CONSTS.INITIAL_ZOOM_DISTANCE);
  const rotationData = useRef({
    theta: 0,
    phi: Math.PI / 4,
  });
  const lastTranslation = useRef({ x: 0, y: 0 });

  // Disable navigation gestures on this screen
  React.useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      swipeEnabled: false,
    });

    // Re-enable when leaving
    return () => {
      navigation.setOptions({
        gestureEnabled: true,
        swipeEnabled: true,
      });
    };
  }, [navigation]);

  // Initialize camera position on mount
  React.useEffect(() => {
    const initialRadius = ZOOM_CONSTS.INITIAL_ZOOM_DISTANCE;
    targetRadius.current = initialRadius;

    const x =
      initialRadius *
      Math.sin(rotationData.current.phi) *
      Math.cos(rotationData.current.theta);
    const y = initialRadius * Math.cos(rotationData.current.phi);
    const z =
      initialRadius *
      Math.sin(rotationData.current.phi) *
      Math.sin(rotationData.current.theta);

    console.log(
      `Initial camera position: x=${x.toFixed(2)}, y=${y.toFixed(
        2
      )}, z=${z.toFixed(2)}`
    );
  }, []);

  const onPanGestureEvent = (event) => {
    const { translationX, translationY, state, absoluteX, absoluteY } =
      event.nativeEvent;

    // Always process gesture events when active
    if (state === State.ACTIVE) {
      // Calculate delta from last position
      const deltaX = translationX - lastTranslation.current.x;
      const deltaY = translationY - lastTranslation.current.y;

      // Only update if there's actual movement
      if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
        // Update rotation based on delta
        rotationData.current.theta += deltaX * 0.01;
        rotationData.current.phi -= deltaY * 0.01;

        // Clamp phi to prevent flipping
        rotationData.current.phi = Math.max(
          0.1,
          Math.min(Math.PI - 0.1, rotationData.current.phi)
        );

        // Store current translation for next frame
        lastTranslation.current = { x: translationX, y: translationY };

        console.log(
          `Active - X: ${absoluteX.toFixed(0)}, Y: ${absoluteY.toFixed(
            0
          )}, State: ${state}`
        );
      }
    }
  };

  const onPanHandlerStateChange = (event) => {
    const { state, translationX, translationY, x, y } = event.nativeEvent;
    console.log(
      `State change: ${State[state]} at (${x?.toFixed(0)}, ${y?.toFixed(0)})`
    );

    if (state === State.BEGAN) {
      // Reset last translation to start fresh delta calculation
      lastTranslation.current = { x: 0, y: 0 };
      console.log("Gesture BEGAN - ready to track");
    } else if (state === State.ACTIVE) {
      // Sometimes the first ACTIVE state comes through state change
      console.log("Gesture ACTIVE (from state change)");
    } else if (state === State.END) {
      // Reset last translation for next gesture
      lastTranslation.current = { x: 0, y: 0 };
      console.log("Gesture END - rotation preserved");
    } else if (state === State.CANCELLED) {
      console.log("CANCELLED - Navigation gesture or touch intercepted?");
      lastTranslation.current = { x: 0, y: 0 };
    } else if (state === State.FAILED) {
      console.log("FAILED - Check if activeOffset is too restrictive");
      lastTranslation.current = { x: 0, y: 0 };
    }
  };

  const zoomIn = () => {
    targetRadius.current = Math.max(
      3,
      targetRadius.current - ZOOM_CONSTS.ZOOM_STEP_DISTANCE
    );
    console.log(`Zoom in - target radius: ${targetRadius.current}`);
  };

  const zoomOut = () => {
    targetRadius.current = Math.min(
      500,
      targetRadius.current + ZOOM_CONSTS.ZOOM_STEP_DISTANCE
    );
    console.log(`Zoom out - target radius: ${targetRadius.current}`);
  };

  const tapRef = useRef();
  const panRef = useRef();
  const velocityData = useRef({
    vx: 0,
    vy: 0,
  });

  return (
    <View style={styles.container}>
      <TapGestureHandler
        ref={tapRef}
        simultaneousHandlers={[panRef]}
        shouldCancelWhenOutside={false}
      >
        <PanGestureHandler
          ref={panRef}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
          shouldCancelWhenOutside={false}
          simultaneousHandlers={[tapRef]}
          minPointers={1}
          maxPointers={1}
          avgTouches={false}
          enableTrackpadTwoFingerGesture={false}
          failOffsetX={[-1000, 1000]}
          failOffsetY={[-1000, 1000]}
          activeOffsetX={[-2, 2]}
          activeOffsetY={[-2, 2]}
          minDist={0}
        >
          <View
            style={[styles.container, styles.gestureContainer]}
            collapsable={false}
            pointerEvents="box-only"
          >
            <Canvas
              style={styles.canvas}
              events={undefined} // Disable react-three-fiber's event handling
              onCreated={({ gl }) => {
                // Disable all pointer events on the canvas
                gl.domElement.style.touchAction = "none";
                gl.domElement.style.pointerEvents = "none";
                gl.domElement.style.userSelect = "none";
                gl.domElement.style.webkitUserSelect = "none";
              }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Suspense fallback={<Box position={[0, 0, 0]} />}>
                <FoxModel scale={0.5} position={[0, -1, 0]} />
              </Suspense>
              <CameraControls
                rotationData={rotationData}
                targetRadius={targetRadius}
                velocityData={velocityData}
              />
            </Canvas>
          </View>
        </PanGestureHandler>
      </TapGestureHandler>

      {/* Zoom Controls */}
      <View style={styles.zoomControls} pointerEvents="box-none">
        <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
          <Text style={styles.zoomButtonText}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Fox;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  canvas: {
    flex: 1,
  },
  zoomControls: {
    position: "absolute",
    right: 20,
    top: 100,
    flexDirection: "column",
  },
  zoomButton: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 5,
  },
  zoomButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
});

// Preload the model
useGLTF.preload(fox);

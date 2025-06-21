import React from "react";
import "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import HomeScreen from "./src/HomeScreen";
import Fox from "./src/fox/Fox";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const Stack = createNativeStackNavigator();

export default function App() {
  const originalLog = console.log;

  console.log = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes(
        "EXGL: gl.pixelStorei() doesn't support this parameter yet!"
      )
    ) {
      return; // skip this log
    }

    originalLog(...args);
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Fox" component={Fox} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

/* 
--legacy-peer-deps
*/

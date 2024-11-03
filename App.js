import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import AddPosteScreen from './src/screens/AddPosteScreen';
import PostesScreen from './src/screens/PostesScreen'

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AddPoste" component={AddPosteScreen} />
        <Stack.Screen name="Postes" component={PostesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

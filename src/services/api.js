import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Verifica se o usuário está logado ao carregar o app
    const checkLoginStatus = async () => {
      const token = await AsyncStorage.getItem('access_token');
      setIsLoggedIn(!!token);  // Se o token existir, usuário está logado
      setLoading(false);       // Finaliza o carregamento
    };

    checkLoginStatus();
  }, []);

  if (loading) {
    return null;  // Aqui você pode renderizar uma tela de carregamento
  }

  return (
    <Stack.Navigator initialRouteName={isLoggedIn ? "Postes" : "Login"}>
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

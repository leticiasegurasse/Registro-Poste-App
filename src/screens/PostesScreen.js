import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserPostesScreen = ({ navigation }) => {
  const [postes, setPostes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPostes();
  }, []);

  // Função para renovar o access token usando o refresh token
  const refreshAccessToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await axios.post('https://postes.g2telecom.com.br/api/token/refresh/', {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.access;

      // Armazena o novo access token
      await AsyncStorage.setItem('accessToken', newAccessToken);

      return newAccessToken;
    } catch (error) {
      console.error('Erro ao renovar o token de acesso:', error);
      return null;
    }
  };

  // Função para buscar postes do usuário
  const fetchUserPostes = async () => {
    try {
      let token = await AsyncStorage.getItem('accessToken');

      // Faz a requisição com o token de acesso atual
      let response = await axios.get('https://postes.g2telecom.com.br/api/postes/', {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      setPostes(response.data);
      setLoading(false);

    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Token de acesso expirado ou inválido, tenta renovar o token
        const newAccessToken = await refreshAccessToken();

        if (newAccessToken) {
          // Tenta novamente a requisição com o novo token
          try {
            const response = await axios.get('https://postes.g2telecom.com.br/api/postes/', {
              headers: {
                Authorization: `Token ${newAccessToken}`,
              },
            });

            setPostes(response.data);
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar os postes.');
          }
        } else {
          Alert.alert('Erro', 'Autenticação falhou. Por favor, faça login novamente.');
        }
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os postes.');
      }

      setLoading(false);
    }
  };

  // Função para deletar um poste com confirmação
  const handleDeletePoste = async (id) => {
    Alert.alert(
      'Confirmação',
      'Você tem certeza que deseja remover este poste?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken');
              await axios.delete(`https://postes.g2telecom.com.br/api/postes/${id}/`, {
                headers: { Authorization: `Token ${token}` },
              });
              setPostes((prevPostes) => prevPostes.filter(poste => poste.id !== id));
              Alert.alert('Sucesso', 'Poste removido com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível remover o poste.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.posteContainer}>
      <Text style={styles.title}>Poste ID: {item.id}</Text>
      <Text style={styles.description}>Cidade: {item.cidade}</Text>
      <Text style={styles.description}>Descrição: {item.descricao}</Text>
      <Button title="Remover" onPress={() => handleDeletePoste(item.id)} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={postes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
      {/* Botão para navegar para a tela de adicionar poste */}
      <Button 
        title="+ Adicionar Novo Poste" 
        onPress={() => navigation.navigate('AddPoste')} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  posteContainer: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserPostesScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as utm from 'utm';  // Importa a biblioteca de conversão
import * as ImagePicker from 'expo-image-picker';  // Para captura de imagem
import RNPickerSelect from 'react-native-picker-select';  // Dropdown para Cidade e Bairro
import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';

const AddPosteScreen = ({ navigation }) => {
  const [cidades, setCidades] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [cidade, setCidade] = useState(null);
  const [bairro, setBairro] = useState(null);
  const [localizacaoUTM, setLocalizacaoUTM] = useState({ zonautm: '', localizacao_utm_x: '', localizacao_utm_y: '' });
  const [observacoes, setObservacoes] = useState('');
  const [image, setImage] = useState(null);  // Armazena a imagem selecionada

  useEffect(() => {
    fetchCidades();
    getLocation();
    requestPermissions();  // Solicita permissões

    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        syncPostes();
      }
    });
  
    return () => unsubscribe();
  }, []);

  const requestPermissions = async () => {
    // Solicitar permissões para a câmera e galeria
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Você precisa permitir o acesso à câmera para usar esta funcionalidade.');
    }
  };

  const fetchCidades = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get('http://104.236.241.235/api/cidades/', {
        headers: { Authorization: `Token ${token}` },
      });
      setCidades(response.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as cidades.');
    }
  };

  const fetchBairros = async (cidadeId) => {
    if (!cidadeId) return;

    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(`http://104.236.241.235/api/cidades/${cidadeId}/bairros/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setBairros(response.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os bairros.');
    }
  };

  
  const getLocation = async () => {
      // Solicita permissão de localização
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
          Alert.alert('Erro', 'Permissão para acessar a localização foi negada.');
          return;
      }
  
      // Obtém a posição atual
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
  
      // Converte latitude e longitude para UTM
      const { easting, northing, zoneNum, zoneLetter } = utm.fromLatLon(latitude, longitude);
  
      // Define o valor de localização UTM
      const localizacaoUTM = {
          zonautm: zoneNum,         // Zona UTM
          localizacao_utm_x: easting,    // Coordenada X em UTM (Easting)
          localizacao_utm_y: northing    // Coordenada Y em UTM (Northing)
      };
  
      setLocalizacaoUTM(localizacaoUTM);
  };
  

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão para acessar a câmera foi negada.');
      return;
    }
  
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
   
  
    if (!result.canceled) {
      // Redimensiona a imagem para uma largura menor (ex: 800px)
      const resizedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      console.log(resizedImage.uri); // Verificar URI da imagem redimensionada
      setImage(resizedImage.uri);    // Usar a imagem redimensionada
    }
  };
  
  // Função para salvar o poste no SQLite se estiver offline
  const savePosteOffline = async (data) => {
    const db = await SQLite.openDatabaseAsync('postes');

    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO postes (cidade, bairro, zonautm, localizacao_utm_x, localizacao_utm_y, observacoes, fotoUri) values (?, ?, ?, ?, ?, ?, ?)',
        [data.cidade, data.bairro, data.zonautm, data.localizacao_utm_x, data.localizacao_utm_y, data.observacoes, data.fotoUri],
        (_, result) => console.log("Poste salvo offline com ID:", result.insertId),
        (_, error) => console.error("Erro ao salvar poste offline:", error)
      );
    });
  };
  
  // Função para enviar o poste para o servidor
  const enviarPosteParaServidor = async (formData) => {
    const token = await AsyncStorage.getItem('accessToken');

    try {
      const response = await axios.post('http://104.236.241.235/api/postes/', formData, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        Alert.alert('Sucesso', 'Poste adicionado com sucesso!');
      }
    } catch (error) {
      console.error("Erro ao enviar poste:", error.response);
      Alert.alert('Erro', 'Não foi possível adicionar o poste. Tente novamente.');
    }
  };

  // Função principal para adicionar o poste
  const handleAddPoste = async () => {
    const formData = new FormData();
    
    formData.append('cidade', cidade);
    formData.append('bairro', bairro);
    formData.append('zonautm', localizacaoUTM.zonautm);
    formData.append('localizacao_utm_x', localizacaoUTM.localizacao_utm_x);
    formData.append('localizacao_utm_y', localizacaoUTM.localizacao_utm_y);
    formData.append('observacoes', observacoes);

    if (image) {
      const fileName = image.split('/').pop();
      const fileType = fileName.split('.').pop();
      formData.append('foto', {
        uri: image,
        name: fileName,
        type: `image/${fileType}`,
      });
    }

    // Verifica a conexão antes de enviar
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      await enviarPosteParaServidor(formData);
    } else {
      // Salva no SQLite se estiver offline
      savePosteOffline({
        cidade,
        bairro,
        zonautm: localizacaoUTM.zonautm,
        localizacao_utm_x: localizacaoUTM.localizacao_utm_x,
        localizacao_utm_y: localizacaoUTM.localizacao_utm_y,
        observacoes,
        fotoUri: image,
      });
      Alert.alert('Offline', 'Poste salvo offline. Será sincronizado automaticamente quando estiver online.');
    }
  };
  
  // Função para sincronizar os dados offline com o servidor
  const syncPostes = async () => {
    const db = await SQLite.openDatabaseAsync('postes');

    console.log("Banco de dados aberto:", db);

    try {
      // Seleciona todos os postes com o status de sincronização pendente
      const allRows = await db.getAllAsync('SELECT * FROM postes WHERE status_sync = 0');
      for (const poste of allRows) {
        const formData = new FormData();
        formData.append('cidade', poste.cidade);
        formData.append('bairro', poste.bairro);
        formData.append('zonautm', poste.zonautm);
        formData.append('localizacao_utm_x', poste.localizacao_utm_x);
        formData.append('localizacao_utm_y', poste.localizacao_utm_y);
        formData.append('observacoes', poste.observacoes);

        if (poste.fotoUri) {
          const fileName = poste.fotoUri.split('/').pop();
          const fileType = fileName.split('.').pop();
          formData.append('foto', {
            uri: poste.fotoUri,
            name: fileName,
            type: `image/${fileType}`,
          });
        }

        try {
          const response = await enviarPosteParaServidor(formData);
          if (response && response.status === 201) {
            // Remove o poste do banco de dados local após a sincronização bem-sucedida
            await db.runAsync('DELETE FROM postes WHERE id = ?', [poste.id]);
            console.log("Poste sincronizado e removido offline:", poste.id);
          }
        } catch (error) {
          console.error("Erro ao sincronizar poste:", error);
        }
      }
    } catch (error) {
      console.error("Erro ao acessar o banco de dados:", error);
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.label}>Cidade</Text>
      <RNPickerSelect
        onValueChange={(value) => {
          setCidade(value);
          fetchBairros(value);
        }}
        items={cidades.map((cidade) => ({ label: cidade.nome, value: cidade.id }))}
        placeholder={{ label: 'Selecione uma cidade', value: null }}
      />

      <Text style={styles.label}>Bairro</Text>
      <RNPickerSelect
        onValueChange={setBairro}
        items={bairros.map((bairro) => ({ label: bairro.nome, value: bairro.id }))}
        placeholder={{ 
          label: cidade ? 'Selecione um bairro' : 'Selecione uma cidade primeiro', 
          value: null 
        }}
        disabled={!cidade}
      />

      <Text style={styles.label}>Observações</Text>
      <TextInput
        style={styles.input}
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Informações adicionais"
      />

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Tirar Foto</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.image} />}

      <Button title="Adicionar Poste" onPress={handleAddPoste} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 16,
    borderRadius: 4,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: 200,
    marginTop: 16,
  },
});

export default AddPosteScreen;

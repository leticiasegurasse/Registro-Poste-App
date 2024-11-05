import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as utm from 'utm';  // Importa a biblioteca de conversão
import * as ImagePicker from 'expo-image-picker';  // Para captura de imagem
import RNPickerSelect from 'react-native-picker-select';  // Dropdown para Cidade e Bairro
import * as ImageManipulator from 'expo-image-manipulator';


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
  
  
  

  const handleAddPoste = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const formData = new FormData();
  
    formData.append('cidade', cidade);
    formData.append('bairro', bairro);
    formData.append('zonautm', localizacaoUTM.zonautm);
    formData.append('localizacao_utm_x', localizacaoUTM.localizacao_utm_x);
    formData.append('localizacao_utm_y', localizacaoUTM.localizacao_utm_y);
    formData.append('observacoes', observacoes);
    
    console.log(image);
  
    if (image) {
      const fileName = image.split('/').pop();
      const fileType = fileName.split('.').pop();
      formData.append('foto', {
        uri: image,
        name: fileName,
        type: `image/${fileType}`,
      });
    }
  
  
    console.log(formData);  // Verificar o conteúdo do FormData
  
    try {
      const response = await axios.post('http://104.236.241.235/api/postes/', formData, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (response.status === 201) {
        Alert.alert('Sucesso', 'Poste adicionado com sucesso!');
        navigation.goBack();
      }
    } catch (error) {
      console.log(error.response);  // Verificar a resposta do erro
      Alert.alert('Erro', 'Não foi possível adicionar o poste. Tente novamente.');
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

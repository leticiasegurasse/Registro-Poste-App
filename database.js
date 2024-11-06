import * as SQLite from 'expo-sqlite';

let db;

// Função para abrir o banco de dados
export const initializeDatabase = async () => {
  db = await SQLite.openDatabaseAsync('postes.db');

  // Inicializa a tabela
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS postes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cidade TEXT,
      bairro TEXT,
      zonautm INTEGER,
      localizacao_utm_x REAL,
      localizacao_utm_y REAL,
      observacoes TEXT,
      status_sync INTEGER DEFAULT 0
    );
  `);
};

// Função para salvar um poste offline
export const savePosteOffline = async (dadosPoste) => {
  await db.execAsync(
    `INSERT INTO postes (cidade, bairro, zonautm, localizacao_utm_x, localizacao_utm_y, observacoes, status_sync) 
    VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [
      dadosPoste.cidade,
      dadosPoste.bairro,
      dadosPoste.zonautm,
      dadosPoste.localizacao_utm_x,
      dadosPoste.localizacao_utm_y,
      dadosPoste.observacoes,
    ]
  );
};

// Função para recuperar postes offline para sincronização
export const getOfflinePostes = async () => {
  const result = await db.getAllAsync('SELECT * FROM postes WHERE status_sync = 0;');
  return result.rows;
};

// Função para marcar um poste como sincronizado
export const markPosteAsSynced = async (id) => {
  await db.execAsync(`UPDATE postes SET status_sync = 1 WHERE id = ?;`, [id]);
};

// Função para sincronizar automaticamente postes ao conectar na internet
export const syncPostes = async (syncCallback) => {
  const offlinePostes = await getOfflinePostes();
  for (const poste of offlinePostes) {
    const sucesso = await syncCallback(poste);
    if (sucesso) {
      await markPosteAsSynced(poste.id);
    }
  }
};

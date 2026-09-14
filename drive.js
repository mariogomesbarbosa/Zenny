// @ts-check

/* Integração com Google Drive — backup na pasta oculta do app.
 *
 * Este módulo isola toda a comunicação com o Google Identity Services (GIS) e a
 * Drive API v3. O app.js importa e chama; o núcleo não sabe que o Drive existe.
 *
 * O token de acesso fica APENAS em memória. Se a aba fechar, a pessoa reconecta
 * na próxima vez — sem estado de sessão persistido, sem refresh token, sem risco
 * de token velho no localStorage.
 *
 * Escopo: drive.appdata — acessa somente a pasta oculta do app no Drive da
 * pessoa, sem ver nenhum arquivo dela.
 */

/* O Client ID do Google Cloud Console. Público por definição — aparece no
   JavaScript que o navegador baixa. */
/** @type {string} */
const CLIENT_ID = '595876283616-a993k9p6jjmf8mfnbkr9bcf10a7osmnp.apps.googleusercontent.com';
const ESCOPO = 'https://www.googleapis.com/auth/drive.appdata';
const NOME_DO_ARQUIVO = 'zenny-backup.json';

/* URLs da API */
const URL_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const URL_ARQUIVOS = 'https://www.googleapis.com/drive/v3/files';
const URL_REVOGAR = 'https://oauth2.googleapis.com/revoke';

/* Estado do módulo — vive só em memória */

/** @type {string|null} */
let token = null;

/** @type {any} */
let tokenClient = null;

// — Inicialização ————————————————————————————————————————

/** Configura o Token Client do GIS. Chamar uma vez, na carga do app.
 *  @param {() => void} aoConectar — callback para quando o token chegar.
 */
export function inicializarDrive(aoConectar) {
  if (CLIENT_ID === '__GOOGLE_CLIENT_ID__') {
    /* Client ID pendente de configuração no Google Cloud Console. */
    return;
  }

  /* O script do GIS pode ainda não ter carregado (async defer). Se não
     carregou, tenta de novo em 500ms. */
  const g = /** @type {any} */ (window).google;
  if (!g || !g.accounts) {
    setTimeout(() => inicializarDrive(aoConectar), 500);
    return;
  }

  tokenClient = g.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: ESCOPO,
    callback: (/** @type {{ access_token?: string, error?: string }} */ resposta) => {
      if (resposta.error || !resposta.access_token) {
        token = null;
        return;
      }
      token = resposta.access_token;
      aoConectar();
    },
  });
}

// — Conexão ————————————————————————————————————————————

/** Abre o popup de consentimento do Google. */
export function conectar() {
  if (CLIENT_ID === '__GOOGLE_CLIENT_ID__') {
    throw new Error('Configure o Client ID do Google no drive.js para conectar.');
  }
  if (!tokenClient) {
    throw new Error('O serviço do Google ainda está carregando. Tente novamente em instantes.');
  }
  /* consent: pede consentimento sempre — mais simples e evita token herdado
     de sessão anterior. Se a pessoa já autorizou o app, o Google mostra apenas
     a seleção de conta, sem a tela de permissões. */
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

/** Revoga o token e limpa o estado local. */
export async function desconectar() {
  if (!token) return;
  try {
    await fetch(`${URL_REVOGAR}?token=${token}`, { method: 'POST' });
  } catch (_) {
    /* Falhar na revogação remota não é motivo para manter o token local. */
  }
  token = null;
}

/** @returns {boolean} */
export function estaConectado() {
  return token !== null;
}

// — Operações no Drive ————————————————————————————————————

/**
 * @typedef {{ id: string, modifiedTime: string, size: string }} InfoDoArquivo
 */

/** Busca o arquivo de backup existente no appDataFolder.
 *  @returns {Promise<InfoDoArquivo|null>}
 */
async function buscarArquivoExistente() {
  if (!token) return null;

  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${NOME_DO_ARQUIVO}'`,
    fields: 'files(id,name,size,modifiedTime)',
    pageSize: '1',
  });

  const resposta = await fetch(`${URL_ARQUIVOS}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    if (resposta.status === 401) { token = null; }
    return null;
  }

  const dados = await resposta.json();
  const arquivos = dados.files || [];
  return arquivos.length > 0 ? arquivos[0] : null;
}

/** Retorna informações sobre o backup no Drive, ou null se não houver.
 *  @returns {Promise<{ exportadoEm: string, tamanho: number }|null>}
 */
export async function infoDoBackupDrive() {
  const arquivo = await buscarArquivoExistente();
  if (!arquivo) return null;

  return {
    exportadoEm: arquivo.modifiedTime,
    tamanho: parseInt(arquivo.size, 10) || 0,
  };
}

/** Sobe o JSON do backup para o appDataFolder. Se já existir, sobrescreve.
 *  @param {string} textoJson
 *  @returns {Promise<{ exportadoEm: string, tamanho: number }>}
 */
export async function salvarNoDrive(textoJson) {
  if (!token) throw new Error('Não conectado ao Google Drive.');

  const existente = await buscarArquivoExistente();

  if (existente) {
    /* Atualiza o conteúdo do arquivo existente. */
    const resposta = await fetch(
      `${URL_UPLOAD}/${existente.id}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: textoJson,
      }
    );
    if (!resposta.ok) {
      if (resposta.status === 401) token = null;
      throw new Error('Erro ao atualizar a cópia no Drive.');
    }
    const dados = await resposta.json();
    return {
      exportadoEm: dados.modifiedTime || new Date().toISOString(),
      tamanho: parseInt(dados.size, 10) || textoJson.length,
    };
  }

  /* Cria um arquivo novo via upload multipart. O metadata inclui o nome e
     o parent (appDataFolder). O body é o JSON do backup. */
  const metadata = JSON.stringify({
    name: NOME_DO_ARQUIVO,
    parents: ['appDataFolder'],
  });

  const boundary = '---zenny-backup-boundary---';
  const corpo =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${textoJson}\r\n` +
    `--${boundary}--`;

  const resposta = await fetch(
    `${URL_UPLOAD}?uploadType=multipart&fields=id,modifiedTime,size`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: corpo,
    }
  );

  if (!resposta.ok) {
    if (resposta.status === 401) token = null;
    throw new Error('Erro ao salvar a cópia no Drive.');
  }

  const dados = await resposta.json();
  return {
    exportadoEm: dados.modifiedTime || new Date().toISOString(),
    tamanho: parseInt(dados.size, 10) || textoJson.length,
  };
}

/** Baixa o conteúdo do backup do Drive.
 *  @returns {Promise<string|null>} — o texto JSON, ou null se não houver backup.
 */
export async function buscarDoDrive() {
  if (!token) return null;

  const arquivo = await buscarArquivoExistente();
  if (!arquivo) return null;

  const resposta = await fetch(
    `${URL_ARQUIVOS}/${arquivo.id}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!resposta.ok) {
    if (resposta.status === 401) token = null;
    return null;
  }

  return await resposta.text();
}

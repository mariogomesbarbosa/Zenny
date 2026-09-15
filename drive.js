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
const ESCOPO = 'https://www.googleapis.com/auth/drive.appdata email';
const NOME_DO_ARQUIVO = 'zenny-backup.json';

/* Chaves de persistência */
const CHAVE_TOKEN = 'zenny-drive-token';
const CHAVE_CONTA = 'zenny-drive-conta';
const CHAVE_INFO = 'zenny-drive-info';

/* URLs da API */
const URL_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const URL_ARQUIVOS = 'https://www.googleapis.com/drive/v3/files';
const URL_REVOGAR = 'https://oauth2.googleapis.com/revoke';
const URL_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

/* Estado do módulo */

/** @type {string|null} */
let token = null;

/** @type {any} */
let tokenClient = null;

// — Persistência Local ——————————————————————————————————————

/** @returns {string|null} */
function carregarSessao() {
  try {
    const bruto = localStorage.getItem(CHAVE_TOKEN);
    if (!bruto) return null;
    const sessao = JSON.parse(bruto);
    if (sessao && sessao.token && sessao.expiraEm > Date.now()) {
      return sessao.token;
    }
  } catch (_) {}
  return null;
}

/** @returns {string|null} */
export function carregarContaLocal() {
  try {
    return localStorage.getItem(CHAVE_CONTA) || null;
  } catch (_) {
    return null;
  }
}

/** @param {string} email */
export function salvarContaLocal(email) {
  try {
    localStorage.setItem(CHAVE_CONTA, email);
  } catch (_) {}
}

/** @returns {{ exportadoEm: string, tamanho: number }|null} */
export function carregarInfoDriveLocal() {
  try {
    const bruto = localStorage.getItem(CHAVE_INFO);
    return bruto ? JSON.parse(bruto) : null;
  } catch (_) {
    return null;
  }
}

/** @param {{ exportadoEm: string, tamanho: number }} info */
export function salvarInfoDriveLocal(info) {
  try {
    localStorage.setItem(CHAVE_INFO, JSON.stringify(info));
  } catch (_) {}
}

// — Inicialização ————————————————————————————————————————

/** Configura o Token Client do GIS. Chamar uma vez, na carga do app.
 *  @param {() => void} aoConectar — callback para quando o token chegar.
 */
export function inicializarDrive(aoConectar) {
  token = carregarSessao();

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
    callback: async (/** @type {{ access_token?: string, expires_in?: string, error?: string }} */ resposta) => {
      if (resposta.error || !resposta.access_token) {
        token = null;
        return;
      }
      token = resposta.access_token;
      const expiraEm = Date.now() + (Number(resposta.expires_in) || 3600) * 1000 - 60000;
      try {
        localStorage.setItem(CHAVE_TOKEN, JSON.stringify({ token, expiraEm }));
      } catch (_) {}

      const email = await obterContaGoogle();
      if (email) salvarContaLocal(email);

      aoConectar();
    },
  });

  if (token) {
    aoConectar();
  }
}

// — Conexão ————————————————————————————————————————————

/** Obtém o e-mail da conta conectada via UserInfo ou Drive API.
 *  @returns {Promise<string|null>}
 */
export async function obterContaGoogle() {
  if (!token) return carregarContaLocal();
  try {
    const resp = await fetch(URL_USERINFO, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) {
      const dados = await resp.json();
      if (dados.email) return dados.email;
    }
  } catch (_) {}

  try {
    const respDrive = await fetch(`${URL_ARQUIVOS}/../about?fields=user(emailAddress)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (respDrive.ok) {
      const dadosDrive = await respDrive.json();
      if (dadosDrive.user?.emailAddress) return dadosDrive.user.emailAddress;
    }
  } catch (_) {}

  return carregarContaLocal();
}

/** Abre o popup de autorização do Google.
 *  @param {{ forcarEscolha?: boolean, prompt?: string }} [opcoes]
 */
export function conectar(opcoes = {}) {
  if (CLIENT_ID === '__GOOGLE_CLIENT_ID__') {
    throw new Error('Configure o Client ID do Google no drive.js para conectar.');
  }
  if (!tokenClient) {
    throw new Error('O serviço do Google ainda está carregando. Tente novamente em instantes.');
  }

  const emailSalvo = carregarContaLocal();
  const prompt = opcoes.forcarEscolha ? 'select_account' : (opcoes.prompt ?? '');

  /** @type {any} */
  const config = { prompt };
  if (emailSalvo && !opcoes.forcarEscolha) {
    config.hint = emailSalvo;
  }

  tokenClient.requestAccessToken(config);
}

/** Revoga o token e limpa o estado local. */
export async function desconectar() {
  if (token) {
    try {
      await fetch(`${URL_REVOGAR}?token=${token}`, { method: 'POST' });
    } catch (_) {
      /* Falhar na revogação remota não é motivo para manter o token local. */
    }
  }
  token = null;
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_CONTA);
    localStorage.removeItem(CHAVE_INFO);
  } catch (_) {}
}

/** @returns {boolean} */
export function estaConectado() {
  return token !== null || carregarContaLocal() !== null;
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

  const info = {
    exportadoEm: arquivo.modifiedTime,
    tamanho: parseInt(arquivo.size, 10) || 0,
  };
  salvarInfoDriveLocal(info);
  return info;
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
    const resultado = {
      exportadoEm: dados.modifiedTime || new Date().toISOString(),
      tamanho: parseInt(dados.size, 10) || textoJson.length,
    };
    salvarInfoDriveLocal(resultado);
    return resultado;
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
  const resultado = {
    exportadoEm: dados.modifiedTime || new Date().toISOString(),
    tamanho: parseInt(dados.size, 10) || textoJson.length,
  };
  salvarInfoDriveLocal(resultado);
  return resultado;
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

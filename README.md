# Doc Manager

Serviço Node.js que monitora uma pasta no **Google Drive**, envia novos arquivos para o **Paperless-NGX** (com tag de origem), remove o arquivo do Drive e envia uma notificação via **Telegram**.

```
Google Drive Folder
       │
       ▼ (polling)
  Doc Manager
       ├─► Paperless-NGX  (upload + tag)
       ├─► Google Drive   (delete file)
       └─► Telegram       (notification)
```

---

## Pré-requisitos

- Node.js 20+ (ou Docker)
- Conta do Google Cloud com Drive API habilitada
- Instância do Paperless-NGX em execução
- Bot do Telegram criado via [@BotFather](https://t.me/BotFather)

---

## Configuração

### 1. Service Account do Google Drive

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto (ou use um existente)
3. Habilite a **Google Drive API**
4. Em **IAM & Admin → Service Accounts**, crie uma Service Account
5. Gere uma chave JSON e salve como `credentials.json` na raiz do projeto
6. Compartilhe sua pasta do Google Drive com o e-mail da Service Account (permissão de **Editor**)

### 2. Token da API do Paperless-NGX

- Acesse `http://seu-paperless/api/token/` e faça login, **ou**
- Vá em **Configurações → API Token** no painel do Paperless

### 3. Bot do Telegram

1. Fale com [@BotFather](https://t.me/BotFather) e crie um bot: `/newbot`
2. Copie o token gerado
3. Para descobrir seu **chat ID**, fale com [@userinfobot](https://t.me/userinfobot)

### 4. ID da Pasta do Google Drive

Abra a pasta no navegador. O ID é a parte final da URL:
```
https://drive.google.com/drive/folders/<FOLDER_ID>
```

---

## Instalação e execução

### Via Node.js (desenvolvimento)

```bash
# Clone e instale dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Coloque o credentials.json na raiz do projeto

# Execute
npm run dev       # com hot-reload
# ou
npm start         # produção
```

### Via Docker (recomendado)

```bash
cp .env.example .env
# Edite o .env com suas credenciais
# Coloque o credentials.json na raiz do projeto

docker-compose up --build -d

# Acompanhe os logs
docker-compose logs -f
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | ✅ | Caminho para o JSON da Service Account |
| `GDRIVE_FOLDER_ID` | ✅ | ID da pasta do Google Drive a monitorar |
| `POLL_INTERVAL_MS` | ❌ | Intervalo de polling em ms (padrão: 60000) |
| `PAPERLESS_URL` | ✅ | URL da instância Paperless-NGX |
| `PAPERLESS_TOKEN` | ✅ | Token de API do Paperless-NGX |
| `PAPERLESS_TAG_NAME` | ❌ | Nome da tag de origem (padrão: `google-drive`) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Token do bot do Telegram |
| `TELEGRAM_CHAT_ID` | ✅ | ID do chat para notificações |

---

## Fluxo de funcionamento

1. A cada `POLL_INTERVAL_MS` ms, o serviço lista os arquivos não deletados da pasta do Drive
2. Para cada arquivo encontrado:
   - Faz o download (arquivos Google Docs/Planilhas são exportados como PDF)
   - Faz o upload para o Paperless-NGX com a tag de origem
   - Move o arquivo para a lixeira do Google Drive
   - Envia notificação via Telegram
3. Em caso de erro em um arquivo, uma notificação de erro é enviada e o serviço continua para o próximo

---

## Estrutura do projeto

```
doc-manager/
├── src/
│   ├── index.js        # Orquestrador principal / loop de polling
│   ├── config.js       # Carregamento e validação de variáveis de ambiente
│   ├── googleDrive.js  # Integração com Google Drive API v3
│   ├── paperless.js    # Integração com Paperless-NGX REST API
│   └── telegram.js     # Notificações via Telegram Bot API
├── credentials.json    # (não versionar!) Service Account key
├── .env                # (não versionar!) Variáveis de ambiente
├── .env.example        # Template de variáveis de ambiente
├── Dockerfile
├── docker-compose.yml
└── package.json
```

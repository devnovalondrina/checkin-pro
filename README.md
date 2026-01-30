# CheckIn Pro

Sistema completo de gestão de eventos e controle de presença com múltiplos métodos de check-in e emissão de certificados.

## Funcionalidades

### 1. Gestão de Eventos (Admin)
- Criar, editar e excluir eventos.
- **Controle de Carga Horária:** Definição de horas para cada evento.
- **Liberação de Certificados:** Controle manual de quando os certificados ficam disponíveis.
- Abrir/fechar inscrições.
- Gerar links e QR Codes para auto-atendimento.
- Visualizar lista de participantes e status de presença.
- Exportar lista para Excel.

### 2. Métodos de Check-in
O sistema suporta 4 métodos distintos de validação de presença:

1.  **Manual (Recepção):**
    - Painel administrativo onde o staff busca pelo nome/CPF e marca a presença.
2.  **Staff com Scanner:**
    - Uso da câmera do dispositivo do staff para ler QR Code do participante (se implementado crachá) ou validar CPF.
3.  **Auto-Checkin (QR Code do Evento):**
    - QR Code impresso na entrada.
    - Participante escaneia com seu celular.
    - Digita CPF.
    - Se já inscrito: Confirma presença.
    - Se não inscrito: Realiza cadastro rápido e confirma presença (Fallback).
4.  **Modo Quiosque (Tablet):**
    - Interface simplificada para tablet na entrada.
    - Participante digita CPF.
    - Valida presença instantaneamente.
    - Realiza inscrição automática se o participante já tiver cadastro no sistema mas não no evento.

### 3. Área do Participante & Certificados
- **Login via CPF:** Acesso simples e rápido.
- **Histórico:** Visualização de eventos passados e futuros.
- **Emissão de Certificados:**
    - Geração automática de PDF.
    - Código de validação único (anti-fraude).
    - Validação pública de autenticidade via QR Code ou link.

### 4. Pré-Registro
- Página pública onde participantes se cadastram e escolhem eventos.
- Validação inteligente de CPF para evitar duplicidades.

## Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- Conta no Supabase (ou instância local)

### Instalação
1.  Clone o repositório.
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Configure as variáveis de ambiente:
    - Crie um arquivo `.env` na raiz.
    - Adicione:
      ```
      VITE_SUPABASE_URL=sua_url
      VITE_SUPABASE_ANON_KEY=sua_chave
      ```
4.  Execute o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

## Estrutura do Banco de Dados (Supabase)

O esquema SQL está disponível em `supabase_schema.sql`.

- `attendees`: Participantes (Nome, CPF, Telefone).
- `events`: Eventos (Título, Data, Local, Status, Carga Horária).
- `registrations`: Tabela pivô (Participante <-> Evento) com status de check-in e código de certificado.

### Manutenção
O sistema inclui scripts e constraints SQL para garantir a integridade dos dados, como a validação de formato numérico para CPFs.

## Tecnologias
- React + Vite
- TypeScript
- Tailwind CSS
- Supabase (Banco de Dados + Realtime)
- React Hook Form
- React Router
- jsPDF (Geração de Certificados)

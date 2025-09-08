# Chat Inteligente

Un chatbot inteligente construido con Next.js 14, TypeScript, Tailwind CSS y next-intl, con integración a N8N mediante Server-Sent Events (SSE).

## Stack Tecnológico

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **next-intl** - Internacionalización
- **N8N** - Automatización y procesamiento backend
- **Playwright** - Testing e2e

## Características

- ✅ Interfaz de chat en tiempo real con SSE
- ✅ Integración con N8N webhooks
- ✅ Respuestas chunked (600-800 caracteres)
- ✅ Soporte para fuentes y métricas de uso
- ✅ Configuración de parámetros (topK, temperature)
- ✅ Internacionalización en español
- ✅ Tests e2e con Playwright
- ✅ Data-testid para testing

## Instalación

### Prerequisitos

- Node.js 18+
- npm (incluido con Node.js)
- N8N instance (local o remota)

### Configuración

1. **Clonar e instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env.local
   ```

   Editar `.env.local` con tus valores:
   ```bash
   # N8N Configuration
   N8N_BASE_URL=http://localhost:5678
   N8N_WEBHOOK_PATH=/webhook/chat
   
   # Next.js Configuration  
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en http://localhost:3000

## Configuración N8N

### Webhook Requirements

Tu N8N workflow debe:

1. **Endpoint:** `POST {N8N_BASE_URL}{N8N_WEBHOOK_PATH}`

2. **Request Body:**
   ```json
   {
     \"chatInput\": \"string\",\n     \"topK\": \"number (optional, default: 5)\",\n     \"temperature\": \"number (optional, default: 0.7)\"\n   }\n   ```\n\n3. **Response Format:**\n   ```json\n   {\n     \"output\": \"string (required)\",\n     \"sources\": [\n       {\n         \"title\": \"string\",\n         \"url\": \"string\", \n         \"snippet\": \"string\"\n       }\n     ],\n     \"usage\": {\n       \"promptTokens\": \"number\",\n       \"completionTokens\": \"number\", \n       \"totalTokens\": \"number\"\n     }\n   }\n   ```\n\n### Ejemplo de Workflow N8N\n\n1. **HTTP Request Trigger** - Recibe el webhook\n2. **Procesamiento** - Tu lógica de AI/LLM\n3. **Response** - Devuelve el formato requerido\n\n## Scripts Disponibles\n\n```bash\n# Desarrollo\npnpm dev\n\n# Build producción\npnpm build\n\n# Iniciar producción\npnpm start\n\n# Linting\npnpm lint\n\n# Tests e2e\npnpm test:e2e\n\n# Tests e2e con UI\npnpm test:e2e:ui\n```\n\n## Testing\n\n### Playwright Tests\n\nLos tests e2e cubren el flujo completo de chat:\n\n```bash\n# Ejecutar tests\npnpm test:e2e\n\n# Ejecutar con interfaz gráfica\npnpm test:e2e:ui\n```\n\n### Data TestIDs\n\nTodos los elementos importantes tienen `data-testid` para facilitar testing:\n\n- `chat-title` - Título del chat\n- `chat-input` - Input de mensaje\n- `send-button` - Botón enviar\n- `messages-container` - Contenedor de mensajes\n- `message-user` / `message-assistant` - Mensajes específicos\n- `settings-toggle` - Toggle configuración\n- `settings-panel` - Panel de configuración\n- `topk-input` / `temperature-input` - Inputs de configuración\n- `clear-chat` - Botón limpiar chat\n- `error-message` - Mensaje de error\n- `retry-button` - Botón reintentar\n- `loading-indicator` - Indicador de carga\n- `source-link-{idx}` - Links de fuentes\n- `usage-info` - Información de uso de tokens\n\n## Arquitectura\n\n```\nsrc/\n├── app/\n│   ├── api/chat/send/\n│   │   └── route.ts          # SSE endpoint\n│   ├── layout.tsx           # Root layout\n│   ├── page.tsx            # Home page\n│   └── globals.css         # Global styles\n├── components/\n│   └── ChatInterface.tsx   # Main chat component\n├── messages/\n│   └── es.json            # Spanish translations\n├── types/\n│   └── chat.ts            # TypeScript interfaces\n├── i18n.ts                # next-intl config\n└── middleware.ts          # next-intl middleware\n```\n\n## API Endpoints\n\n### POST /api/chat/send\n\n**Request:**\n```json\n{\n  \"chatInput\": \"Tu pregunta aquí\",\n  \"topK\": 5,\n  \"temperature\": 0.7\n}\n```\n\n**Response:** Server-Sent Events stream\n\n```\ndata: {\"type\": \"connected\"}\n\ndata: {\"type\": \"chunk\", \"content\": \"Parte del texto...\", \"isLast\": false}\n\ndata: {\"type\": \"chunk\", \"content\": \"Última parte\", \"isLast\": true, \"sources\": [...], \"usage\": {...}}\n\ndata: {\"type\": \"done\"}\n```\n\n## Troubleshooting\n\n### Problemas Comunes\n\n1. **Error de conexión N8N:**\n   - Verificar que N8N esté ejecutándose\n   - Confirmar URL y path del webhook\n   - Revisar logs de N8N\n\n2. **SSE no funciona:**\n   - Verificar CORS en N8N\n   - Comprobar formato de respuesta\n   - Revisar network tab en browser\n\n3. **Tests fallan:**\n   - Asegurar que la app esté corriendo en puerto 3000\n   - Verificar que N8N mock esté configurado\n\n## Contribuir\n\n1. Fork el proyecto\n2. Crear feature branch (`git checkout -b feature/AmazingFeature`)\n3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)\n4. Push branch (`git push origin feature/AmazingFeature`)\n5. Abrir Pull Request\n\n## Licencia\n\nMIT License - ver archivo LICENSE para detalles.
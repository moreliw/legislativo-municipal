# Novas Funcionalidades Implementadas

## 1. Tema Claro/Escuro

### Como usar
- **Trocar tema:** Clique no ícone ☀️/🌙 no canto superior direito do dashboard
- **Persistência:** A preferência é salva automaticamente no `localStorage`
- **Detecção automática:** No primeiro acesso, detecta a preferência do sistema

### Arquivos
- `apps/web/lib/theme-context.tsx` - Contexto React do tema
- `apps/web/components/theme-toggle.tsx` - Botão de toggle
- `apps/web/app/globals.css` - CSS variables para ambos modos
- `apps/web/app/layout.tsx` - ThemeProvider wrapping

### CSS Variables
Modo escuro (padrão):
```css
--bg-base: #0a0d14
--text: #e8edf7
--brand: #3b82f6
```

Modo claro:
```css
--bg-base: #ffffff
--text: #111827
--brand: #3b82f6
```

---

## 2. Integração Camunda BPM

### Configuração
1. Certifique-se que o Camunda está rodando em `http://localhost:8080`
2. Configurar `CAMUNDA_URL` no `.env` (opcional, default = localhost:8080)

### API Endpoints
```
GET    /api/v1/camunda/definitions          - Listar processos
POST   /api/v1/camunda/deploy               - Deploy BPMN
POST   /api/v1/camunda/start/:processKey    - Iniciar processo
GET    /api/v1/camunda/instances            - Listar instâncias
GET    /api/v1/camunda/tasks                - Listar tarefas
POST   /api/v1/camunda/tasks/:id/complete   - Completar tarefa
```

### Exemplo: Deploy de Processo
```bash
curl -X POST http://localhost:3001/api/v1/camunda/deploy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Aprovar Proposição",
    "bpmnXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>..."
  }'
```

### Exemplo: Iniciar Processo
```bash
curl -X POST http://localhost:3001/api/v1/camunda/start/aprovar_proposicao \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "variables": {
      "proposicaoId": "prop-123",
      "autor": "Vereador João"
    }
  }'
```

### Frontend
- Acesse `/processos` no dashboard
- Lista processos disponíveis
- Iniciar instâncias
- Completar tarefas pendentes

### Arquivos
- `apps/api/src/services/camunda.service.ts` - Cliente Camunda
- `apps/api/src/modules/camunda/routes.ts` - REST API
- `apps/web/app/processos/page.tsx` - Interface de usuário

---

## 3. Multi-Tenancy por Schema PostgreSQL

### Conceito
Cada câmara municipal tem seu **próprio schema** no PostgreSQL, garantindo **isolamento total** de dados.

### Estrutura
```
legislativo (database)
├─ public (schema) ← Usuários, Autenticação, CasasLegislativas
├─ casa_uuid1 (schema) ← Proposições, Documentos, Sessões da Câmara 1
├─ casa_uuid2 (schema) ← Proposições, Documentos, Sessões da Câmara 2
└─ ...
```

### API

#### Criar Schema para Nova Câmara
```typescript
import { multitenancyService } from './services/multitenancy.service'

// Ao criar nova câmara
const casaId = 'uuid-da-camara'
await multitenancyService.criarSchemaCamara(casaId)
// Cria schema casa_uuid_da_camara e aplica migrations
```

#### Obter Conexão Isolada
```typescript
// Ao fazer queries específicas de uma câmara
const tenantDb = multitenancyService.getTenantConnection(casaId)

const proposicoes = await tenantDb.proposicao.findMany({
  where: { casaId } // Ainda filtra por casaId por segurança
})
```

#### Deletar Schema (Cuidado!)
```typescript
// Ao deletar câmara completamente
await multitenancyService.deletarSchemaCamara(casaId)
// DROP CASCADE do schema inteiro
```

### Vantagens
- ✅ **Isolamento total** - dados fisicamente separados
- ✅ **Performance** - índices não compartilhados
- ✅ **Backup seletivo** - dump por câmara
- ✅ **Migração** - atualizar schemas individualmente
- ✅ **Compliance** - LGPD/GDPR por câmara

### Arquivos
- `apps/api/src/services/multitenancy.service.ts` - Gerenciamento de schemas

---

## Como Testar

### 1. Tema
```bash
# Rodar no servidor
bash <(curl -fsSL https://raw.githubusercontent.com/moreliw/legislativo-municipal/main/scripts/diagnose-and-fix.sh)

# No navegador
1. Login em https://pleno.morelidev.com
2. Clicar no ícone ☀️/🌙 no header
3. Verificar mudança de tema
```

### 2. Camunda
```bash
# Iniciar Camunda (se não estiver rodando)
docker start camunda 2>/dev/null || \
  docker run -d --name camunda -p 8080:8080 camunda/camunda-bpm-platform:latest

# Testar endpoints
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@camararionovosul.es.gov.br","senha":"RioNovo@2024!"}' \
  | jq -r '.accessToken')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/camunda/definitions | jq
```

### 3. Multi-Tenancy
```typescript
// No console do Prisma Studio ou node REPL
const { multitenancyService } = require('./dist/services/multitenancy.service')

// Criar schema teste
await multitenancyService.criarSchemaCamara('test-123')

// Verificar no psql
// \dn - listar schemas
// \dt casa_test_123.* - listar tabelas
```

---

## Próximos Passos

### Camunda
- [ ] Editor BPMN visual (integrar bpmn-js)
- [ ] Formulários dinâmicos para tarefas
- [ ] Histórico de instâncias completadas
- [ ] Métricas e dashboards de processos

### Multi-Tenancy
- [ ] Migrar criação de câmara para usar schemas
- [ ] Backup/restore por câmara
- [ ] Métricas de uso por schema
- [ ] Limite de storage por câmara

### Tema
- [ ] Mais temas (azul, verde, roxo)
- [ ] Preview de tema antes de aplicar
- [ ] Sincronizar tema entre dispositivos (via backend)

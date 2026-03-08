---
description: Como realizar o deploy manual da aplicação via GitHub
---

Para atualizar o site online com as mudanças que você fez no código local, siga estes passos no terminal (PowerShell ou CMD) dentro da pasta do projeto:

### 1. Gerar os arquivos de produção
Este passo transforma o código que estamos editando em arquivos "prontos para a internet" na pasta `dist`.
// turbo
```powershell
npm run build
```

### 2. Preparar os arquivos para o Git
Este comando avisa ao Git que queremos incluir todas as mudanças (incluindo o novo build) no próximo envio.
// turbo
```powershell
git add .
```

### 3. Criar uma nota da atualização (Commit)
Aqui você dá um "nome" para o que mudou. Use sempre aspas simples ou duplas para a mensagem.
// turbo
```powershell
git commit -m "MInha atualização: Descrição do que mudei"
```

### 4. Enviar para o GitHub (Push)
Este é o passo final que "empurra" o seu código para o servidor. Assim que o GitHub recebe, o seu site online (como a Vercel, Railway ou Cloud Run) detecta a mudança e inicia a atualização automática.
// turbo
```powershell
git push origin main
```

---
> [!IMPORTANT]
> Se o seu deploy online não for automático a partir do GitHub, você deve pegar o conteúdo da pasta `dist` gerada no passo 1 e subir manualmente para o seu serviço de hospedagem (via FTP ou painel de controle).

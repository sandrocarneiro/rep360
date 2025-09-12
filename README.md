# 🎸 Cifras de Violão

Uma aplicação web responsiva para visualizar cifras de violão com funcionalidades avançadas para músicos.

## ✨ Características

- **Design Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Wake Lock API**: Mantém a tela ativa durante a prática (evita desligamento automático)
- **PWA (Progressive Web App)**: Pode ser instalada como app no celular
- **Funcionalidade Offline**: Funciona mesmo sem internet
- **Interface Intuitiva**: Navegação simples e busca de músicas
- **Tela Cheia**: Modo imersivo para prática

## 🚀 Como Usar

### 1. Acessar a Aplicação
- Abra o arquivo `index.html` em qualquer navegador moderno
- Ou faça deploy em um servidor web

### 2. Navegar pelas Músicas
- Use a barra lateral para ver todas as músicas disponíveis
- Use a barra de busca para encontrar músicas específicas
- Clique em uma música para visualizar sua cifra

### 3. Visualizar Cifras
- As cifras são exibidas em formato texto limpo e legível
- Use o botão de tela cheia para uma experiência imersiva
- O Wake Lock é ativado automaticamente ao abrir uma cifra

### 4. Controles
- **🔋**: Ativar/desativar tela sempre ativa
- **📱**: Entrar/sair da tela cheia
- **← Voltar**: Retornar à lista de músicas

## 📱 Funcionalidades Mobile

### Wake Lock (Tela Sempre Ativa)
- **Android (Chrome)**: ✅ Suportado
- **iOS (Safari)**: ✅ Suportado (iOS 16.4+)
- **Outros navegadores**: Verificar compatibilidade

### Instalação como App
- **Android**: "Adicionar à tela inicial" no menu do Chrome
- **iOS**: "Adicionar à tela inicial" no Safari

## 🎵 Adicionando Novas Cifras

### 1. Criar Arquivo de Texto
Crie um arquivo `.txt` na pasta `cifras/` com o nome da música:

```
NOME_DA_MUSICA.txt
```

### 2. Formato da Cifra
Use este formato para suas cifras:

```
TÍTULO DA MÚSICA
Artista

Tonalidade: Do (C)

[Intro]
C  G  Am  F

[Verso]
C           G
Primeira linha da letra
Am          F
Segunda linha da letra

[Refrão]
C           G
Primeira linha do refrão
Am          F
Segunda linha do refrão
```

### 3. Adicionar à Lista
Edite o arquivo `script.js` e adicione a nova música ao array `songs`:

```javascript
{
    id: 'nome-da-musica',
    title: 'Nome da Música',
    artist: 'Nome do Artista',
    filename: 'nome-da-musica.txt'
}
```

## 🌐 Deploy

### Opções Gratuitas Recomendadas:

#### 1. **Netlify** (Recomendado)
- Faça upload dos arquivos para o Netlify
- Deploy automático e suporte completo a PWA
- URL personalizada gratuita

#### 2. **Vercel**
- Deploy automático via GitHub
- Excelente para aplicações modernas
- Performance otimizada

#### 3. **GitHub Pages**
- Deploy direto do repositório
- Gratuito e confiável
- Ideal para projetos estáticos

### Passos para Deploy:
1. Faça upload de todos os arquivos para o servidor
2. Certifique-se de que a estrutura de pastas está correta
3. Acesse via HTTPS (necessário para Wake Lock API)

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Design responsivo com Grid e Flexbox
- **JavaScript ES6+**: Lógica da aplicação
- **Wake Lock API**: Manter tela ativa
- **Fullscreen API**: Modo tela cheia
- **Service Worker**: Funcionalidade offline
- **PWA**: Manifest e instalação

## 📋 Requisitos do Sistema

### Navegadores Suportados:
- **Chrome**: 84+ (Wake Lock completo)
- **Firefox**: 79+ (Wake Lock parcial)
- **Safari**: 16.4+ (Wake Lock completo)
- **Edge**: 84+ (Wake Lock completo)

### Dispositivos:
- **Desktop**: Windows, macOS, Linux
- **Mobile**: Android 5+, iOS 12+
- **Tablet**: Todos os tamanhos

## 🔧 Personalização

### Cores e Tema
Edite o arquivo `styles.css` para personalizar:
- Cores principais
- Tipografia
- Espaçamentos
- Animações

### Funcionalidades
Modifique `script.js` para:
- Adicionar novas funcionalidades
- Alterar comportamento padrão
- Integrar com APIs externas

## 🐛 Solução de Problemas

### Wake Lock Não Funciona
- Verifique se está usando HTTPS
- Confirme compatibilidade do navegador
- Teste em diferentes dispositivos

### Cifras Não Carregam
- Verifique se os arquivos estão na pasta `cifras/`
- Confirme nomes dos arquivos
- Teste o caminho das URLs

### Problemas de Responsividade
- Teste em diferentes tamanhos de tela
- Verifique media queries no CSS
- Use ferramentas de desenvolvedor do navegador

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique este README
2. Teste em diferentes navegadores
3. Confirme estrutura de arquivos
4. Verifique console do navegador para erros

## 📄 Licença

Este projeto é de código aberto e pode ser usado livremente para fins educacionais e pessoais.

---

**Desenvolvido com ❤️ para músicos que amam praticar violão!**

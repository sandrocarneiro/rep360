// Aplicação de Cifras de Violão
class CifrasApp {
    constructor() {
        // Disponibiliza a instância globalmente para event listeners externos
        window.app = this;
        this.currentSong = null;
        this.currentRepertorio = null;
        this.wakeLock = null;
        this.isFullscreen = false;
        this.autoScroll = {
            isActive: false,
            startTimestamp: null,
            lastFrameTime: null,
            totalSeconds: 0,
            totalLines: 0,
            pixelsPerLine: 0,
            scrolledPixels: 0,
            animationFrameId: null,
            detectedLines: 0 // Adicionado para armazenar linhas detectadas
        };
        this.repertorios = [];
        this.songs = [];
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSongs();
        this.renderRepertorios();
        await this.checkWakeLockSupport();
        this.setupServiceWorker();
        this.startWakeLockMonitoring();
    }

    async loadSongs() {
        try {
            // Adicionar timestamp para evitar cache do navegador
            const timestamp = Date.now();

            const response = await fetch(`cifras/songs.json?t=${timestamp}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.repertorios = data.repertorios || [];
            
            // Criar lista plana de todas as músicas para busca
            this.songs = [];
            this.repertorios.forEach(repertorio => {
                repertorio.musicas.forEach(musica => {
                    this.songs.push({
                        ...musica,
                        repertorioId: repertorio.id,
                        repertorioNome: repertorio.nome
                    });
                });
            });
            
            console.log('Repertórios carregados:', this.repertorios);
            console.log('Todas as músicas:', this.songs);
            
            // Verificar se há mudanças e forçar atualização da interface
            this.renderRepertorios();
            
        } catch (error) {
            console.error('Erro ao carregar repertórios:', error);
            // Fallback para repertório padrão em caso de erro
            //alert('Erro ao carregar repertórios')
            this.repertorios = [
                {
                    id: 'default',
                    nome: 'Repertório Padrão',
                    descricao: 'Músicas disponíveis',
                    musicas: [
                        {
                            id: 'garota-de-ipanema',
                            title: 'Garota de Ipanema',
                            artist: 'Tom Jobim',
                            totalScrollSeconds: 240
                        }
                    ]
                }
            ];
            this.songs = this.repertorios[0].musicas;
        }
    }

    bindEvents() {





        // Botão de atualizar cifra
        const refreshCifra = document.getElementById('refreshCifra');
        refreshCifra?.addEventListener('click', () => this.refreshCifra());

        // Botões de controle
        const backButton = document.getElementById('backButton');
        const toggleWakeLock = document.getElementById('toggleWakeLock');
        const toggleFullscreen = document.getElementById('toggleFullscreen');
        const toggleAutoScroll = document.getElementById('toggleAutoScroll');
        const toggleConfig = document.getElementById('toggleConfig');
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        const resetConfigBtn = document.getElementById('resetConfigBtn');

        backButton?.addEventListener('click', () => this.showWelcomeScreen());
        toggleWakeLock?.addEventListener('click', (e) => { e.preventDefault(); console.log('[click] toggleWakeLock'); this.toggleWakeLock(); });
        toggleFullscreen?.addEventListener('click', (e) => { e.preventDefault(); console.log('[click] toggleFullscreen'); this.toggleFullscreen(); });
        toggleAutoScroll?.addEventListener('click', (e) => { e.preventDefault(); console.log('[click] toggleAutoScroll direct'); this.toggleAutoScroll(); });
        toggleConfig?.addEventListener('click', () => this.toggleConfigPanel());
        saveConfigBtn?.addEventListener('click', () => this.saveScrollConfig());
        resetConfigBtn?.addEventListener('click', () => this.resetScrollConfig());

        // Delegação defensiva (garante clique mesmo se o botão for re-renderizado)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#toggleAutoScroll');
            if (btn) {
                e.preventDefault();
                console.log('[click] toggleAutoScroll delegated');
                this.toggleAutoScroll();
            }
        });


        // Teclas de atalho
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isFullscreen) {
                    this.exitFullscreen();
                }
            } else if (e.key === ' ' && this.currentSong) {
                // Barra de espaço inicia/pausa auto-scroll
                e.preventDefault();
                console.log('[keydown] space toggleAutoScroll');
                this.toggleAutoScroll();
            }
        });
    }


    renderRepertorios() {
        const repertoriosGrid = document.getElementById('repertoriosGrid');
        if (!repertoriosGrid) return;

        repertoriosGrid.innerHTML = this.repertorios.map(repertorio => `
            <div class="repertorio-card" data-repertorio-id="${repertorio.id}">
                <div class="repertorio-card-icon">🎵</div>
                <h3 class="repertorio-card-title">${repertorio.nome}</h3>
                <p class="repertorio-card-description">${repertorio.descricao}</p>
                <span class="repertorio-card-count">${repertorio.musicas.length} músicas</span>
                </div>
        `).join('');

        // Adicionar event listeners
        repertoriosGrid.querySelectorAll('.repertorio-card').forEach(card => {
            card.addEventListener('click', () => {
                const repertorioId = card.dataset.repertorioId;
                this.selectRepertorio(repertorioId);
            });
        });
    }

    selectRepertorio(repertorioId) {
        const repertorio = this.repertorios.find(r => r.id === repertorioId);
        if (!repertorio) return;

        this.currentRepertorio = repertorio;
        this.showSongsInMainContent(repertorio);
    }

    showSongsInMainContent(repertorio) {
        const repertoriosMainScreen = document.getElementById('repertoriosMainScreen');
        const cifraContainer = document.getElementById('cifraContainer');
        const mainContent = document.getElementById('mainContent');
        
        // Hide repertórios main screen and cifra container
        if (repertoriosMainScreen) repertoriosMainScreen.style.display = 'none';
        if (cifraContainer) cifraContainer.style.display = 'none';
        
        // Create or update songs display in main content
        this.createSongsDisplay(repertorio);
    }

    createSongsDisplay(repertorio) {
        const mainContent = document.getElementById('mainContent');
        
        // Remove existing songs display if it exists
        const existingSongsDisplay = document.getElementById('songsDisplay');
        if (existingSongsDisplay) {
            existingSongsDisplay.remove();
        }
        
        // Create new songs display
        const songsDisplay = document.createElement('div');
        songsDisplay.id = 'songsDisplay';
        songsDisplay.className = 'songs-display';
        
        songsDisplay.innerHTML = `
            <div class="songs-header">
                <button class="back-to-repertorios-btn" id="backToRepertorios" type="button">← Voltar aos Repertórios</button>
                <h2>${repertorio.nome}</h2>
                <p class="repertorio-description">${repertorio.descricao}</p>
            </div>
            <div class="songs-search-container">
                <input type="text" id="songsSearchInput" placeholder="Buscar músicas..." class="search-input">
            </div>
            <div class="songs-grid" id="songsGrid">
                <!-- Songs will be rendered here -->
            </div>
        `;
        
        mainContent.appendChild(songsDisplay);
        
        // Add event listeners
        this.setupSongsDisplayEvents(repertorio);
        
        // Render the songs
        this.renderSongsGrid(repertorio.musicas);
    }

    setupSongsDisplayEvents(repertorio) {
        // Back to repertórios button
        const backBtn = document.getElementById('backToRepertorios');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showWelcomeScreen();
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('songsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filteredSongs = repertorio.musicas.filter(song => 
                    song.title.toLowerCase().includes(searchTerm) ||
                    song.artist.toLowerCase().includes(searchTerm)
                );
                this.renderSongsGrid(filteredSongs);
            });
        }
    }

    renderSongsGrid(musicas) {
        const songsGrid = document.getElementById('songsGrid');
        if (!songsGrid) return;
        
        songsGrid.innerHTML = '';
        
        musicas.forEach(song => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            songCard.innerHTML = `
                <div class="song-card-content">
                    <div class="song-icon">🎵</div>
                    <div class="song-info">
                        <h3 class="song-title">${song.title}</h3>
                        <p class="song-artist">${song.artist}</p>
                        <span class="song-tonalidade">${song.tonalidade}</span>
                    </div>
                </div>
            `;
            
            songCard.addEventListener('click', () => {
                this.loadSong(song.id);
            });
            
            songsGrid.appendChild(songCard);
        });
    }

    showWelcomeScreen() {
        const repertoriosMainScreen = document.getElementById('repertoriosMainScreen');
        const cifraContainer = document.getElementById('cifraContainer');
        const songsDisplay = document.getElementById('songsDisplay');
        
        if (repertoriosMainScreen) repertoriosMainScreen.style.display = 'block';
        if (cifraContainer) cifraContainer.style.display = 'none';
        if (songsDisplay) songsDisplay.remove();
    }



    async refreshCifra() {
        if (!this.currentSong) return;

        const refreshCifra = document.getElementById('refreshCifra');
        if (refreshCifra) {
            refreshCifra.style.pointerEvents = 'none';
            refreshCifra.style.opacity = '0.6';
            refreshCifra.textContent = '⏳';
        }

        try {
            // Recarregar a cifra atual
            await this.loadSong(this.currentSong.id);
            this.showWakeLockNotification('Cifra atualizada!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar cifra:', error);
            this.showWakeLockNotification('Erro ao atualizar cifra', 'error');
        } finally {
            if (refreshCifra) {
                refreshCifra.style.pointerEvents = 'auto';
                refreshCifra.style.opacity = '1';
                refreshCifra.textContent = '🔄';
            }
        }
    }




    toggleConfigPanel() {
        const panel = document.getElementById('configPanel');
        if (!panel) return;
        const isHidden = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = isHidden ? 'block' : 'none';
        if (panel.style.display === 'block') {
            this.populateConfigInputs();
        }
    }

    populateConfigInputs() {
        if (!this.currentSong) return;
        const secondsInput = document.getElementById('inputSeconds');
        const cfg = this.getStoredScrollConfig(this.currentSong.id);
        const seconds = cfg?.totalScrollSeconds ?? this.currentSong.totalScrollSeconds ?? 240;
        if (secondsInput) secondsInput.value = Number(seconds);

        // Atualizar dica com linhas detectadas
        const hint = document.getElementById('configHint');
        const detected = Number(this.autoScroll?.detectedLines || 0) || undefined;
        if (hint && Number.isFinite(detected)) {
            hint.textContent = `As linhas são detectadas automaticamente do arquivo. Linhas detectadas: ${detected}.`;
        }
    }

    saveScrollConfig() {
        if (!this.currentSong) return;
        const secondsInput = document.getElementById('inputSeconds');
        const totalScrollSeconds = Math.max(10, Number(secondsInput?.value || 0));
        const key = `scrollConfig:${this.currentSong.id}`;
        const value = { totalScrollSeconds };
        try {
            localStorage.setItem(key, JSON.stringify(value));
            this.showWakeLockNotification('Tempo salvo', 'success');
        } catch (e) {
            console.warn('Falha ao salvar configuração', e);
        }
        // Aplicar imediatamente
        this.applyScrollConfig();
        this.initAutoScrollMetrics();
    }

    resetScrollConfig() {
        if (!this.currentSong) return;
        const key = `scrollConfig:${this.currentSong.id}`;
        try { localStorage.removeItem(key); } catch (e) {}
        this.populateConfigInputs();
        this.applyScrollConfig();
        this.initAutoScrollMetrics();
        this.showWakeLockNotification('Tempo redefinido', 'info');
    }

    getStoredScrollConfig(songId) {
        try {
            const raw = localStorage.getItem(`scrollConfig:${songId}`);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    applyScrollConfig() {
        if (!this.currentSong) return;
        const cfg = this.getStoredScrollConfig(this.currentSong.id);
        if (cfg && Number(cfg.totalScrollSeconds)) {
            this.currentSong.totalScrollSeconds = Number(cfg.totalScrollSeconds);
        }
    }

    async loadSong(songId) {
        const song = this.songs.find(s => s.id === songId);
        if (!song) return;


        this.currentSong = song;
        // aplicar configuração persistida antes de iniciar métricas
        this.applyScrollConfig();
        this.resetAutoScrollState();
        this.showCifraContainer();
        this.updateActiveSong(songId);

        try {
            // Adicionar timestamp para evitar cache do navegador
            const timestamp = Date.now();
            const response = await fetch(`cifras/${song.id}.txt?t=${timestamp}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                throw new Error('Erro ao carregar cifra');
            }

            const cifraText = await response.text();
            this.displayCifra(song.title, cifraText);
            
            if (this.wakeLockSupported) {
                await this.requestWakeLock();
            }

        } catch (error) {
            console.error('Erro ao carregar cifra:', error);
            this.displayError('Erro ao carregar a cifra. Verifique se o arquivo existe.');
        }
    }

    displayCifra(title, cifraText) {
        const songTitle = document.getElementById('songTitle');
        const songArtist = document.getElementById('songArtist');
        const songTonalidade = document.getElementById('songTonalidade');
        const cifraContent = document.getElementById('cifraContent');

        if (songTitle) songTitle.textContent = title;
        if (songArtist && this.currentSong) songArtist.textContent = this.currentSong.artist || 'Artista não informado';
        if (songTonalidade && this.currentSong) songTonalidade.textContent = this.currentSong.tonalidade || 'Tonalidade não informada';
        if (cifraContent) {
            cifraContent.textContent = cifraText;
            
            // Detectar automaticamente número de linhas da cifra
            const detected = this.countScrollLines(cifraText);
            this.autoScroll.detectedLines = detected;
            
            // Sempre usar linhas detectadas
            if (this.currentSong) {
                this.currentSong.totalScrollLines = detected;
            }
            
            // Inicializar metrificação para auto-scroll
            this.initAutoScrollMetrics();
            
            // Atualizar inputs do painel de configuração se ele estiver aberto
            this.populateConfigInputs();
        }
    }

    countScrollLines(text) {
        if (!text) return 0;
        // Considerar todas as linhas, incluindo vazias, pois impactam na altura visual
        // Normalizar quebras e contar
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        return lines.length;
    }

    displayError(message) {
        const cifraContent = document.getElementById('cifraContent');
        if (cifraContent) {
            cifraContent.innerHTML = `
                <div style="text-align: center; color: #e74c3c; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <div style="font-size: 1.2rem;">${message}</div>
                </div>
            `;
        }
    }

    showCifraContainer() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const cifraContainer = document.getElementById('cifraContainer');
        const songsDisplay = document.getElementById('songsDisplay');

        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (cifraContainer) cifraContainer.style.display = 'block';
        if (songsDisplay) songsDisplay.style.display = 'none';

    }

    showWelcomeScreen() {
        const repertoriosMainScreen = document.getElementById('repertoriosMainScreen');
        const cifraContainer = document.getElementById('cifraContainer');
        const songsDisplay = document.getElementById('songsDisplay');

        if (repertoriosMainScreen) repertoriosMainScreen.style.display = 'block';
        if (cifraContainer) cifraContainer.style.display = 'none';
        if (songsDisplay) songsDisplay.remove();

        // Desativar Wake Lock ao voltar e parar auto-scroll
        if (this.wakeLock) {
            this.releaseWakeLock();
        }
        this.stopAutoScroll();

        this.currentSong = null;
        this.updateActiveSong(null);
    }

    updateActiveSong(songId) {
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.songId === songId) {
                item.classList.add('active');
            }
        });
    }


    // =========================
    // Auto Scroll
    // =========================
    initAutoScrollMetrics() {
        const cifraContent = document.getElementById('cifraContent');
        if (!cifraContent) return;

        // Calcular pixels por linha baseado no line-height computado
        const computed = window.getComputedStyle(cifraContent);
        const lineHeight = parseFloat(computed.lineHeight);
        this.autoScroll.pixelsPerLine = isNaN(lineHeight) ? 24 : lineHeight; // fallback

        // Aplicar configuração da música
        if (this.currentSong) {
            this.autoScroll.totalSeconds = Number(this.currentSong.totalScrollSeconds || 0);
            this.autoScroll.totalLines = Number(this.currentSong.totalScrollLines || this.autoScroll.detectedLines || 0);
        }

        // Reset de deslocamento
        this.autoScroll.scrolledPixels = 0;
        cifraContent.scrollTop = 0;

        // Atualizar botão
        this.updateAutoScrollButton(false);
    }

    resetAutoScrollState() {
        this.stopAutoScroll();
        this.autoScroll = {
            ...this.autoScroll,
            isActive: false,
            startTimestamp: null,
            lastFrameTime: null,
            scrolledPixels: 0,
            animationFrameId: null
        };
    }

    toggleAutoScroll() {
        console.log('[action] toggleAutoScroll called. currentSong?', !!this.currentSong);
        if (!this.currentSong) return;
        if (!this.autoScroll.isActive) {
            this.startAutoScroll();
        } else {
            this.stopAutoScroll();
        }
    }

    startAutoScroll() {
        const cifraContent = document.getElementById('cifraContent');
        if (!cifraContent) return;

        const { totalSeconds, totalLines, pixelsPerLine } = this.autoScroll;
        console.log('[autoScroll] start', { totalSeconds, totalLines, pixelsPerLine });
        if (!totalSeconds || !totalLines || !pixelsPerLine) {
            this.showWakeLockNotification('Configuração de rolagem inválida', 'error');
            return;
        }

        // Garantir Wake Lock ativo durante auto-scroll
        if (this.wakeLockSupported && !this.wakeLock) {
            this.requestWakeLock();
        }

        this.autoScroll.isActive = true;
        this.autoScroll.startTimestamp = null;
        this.autoScroll.lastFrameTime = null;

        const totalPixelsToScroll = totalLines * pixelsPerLine;
        const speedPxPerSec = totalPixelsToScroll / totalSeconds;

        const step = (timestamp) => {
            if (!this.autoScroll.isActive) return;

            if (!this.autoScroll.startTimestamp) {
                this.autoScroll.startTimestamp = timestamp;
                this.autoScroll.lastFrameTime = timestamp;
            }

            const deltaMs = timestamp - this.autoScroll.lastFrameTime;
            this.autoScroll.lastFrameTime = timestamp;

            const deltaPx = (speedPxPerSec * deltaMs) / 1000;
            this.autoScroll.scrolledPixels += deltaPx;

            const newScrollTop = Math.min(
                this.autoScroll.scrolledPixels,
                Math.max(0, cifraContent.scrollHeight - cifraContent.clientHeight)
            );

            cifraContent.scrollTop = newScrollTop;

            // Parar quando chegar ao final ou atingir o total previsto
            const reachedEnd = newScrollTop >= (cifraContent.scrollHeight - cifraContent.clientHeight - 1);
            const reachedPlanned = this.autoScroll.scrolledPixels >= totalPixelsToScroll - 1;
            if (reachedEnd || reachedPlanned) {
                console.log('[autoScroll] stop - reached end or planned');
                this.stopAutoScroll();
                return;
            }

            this.autoScroll.animationFrameId = requestAnimationFrame(step);
        };

        this.updateAutoScrollButton(true);
        this.autoScroll.animationFrameId = requestAnimationFrame(step);
    }

    stopAutoScroll() {
        if (this.autoScroll.animationFrameId) {
            cancelAnimationFrame(this.autoScroll.animationFrameId);
            this.autoScroll.animationFrameId = null;
        }
        this.autoScroll.isActive = false;
        this.updateAutoScrollButton(false);
    }

    updateAutoScrollButton(isActive) {
        const btn = document.getElementById('toggleAutoScroll');
        if (!btn) return;
        if (isActive) {
            btn.classList.add('active');
            btn.title = 'Parar rolagem automática';
            btn.textContent = '⏸';
        } else {
            btn.classList.remove('active');
            btn.title = 'Iniciar rolagem automática';
            btn.textContent = '▶️';
        }
    }

    // =========================
    // Wake Lock API
    // =========================
    async checkWakeLockSupport() {
        this.wakeLockSupported = 'wakeLock' in navigator;
        
        if (!this.wakeLockSupported) {
            console.log('Wake Lock API não suportada neste navegador');
            const toggleBtn = document.getElementById('toggleWakeLock');
            if (toggleBtn) {
                toggleBtn.style.display = 'none';
            }
            return;
        }

        // Verificar se está em HTTPS
        if (location.protocol !== 'https:') {
            console.log('Wake Lock requer HTTPS');
            const toggleBtn = document.getElementById('toggleWakeLock');
            if (toggleBtn) {
                toggleBtn.style.display = 'none';
            }
            this.wakeLockSupported = false;
            return;
        }

        // Testar se o Wake Lock realmente funciona
        try {
            const testWakeLock = await navigator.wakeLock.request('screen');
            await testWakeLock.release();
            console.log('Wake Lock testado com sucesso');
        } catch (error) {
            console.log('Wake Lock testado mas falhou:', error);
            this.wakeLockSupported = false;
            const toggleBtn = document.getElementById('toggleWakeLock');
            if (toggleBtn) {
                toggleBtn.style.display = 'none';
            }
        }
    }

    async requestWakeLock() {
        if (!this.wakeLockSupported) {
            console.log('Wake Lock não suportado');
            return;
        }

        try {
            // Verificar se já existe um Wake Lock ativo
            if (this.wakeLock) {
                console.log('Wake Lock já está ativo');
                return;
            }

            // Solicitar Wake Lock
            this.wakeLock = await navigator.wakeLock.request('screen');
            
            // Adicionar listener para quando o Wake Lock for liberado pelo sistema
            this.wakeLock.addEventListener('release', () => {
                console.log('Wake Lock liberado pelo sistema');
                this.wakeLock = null;
                this.updateWakeLockButton(false);
            });

            this.updateWakeLockButton(true);
            console.log('Wake Lock ativado com sucesso');
            
            // Mostrar notificação de sucesso
            this.showWakeLockNotification('Tela sempre ativa ativada!', 'success');
            
        } catch (error) {
            console.error('Erro ao ativar Wake Lock:', error);
            this.showWakeLockNotification('Erro ao ativar tela sempre ativa', 'error');
            
            // Tentar novamente em alguns segundos
            setTimeout(() => {
                if (this.wakeLockSupported && !this.wakeLock) {
                    console.log('Tentando ativar Wake Lock novamente...');
                    this.requestWakeLock();
                }
            }, 2000);
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                this.updateWakeLockButton(false);
                console.log('Wake Lock desativado');
            } catch (error) {
                console.error('Erro ao desativar Wake Lock:', error);
            }
        }
    }

    async toggleWakeLock() {
        if (this.wakeLock) {
            await this.releaseWakeLock();
        } else {
            await this.requestWakeLock();
        }
    }

    updateWakeLockButton(isActive) {
        const toggleBtn = document.getElementById('toggleWakeLock');
        const icon = document.getElementById('wakeLockIcon');
        
        if (toggleBtn && icon) {
            if (isActive) {
                toggleBtn.classList.add('active');
                icon.textContent = '🔋';
                toggleBtn.title = 'Desativar tela sempre ativa';
            } else {
                toggleBtn.classList.remove('active');
                icon.textContent = '🔋';
                toggleBtn.title = 'Ativar tela sempre ativa';
            }
        }
    }

    // Fullscreen API
    async toggleFullscreen() {
        if (!this.isFullscreen) {
            await this.enterFullscreen();
        } else {
            await this.exitFullscreen();
        }
    }

    async enterFullscreen() {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                await document.documentElement.msRequestFullscreen();
            }
            
            this.isFullscreen = true;
            this.updateFullscreenButton();
        } catch (error) {
            console.error('Erro ao entrar em tela cheia:', error);
        }
    }

    async exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
            
            this.isFullscreen = false;
            this.updateFullscreenButton();
        } catch (error) {
            console.error('Erro ao sair da tela cheia:', error);
        }
    }

    updateFullscreenButton() {
        const toggleBtn = document.getElementById('toggleFullscreen');
        if (toggleBtn) {
            toggleBtn.textContent = this.isFullscreen ? '📱' : '📱';
            toggleBtn.title = this.isFullscreen ? 'Sair da tela cheia' : 'Tela cheia';
        }
    }

    // Service Worker para PWA
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registrado:', registration);

                // Ouvir mensagens do SW
                navigator.serviceWorker.addEventListener('message', (event) => {
                    const data = event.data || {};
                    if (data.type === 'SW_ACTIVATED') {
                        console.log('Nova versão do SW ativada:', data.version);
                        // Se não estiver no meio de prática (auto-scroll), recarregar automaticamente
                        if (!this.autoScroll?.isActive) {
                            location.reload();
                        } else {
                            // Se estiver praticando, mostrar aviso para atualizar depois
                            this.showWakeLockNotification('Atualização disponível. Atualize quando pausar.', 'info');
                        }
                    }
                });

                // Se uma atualização estiver em waiting, solicitar ativação imediata
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                // Detectar novas atualizações e ativar
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    }
                });
            } catch (error) {
                console.log('Falha ao registrar Service Worker:', error);
            }
        }
    }

    // Detectar mudanças de orientação
    handleOrientationChange() {
        if (window.orientation === 0 || window.orientation === 180) {
            // Portrait
            document.body.classList.add('portrait');
            document.body.classList.remove('landscape');
        } else {
            // Landscape
            document.body.classList.add('landscape');
            document.body.classList.remove('portrait');
        }
    }

    // Mostrar notificações do Wake Lock
    showWakeLockNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `wake-lock-notification ${type}`;
        notification.textContent = message;
        
        // Adicionar ao body
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Verificar status do Wake Lock periodicamente
    startWakeLockMonitoring() {
        if (!this.wakeLockSupported) return;
        
        setInterval(() => {
            if (this.wakeLock && this.wakeLock.released) {
                console.log('Wake Lock foi liberado, tentando reativar...');
                this.wakeLock = null;
                this.updateWakeLockButton(false);
                
                // Reativar automaticamente se estiver em uma cifra
                if (this.currentSong) {
                    setTimeout(() => {
                        this.requestWakeLock();
                    }, 1000);
                }
            }
        }, 5000); // Verificar a cada 5 segundos
    }


}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // garante referência global
    window.app = new CifrasApp();
});

// Detectar mudanças de orientação
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (window.app) {
            window.app.handleOrientationChange();
        }
    }, 100);
});

// Detectar mudanças de tamanho da tela

// Detectar quando a página fica visível/invisível
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.app?.wakeLock) {
        // Liberar Wake Lock quando a página fica invisível
        window.app.releaseWakeLock();
    }
});

// Detectar quando o Wake Lock é liberado pelo sistema
document.addEventListener('wakelockrelease', () => {
    if (window.app) {
        window.app.wakeLock = null;
        window.app.updateWakeLockButton(false);
    }
});

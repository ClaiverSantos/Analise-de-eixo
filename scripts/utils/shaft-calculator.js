class DesenhadorEixo {
    constructor() {
        this.secoes = [];
        this.pontos = [];
        this.scaleX = 2;
        this.offsetY = 200;
        this.offsetCotas = 60;
        this.posicaoAtual = 0;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.atualizarVisualizacao();
    }
    
    bindEvents() {
        const btnAdicionar = document.getElementById('btnAdicionarSecao');
        const btnLimpar = document.getElementById('btnLimparEixo');
        const btnDetalhar = document.getElementById('btnDetalharEixo');
        const btnSalvarConfig = document.getElementById('btnSalvarConfig');
        const btnCalcularReacoes = document.getElementById('btnCalcularReacoes');
        
        btnAdicionar.addEventListener('click', () => {
            this.adicionarSecao();
        });
        
        btnLimpar.addEventListener('click', () => {
            this.limparEixo();
        });
        
        btnDetalhar.addEventListener('click', () => {
            this.mostrarModalConfig();
        });
        
        btnSalvarConfig.addEventListener('click', () => {
            this.salvarConfiguracoes();
        });
        
        // --- ALTERAÇÃO CRÍTICA SOLICITADA ---
        // Agora chamamos a função global 'continuarParaCalculos' do main.js.
        // É esta função que se encarregará de chamar obterDadosParaCalculo(), validarParaCalculo() 
        // salvar os dados e redirecionar.
        btnCalcularReacoes.addEventListener('click', () => {
            // A chamada centralizada
            if (typeof window.continuarParaCalculos === 'function') {
                window.continuarParaCalculos(); 
            } else {
                alert('Erro: main.js não carregado corretamente. Função continuarParaCalculos não encontrada.');
            }
        });
        // ------------------------------------
        
        const modal = document.getElementById('modalConfig');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    adicionarSecao() {
        const diametro = parseFloat(document.getElementById('diametro').value);
        const comprimento = parseFloat(document.getElementById('comprimento').value);
        
        if (comprimento <= 0 || isNaN(diametro) || isNaN(comprimento)) {
            alert('Comprimento e diâmetro devem ser maiores que zero.');
            return;
        }
        
        const secao = {
            diametro: diametro,
            comprimento: comprimento,
            posicaoInicio: this.posicaoAtual,
            posicaoFim: this.posicaoAtual + comprimento
        };
        
        this.secoes.push(secao);
        this.posicaoAtual += comprimento;
        
        this.gerarPontosAutomaticos();
        this.atualizarVisualizacao();
    }
    
    gerarPontosAutomaticos() {
        this.pontos = [];
        
        if (this.secoes.length === 0) return;
        
        // Ponto inicial - SEMPRE INÍCIO DO EIXO (automático)
        this.pontos.push({
            x: 0,
            d: this.secoes[0].diametro,
            tipo: 'inicio',
            descricao: 'Início do eixo',
            raio: 0,
            orientacaoCarga: 'baixo',
            forca: 0,
            torque: 0
        });
        
        // Pontos intermediários - APENAS MUDANÇA DE DIÂMETRO
        let posicaoAcumulada = 0;
        this.secoes.forEach((secao, index) => {
            posicaoAcumulada += secao.comprimento;
            
            if (index < this.secoes.length - 1) { // Garante que não é a última seção
                this.pontos.push({
                    x: posicaoAcumulada,
                    d: this.secoes[index+1].diametro, // Diâmetro da PRÓXIMA seção
                    tipo: 'mudanca',
                    descricao: `Mudança para Ø${this.secoes[index+1].diametro}mm`,
                    raio: 2, // APENAS MUDANÇA TEM RAIO
                    orientacaoCarga: 'baixo',
                    forca: 0,
                    torque: 0
                });
            }
        });
        
        // Ponto final - SEMPRE FIM DO EIXO (automático)
        this.pontos.push({
            x: this.posicaoAtual,
            d: this.secoes[this.secoes.length - 1].diametro,
            tipo: 'fim',
            descricao: 'Fim do eixo',
            raio: 0,
            orientacaoCarga: 'baixo',
            forca: 0,
            torque: 0
        });
    }
    
    mostrarModalConfig() {
        const modal = document.getElementById('modalConfig');
        const configContainer = document.getElementById('configuracoesPontos');
        
        configContainer.innerHTML = '<h4>Configure os pontos do eixo:</h4>';
        
        // MOSTRAR APENAS PONTOS QUE NÃO SÃO INÍCIO NEM FIM (esses são automáticos)
        const pontosConfiguraveis = this.pontos.filter(p => p.tipo !== 'inicio' && p.tipo !== 'fim');
        
        if (pontosConfiguraveis.length === 0) {
            configContainer.innerHTML += '<p>Adicione seções ao eixo para configurar os pontos.</p>';
            modal.style.display = 'block';
            return;
        }
        
        pontosConfiguraveis.forEach((ponto, indexOriginal) => {
            // Encontrar o índice real no array this.pontos
            const indexReal = this.pontos.findIndex(p => p.x === ponto.x && p.d === ponto.d);
            
            const divPonto = document.createElement('div');
            divPonto.className = 'config-ponto';
            
            let configExtra = '';
            
            // Reconstroi o HTML de configuração extra baseado no tipo atual
            // Este é um helper para o modal, a lógica principal de salvamento está em salvarConfiguracoes()
            if (ponto.tipo === 'mudanca' || ponto.tipo === 'raio') {
                configExtra = `
                    <div class="config-subgroup">
                        <label>Raio (mm):</label>
                        <input type="number" class="raio-ponto" data-index="${indexReal}" value="${ponto.raio}" min="0" step="0.1">
                    </div>
                `;
            }
            
            if (ponto.tipo === 'carga') {
                configExtra = `
                    <div class="config-subgroup">
                        <label>Configuração de Carga:</label>
                        <div class="config-carga">
                            <div>
                                <label>Orientação:</label>
                                <select class="orientacao-carga" data-index="${indexReal}">
                                    <option value="cima" ${ponto.orientacaoCarga === 'cima' ? 'selected' : ''}>Para Cima ↑</option>
                                    <option value="baixo" ${ponto.orientacaoCarga === 'baixo' ? 'selected' : ''}>Para Baixo ↓</option>
                                </select>
                            </div>
                            <div>
                                <label>Força (N):</label>
                                <input type="number" class="forca-ponto" data-index="${indexReal}" value="${ponto.forca}" step="100">
                            </div>
                            <div>
                                <label>Torque (Nm):</label>
                                <input type="number" class="torque-ponto" data-index="${indexReal}" value="${ponto.torque}" step="10">
                            </div>
                        </div>
                    </div>
                `;
            }
            
            divPonto.innerHTML = `
                <div class="rotulo-ponto">Ponto em X = ${ponto.x}mm, Ø = ${ponto.d}mm</div>
                <label>Tipo:</label>
                <select class="tipo-ponto" data-index="${indexReal}">
                    <option value="mancal" ${ponto.tipo === 'mancal' ? 'selected' : ''}>Mancal/Apoio</option>
                    <option value="carga" ${ponto.tipo === 'carga' ? 'selected' : ''}>Ponto de Carga</option>
                    <option value="raio" ${ponto.tipo === 'raio' ? 'selected' : ''}>Raio/Filete</option>
                    <option value="mudanca" ${ponto.tipo === 'mudanca' ? 'selected' : ''}>Mudança de Diâmetro</option>
                </select>
                <label>Descrição:</label>
                <input type="text" class="descricao-ponto" data-index="${indexReal}" value="${ponto.descricao}">
                ${configExtra}
            `;
            configContainer.appendChild(divPonto);
        });
        
        const selects = document.querySelectorAll('.tipo-ponto');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                this.atualizarConfigExtra(e.target);
            });
        });
        
        modal.style.display = 'block';
    }
    
    atualizarConfigExtra(select) {
        const index = parseInt(select.dataset.index);
        const configPonto = select.closest('.config-ponto');
        let configExtra = configPonto.querySelector('.config-subgroup');
        
        // Se a div de subgrupo não existe, cria (necessário para dinamismo do modal)
        if (!configExtra) {
            configExtra = document.createElement('div');
            configExtra.className = 'config-subgroup';
            // Assume que 'select' está dentro de algum elemento que tem um pai comum com o que receberá a config extra
            select.parentElement.parentElement.appendChild(configExtra); 
        }
        
        const tipo = select.value;
        
        // Lógica para reconstruir o painel de configuração extra dinamicamente
        if (tipo === 'mudanca' || tipo === 'raio') {
            configExtra.innerHTML = `
                <label>Raio (mm):</label>
                <input type="number" class="raio-ponto" data-index="${index}" value="${this.pontos[index].raio || 2}" min="0" step="0.1">
            `;
        } else if (tipo === 'carga') {
            configExtra.innerHTML = `
                <label>Configuração de Carga:</label>
                <div class="config-carga">
                    <div>
                        <label>Orientação:</label>
                        <select class="orientacao-carga" data-index="${index}">
                            <option value="cima" ${this.pontos[index].orientacaoCarga === 'cima' ? 'selected' : ''}>Para Cima ↑</option>
                            <option value="baixo" ${this.pontos[index].orientacaoCarga === 'baixo' ? 'selected' : ''}>Para Baixo ↓</option>
                        </select>
                    </div>
                    <div>
                        <label>Força (N):</label>
                        <input type="number" class="forca-ponto" data-index="${index}" value="${this.pontos[index].forca || 1000}" step="100">
                    </div>
                    <div>
                        <label>Torque (Nm):</label>
                        <input type="number" class="torque-ponto" data-index="${index}" value="${this.pontos[index].torque || 0}" step="10">
                    </div>
                </div>
            `;
        } else {
            // MANCAL ou outro tipo sem config extra: Limpa o HTML
            configExtra.innerHTML = '';
        }
    }
    
    salvarConfiguracoes() {
        // ... (código para coletar os inputs do modal)
        const selects = document.querySelectorAll('.tipo-ponto');
        const inputs = document.querySelectorAll('.descricao-ponto');
        const raios = document.querySelectorAll('.raio-ponto');
        const orientacoes = document.querySelectorAll('.orientacao-carga');
        const forcas = document.querySelectorAll('.forca-ponto');
        const torques = document.querySelectorAll('.torque-ponto');
        
        selects.forEach(select => {
            const index = parseInt(select.dataset.index);
            const novoTipo = select.value;
            this.pontos[index].tipo = novoTipo;
            
            // Lógica para redefinir propriedades não utilizadas por tipos específicos
            if (!['mudanca', 'raio'].includes(novoTipo)) {
                this.pontos[index].raio = 0;
            }
            if (novoTipo !== 'carga') {
                this.pontos[index].forca = 0;
                this.pontos[index].torque = 0;
            }
            
            // CORREÇÃO: Atualizar descrição padrão baseada no tipo
            if (novoTipo === 'mancal') {
                this.pontos[index].descricao = `Mancal em x=${this.pontos[index].x}mm`;
            } else if (novoTipo === 'carga') {
                this.pontos[index].descricao = `Carga em x=${this.pontos[index].x}mm`;
            } else if (novoTipo === 'raio') {
                this.pontos[index].descricao = `Raio em x=${this.pontos[index].x}mm`;
            } else if (novoTipo === 'mudanca') {
                this.pontos[index].descricao = `Mudança para Ø${this.pontos[index].d}mm`;
            }
        });
        
        inputs.forEach(input => {
            const index = parseInt(input.dataset.index);
            this.pontos[index].descricao = input.value;
        });
        
        raios.forEach(input => {
            const index = parseInt(input.dataset.index);
            if (['mudanca', 'raio'].includes(this.pontos[index].tipo)) {
                this.pontos[index].raio = parseFloat(input.value);
            }
        });
        
        orientacoes.forEach(select => {
            const index = parseInt(select.dataset.index);
            this.pontos[index].orientacaoCarga = select.value;
        });
        
        forcas.forEach(input => {
            const index = parseInt(input.dataset.index);
            if (this.pontos[index].tipo === 'carga') {
                this.pontos[index].forca = parseFloat(input.value);
            }
        });
        
        torques.forEach(input => {
            const index = parseInt(input.dataset.index);
            if (this.pontos[index].tipo === 'carga') {
                this.pontos[index].torque = parseFloat(input.value);
            }
        });
        // ... (Fim da coleta)
        
        document.getElementById('modalConfig').style.display = 'none';
        this.atualizarVisualizacao();
    }
    
    // ... (restante dos métodos de desenho e cotagem - inalterados)
    
    atualizarVisualizacao() {
        const container = document.getElementById('eixoContainer');
        const cotasContainer = document.getElementById('cotasContainer');
        const setasContainer = document.getElementById('setasContainer');
        
        container.innerHTML = '';
        cotasContainer.innerHTML = '';
        setasContainer.innerHTML = '';
        
        // Desenhar seções do eixo
        this.secoes.forEach(secao => {
            const linha = document.createElement('div');
            linha.className = 'linha-eixo';
            linha.style.left = (secao.posicaoInicio * this.scaleX) + 'px';
            linha.style.width = (secao.comprimento * this.scaleX) + 'px';
            linha.style.top = (this.offsetY - secao.diametro) + 'px';
            linha.style.height = (secao.diametro * 2) + 'px';
            container.appendChild(linha);
        });
        
        // Desenhar pontos e elementos especiais
        this.pontos.forEach(ponto => {
            // Ponto principal
            const pontoElement = document.createElement('div');
            pontoElement.className = 'ponto-eixo';
            pontoElement.style.left = (ponto.x * this.scaleX) + 'px';
            pontoElement.style.top = this.offsetY + 'px';
            
            const cores = {
                'inicio': '#28a745',
                'mancal': '#dc3545',
                'carga': '#ffc107',
                'raio': '#fd7e14',
                'mudanca': '#007bff',
                'fim': '#6c757d'
            };
            pontoElement.style.background = cores[ponto.tipo] || 'red';
            
            let titulo = `${ponto.descricao} (x=${ponto.x}mm, Ø=${ponto.d}mm)`;
            if (ponto.tipo === 'carga' && (ponto.forca > 0 || ponto.torque !== 0)) {
                titulo += `\nForça: ${ponto.forca}N, Torque: ${ponto.torque}Nm`;
            }
            if (ponto.raio > 0) {
                titulo += `\nRaio: ${ponto.raio}mm`;
            }
            pontoElement.title = titulo;
            
            container.appendChild(pontoElement);
            
            // CORREÇÃO: Indicador de raio APENAS para pontos que devem ter raio
            if (ponto.raio > 0 && ['mudanca', 'raio'].includes(ponto.tipo)) {
                const raioElement = document.createElement('div');
                raioElement.className = 'raio-indicador';
                raioElement.style.left = (ponto.x * this.scaleX) + 'px';
                raioElement.style.top = this.offsetY + 'px';
                // O indicador de raio não deve ser baseado no raio, mas sim ser um marcador visual fixo
                raioElement.style.width = '10px'; 
                raioElement.style.height = '10px';
                raioElement.title = `Raio = ${ponto.raio}mm`;
                container.appendChild(raioElement);
            }
            
            // Seta e rótulo para cargas
            if (ponto.tipo === 'carga') {
                const setaElement = document.createElement('div');
                setaElement.className = `seta-carga ${ponto.orientacaoCarga === 'cima' ? 'seta-pra-cima' : 'seta-pra-baixo'}`;
                setaElement.style.left = (ponto.x * this.scaleX) + 'px';
                setaElement.style.top = (this.offsetY + (ponto.orientacaoCarga === 'cima' ? -50 : 50)) + 'px';
                setaElement.innerHTML = ponto.orientacaoCarga === 'cima' ? '↑' : '↓';
                setasContainer.appendChild(setaElement);
                
                // Rótulo com valores da carga
                if (ponto.forca > 0 || ponto.torque !== 0) {
                    const rotuloElement = document.createElement('div');
                    rotuloElement.className = 'rotulo-carga';
                    rotuloElement.style.left = (ponto.x * this.scaleX + 10) + 'px';
                    rotuloElement.style.top = (this.offsetY + (ponto.orientacaoCarga === 'cima' ? -80 : 80)) + 'px';
                    
                    let texto = '';
                    if (ponto.forca > 0) texto += `F=${ponto.forca}N`;
                    if (ponto.torque !== 0) {
                        if (texto) texto += ' / '; // Usa espaço ou barra, não quebra de linha em rótulo HTML simples
                        texto += `T=${ponto.torque}Nm`;
                    }
                    rotuloElement.textContent = texto;
                    rotuloElement.title = texto.replace(' / ', ', ');
                    setasContainer.appendChild(rotuloElement);
                }
            }
            
            // Indicador de mancal
            if (ponto.tipo === 'mancal') {
                const mancalElement = document.createElement('div');
                mancalElement.className = 'mancal-indicador';
                mancalElement.style.left = (ponto.x * this.scaleX) + 'px';
                mancalElement.style.top = this.offsetY + 'px';
                mancalElement.title = ponto.descricao;
                container.appendChild(mancalElement);
            }
        });
        
        this.desenharCotas();
    }
    
    // ... (restante dos métodos de cotagem)
    
    desenharCotas() {
        const cotasContainer = document.getElementById('cotasContainer');
        const espacamentoCotas = 80;
        
        this.secoes.forEach((secao, index) => {
            const yPos = this.offsetY + this.offsetCotas + (index * espacamentoCotas);
            this.desenharCotaHorizontal(
                secao.posicaoInicio, 
                secao.posicaoFim, 
                yPos,
                `${secao.comprimento}mm`
            );
        });
        
        this.secoes.forEach((secao, index) => {
            const xPos = secao.posicaoInicio + secao.comprimento/2;
            this.desenharCotaVertical(
                xPos,
                this.offsetY - secao.diametro - 20,
                this.offsetY + secao.diametro + 20,
                `Ø${secao.diametro}mm`
            );
        });
    }
    
    desenharCotaHorizontal(xInicio, xFim, y, texto) {
        const cotaGroup = document.createElement('div');
        cotaGroup.style.position = 'absolute';
        cotaGroup.style.left = (xInicio * this.scaleX) + 'px';
        cotaGroup.style.top = y + 'px';
        
        const linha = document.createElement('div');
        linha.style.width = ((xFim - xInicio) * this.scaleX) + 'px';
        linha.style.height = '1px';
        linha.style.background = '#666';
        cotaGroup.appendChild(linha);
        
        [0, (xFim - xInicio) * this.scaleX].forEach(offset => {
            const linhaVert = document.createElement('div');
            linhaVert.style.position = 'absolute';
            linhaVert.style.left = offset + 'px';
            linhaVert.style.top = '-10px';
            linhaVert.style.width = '1px';
            linhaVert.style.height = '20px';
            linhaVert.style.background = '#666';
            cotaGroup.appendChild(linhaVert);
        });
        
        const textoElem = document.createElement('div');
        textoElem.className = 'cota-texto';
        textoElem.style.position = 'absolute';
        textoElem.style.left = '50%';
        textoElem.style.transform = 'translateX(-50%)';
        textoElem.style.top = '-30px';
        textoElem.textContent = texto;
        textoElem.style.background = 'white';
        textoElem.style.padding = '2px 5px';
        cotaGroup.appendChild(textoElem);
        
        document.getElementById('cotasContainer').appendChild(cotaGroup);
    }
    
    desenharCotaVertical(x, ySuperior, yInferior, texto) {
        const cotaGroup = document.createElement('div');
        cotaGroup.style.position = 'absolute';
        cotaGroup.style.left = (x * this.scaleX) + 'px';
        cotaGroup.style.top = ySuperior + 'px';
        
        const linha = document.createElement('div');
        linha.style.width = '1px';
        linha.style.height = (yInferior - ySuperior) + 'px';
        linha.style.background = '#666';
        cotaGroup.appendChild(linha);
        
        const textoElem = document.createElement('div');
        textoElem.className = 'cota-texto';
        textoElem.style.position = 'absolute';
        textoElem.style.left = '15px';
        textoElem.style.top = '50%';
        textoElem.style.transform = 'translateY(-50%)';
        textoElem.textContent = texto;
        textoElem.style.background = 'white';
        textoElem.style.padding = '2px 5px';
        cotaGroup.appendChild(textoElem);
        
        document.getElementById('cotasContainer').appendChild(cotaGroup);
    }
    
    limparEixo() {
        this.secoes = [];
        this.pontos = [];
        this.posicaoAtual = 0;
        this.atualizarVisualizacao();
        document.getElementById('descricaoEixo').innerHTML = '';
        
        // Limpa os dados no localStorage ao limpar o desenho (Opcional, mas recomendado)
        if (typeof window.salvarDados === 'function') {
            window.salvarDados({ desenhoFeito: false, geometria: null, dadosCalculo: null });
        }
    }
    
    // NOVO MÉTODO: Obter dados para cálculo (Mantido, pois 'main.js' o chama)
    obterDadosParaCalculo() {
        // Obter o diâmetro da seção anterior para as mudanças de diâmetro
        const secoesMap = new Map();
        this.secoes.forEach((sec, index) => {
            secoesMap.set(sec.posicaoInicio, sec);
        });

        // 1. Filtrar pontos relevantes
        const pontosRelevantes = this.pontos.filter(p => p.tipo !== 'inicio' && p.tipo !== 'fim');

        // 2. Coletar dados de carregamentos
        const carregamentos = pontosRelevantes.filter(p => p.tipo === 'carga' && (p.forca !== 0 || p.torque !== 0))
            .map(p => ({ 
                x: p.x, 
                forca: p.forca, 
                torque: p.torque, 
                orientacao: p.orientacaoCarga,
                diametro: p.d // Diâmetro no ponto de carga
            }));

        // 3. Coletar dados de mancais
        const mancais = pontosRelevantes.filter(p => p.tipo === 'mancal')
            .map(p => ({ x: p.x, diametro: p.d }));

        // 4. Coletar pontos críticos (mudanças de diâmetro e raios)
        const pontosCriticos = pontosRelevantes.filter(p => ['mudanca', 'raio', 'mancal', 'carga'].includes(p.tipo))
            .map(p => {
                let diametro_maior = p.d;
                let diametro_menor = p.d;
                
                if (p.tipo === 'mudanca') {
                    // Para mudança, precisamos do diâmetro da seção anterior (D) e o atual (d)
                    const secaoAtual = this.secoes.find(s => s.posicaoFim === p.x); // Seção a ESQUERDA da mudança
                    const secaoProxima = this.secoes.find(s => s.posicaoInicio === p.x); // Seção a DIREITA da mudança
                    
                    if (secaoAtual && secaoProxima) {
                         diametro_maior = Math.max(secaoAtual.diametro, secaoProxima.diametro);
                         diametro_menor = Math.min(secaoAtual.diametro, secaoProxima.diametro);
                    }
                }
                
                return {
                    x: p.x,
                    tipo: p.tipo,
                    diametro: p.d,
                    diametro_maior: diametro_maior, // Para cálculo K_t
                    diametro_menor: diametro_menor, // Para cálculo K_t
                    raio: p.raio || 0
                };
            });
        
        // Retorna a estrutura final que a análise espera
        return {
            comprimentoTotal: this.posicaoAtual,
            secoes: this.secoes, // Para visualizar
            pontos: pontosCriticos, // Pontos que precisam de cálculo de tensão/FS
            carregamentos: carregamentos,
            mancais: mancais,
            metadata: {
                geradoEm: new Date().toISOString(),
                versao: "1.1"
            }
        };
    }
        
    getTipoTexto(tipo) {
        const tipos = {
            'inicio': '🔰 Início',
            'mancal': '⚙️ Mancal',
            'carga': '📌 Carga',
            'raio': '🔵 Raio',
            'mudanca': '📐 Mudança Diâmetro',
            'fim': '🔚 Fim'
        };
        return tipos[tipo] || tipo;
    }

    // Adicionado método de validação para ser chamado pelo main.js
    validarParaCalculo() {
        if (this.pontos.length === 0 || this.posicaoAtual === 0) {
            throw new Error('Desenhe o eixo primeiro!');
        }
        
        const mancais = this.pontos.filter(p => p.tipo === 'mancal');
        
        if (mancais.length < 2) {
            throw new Error('São necessários pelo menos 2 mancais para calcular as reações!');
        }
        
        const cargas = this.pontos.filter(p => p.tipo === 'carga' && (p.forca !== 0 || p.torque !== 0));
        if (cargas.length === 0) {
             console.warn('Alerta: Nenhuma carga aplicada. Os cálculos de tensão serão zero.');
        }



        return true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // ESSENCIAL: Torna a classe disponível globalmente para o main.js
    window.desenhadorEixo = new DesenhadorEixo();
});
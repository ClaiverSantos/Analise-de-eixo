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
        const btnObterDescricao = document.getElementById('btnObterDescricao');
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
        
        btnObterDescricao.addEventListener('click', () => {
            this.gerarDescricaoCompleta();
        });
        
        btnSalvarConfig.addEventListener('click', () => {
            this.salvarConfiguracoes();
        });
        
        btnCalcularReacoes.addEventListener('click', () => {
            this.abrirGuiaCalculos();
        });
        
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
        
        if (comprimento <= 0) {
            alert('Comprimento deve ser maior que zero!');
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
        
        // Ponto inicial - SEM RAIO
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
        
        // Pontos intermediários - APENAS MUDANÇA TEM RAIO
        let posicaoAcumulada = 0;
        this.secoes.forEach((secao, index) => {
            if (index > 0) {
                this.pontos.push({
                    x: posicaoAcumulada,
                    d: secao.diametro,
                    tipo: 'mudanca',
                    descricao: `Mudança para Ø${secao.diametro}mm`,
                    raio: 2, // APENAS MUDANÇA TEM RAIO
                    orientacaoCarga: 'baixo',
                    forca: 0,
                    torque: 0
                });
            }
            
            posicaoAcumulada += secao.comprimento;
        });
        
        // Ponto final - SEM RAIO
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
        
        configContainer.innerHTML = '<h4>Configure cada ponto do eixo:</h4>';
        
        this.pontos.forEach((ponto, index) => {
            const divPonto = document.createElement('div');
            divPonto.className = 'config-ponto';
            
            let configExtra = '';
            
            // CORREÇÃO: APENAS MUDANÇA E RAIO TEM CONFIG DE RAIO
            if (ponto.tipo === 'mudanca') {
                configExtra = `
                    <div class="config-subgroup">
                        <label>Raio (mm):</label>
                        <input type="number" class="raio-ponto" data-index="${index}" value="${ponto.raio}" min="0" step="0.1">
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
                                <select class="orientacao-carga" data-index="${index}">
                                    <option value="cima" ${ponto.orientacaoCarga === 'cima' ? 'selected' : ''}>Para Cima ↑</option>
                                    <option value="baixo" ${ponto.orientacaoCarga === 'baixo' ? 'selected' : ''}>Para Baixo ↓</option>
                                </select>
                            </div>
                            <div>
                                <label>Força (N):</label>
                                <input type="number" class="forca-ponto" data-index="${index}" value="${ponto.forca}" step="100">
                            </div>
                            <div>
                                <label>Torque (Nm):</label>
                                <input type="number" class="torque-ponto" data-index="${index}" value="${ponto.torque}" step="10">
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // CORREÇÃO: Ponto específico de raio
            if (ponto.tipo === 'raio') {
                configExtra = `
                    <div class="config-subgroup">
                        <label>Raio (mm):</label>
                        <input type="number" class="raio-ponto" data-index="${index}" value="${ponto.raio}" min="0" step="0.1">
                    </div>
                `;
            }
            
            divPonto.innerHTML = `
                <div class="rotulo-ponto">Ponto em X = ${ponto.x}mm, Ø = ${ponto.d}mm</div>
                <label>Tipo:</label>
                <select class="tipo-ponto" data-index="${index}">
                    <option value="inicio" ${ponto.tipo === 'inicio' ? 'selected' : ''}>Início do Eixo</option>
                    <option value="mancal" ${ponto.tipo === 'mancal' ? 'selected' : ''}>Mancal/Apoio</option>
                    <option value="carga" ${ponto.tipo === 'carga' ? 'selected' : ''}>Ponto de Carga</option>
                    <option value="raio" ${ponto.tipo === 'raio' ? 'selected' : ''}>Raio/Filete</option>
                    <option value="mudanca" ${ponto.tipo === 'mudanca' ? 'selected' : ''}>Mudança de Diâmetro</option>
                    <option value="fim" ${ponto.tipo === 'fim' ? 'selected' : ''}>Fim do Eixo</option>
                </select>
                <label>Descrição:</label>
                <input type="text" class="descricao-ponto" data-index="${index}" value="${ponto.descricao}">
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
        
        if (!configExtra) {
            configExtra = document.createElement('div');
            configExtra.className = 'config-subgroup';
            select.closest('.form-group').after(configExtra);
        }
        
        const tipo = select.value;
        
        // CORREÇÃO: Lógica melhorada para config extra
        if (tipo === 'mudanca') {
            configExtra.innerHTML = `
                <label>Raio (mm):</label>
                <input type="number" class="raio-ponto" data-index="${index}" value="2" min="0" step="0.1">
            `;
        } else if (tipo === 'carga') {
            configExtra.innerHTML = `
                <label>Configuração de Carga:</label>
                <div class="config-carga">
                    <div>
                        <label>Orientação:</label>
                        <select class="orientacao-carga" data-index="${index}">
                            <option value="cima">Para Cima ↑</option>
                            <option value="baixo" selected>Para Baixo ↓</option>
                        </select>
                    </div>
                    <div>
                        <label>Força (N):</label>
                        <input type="number" class="forca-ponto" data-index="${index}" value="1000" step="100">
                    </div>
                    <div>
                        <label>Torque (Nm):</label>
                        <input type="number" class="torque-ponto" data-index="${index}" value="0" step="10">
                    </div>
                </div>
            `;
        } else if (tipo === 'raio') {
            configExtra.innerHTML = `
                <label>Raio (mm):</label>
                <input type="number" class="raio-ponto" data-index="${index}" value="2" min="0" step="0.1">
            `;
        } else {
            // INÍCIO, MANCAL, FIM - NÃO TEM CONFIG EXTRA
            configExtra.innerHTML = '';
        }
    }
    
    salvarConfiguracoes() {
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
            
            // CORREÇÃO CRÍTICA: ZERAR RAIO PARA TIPOS QUE NÃO DEVEM TER
            if (!['mudanca', 'raio'].includes(novoTipo)) {
                this.pontos[index].raio = 0;
            }
            
            // CORREÇÃO: Atualizar descrição padrão baseada no tipo
            if (novoTipo === 'mancal') {
                this.pontos[index].descricao = `Mancal em x=${this.pontos[index].x}mm`;
            } else if (novoTipo === 'carga') {
                this.pontos[index].descricao = `Carga em x=${this.pontos[index].x}mm`;
            } else if (novoTipo === 'raio') {
                this.pontos[index].descricao = `Raio em x=${this.pontos[index].x}mm`;
            }
        });
        
        inputs.forEach(input => {
            const index = parseInt(input.dataset.index);
            this.pontos[index].descricao = input.value;
        });
        
        raios.forEach(input => {
            const index = parseInt(input.dataset.index);
            // CORREÇÃO: Só atualiza raio se o ponto for do tipo que permite raio
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
            this.pontos[index].forca = parseFloat(input.value);
        });
        
        torques.forEach(input => {
            const index = parseInt(input.dataset.index);
            this.pontos[index].torque = parseFloat(input.value);
        });
        
        document.getElementById('modalConfig').style.display = 'none';
        this.atualizarVisualizacao();
    }
    
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
                raioElement.style.width = (ponto.raio * 2 * this.scaleX) + 'px';
                raioElement.style.height = (ponto.raio * 2 * this.scaleX) + 'px';
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
                        if (texto) texto += '\n';
                        texto += `T=${ponto.torque}Nm`;
                    }
                    rotuloElement.textContent = texto;
                    rotuloElement.title = texto.replace('\n', ', ');
                    setasContainer.appendChild(rotuloElement);
                }
            }
        });
        
        this.desenharCotas();
    }
    
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
        
        cotasContainer.appendChild(cotaGroup);
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
        
        cotasContainer.appendChild(cotaGroup);
    }
    
    limparEixo() {
        this.secoes = [];
        this.pontos = [];
        this.posicaoAtual = 0;
        this.atualizarVisualizacao();
        document.getElementById('descricaoEixo').innerHTML = '';
    }
    
    gerarDescricaoCompleta() {
        const descricaoDiv = document.getElementById('descricaoEixo');
        
        if (this.pontos.length === 0) {
            descricaoDiv.innerHTML = '<p>Nenhuma seção definida. Adicione seções ao eixo primeiro.</p>';
            return;
        }
        
        let html = '<h4>📋 DESCRIÇÃO COMPLETA DO EIXO</h4>';
        
        // Resumo geral
        html += `<p><strong>Comprimento total:</strong> ${this.posicaoAtual} mm</p>`;
        html += `<p><strong>Número de seções:</strong> ${this.secoes.length}</p>`;
        
        // Pontos de carga
        const pontosCarga = this.pontos.filter(p => p.tipo === 'carga' && (p.forca > 0 || p.torque !== 0));
        if (pontosCarga.length > 0) {
            html += '<h5>📌 PONTOS DE CARGA:</h5>';
            pontosCarga.forEach(ponto => {
                html += `<div class="info-carga">
                    <strong>Posição X = ${ponto.x}mm</strong><br>
                    Força: ${ponto.forca} N ${ponto.orientacaoCarga === 'cima' ? '↑' : '↓'}<br>
                    Torque: ${ponto.torque} Nm<br>
                    Diâmetro local: Ø${ponto.d}mm
                </div>`;
            });
        }
        
        // Tabela de pontos detalhada
        html += '<h5>🎯 PONTOS ESPECIAIS DO EIXO:</h5>';
        html += '<table>';
        html += '<tr><th>Posição (mm)</th><th>Diâmetro (mm)</th><th>Tipo</th><th>Raio (mm)</th><th>Descrição</th></tr>';
        
        this.pontos.forEach(ponto => {
            html += `<tr>
                <td>${ponto.x}</td>
                <td>${ponto.d}</td>
                <td>${this.getTipoTexto(ponto.tipo)}</td>
                <td>${ponto.raio > 0 ? ponto.raio : '-'}</td>
                <td>${ponto.descricao}</td>
            </tr>`;
        });
        html += '</table>';
        
        // Tabela de seções
        html += '<h5>📏 SEÇÕES DO EIXO:</h5>';
        html += '<table>';
        html += '<tr><th>Seção</th><th>Diâmetro (mm)</th><th>Comprimento (mm)</th><th>Início → Fim (mm)</th></tr>';
        
        this.secoes.forEach((secao, index) => {
            html += `<tr>
                <td>${index + 1}</td>
                <td>Ø${secao.diametro}</td>
                <td>${secao.comprimento}</td>
                <td>${secao.posicaoInicio} → ${secao.posicaoFim}</td>
            </tr>`;
        });
        html += '</table>';
        
        // Dados para cálculo em JSON
        html += '<h5>💾 DADOS PARA CÁLCULO (JSON):</h5>';
        html += '<div class="dados-json" id="dadosCalculo"></div>';
        
        const dadosCalculo = this.obterDadosParaCalculo();
        
        descricaoDiv.innerHTML = html;
        document.getElementById('dadosCalculo').textContent = JSON.stringify(dadosCalculo, null, 2);
    }
    
    // NOVO MÉTODO: Obter dados para cálculo
    obterDadosParaCalculo() {
        return {
            comprimentoTotal: this.posicaoAtual,
            secoes: this.secoes,
            pontos: this.pontos.filter(p => p.tipo !== 'inicio' && p.tipo !== 'fim'),
            carregamentos: this.pontos.filter(p => p.tipo === 'carga' && (p.forca > 0 || p.torque !== 0))
                .map(p => ({ 
                    x: p.x, 
                    forca: p.forca, 
                    torque: p.torque, 
                    orientacao: p.orientacaoCarga,
                    diametro: p.d 
                })),
            mancais: this.pontos.filter(p => p.tipo === 'mancal')
                .map(p => ({ x: p.x, diametro: p.d })),
            metadata: {
                geradoEm: new Date().toISOString(),
                versao: "1.1"
            }
        };
    }
    
    // NOVO MÉTODO: Abrir guia de cálculos
    abrirGuiaCalculos() {
        if (this.pontos.length === 0) {
            alert('Desenhe o eixo primeiro!');
            return;
        }
        
        const dadosEixo = this.obterDadosParaCalculo();
        
        // Verificar se temos pelo menos 2 mancais
        const mancais = dadosEixo.pontos.filter(p => p.tipo === 'mancal');
        if (mancais.length < 2) {
            alert('São necessários pelo menos 2 mancais para calcular as reações!');
            return;
        }
        
        if (typeof window.abrirCalculos === 'function') {
            window.abrirCalculos(dadosEixo);
        } else {
            alert('Sistema de cálculos não carregado. Recarregue a página.');
        }
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.desenhadorEixo = new DesenhadorEixo();
});
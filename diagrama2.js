// diagrama2.js
class DiagramaFadiga {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.dados = null;
        this.margins = { top: 50, right: 50, bottom: 80, left: 80 };
        this.colors = {
            linhaGoodman: '#e74c3c',
            linhaEscoamento: '#f39c12',
            retanguloEsforco: 'rgba(52, 152, 219, 0.6)',
            areaSegura: 'rgba(46, 204, 113, 0.4)',
            areaGoodman: 'rgba(231, 76, 60, 0.2)',
            areaEscoamento: 'rgba(243, 156, 18, 0.2)',
            grid: '#ecf0f1',
            text: '#2c3e50'
        };
    }

    inicializar(dadosEixo, configuracao, resultadosEstatica) {
        console.log("Inicializando diagrama com dados:", { dadosEixo, configuracao, resultadosEstatica });
        
        this.dadosEixo = dadosEixo;
        this.config = configuracao;
        this.resultadosEstatica = resultadosEstatica;
        
        // Calcular resultados de fadiga
        const analisador = new AnalisadorFadiga(dadosEixo, configuracao, resultadosEstatica);
        this.resultadosFadiga = analisador.executarAnaliseFadiga();
        
        console.log("Resultados fadiga:", this.resultadosFadiga);
        
        this.criarCanvas();
        this.renderizarDiagrama();
    }

    criarCanvas() {
        // Remover canvas existente se houver
        const existingCanvas = document.getElementById('canvasDiagramaFadiga');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        // Remover informações anteriores se existirem
        const existingInfo = document.getElementById('info-diagrama');
        if (existingInfo) {
            existingInfo.remove();
        }

        // Criar novo canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'canvasDiagramaFadiga';
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.border = '1px solid #ddd';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.margin = '20px auto';
        this.canvas.style.display = 'block';
        this.canvas.style.background = 'white';
        this.canvas.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

        // Adicionar ao container de resultados
        const container = document.querySelector('.resultados-fadiga');
        if (container) {
            container.appendChild(this.canvas);
        } else {
            document.body.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');
    }

    renderizarDiagrama() {
        if (!this.ctx) return;

        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Desenhar grade
        this.desenharGrade();

        // Desenhar eixos
        this.desenharEixos();

        // Desenhar área de escoamento (Sy x Sy)
        this.desenharAreaEscoamento();

        // Desenhar linha de Goodman (Se até Sut)
        this.desenharLinhaGoodman();

        // Desenhar área segura (interseção)
        this.desenharAreaSegura();

        // Desenhar retângulo de esforço
        this.desenharRetanguloEsforco();

        // Desenhar legenda
        this.desenharLegenda();

        // Desenhar título
        this.desenharTitulo();
    }

    desenharGrade() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;

        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 0.5;

        // Linhas verticais
        for (let x = margins.left; x <= width - margins.right; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, margins.top);
            ctx.lineTo(x, height - margins.bottom);
            ctx.stroke();
        }

        // Linhas horizontais
        for (let y = margins.top; y <= height - margins.bottom; y += 50) {
            ctx.beginPath();
            ctx.moveTo(margins.left, y);
            ctx.lineTo(width - margins.right, y);
            ctx.stroke();
        }
    }

    desenharEixos() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;

        ctx.strokeStyle = this.colors.text;
        ctx.lineWidth = 2;
        ctx.fillStyle = this.colors.text;
        ctx.font = '12px Arial';

        // Eixo Y (Tensão Alternada σa)
        ctx.beginPath();
        ctx.moveTo(margins.left, margins.top);
        ctx.lineTo(margins.left, height - margins.bottom);
        ctx.stroke();

        // Eixo X (Tensão Média σm)
        ctx.beginPath();
        ctx.moveTo(margins.left, height - margins.bottom);
        ctx.lineTo(width - margins.right, height - margins.bottom);
        ctx.stroke();

        // Rótulos dos eixos
        ctx.save();
        ctx.translate(margins.left - 40, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Tensão Alternada σa (MPa)', 0, 0);
        ctx.restore();

        ctx.fillText('Tensão Média σm (MPa)', width / 2 - 60, height - 20);

        // Escalas
        const Se = this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa;
        const Sut = this.config.Sut;
        const Sy = this.config.Sy;
        const maxTensao = Math.max(Se, Sut, Sy) * 1.2;

        // Escala eixo Y
        for (let i = 0; i <= 5; i++) {
            const valor = (maxTensao * i / 5).toFixed(0);
            const y = height - margins.bottom - (i * (height - margins.top - margins.bottom) / 5);
            
            ctx.fillText(valor, margins.left - 30, y + 4);
            ctx.beginPath();
            ctx.moveTo(margins.left - 5, y);
            ctx.lineTo(margins.left, y);
            ctx.stroke();
        }

        // Escala eixo X
        for (let i = 0; i <= 5; i++) {
            const valor = (maxTensao * i / 5).toFixed(0);
            const x = margins.left + (i * (width - margins.left - margins.right) / 5);
            
            ctx.fillText(valor, x - 5, height - margins.bottom + 20);
            ctx.beginPath();
            ctx.moveTo(x, height - margins.bottom);
            ctx.lineTo(x, height - margins.bottom + 5);
            ctx.stroke();
        }

        // Marcas especiais
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 12px Arial';
        
        // Marca do Se no eixo Y
        const ySe = height - margins.bottom - (Se * (height - margins.top - margins.bottom) / maxTensao);
        ctx.fillText(`Se = ${Se.toFixed(0)}`, margins.left - 60, ySe + 4);
        
        // Marca do Sut no eixo X
        const xSut = margins.left + (Sut * (width - margins.left - margins.right) / maxTensao);
        ctx.fillText(`Sut = ${Sut}`, xSut - 20, height - margins.bottom + 35);

        // Marca do Sy nos eixos
        ctx.fillStyle = '#f39c12';
        const ySy = height - margins.bottom - (Sy * (height - margins.top - margins.bottom) / maxTensao);
        ctx.fillText(`Sy = ${Sy}`, margins.left - 60, ySy + 4);
        
        const xSy = margins.left + (Sy * (width - margins.left - margins.right) / maxTensao);
        ctx.fillText(`Sy = ${Sy}`, xSy - 20, height - margins.bottom + 55);
    }

    desenharLinhaGoodman() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;
        
        const Se = this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa;
        const Sut = this.config.Sut;
        const maxTensao = Math.max(Se, Sut) * 1.2;

        ctx.strokeStyle = this.colors.linhaGoodman;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);

        // Linha de Goodman: de (0, Se) até (Sut, 0)
        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        const x1 = margins.left; // σm = 0
        const y1 = height - margins.bottom - Se * yScale; // σa = Se
        
        const x2 = margins.left + Sut * xScale; // σm = Sut
        const y2 = height - margins.bottom; // σa = 0

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Preencher área de Goodman (triângulo)
        ctx.fillStyle = this.colors.areaGoodman;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y2);
        ctx.closePath();
        ctx.fill();
    }

    desenharAreaEscoamento() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;
        
        const Sy = this.config.Sy;
        const maxTensao = Math.max(Sy, this.config.Sut, this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Linha de escoamento: de (Sy, 0) até (0, Sy) - formando triângulo
        const x1 = margins.left + Sy * xScale; // σm = Sy
        const y1 = height - margins.bottom; // σa = 0
        
        const x2 = margins.left; // σm = 0
        const y2 = height - margins.bottom - Sy * yScale; // σa = Sy

        // Desenhar área de escoamento (triângulo)
        ctx.fillStyle = this.colors.areaEscoamento;
        ctx.beginPath();
        ctx.moveTo(x1, y1); // (Sy, 0)
        ctx.lineTo(x2, y2); // (0, Sy)
        ctx.lineTo(x2, y1); // (0, 0)
        ctx.closePath();
        ctx.fill();

        // Linha de escoamento
        ctx.strokeStyle = this.colors.linhaEscoamento;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1); // (Sy, 0)
        ctx.lineTo(x2, y2); // (0, Sy)
        ctx.stroke();
        ctx.setLineDash([]);
    }

    desenharAreaSegura() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;
        
        const Se = this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa;
        const Sut = this.config.Sut;
        const Sy = this.config.Sy;
        const maxTensao = Math.max(Se, Sut, Sy) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Área segura = SOBREPOSIÇÃO dos dois triângulos
        // Ou seja, a área que está dentro de AMBOS os triângulos
        ctx.fillStyle = this.colors.areaSegura;
        ctx.beginPath();
        
        // Começar na origem (0,0) - ponto comum a ambos os triângulos
        ctx.moveTo(margins.left, height - margins.bottom);
        
        // Seguir pelo eixo X até o ponto onde as duas linhas se encontram
        // ou até o menor limite no eixo X (Sy ou Sut)
        const xLimit = Math.min(Sy, Sut);
        ctx.lineTo(margins.left + xLimit * xScale, height - margins.bottom);
        
        // Agora subir pela linha MAIS BAIXA (mais restritiva) das duas
        // Isso cria a borda superior da área segura
        
        // Para cada ponto no eixo X, escolher a menor tensão alternada entre as duas linhas
        const pontos = [];
        const numPontos = 20;
        
        for (let i = 0; i <= numPontos; i++) {
            const σm = (xLimit * i) / numPontos;
            
            // Tensão alternada na linha de Goodman
            const σa_goodman = Se * (1 - σm / Sut);
            
            // Tensão alternada na linha de Escoamento (Sy-Sy)
            const σa_escoamento = Sy - σm;
            
            // Escolher a MENOR tensão alternada (mais restritiva)
            const σa_restritiva = Math.min(σa_goodman, σa_escoamento);
            
            // Só incluir pontos onde ambas as condições são satisfeitas
            if (σa_restritiva >= 0) {
                pontos.push({
                    x: margins.left + σm * xScale,
                    y: height - margins.bottom - σa_restritiva * yScale
                });
            }
        }
        
        // Conectar os pontos para formar a borda superior
        pontos.forEach((ponto, index) => {
            if (index === 0) {
                ctx.lineTo(ponto.x, ponto.y);
            } else {
                ctx.lineTo(ponto.x, ponto.y);
            }
        });
        
        // Voltar para a origem pelo eixo Y
        ctx.lineTo(margins.left, height - margins.bottom - Math.min(Se, Sy) * yScale);
        
        ctx.closePath();
        ctx.fill();
        
        // Opcional: desenhar a linha da borda superior para destacar
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margins.left, height - margins.bottom - Math.min(Se, Sy) * yScale);
        pontos.forEach(ponto => {
            ctx.lineTo(ponto.x, ponto.y);
        });
        ctx.stroke();
    }

    desenharRetanguloEsforco() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;
        
        const Se = this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa;
        const Sut = this.config.Sut;
        const Sy = this.config.Sy;
        const maxTensao = Math.max(Se, Sut, Sy) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Obter tensões corrigidas
        const tensoesCorrigidas = this.resultadosFadiga.limiteFadiga.fatores.tensoesCorrigidas;
        if (!tensoesCorrigidas) {
            console.warn("Dados de tensões corrigidas não disponíveis");
            return;
        }

        const vonMisesCorrigido = tensoesCorrigidas.vonMises.corrigido / 1e6; // MPa
        const flexaoCorrigida = tensoesCorrigidas.flexao.corrigida / 1e6; // MPa

        console.log("Tensões para retângulo:", { vonMisesCorrigido, flexaoCorrigida });

        // Retângulo de esforço: de (0,0) até (vonMisesCorrigido, flexaoCorrigida)
        const xStart = margins.left;
        const yStart = height - margins.bottom;
        const rectWidth = vonMisesCorrigido * xScale;
        const rectHeight = flexaoCorrigida * yScale;

        // Desenhar retângulo
        ctx.fillStyle = this.colors.retanguloEsforco;
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        
        ctx.fillRect(xStart, yStart - rectHeight, rectWidth, rectHeight);
        ctx.strokeRect(xStart, yStart - rectHeight, rectWidth, rectHeight);

        // Desenhar ponto no vértice do retângulo
        ctx.fillStyle = '#2980b9';
        ctx.beginPath();
        ctx.arc(xStart + rectWidth, yStart - rectHeight, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Linhas de referência do ponto
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Linha vertical até eixo X
        ctx.beginPath();
        ctx.moveTo(xStart + rectWidth, yStart - rectHeight);
        ctx.lineTo(xStart + rectWidth, yStart);
        ctx.stroke();
        
        // Linha horizontal até eixo Y
        ctx.beginPath();
        ctx.moveTo(xStart + rectWidth, yStart - rectHeight);
        ctx.lineTo(xStart, yStart - rectHeight);
        ctx.stroke();
        
        ctx.setLineDash([]);

        // Labels das tensões
        ctx.fillStyle = '#2980b9';
        ctx.font = 'bold 12px Arial';
        
        // Label no eixo X (von Mises)
        ctx.fillText(`σ' = ${vonMisesCorrigido.toFixed(1)} MPa`, 
                    xStart + rectWidth - 40, yStart + 20);
        
        // Label no eixo Y (flexão)
        ctx.fillText(`σ = ${flexaoCorrigida.toFixed(1)} MPa`, 
                    xStart - 70, yStart - rectHeight + 4);
    }

    desenharLegenda() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const margins = this.margins;

        const legendaItems = [
            { color: this.colors.linhaGoodman, text: 'Linha de Goodman (Se-Sut)' },
            { color: this.colors.linhaEscoamento, text: 'Linha de Escoamento (Sy-Sy)' },
            { color: this.colors.retanguloEsforco, text: 'Área de Esforço' },
            { color: this.colors.areaSegura, text: 'Área Segura (Interseção)' }
        ];

        ctx.font = '12px Arial';
        const itemHeight = 20;
        const startX = width - margins.right - 180;
        const startY = this.margins.top + 100;

        legendaItems.forEach((item, index) => {
            const y = startY + index * itemHeight;

            // Quadrado de cor
            ctx.fillStyle = item.color;
            if (item.text.includes('Área')) {
                ctx.fillRect(startX, y - 8, 15, 15);
            } else {
                ctx.fillRect(startX, y - 8, 15, 3);
            }

            // Texto
            ctx.fillStyle = this.colors.text;
            ctx.fillText(item.text, startX + 20, y);
        });
    }

    desenharTitulo() {
        const ctx = this.ctx;
        const width = this.canvas.width;

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Diagrama de Fadiga - Critério de Goodman Modificado', width / 2, 30);
        ctx.textAlign = 'left';
    }
}

// Função global para ser chamada pelo botão
function gerarDiagramaFadiga() {
    console.log("Gerando diagrama de fadiga...");
    
    try {
        // Tentar várias formas de obter os dados
        let dadosEixo, configuracao, resultadosEstatica;
        
        // Método 1: Do gerenciador global
        if (window.gerenciadorAtual) {
            console.log("Obtendo dados do gerenciador global...");
            dadosEixo = window.gerenciadorAtual.dadosEixo;
            configuracao = window.gerenciadorAtual.config;
            resultadosEstatica = window.gerenciadorAtual.resultadosEstatica;
        }
        // Método 2: Do window.gerenciadorDiagramas (se existir)
        else if (window.gerenciadorDiagramas) {
            console.log("Obtendo dados do window.gerenciadorDiagramas...");
            dadosEixo = window.gerenciadorDiagramas.dadosEixo;
            configuracao = window.gerenciadorDiagramas.config;
            resultadosEstatica = window.gerenciadorDiagramas.resultadosEstatica;
        }

        // Verificar se temos todos os dados necessários
        if (dadosEixo && configuracao && resultadosEstatica) {
            console.log("Dados encontrados, criando diagrama...");
            const diagrama = new DiagramaFadiga();
            diagrama.inicializar(dadosEixo, configuracao, resultadosEstatica);
            diagrama.adicionarInformacoesAdicionais();
        } else {
            console.error("Dados faltantes:", {
                dadosEixo: !!dadosEixo,
                configuracao: !!configuracao,
                resultadosEstatica: !!resultadosEstatica
            });
            alert('Erro: Dados de análise não encontrados. Execute a análise primeiro.');
        }
    } catch (error) {
        console.error('Erro ao gerar diagrama:', error);
        alert('Erro ao gerar diagrama: ' + error.message);
    }
}

// Adicionar método para informações adicionais
DiagramaFadiga.prototype.adicionarInformacoesAdicionais = function() {
    const container = document.querySelector('.resultados-fadiga');
    if (!container) return;

    // Remover informações anteriores se existirem
    const existingInfo = document.getElementById('info-diagrama');
    if (existingInfo) {
        existingInfo.remove();
    }

    const infoDiv = document.createElement('div');
    infoDiv.id = 'info-diagrama';
    infoDiv.style.margin = '20px auto';
    infoDiv.style.padding = '15px';
    infoDiv.style.background = '#f8f9fa';
    infoDiv.style.borderRadius = '8px';
    infoDiv.style.maxWidth = '800px';
    infoDiv.style.border = '1px solid #dee2e6';

    const resultados = this.resultadosFadiga;
    const tensoesCorrigidas = resultados.limiteFadiga.fatores.tensoesCorrigidas;
    
    const vonMisesCorrigido = tensoesCorrigidas ? tensoesCorrigidas.vonMises.corrigido / 1e6 : 0;
    const flexaoCorrigida = tensoesCorrigidas ? tensoesCorrigidas.flexao.corrigida / 1e6 : 0;
    const Se = resultados.limiteFadiga.detalhes.Se_MPa;
    const Sut = this.config.Sut;
    const Sy = this.config.Sy;

    // Verificar se está na área segura (Goodman Modificado)
    const criterioGoodman = (flexaoCorrigida / Se) + (vonMisesCorrigido / Sut) <= 1;
    const criterioEscoamento = (flexaoCorrigida / Sy) + (vonMisesCorrigido / Sy) <= 1;
    const seguro = criterioGoodman && criterioEscoamento;

    infoDiv.innerHTML = `
        <h4 style="color: #2c3e50; margin-bottom: 15px;">📋 Interpretação do Diagrama - Goodman Modificado</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <strong>Limite de Fadiga (Se):</strong> ${Se.toFixed(1)} MPa<br>
                <strong>Resistência Última (Sut):</strong> ${Sut} MPa<br>
                <strong>Limite de Escoamento (Sy):</strong> ${Sy} MPa
            </div>
            <div>
                <strong>σ Flexão Corrigida:</strong> ${flexaoCorrigida.toFixed(1)} MPa<br>
                <strong>σ' Von Mises Corrigido:</strong> ${vonMisesCorrigido.toFixed(1)} MPa<br>
                <strong>Status:</strong> <span style="color: ${seguro ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                    ${seguro ? 'SEGURO' : 'NÃO SEGURO'}
                </span>
            </div>
        </div>
        <div style="margin-top: 10px; font-size: 0.9em; color: #6c757d;">
            <strong>Critério de Goodman Modificado:</strong><br>
            • Goodman: σa/Se + σm/Sut ≤ 1 → ${criterioGoodman ? 'ATENDE' : 'NÃO ATENDE'}<br>
            • Escoamento: σa/Sy + σm/Sy ≤ 1 → ${criterioEscoamento ? 'ATENDE' : 'NÃO ATENDE'}<br>
            <strong>Área segura:</strong> Interseção dos dois triângulos (Goodman ∩ Escoamento)
        </div>
    `;

    container.appendChild(infoDiv);
};

console.log("diagrama2.js carregado com sucesso!");
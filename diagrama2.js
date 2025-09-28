// diagrama2.js
// diagrama2.js
class DiagramaFadiga {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.dados = null;
        this.margins = { top: 50, right: 50, bottom: 80, left: 80 };
        this.colors = {
            linhaFadiga: '#e74c3c',
            linhaTensao: '#3498db',
            areaSegura: 'rgba(46, 204, 113, 0.2)',
            areaInsegura: 'rgba(231, 76, 60, 0.2)',
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

        // Desenhar linha de fadiga (Se)
        this.desenharLinhaFadiga();

        // Desenhar ponto de tensão atual
        this.desenharPontoTensao();

        // Desenhar áreas segura/insegura
        this.desenharAreas();

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
        const maxTensao = Math.max(
            this.resultadosFadiga.tensaoMaxima / 1e6,
            this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa
        ) * 1.5;

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
    }

    desenharLinhaFadiga() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;
        
        const Se = this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa;
        const Sut = this.config.Sut;
        const maxTensao = Math.max(Se, Sut) * 1.2;

        ctx.strokeStyle = this.colors.linhaFadiga;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);

        // Linha de Goodman modificada: σa/Se + σm/Sut = 1
        ctx.beginPath();
        
        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        for (let σm = 0; σm <= Sut; σm += Sut / 100) {
            const σa = Se * (1 - σm / Sut);
            
            if (σa >= 0) {
                const x = margins.left + σm * xScale;
                const y = height - margins.bottom - σa * yScale;
                
                if (σm === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        
        ctx.stroke();

        // Adicionar label da linha de fadiga
        ctx.fillStyle = this.colors.linhaFadiga;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`Se = ${Se.toFixed(1)} MPa`, width - margins.right - 100, margins.top + 20);
    }

    desenharPontoTensao() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;
        
        const tensaoMax = this.resultadosFadiga.tensaoMaxima / 1e6;
        const Se = this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa;
        const maxTensao = Math.max(tensaoMax, Se) * 1.5;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Para simplificar, vamos considerar σm = 0 e σa = tensão máxima
        const σm = 0; // Tensão média (assumindo carga completamente reversa)
        const σa = tensaoMax; // Tensão alternada

        const x = margins.left + σm * xScale;
        const y = height - margins.bottom - σa * yScale;

        // Desenhar ponto
        ctx.fillStyle = this.colors.linhaTensao;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Desenhar linha de referência
        ctx.strokeStyle = this.colors.linhaTensao;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, height - margins.bottom);
        ctx.moveTo(x, y);
        ctx.lineTo(margins.left, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Adicionar label do ponto
        ctx.fillStyle = this.colors.linhaTensao;
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`σ = ${tensaoMax.toFixed(1)} MPa`, x + 10, y - 10);
    }

    desenharAreas() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = this.margins;
        
        const Se = this.resultadosFadiga.limiteFadiga.detalhes.Se_MPa;
        const Sut = this.config.Sut;
        const maxTensao = Math.max(Se, Sut) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Área segura (abaixo da linha de fadiga)
        ctx.fillStyle = this.colors.areaSegura;
        ctx.beginPath();
        ctx.moveTo(margins.left, height - margins.bottom);
        
        for (let σm = 0; σm <= Sut; σm += Sut / 100) {
            const σa = Se * (1 - σm / Sut);
            if (σa >= 0) {
                const x = margins.left + σm * xScale;
                const y = height - margins.bottom - σa * yScale;
                ctx.lineTo(x, y);
            }
        }
        
        ctx.lineTo(margins.left + Sut * xScale, height - margins.bottom);
        ctx.closePath();
        ctx.fill();

        // Área insegura (acima da linha de fadiga)
        ctx.fillStyle = this.colors.areaInsegura;
        ctx.beginPath();
        ctx.moveTo(margins.left, height - margins.bottom - Se * yScale);
        
        for (let σm = 0; σm <= Sut; σm += Sut / 100) {
            const σa = Se * (1 - σm / Sut);
            if (σa >= 0) {
                const x = margins.left + σm * xScale;
                const y = height - margins.bottom - σa * yScale;
                ctx.lineTo(x, y);
            }
        }
        
        ctx.lineTo(margins.left + Sut * xScale, height - margins.bottom);
        ctx.lineTo(margins.left, height - margins.bottom);
        ctx.closePath();
        ctx.fill();
    }

    desenharLegenda() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const margins = this.margins;

        const legendaItems = [
            { color: this.colors.linhaFadiga, text: 'Linha de Fadiga (Goodman)' },
            { color: this.colors.linhaTensao, text: 'Tensão de Trabalho' },
            { color: this.colors.areaSegura, text: 'Área Segura' },
            { color: this.colors.areaInsegura, text: 'Área Insegura' }
        ];

        ctx.font = '12px Arial';
        const itemHeight = 20;
        const startX = width - margins.right - 150;
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
// Função global melhorada para ser chamada pelo botão
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
        // Método 3: Tentar encontrar na página
        else {
            console.log("Tentando obter dados da página...");
            // Se você tem algum elemento na página que contém os dados, pode tentar aqui
            // Por exemplo, se os dados estão em variáveis globais ou em elementos HTML
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
            alert('Erro: Dados de análise não encontrados. Execute a análise primeiro.\n\nDicas:\n- Certifique-se de executar a análise estática primeiro\n- Verifique se todos os campos foram preenchidos\n- Recarregue a página e tente novamente');
        }
    } catch (error) {
        console.error('Erro ao gerar diagrama:', error);
        alert('Erro ao gerar diagrama: ' + error.message + '\n\nConsole aberto para mais detalhes.');
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
    const tensaoTrabalho = resultados.tensaoMaxima / 1e6;
    const limiteFadiga = resultados.limiteFadiga.detalhes.Se_MPa;
    const fatorSeguranca = limiteFadiga / tensaoTrabalho;

    infoDiv.innerHTML = `
        <h4 style="color: #2c3e50; margin-bottom: 15px;">📋 Interpretação do Diagrama</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <strong>Limite de Fadiga (Se):</strong> ${limiteFadiga.toFixed(1)} MPa<br>
                <strong>Tensão de Trabalho:</strong> ${tensaoTrabalho.toFixed(1)} MPa<br>
                <strong>Fator de Segurança:</strong> ${fatorSeguranca.toFixed(2)}
            </div>
            <div>
                <strong>Status:</strong> <span style="color: ${fatorSeguranca >= 1.5 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                    ${fatorSeguranca >= 1.5 ? 'PROJETO SEGURO' : 'ATENÇÃO REQUERIDA'}
                </span><br>
                <strong>Critério:</strong> Goodman Modificado<br>
                <strong>Material:</strong> ${this.config.tipoMaterial === 'aco' ? 'Aço' : 'Ferro Fundido'}
            </div>
        </div>
        <div style="margin-top: 10px; font-size: 0.9em; color: #6c757d;">
            <strong>Observação:</strong> O diagrama considera carga completamente reversa (σm = 0). 
            Para cargas com componente média, o ponto se moveria ao longo do eixo horizontal.
        </div>
    `;

    container.appendChild(infoDiv);
};

// Função de debug para verificar se o script foi carregado
console.log("diagrama2.js carregado com sucesso!");
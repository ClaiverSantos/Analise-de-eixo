// gerador-pdf.js - Versão atualizada com cores melhores e exibição na página
class GeradorPDF {
    constructor() {
        this.pdf = null;
        this.dados = null;
        this.canvas = null;
        this.ctx = null;
    }

    inicializar(resultados, dadosFormulario, dadosAnalise) {
        this.dados = {
            resultados: resultados,
            dadosFormulario: dadosFormulario,
            dadosAnalise: dadosAnalise
        };
        
        // Mostrar o diagrama na página
        this.mostrarDiagramaNaPagina();
    }

    mostrarDiagramaNaPagina() {
        const areaDiagrama = document.getElementById('areaDiagrama');
        const containerDiagrama = document.getElementById('containerDiagrama');
        const infoDiagrama = document.getElementById('infoDiagrama');
        
        if (!areaDiagrama || !containerDiagrama) return;

        // Limpar container
        containerDiagrama.innerHTML = '';
        
        // Criar canvas para exibição na página
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';
        this.canvas.style.border = '1px solid #ddd';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.background = 'white';
        this.canvas.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        
        containerDiagrama.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Renderizar diagrama
        this.renderizarDiagrama();
        
        // Mostrar informações
        this.mostrarInformacoesDiagrama(infoDiagrama);
        
        // Mostrar área do diagrama
        areaDiagrama.style.display = 'block';
        
        // Mostrar botão de exportar
        document.getElementById('btnGerarGrafico').style.display = 'block';
    }

    renderizarDiagrama() {
        if (!this.ctx || !this.canvas) return;
        
        const resultados = this.dados.resultados;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const margins = { top: 60, right: 50, bottom: 80, left: 80 };
        
        // Limpar canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Fundo gradiente suave
        const gradient = this.ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#ffffff');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
        
        // Desenhar elementos na ordem correta
        this.desenharGrade(width, height, margins);
        this.desenharAreaSegura(width, height, margins, resultados);
        this.desenharAreaGoodman(width, height, margins, resultados);
        this.desenharAreaEscoamento(width, height, margins, resultados);
        this.desenharEixos(width, height, margins);
        this.desenharLinhaGoodman(width, height, margins, resultados);
        this.desenharLinhaEscoamento(width, height, margins, resultados);
        this.desenharPontoOperacao(width, height, margins, resultados);
        this.desenharTitulo(width, height, resultados);
        this.desenharLegenda(width, height);
        this.desenharMarcacoesEspeciais(width, height, margins, resultados);
    }

    desenharGrade(width, height, margins) {
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 1;

        // Linhas verticais
        for (let x = margins.left; x <= width - margins.right; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, margins.top);
            this.ctx.lineTo(x, height - margins.bottom);
            this.ctx.stroke();
        }

        // Linhas horizontais
        for (let y = margins.top; y <= height - margins.bottom; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(margins.left, y);
            this.ctx.lineTo(width - margins.right, y);
            this.ctx.stroke();
        }
    }

    desenharAreaSegura(width, height, margins, resultados) {
        const Se = resultados.limiteFadiga.Se / 1e6;
        const Sut = resultados.configuracao.Sut;
        const Sy = resultados.configuracao.Sy;
        const maxTensao = Math.max(Se, Sut, Sy) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Área segura (interseção Goodman + Escoamento)
        this.ctx.fillStyle = 'rgba(39, 174, 96, 0.3)'; // Verde suave
        this.ctx.beginPath();
        
        // Para cada ponto no eixo X, escolher a menor tensão alternada
        const pontos = [];
        const numPontos = 50;
        const xLimit = Math.min(Sy, Sut);
        
        for (let i = 0; i <= numPontos; i++) {
            const σm = (xLimit * i) / numPontos;
            const σa_goodman = Se * (1 - σm / Sut);
            const σa_escoamento = Sy - σm;
            const σa_restritiva = Math.min(σa_goodman, σa_escoamento);
            
            if (σa_restritiva >= 0) {
                pontos.push({
                    x: margins.left + σm * xScale,
                    y: height - margins.bottom - σa_restritiva * yScale
                });
            }
        }
        
        // Criar área preenchida
        this.ctx.moveTo(margins.left, height - margins.bottom);
        pontos.forEach(ponto => {
            this.ctx.lineTo(ponto.x, ponto.y);
        });
        this.ctx.lineTo(margins.left, height - margins.bottom);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Borda da área segura
        this.ctx.strokeStyle = '#27ae60';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    desenharAreaGoodman(width, height, margins, resultados) {
        const Se = resultados.limiteFadiga.Se / 1e6;
        const Sut = resultados.configuracao.Sut;
        const maxTensao = Math.max(Se, Sut) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Área de Goodman (triângulo completo)
        this.ctx.fillStyle = 'rgba(231, 76, 60, 0.15)'; // Vermelho muito suave
        this.ctx.beginPath();
        this.ctx.moveTo(margins.left, height - margins.bottom - Se * yScale);
        this.ctx.lineTo(margins.left + Sut * xScale, height - margins.bottom);
        this.ctx.lineTo(margins.left, height - margins.bottom);
        this.ctx.closePath();
        this.ctx.fill();
    }

    desenharAreaEscoamento(width, height, margins, resultados) {
        const Sy = resultados.configuracao.Sy;
        const maxTensao = Math.max(Sy, resultados.configuracao.Sut, resultados.limiteFadiga.Se / 1e6) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Área de Escoamento (triângulo completo)
        this.ctx.fillStyle = 'rgba(243, 156, 18, 0.15)'; // Laranja muito suave
        this.ctx.beginPath();
        this.ctx.moveTo(margins.left + Sy * xScale, height - margins.bottom);
        this.ctx.lineTo(margins.left, height - margins.bottom - Sy * yScale);
        this.ctx.lineTo(margins.left, height - margins.bottom);
        this.ctx.closePath();
        this.ctx.fill();
    }

    desenharEixos(width, height, margins) {
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = '13px Arial';

        // Eixo Y (σa)
        this.ctx.beginPath();
        this.ctx.moveTo(margins.left, margins.top);
        this.ctx.lineTo(margins.left, height - margins.bottom);
        this.ctx.stroke();

        // Eixo X (σm)
        this.ctx.beginPath();
        this.ctx.moveTo(margins.left, height - margins.bottom);
        this.ctx.lineTo(width - margins.right, height - margins.bottom);
        this.ctx.stroke();

        // Rótulos dos eixos
        this.ctx.save();
        this.ctx.translate(margins.left - 45, height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('Tensão Alternada σa (MPa)', 0, 0);
        this.ctx.restore();

        this.ctx.fillText('Tensão Média σm (MPa)', width / 2 - 65, height - 25);
    }

    desenharLinhaGoodman(width, height, margins, resultados) {
        const Se = resultados.limiteFadiga.Se / 1e6;
        const Sut = resultados.configuracao.Sut;
        const maxTensao = Math.max(Se, Sut) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Linha de Goodman
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([]);

        this.ctx.beginPath();
        this.ctx.moveTo(margins.left, height - margins.bottom - Se * yScale);
        this.ctx.lineTo(margins.left + Sut * xScale, height - margins.bottom);
        this.ctx.stroke();
    }

    desenharLinhaEscoamento(width, height, margins, resultados) {
        const Sy = resultados.configuracao.Sy;
        const maxTensao = Math.max(Sy, resultados.configuracao.Sut, resultados.limiteFadiga.Se / 1e6) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Linha de Escoamento
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);

        this.ctx.beginPath();
        this.ctx.moveTo(margins.left + Sy * xScale, height - margins.bottom);
        this.ctx.lineTo(margins.left, height - margins.bottom - Sy * yScale);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    desenharPontoOperacao(width, height, margins, resultados) {
        const tensoes = resultados.tensoes;
        const vonMises_MPa = tensoes.von_mises / 1e6;
        const flexao_MPa = tensoes.flexao / 1e6;
        
        const maxTensao = Math.max(
            resultados.limiteFadiga.Se / 1e6,
            resultados.configuracao.Sut,
            resultados.configuracao.Sy
        ) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        const x = margins.left + vonMises_MPa * xScale;
        const y = height - margins.bottom - flexao_MPa * yScale;

        // Verificar se está na área segura
        const criterioGoodman = (flexao_MPa / (resultados.limiteFadiga.Se / 1e6)) + (vonMises_MPa / resultados.configuracao.Sut) <= 1;
        const criterioEscoamento = (flexao_MPa / resultados.configuracao.Sy) + (vonMises_MPa / resultados.configuracao.Sy) <= 1;
        const seguro = criterioGoodman && criterioEscoamento;

        // Desenhar ponto com cor baseada na segurança
        const corPonto = seguro ? '#27ae60' : '#e74c3c';
        
        // Ponto central
        this.ctx.fillStyle = corPonto;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, 2 * Math.PI);
        this.ctx.fill();

        // Anel externo
        this.ctx.strokeStyle = corPonto;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15, 0, 2 * Math.PI);
        this.ctx.stroke();

        // Sombra do ponto
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Linhas de referência
        this.ctx.strokeStyle = '#2980b9';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, height - margins.bottom);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(margins.left, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Label do ponto
        this.ctx.fillStyle = corPonto;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('● Ponto de Operação', x + 20, y - 10);
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`σm: ${vonMises_MPa.toFixed(1)} MPa`, x + 20, y + 10);
        this.ctx.fillText(`σa: ${flexao_MPa.toFixed(1)} MPa`, x + 20, y + 25);
        this.ctx.fillText(`Status: ${seguro ? 'SEGURO' : 'CRÍTICO'}`, x + 20, y + 40);
    }

    desenharTitulo(width, height, resultados) {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DIAGRAMA DE FADIGA - GOODMAN MODIFICADO', width / 2, 30);

        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillText(`Fator de Segurança: ${resultados.fatorSeguranca.toFixed(2)} | ${resultados.segura ? 'PROJETO ADEQUADO' : 'ATENÇÃO REQUERIDA'}`, width / 2, 50);
    }

    desenharLegenda(width, height) {
        const legendaItems = [
            { color: '#e74c3c', text: 'Linha de Goodman (Se-Sut)', type: 'line' },
            { color: '#f39c12', text: 'Linha de Escoamento (Sy-Sy)', type: 'dashed' },
            { color: '#27ae60', text: 'Área Segura', type: 'area' },
            { color: '#27ae60', text: 'Ponto Seguro', type: 'point' },
            { color: '#e74c3c', text: 'Ponto Crítico', type: 'point' }
        ];

        const startX = width - 220;
        const startY = 100;
        const itemHeight = 25;

        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#2c3e50';

        legendaItems.forEach((item, index) => {
            const y = startY + index * itemHeight;

            if (item.type === 'line') {
                this.ctx.strokeStyle = item.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(startX, y - 5);
                this.ctx.lineTo(startX + 20, y - 5);
                this.ctx.stroke();
            } else if (item.type === 'dashed') {
                this.ctx.strokeStyle = item.color;
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 3]);
                this.ctx.beginPath();
                this.ctx.moveTo(startX, y - 5);
                this.ctx.lineTo(startX + 20, y - 5);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            } else if (item.type === 'area') {
                this.ctx.fillStyle = 'rgba(39, 174, 96, 0.3)';
                this.ctx.fillRect(startX, y - 10, 20, 15);
                this.ctx.strokeStyle = '#27ae60';
                this.ctx.strokeRect(startX, y - 10, 20, 15);
            } else if (item.type === 'point') {
                this.ctx.fillStyle = item.color;
                this.ctx.beginPath();
                this.ctx.arc(startX + 10, y - 5, 6, 0, 2 * Math.PI);
                this.ctx.fill();
            }

            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillText(item.text, startX + 30, y);
        });
    }

    desenharMarcacoesEspeciais(width, height, margins, resultados) {
        const Se = resultados.limiteFadiga.Se / 1e6;
        const Sut = resultados.configuracao.Sut;
        const Sy = resultados.configuracao.Sy;
        const maxTensao = Math.max(Se, Sut, Sy) * 1.2;

        const xScale = (width - margins.left - margins.right) / maxTensao;
        const yScale = (height - margins.top - margins.bottom) / maxTensao;

        // Marcas especiais nos eixos
        this.ctx.font = 'bold 12px Arial';
        
        // Se no eixo Y
        const ySe = height - margins.bottom - Se * yScale;
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillText(`Se = ${Se.toFixed(1)}`, margins.left - 70, ySe + 4);
        
        // Sut no eixo X
        const xSut = margins.left + Sut * xScale;
        this.ctx.fillText(`Sut = ${Sut}`, xSut - 25, height - margins.bottom + 35);

        // Sy nos eixos
        this.ctx.fillStyle = '#f39c12';
        const ySy = height - margins.bottom - Sy * yScale;
        this.ctx.fillText(`Sy = ${Sy}`, margins.left - 70, ySy + 4);
        
        const xSy = margins.left + Sy * xScale;
        this.ctx.fillText(`Sy = ${Sy}`, xSy - 25, height - margins.bottom + 55);
    }

    mostrarInformacoesDiagrama(container) {
        if (!container) return;
        
        const resultados = this.dados.resultados;
        const tensoes = resultados.tensoes;
        
        const vonMises_MPa = tensoes.von_mises / 1e6;
        const flexao_MPa = tensoes.flexao / 1e6;
        const Se_MPa = resultados.limiteFadiga.Se / 1e6;

        // Verificar critérios
        const criterioGoodman = (flexao_MPa / Se_MPa) + (vonMises_MPa / resultados.configuracao.Sut) <= 1;
        const criterioEscoamento = (flexao_MPa / resultados.configuracao.Sy) + (vonMises_MPa / resultados.configuracao.Sy) <= 1;
        const seguro = criterioGoodman && criterioEscoamento;

        container.innerHTML = `
            <div class="${seguro ? 'diagrama-seguro' : 'diagrama-critico'}">
                <h4>📋 Interpretação do Diagrama</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                    <div>
                        <strong>Critério de Goodman:</strong><br>
                        σa/Se + σm/Sut ≤ 1<br>
                        <span style="color: ${criterioGoodman ? '#27ae60' : '#e74c3c'}">
                            ${(flexao_MPa / Se_MPa).toFixed(3)} + ${(vonMises_MPa / resultados.configuracao.Sut).toFixed(3)} = ${((flexao_MPa / Se_MPa) + (vonMises_MPa / resultados.configuracao.Sut)).toFixed(3)} 
                            → ${criterioGoodman ? '✓ ATENDE' : '✗ NÃO ATENDE'}
                        </span>
                    </div>
                    <div>
                        <strong>Critério de Escoamento:</strong><br>
                        σa/Sy + σm/Sy ≤ 1<br>
                        <span style="color: ${criterioEscoamento ? '#27ae60' : '#e74c3c'}">
                            ${(flexao_MPa / resultados.configuracao.Sy).toFixed(3)} + ${(vonMises_MPa / resultados.configuracao.Sy).toFixed(3)} = ${((flexao_MPa / resultados.configuracao.Sy) + (vonMises_MPa / resultados.configuracao.Sy)).toFixed(3)}
                            → ${criterioEscoamento ? '✓ ATENDE' : '✗ NÃO ATENDE'}
                        </span>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 10px; background: ${seguro ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)'}; border-radius: 5px;">
                    <strong>Conclusão:</strong> O ponto de operação está <strong>${seguro ? 'DENTRO' : 'FORA'}</strong> da área segura.
                    ${seguro ? 'O projeto atende aos critérios de fadiga e escoamento.' : 'Revisão do projeto é recomendada.'}
                </div>
            </div>
        `;
    }

    gerarPDFGrafico() {
        if (!this.canvas) {
            alert('Diagrama não está disponível para exportação.');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Adicionar cabeçalho
            pdf.setFontSize(16);
            pdf.setTextColor(44, 62, 80);
            pdf.text('RELATÓRIO DE ANÁLISE DE FADIGA - DIAGRAMA DE GOODMAN', 20, 20);

            // Informações básicas
            pdf.setFontSize(10);
            pdf.setTextColor(127, 140, 141);
            pdf.text(`Data: ${new Date().toLocaleDateString()}`, 20, 30);
            pdf.text(`Hora: ${new Date().toLocaleTimeString()}`, 20, 35);

            // Converter canvas para imagem
            const imgData = this.canvas.toDataURL('image/png', 1.0);
            
            // Adicionar imagem do diagrama (maior e centralizada)
            pdf.addImage(imgData, 'PNG', 15, 45, 270, 160);

            // Adicionar resumo
            this.adicionarResumoPDF(pdf);

            // Salvar PDF
            pdf.save(`diagrama-fadiga-${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF: ' + error.message);
        }
    }

    adicionarResumoPDF(pdf) {
        const resultados = this.dados.resultados;
        const tensoes = resultados.tensoes;
        
        pdf.setFontSize(12);
        pdf.setTextColor(44, 62, 80);
        pdf.text('RESUMO TÉCNICO', 20, 220);

        pdf.setFontSize(10);
        let yPos = 230;
        
        const resumo = [
            `Fator de Segurança: ${resultados.fatorSeguranca.toFixed(2)}`,
            `Status do Projeto: ${resultados.segura ? 'ADEQUADO' : 'REQUER ATENÇÃO'}`,
            `Limite de Fadiga Corrigido (Se): ${(resultados.limiteFadiga.Se / 1e6).toFixed(1)} MPa`,
            `Tensão Alternada (σa): ${(tensoes.flexao / 1e6).toFixed(1)} MPa`,
            `Tensão Média (σm): ${(tensoes.von_mises / 1e6).toFixed(1)} MPa`,
            `Fator de Concentração Kf: ${resultados.fatoresConcentracao.Kf.toFixed(3)}`,
            `Fator de Concentração Kfs: ${resultados.fatoresConcentracao.Kfs.toFixed(3)}`,
            `Material: ${this.obterDescricaoMaterial()}`,
            `Confiabilidade: ${resultados.configuracao.confiabilidade}%`
        ];

        resumo.forEach((item, index) => {
            const x = index < 5 ? 20 : 120;
            const lineY = yPos + (index % 5) * 6;
            pdf.text(item, x, lineY);
        });

        // Adicionar observações
        pdf.setFontSize(10);
        pdf.setTextColor(127, 140, 141);
        pdf.text('* Diagrama baseado no critério de Goodman modificado', 20, 265);
        pdf.text('* Área segura considera interseção dos critérios de fadiga e escoamento', 20, 270);
    }

    obterDescricaoMaterial() {
        const tipo = this.dados.dadosFormulario?.tipoMaterial || 'aço';
        const acabamento = this.dados.dadosFormulario?.material?.acabamento || 'usinado';
        
        const tipos = {
            'aco': 'Aço',
            'ferro': 'Ferro Fundido'
        };
        
        const acabamentos = {
            'usinado': 'Usinado',
            'retificado': 'Retificado', 
            'laminado': 'Laminado',
            'forjado': 'Forjado'
        };
        
        return `${tipos[tipo] || 'Aço'} ${acabamentos[acabamento] || 'Usinado'}`;
    }
}

// Inicializar gerador global
window.geradorPDF = new GeradorPDF();
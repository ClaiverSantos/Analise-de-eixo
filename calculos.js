// --- Início das Classes de Cálculo ---

class CalculadorFadiga {
    constructor(dadosEixo, propriedadesMaterial) {
        this.dadosEixo = dadosEixo;
        this.material = propriedadesMaterial;
    }

    // Funções auxiliares de conversão
    mmParaMetros(valorMM) {
        return valorMM / 1000;
    }

    MPaParaPa(valorMPa) {
        return valorMPa * 1e6;
    }

    // Cálculos básicos de tensão
    calcularTensaoFlexao(momentoFletor, diametroMM) {
        const diametroM = this.mmParaMetros(diametroMM);
        const I = Math.PI * Math.pow(diametroM, 4) / 64;
        const c = diametroM / 2;
        return (momentoFletor * c) / I;
    }

    calcularTensaoTorsao(torque, diametroMM) {
        const diametroM = this.mmParaMetros(diametroMM);
        const J = Math.PI * Math.pow(diametroM, 4) / 32;
        const c = diametroM / 2;
        return (torque * c) / J;
    }

    // Cálculo de reações nos mancais
    calcularReacoes() {
        const mancais = this.dadosEixo.pontos.filter(p => p.tipo === 'mancal');
        const cargas = this.dadosEixo.carregamentos;
        
        if (mancais.length < 2) {
            throw new Error('São necessários pelo menos 2 mancais para cálculo de reações');
        }

        const R1 = mancais[0];
        const R2 = mancais[1];

        let somaMomentos = 0;
        cargas.forEach(carga => {
            const braco = this.mmParaMetros(carga.x - R1.x);
            somaMomentos += carga.forca * braco;
        });

        const distanciaMancais = this.mmParaMetros(R2.x - R1.x);
        const R2_valor = somaMomentos / distanciaMancais;
        const R1_valor = cargas.reduce((sum, c) => sum + c.forca, 0) - R2_valor;

        return {
            R1: { x: R1.x, valor: R1_valor },
            R2: { x: R2.x, valor: R2_valor }
        };
    }

    // Diagrama de momento fletor
    calcularMomentoFletor(posicaoX) {
        const reacoes = this.calcularReacoes();
        const cargas = this.dadosEixo.carregamentos;
        
        let momento = 0;

        if (posicaoX > reacoes.R1.x) {
            const braco = this.mmParaMetros(posicaoX - reacoes.R1.x);
            momento += reacoes.R1.valor * braco;
        }

        cargas.forEach(carga => {
            if (carga.x < posicaoX) {
                const braco = this.mmParaMetros(posicaoX - carga.x);
                momento -= carga.forca * braco;
            }
        });

        return momento;
    }

    // CORREÇÃO CRÍTICA: Obter diâmetros da seção de forma inteligente
    obterDiametrosSecao(ponto) {
        if (ponto.tipo === 'mudanca') {
            let diametro_antes = ponto.d;
            let diametro_depois = ponto.d;
            
            // Encontrar seção que TERMINA no ponto X (anterior)
            for (let secao of this.dadosEixo.secoes) {
                if (Math.abs(secao.posicaoFim - ponto.x) < 1) {
                    diametro_antes = secao.diametro;
                    break;
                }
            }
            
            // Encontrar seção que COMEÇA no ponto X (posterior)
            for (let secao of this.dadosEixo.secoes) {
                if (Math.abs(secao.posicaoInicio - ponto.x) < 1) {
                    diametro_depois = secao.diametro;
                    break;
                }
            }
            
            const d_menor = Math.min(diametro_antes, diametro_depois);
            const D_maior = Math.max(diametro_antes, diametro_depois);
            
            return { 
                d_menor: d_menor, 
                D_maior: D_maior 
            };
        }
        return { d_menor: ponto.d, D_maior: ponto.d };
    }
    // Identificar apenas seções de mudança
    identificarMudancasCriticas() {
        const mudancasCriticas = [];
        
        this.dadosEixo.pontos.forEach(ponto => {
            if (ponto.tipo === 'mudanca') {
                const { d_menor, D_maior } = this.obterDiametrosSecao(ponto);
                const diametro_calculo = d_menor;

                const momento = this.calcularMomentoFletor(ponto.x);
                const tensaoFlexao = this.calcularTensaoFlexao(momento, diametro_calculo);
                
                let torqueTotal = 0;
                this.dadosEixo.carregamentos.forEach(carga => {
                    if (carga.x <= ponto.x) {
                        torqueTotal += carga.torque;
                    }
                });
                
                const tensaoTorsao = this.calcularTensaoTorsao(torqueTotal, diametro_calculo);
                
                const sigma_vonMises = Math.sqrt(
                    Math.pow(tensaoFlexao, 2) + 3 * Math.pow(tensaoTorsao, 2)
                );
                
                mudancasCriticas.push({
                    posicao: ponto.x,
                    diametro_menor: d_menor,
                    diametro_maior: D_maior,
                    tipo: ponto.tipo,
                    momentoFletor: momento,
                    torque: torqueTotal,
                    tensaoFlexao: tensaoFlexao,
                    tensaoTorsao: tensaoTorsao,
                    sigma_vonMises: sigma_vonMises,
                    raio: ponto.raio
                });
            }
        });

        return mudancasCriticas.sort((a, b) => b.momentoFletor - a.momentoFletor);
    }

    // Encontrar a mudança mais crítica
    encontrarMudancaMaisCritica() {
        const mudancas = this.identificarMudancasCriticas();
        if (mudancas.length === 0) return null;
        
        return mudancas.sort((a, b) => b.sigma_vonMises - a.sigma_vonMises)[0];
    }

    // Cálculos detalhados para uma seção
    calcularTensoesDetalhadas(secao) {
        const SyMPa = this.material.Sy / 1e6;

        const tensaoFlexaoMPa = secao.tensaoFlexao / 1e6;
        const tensaoTorsaoMPa = secao.tensaoTorsao / 1e6;
        
        const sigma_x = tensaoFlexaoMPa;
        const tau_xy = tensaoTorsaoMPa;
        
        const sigma_1 = (sigma_x / 2) + Math.sqrt(Math.pow(sigma_x / 2, 2) + Math.pow(tau_xy, 2));
        const sigma_2 = (sigma_x / 2) - Math.sqrt(Math.pow(sigma_x / 2, 2) + Math.pow(tau_xy, 2));
        const tau_max = Math.sqrt(Math.pow(sigma_x / 2, 2) + Math.pow(tau_xy, 2));
        
        return {
            tensaoFlexao: tensaoFlexaoMPa,
            tensaoTorsao: tensaoTorsaoMPa,
            sigmaVonMises: secao.sigma_vonMises / 1e6,
            tensoesPrincipais: {
                sigma1: sigma_1,
                sigma2: sigma_2,
                tauMax: tau_max
            },
            fatorSeguranca: SyMPa / (secao.sigma_vonMises / 1e6)
        };
    }
}

// --- Classe de Integração ---

class IntegradorCalculos {
    constructor() {
        this.calculador = null;
    }

    inicializarCalculos(dadosEixoJSON) {
        const propriedadesMaterial = {
            Sut: this.MPaParaPa(1515.8),
            Sy: this.MPaParaPa(1240.2),
            Se: this.MPaParaPa(700),
            acabamento: 'retificado',
            dureza: 131
        };

        this.calculador = new CalculadorFadiga(dadosEixoJSON, propriedadesMaterial);
        return this.calculador;
    }

    MPaParaPa(valorMPa) {
        return valorMPa * 1e6;
    }

    executarCalculosCompletos() {
        if (!this.calculador) {
            throw new Error('Calculador não inicializado');
        }

        const resultados = {
            reacoes: this.calculador.calcularReacoes(),
            mudancasCriticas: this.calculador.identificarMudancasCriticas(),
            mudancaMaisCritica: this.calculador.encontrarMudancaMaisCritica(),
            dadosEixo: this.calculador.dadosEixo // Adicionado para passar para a próxima guia
        };

        return resultados;
    }
}

// --- Funções Globais e de Interface ---

window.CalculadorFadiga = CalculadorFadiga;
window.IntegradorCalculos = IntegradorCalculos;

window.fecharCalculos = function() {
    const guia = document.getElementById('guiaCalculos');
    if (guia) {
        guia.remove();
    }
};

window.abrirCalculos = function(dadosEixo) {
    const guiaCalculos = document.createElement('div');
    guiaCalculos.className = 'guia-calculos';
    guiaCalculos.id = 'guiaCalculos';
    
    guiaCalculos.innerHTML = `
        <div class="cabecalho-calculos">
            <h2>📊 Cálculos de Fadiga - Eixo</h2>
            <button onclick="fecharCalculos()" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                Fechar ×
            </button>
        </div>
        <div class="conteudo-calculos">
            <div id="resultadosCalculos"></div>
        </div>
    `;
    
    document.body.appendChild(guiaCalculos);
    document.getElementById('guiaCalculos').style.display = 'block';
    
    mostrarResultadosCalculos(dadosEixo);
};

// NOVA FUNÇÃO: Abrir guia de diagramas e fadiga
window.abrirDiagramasFadiga = function(resultadosCalculos) {
    const guiaDiagramas = document.createElement('div');
    guiaDiagramas.className = 'guia-calculos';
    guiaDiagramas.id = 'guiaDiagramas';
    
    guiaDiagramas.innerHTML = `
        <div class="cabecalho-calculos">
            <h2>📈 Diagramas e Análise de Fadiga</h2>
            <button onclick="fecharDiagramas()" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                Fechar ×
            </button>
        </div>
        <div class="conteudo-calculos">
            <div id="conteudoDiagramas">
                <h3>🚀 Análise de Fadiga em Desenvolvimento</h3>
                <p>Esta funcionalidade será implementada na próxima etapa!</p>
                <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>Dados Recebidos da Análise Estática:</h4>
                    <pre>${JSON.stringify({
                        mudancaMaisCritica: resultadosCalculos.mudancaMaisCritica ? {
                            posicao: resultadosCalculos.mudancaMaisCritica.posicao,
                            diametro_menor: resultadosCalculos.mudancaMaisCritica.diametro_menor,
                            diametro_maior: resultadosCalculos.mudancaMaisCritica.diametro_maior,
                            momentoFletor: resultadosCalculos.mudancaMaisCritica.momentoFletor,
                            torque: resultadosCalculos.mudancaMaisCritica.torque
                        } : null,
                        totalMudancas: resultadosCalculos.mudancasCriticas.length
                    }, null, 2)}</pre>
                </div>
                <button onclick="iniciarCalculosFadiga()" class="verde" style="margin-top: 20px;">
                    🔍 Iniciar Cálculos de Fadiga
                </button>
            </div>
        </div>
    `;
    
    // Fechar a guia atual e abrir a nova
    window.fecharCalculos();
    document.body.appendChild(guiaDiagramas);
    document.getElementById('guiaDiagramas').style.display = 'block';
};

window.fecharDiagramas = function() {
    const guia = document.getElementById('guiaDiagramas');
    if (guia) {
        guia.remove();
    }
};

window.iniciarCalculosFadiga = function() {
    alert('Cálculos de fadiga serão implementados na próxima etapa!');
    // Aqui vamos implementar Goodman, ASME Elíptico, etc.
};

function mostrarResultadosCalculos(dadosEixo) {
    const container = document.getElementById('resultadosCalculos');
    
    try {
        const integrador = new IntegradorCalculos();
        integrador.inicializarCalculos(dadosEixo);
        const resultados = integrador.executarCalculosCompletos();
        
        // Guardar resultados globalmente para usar na próxima guia
        window.ultimosResultados = resultados;
        
        container.innerHTML = gerarHTMLResultados(resultados, dadosEixo, integrador);
        
    } catch (error) {
        container.innerHTML = `
            <div style="color: red; padding: 20px; background: #fee;">
                <h3>❌ Erro nos Cálculos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function gerarHTMLResultados(resultados, dadosEixo, integrador) {
    let html = '';
    
    // Reações nos mancais
    html += `
        <div class="painel-resultados">
            <h3>⚖️ Reações nos Mancais</h3>
            <table class="tabela-resultados">
                <tr><th>Mancal</th><th>Posição (mm)</th><th>Reação (N)</th></tr>
                <tr>
                    <td>R1</td><td>${resultados.reacoes.R1.x}</td><td>${resultados.reacoes.R1.valor.toFixed(1)} N</td>
                </tr>
                <tr>
                    <td>R2</td><td>${resultados.reacoes.R2.x}</td><td>${resultados.reacoes.R2.valor.toFixed(1)} N</td>
                </tr>
            </table>
        </div>
    `;

    const maisCritica = resultados.mudancaMaisCritica;

    // Seção Mais Crítica
    if (maisCritica) {
        const tensoes = integrador.calculador.calcularTensoesDetalhadas(maisCritica);
        
        html += `
            <div class="painel-resultados" style="border: 3px solid #dc3545; background: #fff5f5;">
                <h3>⚠️ MUDANÇA MAIS CRÍTICA (Posição ${maisCritica.posicao} mm)</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0;">
                    <div>
                        <h4>Dados da Seção</h4>
                        <p><strong>Posição:</strong> ${maisCritica.posicao} mm</p>
                        <p><strong>Diâmetro menor (d):</strong> Ø${maisCritica.diametro_menor} mm</p>
                        <p><strong>Diâmetro maior (D):</strong> Ø${maisCritica.diametro_maior} mm</p>
                        <p><strong>Raio:</strong> ${maisCritica.raio} mm</p>
                        <p><strong>Momento Fletor:</strong> ${maisCritica.momentoFletor.toFixed(2)} Nm</p>
                        <p><strong>Torque:</strong> ${maisCritica.torque} Nm</p>
                    </div>
                    <div>
                        <h4>Tensões no Diâmetro Menor (d)</h4>
                        <p><strong>σ Flexão:</strong> ${tensoes.tensaoFlexao.toFixed(1)} MPa</p>
                        <p><strong>τ Cisalhamento:</strong> ${tensoes.tensaoTorsao.toFixed(1)} MPa</p>
                        <p><strong>σ' Von Mises:</strong> ${tensoes.sigmaVonMises.toFixed(1)} MPa</p>
                        <p><strong>n Estático:</strong> ${tensoes.fatorSeguranca.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Apenas mudanças
    html += `
        <div class="painel-resultados">
            <h3>🎯 Seções de Mudança (Ordenadas por Momento)</h3>
            <table class="tabela-resultados">
                <tr>
                    <th>Posição</th>
                    <th>Diâm. d</th>
                    <th>Diâm. D</th>
                    <th>Momento (Nm)</th>
                    <th>Torque (Nm)</th>
                    <th>σ' Von Mises (MPa)</th>
                    <th>n Estático</th>
                </tr>
    `;
    
    resultados.mudancasCriticas.forEach((mudanca) => {
        const tensoes = integrador.calculador.calcularTensoesDetalhadas(mudanca);
        const isDestaque = mudanca === maisCritica;
        
        html += `
            <tr ${isDestaque ? 'class="secao-critica"' : ''}>
                <td>${mudanca.posicao} mm</td>
                <td>Ø${mudanca.diametro_menor} mm</td>
                <td>Ø${mudanca.diametro_maior} mm</td>
                <td>${mudanca.momentoFletor.toFixed(2)}</td>
                <td>${mudanca.torque}</td>
                <td>${tensoes.sigmaVonMises.toFixed(1)}</td>
                <td>${tensoes.fatorSeguranca.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `</table></div>`;

    // Desenho do eixo
    html += gerarDesenhoEixo(resultados, dadosEixo);
    
    // Botões ATUALIZADOS
    html += `
        <div class="grupo-botoes">
            <button onclick="exportarResultados()" class="verde">📥 Exportar Resultados</button>
            <button onclick="abrirDiagramasFadiga(window.ultimosResultados)" class="laranja">📈 Analise de Fadiga</button>
        </div>
    `;
    
    return html;
}

function gerarDesenhoEixo(resultados, dadosEixo) {
    const maisCritica = resultados.mudancaMaisCritica;
    
    let html = `
        <div class="painel-resultados">
            <h3>📐 Visualização do Eixo</h3>
            <div style="position: relative; height: 300px; border: 1px solid #ddd; background: #f9f9f9; overflow-x: auto; padding: 20px 0;">
                <div id="desenhoEixoContainer" style="position: relative; height: 100%; min-width: 100%;">
    `;

    // Desenhar o eixo
    dadosEixo.secoes.forEach((secao, index) => {
        const largura = secao.comprimento * 2;
        const altura = secao.diametro * 4;
        const left = secao.posicaoInicio * 2;
        
        html += `
            <div style="position: absolute; left: ${left}px; top: 50%; transform: translateY(-50%); 
                       width: ${largura}px; height: ${altura}px; background: #007bff; 
                       border: 2px solid #0056b3; border-radius: 2px;">
                <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); 
                           white-space: nowrap; font-size: 12px; background: white; padding: 2px 5px;">
                    Ø${secao.diametro}mm
                </div>
                <div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); 
                           font-size: 10px; color: #666;">
                    ${secao.comprimento}mm
                </div>
            </div>
        `;
    });

    // Marcar pontos importantes
    dadosEixo.pontos.forEach(ponto => {
        if (['mancal', 'carga', 'mudanca'].includes(ponto.tipo)) {
            const left = ponto.x * 2;
            const isCritico = ponto.tipo === 'mudanca' && maisCritica && ponto.x === maisCritica.posicao;
            
            let cor, simbolo, titulo;
            switch(ponto.tipo) {
                case 'mancal':
                    cor = '#dc3545';
                    simbolo = '⚙️';
                    titulo = `Mancal - R: ${resultados.reacoes[ponto.x === resultados.reacoes.R1.x ? 'R1' : 'R2'].valor.toFixed(1)}N`;
                    break;
                case 'carga':
                    cor = '#ffc107';
                    simbolo = '📌';
                    const carga = dadosEixo.carregamentos.find(c => c.x === ponto.x);
                    titulo = `Carga - F: ${carga ? carga.forca + 'N' : '0N'}, T: ${carga ? carga.torque + 'Nm' : '0Nm'}`;
                    break;
                case 'mudanca':
                    cor = isCritico ? '#dc3545' : '#007bff';
                    simbolo = isCritico ? '⚠️' : '📐';
                    const mudanca = resultados.mudancasCriticas.find(m => m.posicao === ponto.x);
                    titulo = `Mudança - M: ${mudanca ? mudanca.momentoFletor.toFixed(1) + 'Nm' : '0Nm'}`;
                    break;
            }
            
            html += `
                <div style="position: absolute; left: ${left}px; top: 50%; transform: translate(-50%, -50%);
                           width: 20px; height: 20px; background: ${cor}; border-radius: 50%; border: 2px solid white;
                           display: flex; align-items: center; justify-content: center; font-size: 12px;
                           box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: help; z-index: 10;"
                     title="${titulo}">
                    ${simbolo}
                </div>
            `;
            
            // Linha vertical para o ponto
            html += `
                <div style="position: absolute; left: ${left}px; top: 0; bottom: 0; width: 1px; 
                           background: ${cor}; opacity: 0.5; z-index: 5;"></div>
            `;
        }
    });

    html += `
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                <strong>Legenda:</strong> 
                <span style="color: #dc3545;">⚙️ Mancal</span> | 
                <span style="color: #ffc107;">📌 Carga</span> | 
                <span style="color: #007bff;">📐 Mudança</span> | 
                <span style="color: #dc3545;">⚠️ Mudança Crítica</span>
            </div>
        </div>
    `;

    return html;
}

// Funções auxiliares
window.exportarResultados = function() {
    const resultados = document.getElementById('resultadosCalculos').innerHTML;
    const blob = new Blob([resultados], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calculos-eixo.html';
    a.click();
};
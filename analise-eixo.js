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

    // Obter diâmetros da seção
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
        } else {
            // Para mancais e cargas, encontrar a seção onde estão localizados
            const secaoAtual = this.dadosEixo.secoes.find(secao => 
                ponto.x >= secao.posicaoInicio && ponto.x <= secao.posicaoFim
            );
            const diametro = secaoAtual ? secaoAtual.diametro : ponto.d;
            return { 
                d_menor: diametro, 
                D_maior: diametro 
            };
        }
    }

    // Identificar TODOS os pontos relevantes (mancais, cargas e mudanças)
    identificarTodosPontosRelevantes() {
        const todosPontos = [];
        
        this.dadosEixo.pontos.forEach(ponto => {
            if (['mancal', 'carga', 'mudanca'].includes(ponto.tipo)) {
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
                
                todosPontos.push({
                    posicao: ponto.x,
                    tipo: ponto.tipo,
                    diametro_menor: d_menor,
                    diametro_maior: D_maior,
                    momentoFletor: momento,
                    torque: torqueTotal,
                    tensaoFlexao: tensaoFlexao,
                    tensaoTorsao: tensaoTorsao,
                    sigma_vonMises: sigma_vonMises,
                    raio: ponto.raio || 0
                });
            }
        });

        // Ordenar por tipo primeiro, depois por posição
        return todosPontos.sort((a, b) => {
            // Ordem: Mancais, Cargas, Mudanças
            const ordemTipo = { 'mancal': 1, 'carga': 2, 'mudanca': 3 };
            if (ordemTipo[a.tipo] !== ordemTipo[b.tipo]) {
                return ordemTipo[a.tipo] - ordemTipo[b.tipo];
            }
            return a.posicao - b.posicao;
        });
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
            todosPontos: this.calculador.identificarTodosPontosRelevantes(),
            dadosEixo: this.calculador.dadosEixo
        };

        return resultados;
    }
}

// --- Funções Globais ---

window.CalculadorFadiga = CalculadorFadiga;
window.IntegradorCalculos = IntegradorCalculos;

// --- Inicialização da Página ---

function inicializarAnaliseEixo() {
    const container = document.getElementById('conteudoResultados');
    
    // Carregar dados do eixo
    const dadosSalvos = carregarDados();
    
    if (!dadosSalvos.desenhoFeito || !dadosSalvos.geometria) {
        container.innerHTML = `
            <div class="erro">
                <h3>❌ Nenhum eixo encontrado</h3>
                <p>Volte à página de desenho para criar um eixo primeiro.</p>
                <button onclick="voltarParaDesenho()" class="btn-voltar">Voltar ao Desenho</button>
            </div>
        `;
        return;
    }

    // Exibir informações do eixo
    exibirInformacoesEixo(dadosSalvos.geometria);

    try {
        // Executar cálculos
        const integrador = new IntegradorCalculos();
        integrador.inicializarCalculos(dadosSalvos.geometria);
        const resultados = integrador.executarCalculosCompletos();

        // Guardar resultados globalmente
        window.resultadosCalculos = resultados;
        window.integradorGlobal = integrador;

        // Exibir interface de seleção
        exibirInterfaceSelecao(resultados, integrador);

    } catch (error) {
        container.innerHTML = `
            <div class="erro">
                <h3>❌ Erro nos Cálculos</h3>
                <p>${error.message}</p>
                <button onclick="voltarParaDesenho()" class="btn-voltar">Voltar ao Desenho</button>
            </div>
        `;
    }
}

function exibirInformacoesEixo(dadosEixo) {
    const container = document.getElementById('dadosEixoInfo');
    
    let html = `
        <div class="info-grid">
            <div class="info-item">
                <strong>Comprimento total:</strong> ${dadosEixo.comprimentoTotal} mm
            </div>
            <div class="info-item">
                <strong>Número de seções:</strong> ${dadosEixo.secoes.length}
            </div>
            <div class="info-item">
                <strong>Mancais:</strong> ${dadosEixo.mancais.length}
            </div>
            <div class="info-item">
                <strong>Cargas aplicadas:</strong> ${dadosEixo.carregamentos.length}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function exibirInterfaceSelecao(resultados, integrador) {
    const container = document.getElementById('conteudoResultados');
    
    let html = `
        <div class="painel-resultado">
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

        <div class="painel-resultado">
            <h3>🎯 Selecione um Ponto para Análise Avançada</h3>
            <p>Clique em qualquer linha da tabela abaixo para selecionar o ponto que deseja analisar:</p>
            
            <div class="tabela-container">
                <table class="tabela-selecao" id="tabelaPontos">
                    <thead>
                        <tr>
                            <th>Posição</th>
                            <th>Tipo</th>
                            <th>Diâmetro (mm)</th>
                            <th>Momento (Nm)</th>
                            <th>Torque (Nm)</th>
                            <th>σ' Von Mises (MPa)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    resultados.todosPontos.forEach((ponto, index) => {
        const tensoes = integrador.calculador.calcularTensoesDetalhadas(ponto);
        
        html += `
            <tr class="linha-selecionavel" data-index="${index}" onclick="selecionarPonto(${index})">
                <td>${ponto.posicao}</td>
                <td>
                    ${ponto.tipo === 'mancal' ? '⚙️ Mancal' : 
                      ponto.tipo === 'carga' ? '📌 Carga' : 
                      '📐 Mudança'}
                </td>
                <td>Ø${ponto.diametro_menor}</td>
                <td>${ponto.momentoFletor.toFixed(2)}</td>
                <td>${ponto.torque}</td>
                <td>${tensoes.sigmaVonMises.toFixed(1)}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div id="detalhesPonto" class="detalhes-ponto" style="display: none; margin-top: 20px;">
                <h4>📊 Detalhes do Ponto Selecionado</h4>
                <div id="conteudoDetalhes"></div>
                <button id="btnAnaliseAvancada" class="btn-avancar" onclick="iniciarAnaliseAvancada()" style="margin-top: 15px;">
                    🚀 Iniciar Análise Avançada
                </button>
            </div>
        </div>
    `;

    // Adicionar visualização do eixo
    html += gerarDesenhoEixo(resultados, resultados.dadosEixo);
    
    // Botões de ação
    html += `
        <div class="grupo-botoes">
            <button onclick="exportarResultados()" class="btn-exportar">📥 Exportar Resultados</button>
            <button onclick="voltarParaDesenho()" class="btn-voltar">↩️ Voltar ao Desenho</button>
        </div>
    `;

    container.innerHTML = html;
}

function selecionarPonto(index) {
    // Remover seleção anterior
    const linhas = document.querySelectorAll('.linha-selecionavel');
    linhas.forEach(linha => linha.classList.remove('selecionada'));
    
    // Adicionar seleção à linha clicada
    const linhaSelecionada = document.querySelector(`[data-index="${index}"]`);
    linhaSelecionada.classList.add('selecionada');
    
    // Atualizar destaque no desenho do eixo
    atualizarDestaqueDesenho(index);
    
    // Mostrar detalhes do ponto
    const ponto = window.resultadosCalculos.todosPontos[index];
    const tensoes = window.integradorGlobal.calculador.calcularTensoesDetalhadas(ponto);
    
    const detalhesDiv = document.getElementById('detalhesPonto');
    const conteudoDetalhes = document.getElementById('conteudoDetalhes');
    
    let tipoTexto = '';
    switch(ponto.tipo) {
        case 'mancal': tipoTexto = 'Mancal/Apoio'; break;
        case 'carga': tipoTexto = 'Ponto de Carga'; break;
        case 'mudanca': tipoTexto = 'Mudança de Diâmetro'; break;
    }
    
    const relacaoDd = ponto.diametro_maior / ponto.diametro_menor;
    
    conteudoDetalhes.innerHTML = `
        <div class="detalhes-grid">
            <div class="detalhe-item">
                <strong>Tipo:</strong> ${tipoTexto}
            </div>
            <div class="detalhe-item">
                <strong>Posição:</strong> ${ponto.posicao} mm
            </div>
            <div class="detalhe-item">
                <strong>Diâmetro menor (d):</strong> Ø${ponto.diametro_menor} mm
            </div>
            <div class="detalhe-item">
                <strong>Diâmetro maior (D):</strong> Ø${ponto.diametro_maior} mm
            </div>
            <div class="detalhe-item">
                <strong>Relação D/d:</strong> ${relacaoDd.toFixed(2)}
            </div>
            <div class="detalhe-item">
                <strong>Raio:</strong> ${ponto.raio} mm
            </div>
            <div class="detalhe-item">
                <strong>Momento Fletor:</strong> ${ponto.momentoFletor.toFixed(2)} Nm
            </div>
            <div class="detalhe-item">
                <strong>Torque:</strong> ${ponto.torque} Nm
            </div>
            <div class="detalhe-item">
                <strong>σ Flexão:</strong> ${tensoes.tensaoFlexao.toFixed(1)} MPa
            </div>
            <div class="detalhe-item">
                <strong>τ Cisalhamento:</strong> ${tensoes.tensaoTorsao.toFixed(1)} MPa
            </div>
            <div class="detalhe-item">
                <strong>σ' Von Mises:</strong> ${tensoes.sigmaVonMises.toFixed(1)} MPa
            </div>
        </div>
    `;
    
    detalhesDiv.style.display = 'block';
    
    // Guardar ponto selecionado para análise avançada
    window.pontoSelecionado = ponto;
}

function atualizarDestaqueDesenho(indexSelecionado) {
    const ponto = window.resultadosCalculos.todosPontos[indexSelecionado];
    
    // Remover destaque anterior - nova lógica
    const marcadores = document.querySelectorAll('.ponto-visual');
    marcadores.forEach(marcador => {
        marcador.style.border = '2px solid white';
        marcador.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    });
    
    // Adicionar destaque ao ponto selecionado - nova lógica
    const marcadorSelecionado = document.querySelector(`.ponto-visual[data-posicao="${ponto.posicao}"]`);
    if (marcadorSelecionado) {
        marcadorSelecionado.style.border = '3px solid #FFD700';
        marcadorSelecionado.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
        marcadorSelecionado.style.transform = 'translate(-50%, -50%) scale(1.3)';
    }
}

// --- Função gerarDesenhoEixo atualizada ---
function gerarDesenhoEixo(resultados, dadosEixo) {
    // Calcular a escala baseada no comprimento total
    const larguraContainer = 800; // Largura fixa para o container
    const escala = larguraContainer / dadosEixo.comprimentoTotal;
    
    let html = `
        <div class="painel-resultado">
            <h3>📐 Visualização do Eixo</h3>
            <div style="position: relative; height: 300px; border: 1px solid #ddd; background: #f9f9f9; overflow-x: auto; padding: 20px;">
                <div id="desenhoEixoContainer" style="position: relative; height: 100%; width: ${larguraContainer}px; margin: 0 auto;">
    `;

    // Desenhar o eixo (linha central)
    html += `
        <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%);
                    width: 100%; height: 2px; background: #333; z-index: 1;"></div>
    `;

    // Desenhar seções do eixo
    dadosEixo.secoes.forEach((secao, index) => {
        const largura = secao.comprimento * escala;
        const altura = Math.min(secao.diametro * 2, 60); // Altura máxima de 60px
        const left = secao.posicaoInicio * escala;
        
        html += `
            <div style="position: absolute; left: ${left}px; top: 50%; transform: translateY(-50%);
                       width: ${largura}px; height: ${altura}px; background: #007bff; 
                       border: 2px solid #0056b3; border-radius: 4px; z-index: 2;">
                <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); 
                           white-space: nowrap; font-size: 12px; background: white; padding: 2px 5px; border: 1px solid #ddd;">
                    Ø${secao.diametro}mm
                </div>
                <div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); 
                           font-size: 10px; color: #666; background: white; padding: 1px 3px;">
                    ${secao.comprimento}mm
                </div>
            </div>
        `;
    });

    // Marcar pontos importantes
    const reacoes = resultados.reacoes;
    resultados.todosPontos.forEach((ponto, index) => {
        const left = ponto.x * escala;
        let cor, simbolo, titulo;
        
        switch(ponto.tipo) {
            case 'mancal':
                cor = '#dc3545';
                simbolo = '⚙️';
                const R_valor = ponto.x === reacoes.R1.x ? reacoes.R1.valor : (ponto.x === reacoes.R2.x ? reacoes.R2.valor : 0);
                titulo = `Mancal - R: ${R_valor.toFixed(1)}N`;
                break;
            case 'carga':
                cor = '#ffc107';
                simbolo = '📌';
                const carga = dadosEixo.carregamentos.find(c => c.x === ponto.x);
                titulo = `Carga - F: ${carga ? carga.forca + 'N' : '0N'}, T: ${carga ? carga.torque + 'Nm' : '0Nm'}`;
                break;
            case 'mudanca':
                cor = '#007bff';
                simbolo = '📐';
                titulo = `Mudança - Ø${ponto.diametro_menor}/${ponto.diametro_maior}mm, M: ${ponto.momentoFletor.toFixed(1)}Nm`;
                break;
        }
        
        html += `
            <div class="ponto-visual" data-posicao="${ponto.posicao}" data-index="${index}"
                 style="position: absolute; left: ${left}px; top: 50%; transform: translate(-50%, -50%);
                        width: 24px; height: 24px; background: ${cor}; border-radius: 50%; border: 2px solid white;
                        display: flex; align-items: center; justify-content: center; font-size: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer; z-index: 10;"
                 title="${titulo}" onclick="selecionarPonto(${index})">
                ${simbolo}
            </div>
            <div style="position: absolute; left: ${left}px; top: 30%; bottom: 30%; width: 1px; 
                       background: ${cor}; opacity: 0.5; z-index: 5;"></div>
        `;
    });

    // Círculo de destaque (inicialmente invisível) - CORRIGIDO
    html += `
            <div id="destaquePonto" 
                 style="position: absolute; width: 32px; height: 32px; border: 3px solid #FFD700; 
                        border-radius: 50%; background: transparent; z-index: 15; display: none;
                        pointer-events: none; box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
                        transform: translate(-50%, -50%); transition: all 0.3s ease;">
            </div>
        </div>
    </div>
    <div style="margin-top: 10px; font-size: 12px; color: #666;">
        <strong>Legenda:</strong> 
        <span style="color: #dc3545;">⚙️ Mancal</span> | 
        <span style="color: #ffc107;">📌 Carga</span> | 
        <span style="color: #007bff;">📐 Mudança</span> |
        <span style="color: #FFD700;">🟡 Ponto Selecionado</span>
    </div>
    <div style="margin-top: 5px; font-size: 11px; color: #999;">
        <strong>Escala:</strong> 1mm = ${escala.toFixed(3)}px | Total: ${dadosEixo.comprimentoTotal}mm
    </div>
</div>
    `;

    return html;
}

// --- Função atualizarDestaqueDesenho atualizada ---
function atualizarDestaqueDesenho(indexSelecionado) {
    const ponto = window.resultadosCalculos.todosPontos[indexSelecionado];
    
    // Calcular a mesma escala usada no desenho
    const larguraContainer = 800;
    const dadosEixo = window.resultadosCalculos.dadosEixo;
    const escala = larguraContainer / dadosEixo.comprimentoTotal;
    const left = ponto.x * escala;
    
    console.log(`Destaque: Ponto X=${ponto.posicao}mm -> left=${left}px (escala: ${escala})`);
    
    // Obter o elemento de destaque
    const destaque = document.getElementById('destaquePonto');
    
    if (destaque) {
        // Posicionar o círculo amarelo no ponto selecionado - CORRIGIDO
        destaque.style.left = left + 'px';
        destaque.style.top = '50%';
        destaque.style.display = 'block';
        
        console.log(`✅ Destaque posicionado em left: ${left}px`);
    } else {
        console.error('❌ Elemento de destaque não encontrado!');
    }
    
    // Também destacar o marcador visual correspondente
    const marcadores = document.querySelectorAll('.ponto-visual');
    marcadores.forEach(marcador => {
        marcador.style.border = '2px solid white';
        marcador.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        marcador.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    const marcadorSelecionado = document.querySelector(`.ponto-visual[data-index="${indexSelecionado}"]`);
    if (marcadorSelecionado) {
        marcadorSelecionado.style.border = '3px solid #FFD700';
        marcadorSelecionado.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
        marcadorSelecionado.style.transform = 'translate(-50%, -50%) scale(1.3)';
    }
}


function iniciarAnaliseAvancada() {
    if (!window.pontoSelecionado) {
        alert('Selecione um ponto primeiro!');
        return;
    }
    
    // Preparar dados para análise avançada
    const dadosAnaliseAvancada = {
        pontoSelecionado: window.pontoSelecionado,
        resultadosCalculos: window.resultadosCalculos,
        dadosEixo: window.resultadosCalculos.dadosEixo,
        timestamp: new Date().toISOString(),
        tipoAnalise: 'fadiga'
    };
    
    console.log('Dados salvos para análise avançada:', dadosAnaliseAvancada);
    
    // Salvar dados para a próxima etapa
    salvarDados({
        analiseAvancada: dadosAnaliseAvancada,
        analiseConcluida: true
    });
    
    // Redirecionar para análise.html
    window.location.href = 'analise.html';
}

function exportarResultados() {
    const conteudo = document.getElementById('conteudoResultados').innerHTML;
    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analise-eixo.html';
    a.click();
}

function voltarParaDesenho() {
    window.location.href = 'eixo.html';
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    inicializarAnaliseEixo();
});
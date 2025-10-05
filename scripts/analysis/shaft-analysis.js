// --- MÓDULO DE PERSISTÊNCIA DE DADOS (CARREGAMENTO DO EIXO) ---

/**
 * Carrega a geometria do eixo salva no localStorage pela página de desenho.
 * A chave 'dados_eixo' deve ser a mesma usada para salvar no 'eixo.html'.
 */
function carregarDados() {
    try {
        // CORREÇÃO ESSENCIAL: Garante que a chave é a mesma do main.js
        const dadosJSON = localStorage.getItem('dados_eixo'); 
        if (dadosJSON) {
            const dados = JSON.parse(dadosJSON);
            
            // Verifica se o objeto principal e a geometria existem
            if (dados && dados.desenhoFeito && dados.geometria) {
                // Lógica de compatibilidade (recriar pontos se necessário)
                if (!dados.geometria.pontos) {
                    dados.geometria.pontos = [];
                    
                    const pontosMancais = (dados.geometria.mancais || []).map(m => ({ x: m.x, tipo: 'mancal', raio: 0 }));
                    const pontosCargas = (dados.geometria.carregamentos || []).map(c => ({ x: c.x, tipo: 'carga', raio: 0, forca: c.forca, torque: c.torque }));
                    
                    const pontosMudanca = [];
                    if (dados.geometria.secoes) {
                        for(let i = 0; i < dados.geometria.secoes.length - 1; i++) {
                            const secaoAtual = dados.geometria.secoes[i];
                            const proximaSecao = dados.geometria.secoes[i+1];
                            
                            if (secaoAtual.diametro !== proximaSecao.diametro) {
                                pontosMudanca.push({ x: secaoAtual.posicaoFim, tipo: 'mudanca', raio: 0, d: secaoAtual.diametro });
                            }
                        }
                    }

                    // Junta todos os pontos
                    dados.geometria.pontos.push(...pontosMancais, ...pontosCargas, ...pontosMudanca);
                }
                return dados; // Retorna o objeto completo
            }
        }
    } catch (e) {
        console.error("Erro ao carregar dados do LocalStorage:", e);
    }
    // Retorna a estrutura para indicar falha no carregamento
    return { desenhoFeito: false, geometria: null };
}

/**
 * Salva os resultados da análise no localStorage para uso em outras páginas (ex: analise.html).
 */
function salvarDados(dados) {
    // Nota: Essa função agora salva resultados de análise avançada em uma chave separada
    localStorage.setItem('analise_avancada_results', JSON.stringify(dados));
}

// --------------------------------------------------------------------------------------------------
// --- INÍCIO DAS CLASSES DE CÁLCULO E LÓGICA DE NEGÓCIO ---
// --------------------------------------------------------------------------------------------------

class CalculadorFadiga {
    constructor(dadosEixo, propriedadesMaterial) {
        this.dadosEixo = dadosEixo;
        this.material = propriedadesMaterial;
        this._reacoes = null;
    }

    // Funções auxiliares de conversão
    mmParaMetros(valorMM) { return valorMM / 1000; }
    MPaParaPa(valorMPa) { return valorMPa * 1e6; }

    // Cálculos básicos de tensão
    calcularTensaoFlexao(momentoFletor, diametroMM) {
        if (diametroMM <= 0) return 0;
        const diametroM = this.mmParaMetros(diametroMM);
        const I = Math.PI * Math.pow(diametroM, 4) / 64;
        const c = diametroM / 2;
        return I === 0 ? 0 : (momentoFletor * c) / I; 
    }

    calcularTensaoTorsao(torque, diametroMM) {
        if (diametroMM <= 0) return 0;
        const diametroM = this.mmParaMetros(diametroMM);
        const J = Math.PI * Math.pow(diametroM, 4) / 32;
        const c = diametroM / 2;
        return J === 0 ? 0 : (torque * c) / J;
    }

    // Cálculo de reações nos mancais
    calcularReacoes() {
        if (this._reacoes) return this._reacoes; 

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
        if (distanciaMancais <= 0) throw new Error('Os mancais estão na mesma posição.');

        const R2_valor = somaMomentos / distanciaMancais;
        const R1_valor = cargas.reduce((sum, c) => sum + c.forca, 0) - R2_valor;

        this._reacoes = {
            R1: { x: R1.x, valor: R1_valor },
            R2: { x: R2.x, valor: R2_valor }
        };
        return this._reacoes;
    }

    // Diagrama de momento fletor
    calcularMomentoFletor(posicaoX) {
        const reacoes = this.calcularReacoes();
        const cargas = this.dadosEixo.carregamentos;
        
        let momento = 0;

        if (posicaoX >= reacoes.R1.x) {
            const braco = this.mmParaMetros(posicaoX - reacoes.R1.x);
            momento += reacoes.R1.valor * braco;
        }

        cargas.forEach(carga => {
            if (carga.x <= posicaoX) {
                const braco = this.mmParaMetros(posicaoX - carga.x);
                momento -= carga.forca * braco;
            }
        });

        return momento;
    }

    // Obter diâmetros da seção 
    obterDiametrosSecao(ponto) {
        const tolerancia = 1; 
        
        if (!this.dadosEixo.secoes || this.dadosEixo.secoes.length === 0) {
            console.warn("Nenhuma seção de eixo encontrada. Usando diâmetro padrão.");
            const diametroPadrao = ponto.d || 0;
            return { d_menor: diametroPadrao, D_maior: diametroPadrao };
        }

        if (ponto.tipo === 'mudanca') {
            let diametro_antes = 0;
            let diametro_depois = 0;
            
            for (let secao of this.dadosEixo.secoes) {
                if (Math.abs(secao.posicaoFim - ponto.x) < tolerancia) {
                    diametro_antes = secao.diametro;
                }
                if (Math.abs(secao.posicaoInicio - ponto.x) < tolerancia) {
                    diametro_depois = secao.diametro;
                }
            }
            
            const d_menor = Math.min(diametro_antes, diametro_depois);
            const D_maior = Math.max(diametro_antes, diametro_depois);
            
            return { d_menor: d_menor, D_maior: D_maior };
        } else {
            const secaoAtual = this.dadosEixo.secoes.find(secao => 
                ponto.x >= secao.posicaoInicio - tolerancia && ponto.x <= secao.posicaoFim + tolerancia
            );
            const diametro = secaoAtual ? secaoAtual.diametro : (ponto.d || 0);
            return { d_menor: diametro, D_maior: diametro };
        }
    }

    // Identificar TODOS os pontos relevantes
    identificarTodosPontosRelevantes() {
        const todosPontos = [];
        const pontosParaAnalisar = this.dadosEixo.pontos || [];

        pontosParaAnalisar.forEach(ponto => {
            if (['mancal', 'carga', 'mudanca'].includes(ponto.tipo)) {
                const { d_menor, D_maior } = this.obterDiametrosSecao(ponto);
                const diametro_calculo = d_menor;
                
                if (diametro_calculo <= 0) return; 

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
                    x: ponto.x,
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

        // Ordena por posição
        return todosPontos.sort((a, b) => a.posicao - b.posicao);
    }

    // Cálculos detalhados para uma seção
    calcularTensoesDetalhadas(secao) {
        const SyMPa = this.material.Sy / 1e6;

        const tensaoFlexaoMPa = secao.tensaoFlexao / 1e6;
        const tensaoTorsaoMPa = secao.tensaoTorsao / 1e6;
        
        const sigma_x = tensaoFlexaoMPa;
        const tau_xy = tensaoTorsaoMPa;
        
        const radical = Math.sqrt(Math.pow(sigma_x / 2, 2) + Math.pow(tau_xy, 2));
        const sigma_1 = (sigma_x / 2) + radical;
        const sigma_2 = (sigma_x / 2) - radical;
        const tau_max = radical;
        
        const sigmaVonMisesMPa = secao.sigma_vonMises / 1e6;
        const fatorSeguranca = sigmaVonMisesMPa > 0 ? SyMPa / sigmaVonMisesMPa : Infinity;

        return {
            tensaoFlexao: tensaoFlexaoMPa,
            tensaoTorsao: tensaoTorsaoMPa,
            sigmaVonMises: sigmaVonMisesMPa,
            tensoesPrincipais: {
                sigma1: sigma_1,
                sigma2: sigma_2,
                tauMax: tau_max
            },
            fatorSeguranca: fatorSeguranca
        };
    }
}

// --- Classe de Integração ---

class IntegradorCalculos {
    constructor() { this.calculador = null; }

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

    MPaParaPa(valorMPa) { return valorMPa * 1e6; }

    executarCalculosCompletos() {
        if (!this.calculador) throw new Error('Calculador não inicializado');

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

function inicializarAnaliseEixo() {
    const container = document.getElementById('conteudoResultados');
    if (!container) return;
    
    // Carregar dados (incluindo a correção no carregarDados que busca o localStorage)
    const dadosSalvos = carregarDados();
    
    if (!dadosSalvos.desenhoFeito || !dadosSalvos.geometria || dadosSalvos.geometria.comprimentoTotal <= 0) {
        container.innerHTML = `
            <div class="erro">
                <h3>❌ Nenhum eixo válido encontrado</h3>
                <p>Volte à página de desenho para criar um eixo primeiro.</p>
                <button onclick="voltarParaDesenho()" class="btn-voltar">Voltar ao Desenho</button>
            </div>
        `;
        return;
    }

    exibirInformacoesEixo(dadosSalvos.geometria);

    try {
        const integrador = new IntegradorCalculos();
        integrador.inicializarCalculos(dadosSalvos.geometria);
        const resultados = integrador.executarCalculosCompletos();

        window.resultadosCalculos = resultados;
        window.integradorGlobal = integrador;

        exibirInterfaceSelecao(resultados, integrador);

    } catch (error) {
        container.innerHTML = `
            <div class="erro">
                <h3>❌ Erro nos Cálculos</h3>
                <p>Ocorreu um erro: ${error.message}</p>
                <button onclick="voltarParaDesenho()" class="btn-voltar">Voltar ao Desenho</button>
            </div>
        `;
    }
}

function exibirInformacoesEixo(dadosEixo) {
    const container = document.getElementById('dadosEixoInfo');
    if (!container) return;
    
    const numMancais = (dadosEixo.mancais && dadosEixo.mancais.length) ? dadosEixo.mancais.length : (dadosEixo.pontos ? dadosEixo.pontos.filter(p => p.tipo === 'mancal').length : 0);
    const numCargas = dadosEixo.carregamentos ? dadosEixo.carregamentos.length : 0;
    
    let html = `
        <div class="info-grid">
            <div class="info-item">
                <strong>Comprimento total:</strong> ${dadosEixo.comprimentoTotal} mm
            </div>
            <div class="info-item">
                <strong>Número de seções:</strong> ${dadosEixo.secoes.length}
            </div>
            <div class="info-item">
                <strong>Mancais:</strong> ${numMancais}
            </div>
            <div class="info-item">
                <strong>Cargas aplicadas:</strong> ${numCargas}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function exibirInterfaceSelecao(resultados, integrador) {
    const container = document.getElementById('conteudoResultados');
    
    // --- ALTERAÇÃO: ORDENAÇÃO POR TIPO E POSIÇÃO ---
    const pontosOrdenados = [...resultados.todosPontos].sort((a, b) => {
        // Mapeamento para ordem: Mancal(1) > Carga(2) > Mudança(3)
        const tipoA = a.tipo === 'mancal' ? 1 : a.tipo === 'carga' ? 2 : 3;
        const tipoB = b.tipo === 'mancal' ? 1 : b.tipo === 'carga' ? 2 : 3;
        
        if (tipoA !== tipoB) {
            return tipoA - tipoB; // Ordena pelo tipo
        }
        return a.posicao - b.posicao; // Desempate pela posição
    });
    // ------------------------------------------

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

        <!-- VISUALIZAÇÃO DO EIXO -->
        ${gerarDesenhoEixo(resultados, resultados.dadosEixo)}

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
    
    // Usa os pontos ordenados para gerar as linhas
    pontosOrdenados.forEach((ponto, index) => {
        // Encontra o índice no array original para passar para selecionarPonto
        const indexOriginal = resultados.todosPontos.findIndex(p => p.x === ponto.x && p.tipo === ponto.tipo);

        const tensoes = integrador.calculador.calcularTensoesDetalhadas(ponto);
        
        html += `
            <tr class="linha-selecionavel" data-index="${indexOriginal}" onclick="selecionarPonto(${indexOriginal})">
                <td>${ponto.posicao}</td>
                <td>
                    ${ponto.tipo === 'mancal' ? '⚙️ Mancal' : 
                      ponto.tipo === 'carga' ? '📌 Carga' : 
                      '📐 Mudança'}
                </td>
                <td>Ø${ponto.diametro_menor}</td>
                <td>${ponto.momentoFletor.toFixed(2)}</td>
                <td>${ponto.torque.toFixed(0)}</td>
                <td>${tensoes.sigmaVonMises.toFixed(1)}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>

        <!-- DETALHES DO PONTO SELECIONADO -->
            <div id="detalhesPonto" class="detalhes-ponto" style="display: none; margin-top: 20px;">
                <h4>📊 Detalhes do Ponto Selecionado</h4>
                <div id="conteudoDetalhes"></div>
                <div style="text-align: right; margin-top: 15px;">
                    <button id="btnAnaliseAvancada" class="btn-avancar" onclick="iniciarAnaliseAvancada()">
                        🚀 Iniciar Análise Avançada
                    </button>
                </div>
            </div>
    `;
    
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
    // Remove seleção da tabela
    document.querySelectorAll('.linha-selecionavel').forEach(linha => linha.classList.remove('selecionada'));
    document.querySelector(`[data-index="${index}"]`).classList.add('selecionada');
    
    // Atualiza destaque no desenho
    atualizarDestaqueDesenho(index);
    
    const ponto = window.resultadosCalculos.todosPontos[index];
    const tensoes = window.integradorGlobal.calculador.calcularTensoesDetalhadas(ponto);
    
    const detalhesDiv = document.getElementById('detalhesPonto');
    const conteudoDetalhes = document.getElementById('conteudoDetalhes');
    
    let tipoTexto = '';
    switch(ponto.tipo) {
        case 'mancal': tipoTexto = 'Mancal/Apoio'; break;
        case 'carga': tipoTexto = 'Ponto de Carga'; break;
        case 'mudanca': tipoTexto = 'Mudança de Diâmetro'; break;
        default: tipoTexto = ponto.tipo;
    }
    
    const relacaoDd = ponto.diametro_menor > 0 ? (ponto.diametro_maior / ponto.diametro_menor) : 1;
    
    conteudoDetalhes.innerHTML = `
        <div class="detalhes-grid">
            <div class="detalhe-item"><strong>Tipo:</strong> ${tipoTexto}</div>
            <div class="detalhe-item"><strong>Posição:</strong> ${ponto.posicao} mm</div>
            <div class="detalhe-item"><strong>Diâmetro menor (d):</strong> Ø${ponto.diametro_menor} mm</div>
            <div class="detalhe-item"><strong>Diâmetro maior (D):</strong> Ø${ponto.diametro_maior} mm</div>
            <div class="detalhe-item"><strong>Relação D/d:</strong> ${relacaoDd.toFixed(2)}</div>
            <div class="detalhe-item"><strong>Raio:</strong> ${ponto.raio} mm</div>
            <div class="detalhe-item"><strong>Momento Fletor:</strong> ${ponto.momentoFletor.toFixed(2)} Nm</div>
            <div class="detalhe-item"><strong>Torque:</strong> ${ponto.torque.toFixed(0)} Nm</div>
            <div class="detalhe-item"><strong>σ Flexão:</strong> ${tensoes.tensaoFlexao.toFixed(1)} MPa</div>
            <div class="detalhe-item"><strong>τ Cisalhamento:</strong> ${tensoes.tensaoTorsao.toFixed(1)} MPa</div>
            <div class="detalhe-item"><strong>σ' Von Mises:</strong> ${tensoes.sigmaVonMises.toFixed(1)} MPa</div>
        </div>
    `;
    
    detalhesDiv.style.display = 'block';
    window.pontoSelecionado = ponto;
}

// --- Função gerarDesenhoEixo (MODIFICADA para inicializar o cinza) ---
function gerarDesenhoEixo(resultados, dadosEixo) {
    const larguraContainer = 800;
    const escala = larguraContainer / dadosEixo.comprimentoTotal;
    
    let html = `
        <div class="painel-resultado">
            <h3>📐 Visualização do Eixo</h3>
            <div style="position: relative; height: 300px; border: 1px solid #ddd; background: #f9f9f9; overflow-x: auto; padding: 20px 0;">
                <div id="desenhoEixoContainer" style="position: relative; height: 100%; width: ${larguraContainer}px; margin: 0 auto;">
    `;

    // Linha central do eixo
    html += `
        <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%);
                    width: 100%; height: 2px; background: #333; z-index: 1;"></div>
    `;

    // Seções do eixo (Inalterado)
    dadosEixo.secoes.forEach((secao) => {
        const largura = secao.comprimento * escala;
        const altura = Math.max(10, Math.min(secao.diametro * 2, 80)); 
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

    // Pontos importantes (Mancais, Cargas, Mudanças)
    const reacoes = resultados.reacoes;
    resultados.todosPontos.forEach((ponto, index) => {
        const left = ponto.x * escala;
        let cor, simbolo, titulo, tipoClasse;
        
        switch(ponto.tipo) {
            case 'mancal':
                cor = '#dc3545';
                simbolo = '⚙️';
                tipoClasse = 'mancal';
                const R_valor = ponto.x === reacoes.R1.x ? reacoes.R1.valor : (ponto.x === reacoes.R2.x ? reacoes.R2.valor : 0);
                titulo = `Mancal - R: ${R_valor.toFixed(1)}N`;
                break;
            case 'carga':
                cor = '#ffc107';
                simbolo = '📌';
                tipoClasse = 'carga';
                const carga = dadosEixo.carregamentos.find(c => c.x === ponto.x);
                titulo = `Carga - F: ${carga ? carga.forca + 'N' : '0N'}, T: ${carga ? carga.torque + 'Nm' : '0Nm'}`;
                // Desenha a seta para a carga
                html += `
                    <div style="position: absolute; left: ${left}px; top: 15%; transform: translateX(-50%); width: 2px; height: 30px; background: #ffc107; z-index: 5;"></div>
                    <div style="position: absolute; left: ${left}px; top: 15%; transform: translate(-50%, -50%) rotate(45deg); width: 8px; height: 8px; border-bottom: 2px solid #ffc107; border-left: 2px solid #ffc107; z-index: 5;"></div>
                `;
                break;
            case 'mudanca':
                cor = '#007bff';
                simbolo = '📐';
                tipoClasse = 'mudanca';
                titulo = `Mudança - Ø${ponto.diametro_menor}/${ponto.diametro_maior}mm, M: ${ponto.momentoFletor.toFixed(1)}Nm`;
                break;
            default:
                cor = '#6c757d'; // Cinza
                simbolo = '⚫';
                tipoClasse = 'outro';
                titulo = ponto.tipo;
        }

        // --- ALTERAÇÃO: Adiciona a classe de DESELEÇÃO por padrão ---
        html += `
            <div class="ponto-visual ${tipoClasse} ponto-deselecionado" data-posicao="${ponto.posicao}" data-index="${index}"
                 style="position: absolute; left: ${left}px; top: 50%; transform: translate(-50%, -50%) scale(1);
                        width: 24px; height: 24px; background: ${cor}; border-radius: 50%; border: 2px solid white;
                        display: flex; align-items: center; justify-content: center; font-size: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer; z-index: 10; transition: all 0.3s ease;"
                 title="${titulo}" onclick="selecionarPonto(${index})">
                ${simbolo}
            </div>
            <div style="position: absolute; left: ${left}px; top: 30%; bottom: 30%; width: 1px; 
                       background: ${cor}; opacity: 0.5; z-index: 5;"></div>
        `;
    });

    // Fechamento e Legenda
    html += `
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

// --- Função atualizarDestaqueDesenho (MODIFICADA para gerenciar as classes) ---
function atualizarDestaqueDesenho(indexSelecionado) {
    // 1. Remover destaque de TODOS os marcadores visuais
    const marcadores = document.querySelectorAll('.ponto-visual');
    marcadores.forEach(marcador => {
        // Remove seleção anterior, adiciona a classe de deselecionado (cinza)
        marcador.classList.remove('ponto-selecionado');
        marcador.classList.add('ponto-deselecionado');
    });
    
    // 2. Adicionar destaque ao marcador visual selecionado
    const marcadorSelecionado = document.querySelector(`.ponto-visual[data-index="${indexSelecionado}"]`);
    if (marcadorSelecionado) {
        // Adiciona classe de seleção, remove deseleção (volta a cor)
        marcadorSelecionado.classList.remove('ponto-deselecionado');
        marcadorSelecionado.classList.add('ponto-selecionado');
    }
}

function iniciarAnaliseAvancada() {
    if (!window.pontoSelecionado) {
        alert('Selecione um ponto primeiro!');
        return;
    }
    
    const dadosAnaliseAvancada = {
        pontoSelecionado: window.pontoSelecionado,
        resultadosCalculos: window.resultadosCalculos,
        dadosEixo: window.resultadosCalculos.dadosEixo,
        timestamp: new Date().toISOString(),
        tipoAnalise: 'fadiga'
    };
    
    // Salva o objeto de análise para ser puxado pela próxima página
    salvarDados({
        analiseAvancada: dadosAnaliseAvancada,
        analiseConcluida: true
    });
    
    window.location.href = '../pages/advanced-analysis.html';
}

function exportarResultados() {
    const conteudo = document.getElementById('conteudoResultados').innerHTML;
    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '../pages/shaft-analisys.html';
    a.click();
}

function voltarParaDesenho() {
    window.location.href = '../pages/shaft-input.html';
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    inicializarAnaliseEixo();
});
// Dados da análise
let dadosAnalise = null;
let dadosFormulario = null;
let resultadosCalculados = null;

// Fatores de confiabilidade (exatamente como no código fornecido)
const FATORES_CONFIABILIDADE = {
    50: 1.000,
    90: 0.897,
    95: 0.868,
    99: 0.814,
    99.9: 0.753,
    99.99: 0.702,
    99.999: 0.659,
    99.9999: 0.620
};

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    carregarDadosAnalise();
});

function carregarDadosAnalise() {
    try {
        const dadosSalvos = localStorage.getItem('analise_avancada_results');
        console.log('Dados salvos no localStorage:', dadosSalvos);
        
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            console.log('Dados parseados:', dados);
            
            // VERIFICAR OS DOIS FORMATOS POSSÍVEIS
            if (dados.dadosFormulario) {
                // NOVO FORMATO: dados do formulário atual
                dadosFormulario = dados.dadosFormulario;
                dadosAnalise = dados.analiseAvancada || dados.dadosReferencia?.pontoSelecionado;
                
                console.log('Carregado no NOVO formato:', {
                    dadosFormulario: dadosFormulario,
                    dadosAnalise: dadosAnalise
                });
                
            } else if (dados.analiseAvancada) {
                // FORMATO ANTIGO: dados do desenho
                dadosAnalise = dados.analiseAvancada;
                // Criar dadosFormulario básico a partir dos dados disponíveis
                dadosFormulario = criarDadosFormularioPadrao(dados);
                
                console.log('Carregado no formato ANTIGO:', {
                    dadosFormulario: dadosFormulario,
                    dadosAnalise: dadosAnalise
                });
            } else {
                throw new Error('Formato de dados não reconhecido');
            }
            
            exibirInformacoesPonto();
            executarCalculosCompletos();
            
        } else {
            mostrarErro('Nenhum dado de análise encontrado no localStorage.');
        }
    } catch (error) {
        console.error('Erro ao carregar dados da análise:', error);
        mostrarErro('Erro ao carregar dados da análise: ' + error.message);
    }
}

// Função para criar dados padrão quando só temos dados do desenho
function criarDadosFormularioPadrao(dados) {
    return {
        tipoMaterial: 'aco',
        Sut: 500, // valor padrão
        Sy: 400,  // valor padrão
        vidaUtil: {
            tipo: 'infinita',
            ciclos: null
        },
        material: {
            acabamento: 'usinado',
            Sut: 500,
            Sy: 400
        },
        confiabilidade: 50,
        temperatura: 20,
        tipoCarga: 'flexao',
        geometricos: dados.analiseAvancada?.pontoSelecionado ? {
            D: dados.analiseAvancada.pontoSelecionado.diametro_maior,
            d: dados.analiseAvancada.pontoSelecionado.diametro_menor,
            r: dados.analiseAvancada.pontoSelecionado.raio
        } : {}
    };
}

function exibirInformacoesPonto() {
    const container = document.getElementById('infoPontoAnalisado');
    if (!container) return;

    // Verificar diferentes formatos de dados
    let ponto = null;
    
    if (dadosAnalise && dadosAnalise.pontoSelecionado) {
        // Formato antigo: dados do desenho
        ponto = dadosAnalise.pontoSelecionado;
    } else if (dadosAnalise && dadosAnalise.posicao) {
        // Formato novo: dados diretos
        ponto = dadosAnalise;
    } else if (dadosFormulario && dadosFormulario.geometricos) {
        // Dados apenas do formulário
        ponto = {
            tipo: 'formulario',
            posicao: 'N/A',
            diametro_menor: dadosFormulario.geometricos.d,
            diametro_maior: dadosFormulario.geometricos.D,
            raio: dadosFormulario.geometricos.r,
            momentoFletor: dadosFormulario.carregamentos?.momento || 0,
            torque: dadosFormulario.carregamentos?.torque || 0
        };
    }

    if (!ponto) {
        container.innerHTML = '<p>⚠️ Dados do ponto não disponíveis</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="info-item">
            <strong>Tipo:</strong> ${formatarTipo(ponto.tipo)}
        </div>
        <div class="info-item">
            <strong>Posição:</strong> ${ponto.posicao || 'N/A'} mm
        </div>
        <div class="info-item">
            <strong>Diâmetro Menor (d):</strong> Ø${ponto.diametro_menor || 'N/A'} mm
        </div>
        <div class="info-item">
            <strong>Diâmetro Maior (D):</strong> Ø${ponto.diametro_maior || 'N/A'} mm
        </div>
        <div class="info-item">
            <strong>Raio:</strong> ${ponto.raio || 'Não informado'} mm
        </div>
        <div class="info-item">
            <strong>Momento Fletor:</strong> ${(ponto.momentoFletor || 0).toFixed(2)} Nm
        </div>
        <div class="info-item">
            <strong>Torque:</strong> ${(ponto.torque || 0).toFixed(0)} Nm
        </div>
        ${ponto.tipo === 'formulario' ? '<div class="info-item" style="color: #666;"><em>Dados inseridos manualmente</em></div>' : ''}
    `;
}

function formatarTipo(tipo) {
    const tipos = {
        'mancal': '⚙️ Mancal',
        'carga': '📌 Carga',
        'mudanca': '📐 Mudança de Diâmetro',
        'formulario': '📝 Dados Manuais'
    };
    return tipos[tipo] || tipo;
}

function executarCalculosCompletos() {
    try {
        // Obter ponto para cálculo (suporta diferentes formatos)
        let pontoCalculo = null;
        
        if (dadosAnalise && dadosAnalise.pontoSelecionado) {
            pontoCalculo = dadosAnalise.pontoSelecionado;
        } else if (dadosAnalise && dadosAnalise.posicao) {
            pontoCalculo = dadosAnalise;
        } else if (dadosFormulario && dadosFormulario.geometricos) {
            // Criar ponto a partir dos dados do formulário
            pontoCalculo = {
                tipo: 'formulario',
                posicao: 0,
                diametro_menor: dadosFormulario.geometricos.d,
                diametro_maior: dadosFormulario.geometricos.D,
                raio: dadosFormulario.geometricos.r || 0.001,
                momentoFletor: dadosFormulario.carregamentos?.momento || 0,
                torque: dadosFormulario.carregamentos?.torque || 0
            };
        }

        if (!pontoCalculo) {
            throw new Error('Não foi possível obter dados para cálculo');
        }

        // Configuração com dados do formulário
        const configuracao = {
            tipoMaterial: dadosFormulario?.tipoMaterial || 'aco',
            Sut: dadosFormulario?.material?.Sut || dadosFormulario?.Sut || 500,
            Sy: dadosFormulario?.material?.Sy || dadosFormulario?.Sy || 400,
            tipoAnalise: dadosFormulario?.vidaUtil?.tipo || 'infinita',
            ciclosDesejados: dadosFormulario?.vidaUtil?.ciclos || 1000000,
            acabamento: dadosFormulario?.material?.acabamento || 'usinado',
            confiabilidade: dadosFormulario?.confiabilidade || 50,
            temperatura: dadosFormulario?.temperatura || 20,
            tipoCarga: dadosFormulario?.tipoCarga || 'flexao',
            ambiente: 'normal'
        };

        console.log('Configuração para cálculo:', configuracao);
        console.log('Ponto para cálculo:', pontoCalculo);

        // Criar analisador
        const analisador = new AnalisadorFadiga(configuracao);
        
        // Executar análise
        resultadosCalculados = analisador.executarAnaliseCompleta(pontoCalculo);
        
        // Exibir resultados
        exibirResultadosCompletos(resultadosCalculados);

    } catch (error) {
        console.error('Erro nos cálculos:', error);
        mostrarErro('Erro durante os cálculos: ' + error.message);
    }
}

// =============================================
// CLASSE ANALISADOR DE FADIGA CORRIGIDA
// =============================================

class AnalisadorFadiga {
    constructor(configuracao) {
        this.config = configuracao;
    }

    executarAnaliseCompleta(ponto) {
        // 1. Calcular tensões básicas
        const tensoes = this.calcularTensoesBasicas(ponto);
        
        // 2. Calcular fatores de concentração CORRETOS
        const fatoresConcentracao = this.calcularKfKfs(ponto);
        
        // 3. Calcular limite de fadiga CORRETO
        const limiteFadiga = this.calcularLimiteFadiga(ponto);
        
        // 4. Calcular fator de segurança
        const fatorSeguranca = this.calcularFatorSeguranca(tensoes, fatoresConcentracao, limiteFadiga);
        
        return {
            ponto: ponto,
            configuracao: this.config,
            tensoes: tensoes,
            fatoresConcentracao: fatoresConcentracao,
            limiteFadiga: limiteFadiga,
            fatorSeguranca: fatorSeguranca,
            segura: fatorSeguranca >= 1.5
        };
    }

    calcularTensoesBasicas(ponto) {
        const d_mm = ponto.diametro_menor;
        const d_m = d_mm / 1000;
        const momento = ponto.momentoFletor;
        const torque = ponto.torque;

        // Tensão de flexão (σ = 32M/πd³)
        const sigma_flexao = (32 * momento) / (Math.PI * Math.pow(d_m, 3));
        
        // Tensão de torção (τ = 16T/πd³)
        const tau_torsao = (16 * torque) / (Math.PI * Math.pow(d_m, 3));
        
        // Tensão de Von Mises (σ' = √(σ² + 3τ²))
        const sigma_von_mises = Math.sqrt(Math.pow(sigma_flexao, 2) + 3 * Math.pow(tau_torsao, 2));

        return {
            flexao: sigma_flexao,
            torsao: tau_torsao,
            von_mises: sigma_von_mises,
            unidades: 'Pa'
        };
    }

    // ========== CÁLCULO DE Kt E Kts CORRETOS ==========

    calcularKt(mudanca) {
        if (!mudanca || !mudanca.diametro_maior || !mudanca.diametro_menor) {
            return 1.5;
        }

        const D = mudanca.diametro_maior;
        const d = mudanca.diametro_menor;
        const r = mudanca.raio || 0.001;
        
        const D_d = D / d;
        const r_d = r / d;
        console.log('DEBUG Kt - D:', D, 'd:', d, 'r:', r, 'D/d:', D_d, 'r/d:', r_d);
        const tabelaKt = [
            { D_d: 6.00, A: 0.87868, b: -0.33243 },
            { D_d: 3.00, A: 0.89334, b: -0.30860 },
            { D_d: 2.00, A: 0.90879, b: -0.28598 },
            { D_d: 1.50, A: 0.93836, b: -0.25759 },
            { D_d: 1.20, A: 0.97098, b: -0.21796 },
            { D_d: 1.10, A: 0.95120, b: -0.23757 },
            { D_d: 1.07, A: 0.97527, b: -0.20958 },
            { D_d: 1.05, A: 0.98137, b: -0.19653 },
            { D_d: 1.03, A: 0.98061, b: -0.18381 },
            { D_d: 1.02, A: 0.96048, b: -0.17711 },
            { D_d: 1.01, A: 0.91938, b: -0.17032 }
        ];

        return this.calcularKtGenerico(D_d, r_d, tabelaKt, "flexão");
    }

    calcularKts(mudanca) {
        if (!mudanca || !mudanca.diametro_maior || !mudanca.diametro_menor) {
            return 1.2;
        }

        const D = mudanca.diametro_maior;
        const d = mudanca.diametro_menor;
        const r = mudanca.raio || 0.001;
        
        const D_d = D / d;
        const r_d = r / d;

        const tabelaKts = [
            { D_d: 2.00, A: 0.86331, b: -0.23865 },
            { D_d: 1.33, A: 0.84897, b: -0.23161 },
            { D_d: 1.20, A: 0.83425, b: -0.21649 },
            { D_d: 1.09, A: 0.90337, b: -0.12692 }
        ];

        return this.calcularKtGenerico(D_d, r_d, tabelaKts, "torção");
    }

calcularKtGenerico(D_d, r_d, tabela, tipo) {
    console.log(`DEBUG ${tipo} - Iniciando cálculo: D/d=${D_d}, r/d=${r_d}`);
    
    tabela.sort((a, b) => b.D_d - a.D_d);

    let pontoInferior = null;
    let pontoSuperior = null;

    console.log(`DEBUG ${tipo} - Tabela:`, tabela.map(item => `D/d=${item.D_d}`).join(', '));

    for (let i = 0; i < tabela.length - 1; i++) {
        if (D_d >= tabela[i + 1].D_d && D_d <= tabela[i].D_d) {
            pontoInferior = tabela[i + 1];
            pontoSuperior = tabela[i];
            console.log(`DEBUG ${tipo} - Encontrou pontos: inferior D/d=${pontoInferior.D_d}, superior D/d=${pontoSuperior.D_d}`);
            break;
        }
    }

    if (!pontoInferior || !pontoSuperior) {
        if (D_d >= tabela[0].D_d) {
            pontoInferior = pontoSuperior = tabela[0];
            console.log(`DEBUG ${tipo} - Usando maior ponto: D/d=${pontoInferior.D_d}`);
        } else if (D_d <= tabela[tabela.length - 1].D_d) {
            pontoInferior = pontoSuperior = tabela[tabela.length - 1];
            console.log(`DEBUG ${tipo} - Usando menor ponto: D/d=${pontoInferior.D_d}`);
        } else {
            pontoInferior = tabela[tabela.length - 1];
            pontoSuperior = tabela[0];
            console.log(`DEBUG ${tipo} - Usando extremos: inferior D/d=${pontoInferior.D_d}, superior D/d=${pontoSuperior.D_d}`);
        }
    }

    let A, b;
    
    if (pontoInferior.D_d === pontoSuperior.D_d) {
        A = pontoInferior.A;
        b = pontoInferior.b;
        console.log(`DEBUG ${tipo} - Ponto único: A=${A}, b=${b}`);
    } else {
        const fator = (D_d - pontoInferior.D_d) / (pontoSuperior.D_d - pontoInferior.D_d);
        A = pontoInferior.A + fator * (pontoSuperior.A - pontoInferior.A);
        b = pontoInferior.b + fator * (pontoSuperior.b - pontoInferior.b);
        console.log(`DEBUG ${tipo} - Interpolação: fator=${fator}, A=${A}, b=${b}`);
    }

    const Kt = A * Math.pow(r_d, b);
    console.log(`DEBUG ${tipo} - Kt calculado: ${Kt} = ${A} * (${r_d})^${b}`);

    const limites = {
        "flexão": { min: 1.0, max: 5.0 },
        "torção": { min: 1.0, max: 4.0 }
    };

    const limite = limites[tipo] || { min: 1.0, max: 5.0 };
    
    const resultado = Math.max(limite.min, Math.min(limite.max, Kt));
    console.log(`DEBUG ${tipo} - Kt final: ${resultado}`);
    
    return resultado;
}

    // ========== CÁLCULO DO FATOR DE SENSIBILIDADE AO ENTALHE (q) ==========

    calcularFatorSensibilidade(Sut_Kpsi, raio_mm) {
        // Converter raio de mm para polegadas
        const raio_polegadas = raio_mm / 25.4; 
        
        // Tabela Sut (Kpsi) vs A
        const tabelaSutA = [
            { Sut: 50, A: 0.130 },
            { Sut: 55, A: 0.118 },
            { Sut: 60, A: 0.108 },
            { Sut: 70, A: 0.093 },
            { Sut: 80, A: 0.080 },
            { Sut: 90, A: 0.070 },
            { Sut: 100, A: 0.062 },
            { Sut: 110, A: 0.055 },
            { Sut: 120, A: 0.049 },
            { Sut: 130, A: 0.044 },
            { Sut: 140, A: 0.039 },
            { Sut: 160, A: 0.031 },
            { Sut: 180, A: 0.024 },
            { Sut: 200, A: 0.018 },
            { Sut: 220, A: 0.013 },
            { Sut: 240, A: 0.009 }
        ];
        
        // Encontrar o valor de A para o Sut dado (com interpolação)
        let A_valor;
        
        if (Sut_Kpsi <= tabelaSutA[0].Sut) {
            A_valor = tabelaSutA[0].A;
        } else if (Sut_Kpsi >= tabelaSutA[tabelaSutA.length - 1].Sut) {
            A_valor = tabelaSutA[tabelaSutA.length - 1].A;
        } else {
            // Interpolação linear
            for (let i = 0; i < tabelaSutA.length - 1; i++) {
                if (Sut_Kpsi >= tabelaSutA[i].Sut && Sut_Kpsi <= tabelaSutA[i + 1].Sut) {
                    const fator = (Sut_Kpsi - tabelaSutA[i].Sut) / (tabelaSutA[i + 1].Sut - tabelaSutA[i].Sut);
                    A_valor = tabelaSutA[i].A + fator * (tabelaSutA[i + 1].A - tabelaSutA[i].A);
                    break;
                }
            }
        }
        
        // CORREÇÃO APLICADA AQUI: A_valor é dividido pela raiz quadrada do raio
        const raiz_raio = Math.sqrt(raio_polegadas);
        const q = 1 / (1 + (A_valor / raiz_raio));
        
        return {
            q: q,
            A: A_valor,
            raio_polegadas: raio_polegadas,
            Sut_Kpsi: Sut_Kpsi
        };
    }

    // ========== CÁLCULO DE Kf E Kfs ==========

    calcularKfKfs(ponto) {
        const raio = ponto.raio || 0.001;
        const Kt = this.calcularKt(ponto);
        const Kts = this.calcularKts(ponto);
        
        // Calcular fator de sensibilidade
        const Sut_Kpsi = this.config.Sut / 6.89476;
        const qResult = this.calcularFatorSensibilidade(Sut_Kpsi, raio);
        const q = qResult.q;
        
        // Calcular Kf e Kfs
        const Kf = 1 + q * (Kt - 1);
        const Kfs = 1 + q * (Kts - 1);
        
        return {
            Kt: Kt,
            Kts: Kts,
            Kf: Kf,
            Kfs: Kfs,
            q: qResult.q,
            A: qResult.A,
            raio_polegadas: qResult.raio_polegadas,
            Sut_Kpsi: qResult.Sut_Kpsi
        };
    }

    // ========== CÁLCULO DO LIMITE DE FADIGA CORRETO ==========

    calcularLimiteFadiga(ponto) {
        // Se' - Limite de fadiga básico CORRETO
        const Se_prime = this.calcularSePrime();
        
        // Fatores de correção
        const fatoresC = this.calcularFatoresCorrecao(ponto);
        
        // Se - Limite de fadiga corrigido
        const Se = Se_prime.Se_prime_MPa * 1e6 * fatoresC.produto;
        
        return {
            Se_prime: Se_prime,
            Se: Se,
            fatores: fatoresC
        };
    }

    calcularSePrime() {
        const Sut = this.config.Sut;
        const tipoMaterial = this.config.tipoMaterial;
        
        // Converter MPa para Kpsi
        const Sut_Kpsi = Sut / 6.89476;
        
        let Se_prime_Kpsi;
        let Se_prime_MPa;
        
        if (tipoMaterial === 'aco') {
            if (Sut_Kpsi > 200) {
                // Para aço: Sut > 200 Kpsi → Se' = 100 Kpsi ≈ 700 MPa
                Se_prime_Kpsi = 100;
                Se_prime_MPa = 700; // Valor aproximado
            } else {
                // Para aço: Sut ≤ 200 Kpsi → Se' = 0.5 × Sut
                Se_prime_Kpsi = 0.5 * Sut_Kpsi;
                Se_prime_MPa = Se_prime_Kpsi * 6.89476;
            }
        } else if (tipoMaterial === 'ferro') {
            if (Sut_Kpsi > 60) {
                // Para ferro: Sut > 60 Kpsi → Se' = 24 Kpsi ≈ 160 MPa
                Se_prime_Kpsi = 24;
                Se_prime_MPa = 160; // Valor aproximado
            } else {
                // Para ferro: Sut ≤ 60 Kpsi → Se' = 0.4 × Sut
                Se_prime_Kpsi = 0.4 * Sut_Kpsi;
                Se_prime_MPa = Se_prime_Kpsi * 6.89476;
            }
        } else {
            // Material desconhecido
            Se_prime_Kpsi = 0.5 * Sut_Kpsi;
            Se_prime_Kpsi = Math.min(Se_prime_Kpsi, 100); // Limite de 100 Kpsi
            Se_prime_MPa = Se_prime_Kpsi * 6.89476;
        }
        
        return {
            Se_prime_MPa: Se_prime_MPa,
            Se_prime_Kpsi: Se_prime_Kpsi,
            Sut_Kpsi: Sut_Kpsi,
            limiteAtingido: (tipoMaterial === 'aco' && Sut_Kpsi > 200) || (tipoMaterial === 'ferro' && Sut_Kpsi > 60)
        };
    }

    calcularFatoresCorrecao(ponto) {
        // Ccarg - Fator de carga
        const Ccarg = this.calcularCcarg();
        
        // Ctam - Fator de tamanho
        const Ctam = this.calcularCtam(ponto);
        
        // Ctemp - Fator de temperatura
        const Ctemp = this.calcularCtemp();
        
        // Csuperf - Fator de superfície
        const Csuperf = this.calcularCsuperf();
        
        // Cconf - Fator de confiabilidade (usando a tabela fornecida)
        const Cconf = this.calcularCconf();
        
        const produto = Ccarg * Ctam * Ctemp * Csuperf * Cconf;
        
        return {
            Ccarg: Ccarg,
            Ctam: Ctam,
            Ctemp: Ctemp,
            Csuperf: Csuperf,
            Cconf: Cconf,
            produto: produto
        };
    }

    calcularCcarg() {
        const fatores = {
            'flexao': 1.0,
            'torsao': 1.0,
            'normal': 0.70
        };
        return fatores[this.config.tipoCarga] || 1.0;
    }

    calcularCtam(ponto) {
        const D_mm = ponto.diametro_maior;
        
        if (D_mm <= 8) {
            return 1.0;
        } else {
            return 1.189 * Math.pow(D_mm, -0.097);
        }
    }

    calcularCtemp() {
        const temperatura = this.config.temperatura;
        
        if (temperatura <= 450) {
            return 1.0;
        } else if (temperatura <= 550) {
            return 1 - 0.0058 * (temperatura - 450);
        } else {
            const tempF = temperatura * 9/5 + 32;
            if (tempF <= 1020) {
                return 1 - 0.0032 * (tempF - 840);
            } else {
                return 0.5;
            }
        }
    }

    calcularCsuperf() {
        const acabamento = this.config.acabamento;
        const Sut_MPa = this.config.Sut;
        const tipoMaterial = this.config.tipoMaterial;
        
        const tabelaMPa = {
            'retificado': { A: 1.58, b: -0.085 },
            'usinado': { A: 4.51, b: -0.265 },
            'laminado': { A: 57.7, b: -0.718 },
            'forjado': { A: 272, b: -0.995 }
        };

        const coeficientes = tabelaMPa[acabamento] || tabelaMPa['usinado'];
        return coeficientes.A * Math.pow(Sut_MPa, coeficientes.b);
    }

    calcularCconf() {
        const confiabilidade = this.config.confiabilidade;
        const chaves = Object.keys(FATORES_CONFIABILIDADE).map(Number).sort((a, b) => a - b);
        
        if (confiabilidade <= chaves[0]) return FATORES_CONFIABILIDADE[chaves[0]];
        if (confiabilidade >= chaves[chaves.length - 1]) return FATORES_CONFIABILIDADE[chaves[chaves.length - 1]];
        
        for (let i = 0; i < chaves.length - 1; i++) {
            if (confiabilidade >= chaves[i] && confiabilidade <= chaves[i + 1]) {
                const fator = (confiabilidade - chaves[i]) / (chaves[i + 1] - chaves[i]);
                return FATORES_CONFIABILIDADE[chaves[i]] + fator * (FATORES_CONFIABILIDADE[chaves[i + 1]] - FATORES_CONFIABILIDADE[chaves[i]]);
            }
        }
        
        return FATORES_CONFIABILIDADE[90];
    }

    calcularFatorSeguranca(tensoes, fatoresConcentracao, limiteFadiga) {
        // Tensão máxima considerando concentração (usando Kf para flexão)
        const tensao_flexao_corrigida = tensoes.flexao * fatoresConcentracao.Kf;
        const tensao_torsao_corrigida = tensoes.torsao * fatoresConcentracao.Kfs;
        
        // Tensão de Von Mises corrigida
        const tensao_von_mises_corrigida = Math.sqrt(
            Math.pow(tensao_flexao_corrigida, 2) + 3 * Math.pow(tensao_torsao_corrigida, 2)
        );
        
        // Fator de segurança = Limite de fadiga / Tensão máxima corrigida
        return limiteFadiga.Se / tensao_von_mises_corrigida;
    }
}

function exibirResultadosCompletos(resultados) {
    const container = document.getElementById('conteudoResultados');
    
    const fatorSeguranca = resultados.fatorSeguranca;
    const status = resultados.segura ? 'adequado' : 'critico';
    const statusClass = resultados.segura ? 'status-adequado' : 'status-critico';
    
    // Converter para MPa para exibição
    const tensao_flexao_MPa = resultados.tensoes.flexao / 1e6;
    const tensao_torsao_MPa = resultados.tensoes.torsao / 1e6;
    const tensao_von_mises_MPa = resultados.tensoes.von_mises / 1e6;
    const Se_prime_MPa = resultados.limiteFadiga.Se_prime.Se_prime_MPa;
    const Se_MPa = resultados.limiteFadiga.Se / 1e6;
    
    let html = `
        <div class="resultados-grid">
            <div class="resultado-coluna">
                <h4>🛡️ Fatores de Segurança</h4>
                <div class="resultado-item ${statusClass}">
                    <span>Fator de Segurança (N):</span>
                    <span>${fatorSeguranca.toFixed(2)}</span>
                </div>
                <div class="resultado-item">
                    <span>Status:</span>
                    <span class="${statusClass}">${status.toUpperCase()}</span>
                </div>
                <div class="resultado-item">
                    <span>Recomendação:</span>
                    <span>${gerarRecomendacaoSeguranca(fatorSeguranca)}</span>
                </div>
            </div>
            
            <div class="resultado-coluna">
                <h4>📈 Tensões Calculadas</h4>
                <div class="resultado-item">
                    <span>σ Flexão:</span>
                    <span>${tensao_flexao_MPa.toFixed(1)} MPa</span>
                </div>
                <div class="resultado-item">
                    <span>τ Cisalhamento:</span>
                    <span>${tensao_torsao_MPa.toFixed(1)} MPa</span>
                </div>
                <div class="resultado-item">
                    <span>σ' Von Mises:</span>
                    <span>${tensao_von_mises_MPa.toFixed(1)} MPa</span>
                </div>
            </div>
            
            <div class="resultado-coluna">
                <h4>🔧 Fatores de Concentração</h4>
                <div class="resultado-item">
                    <span>Kt (Flexão):</span>
                    <span>${resultados.fatoresConcentracao.Kt.toFixed(3)}</span>
                </div>
                <div class="resultado-item">
                    <span>Kts (Torção):</span>
                    <span>${resultados.fatoresConcentracao.Kts.toFixed(3)}</span>
                </div>
                <div class="resultado-item">
                    <span>Kf (Fadiga Flexão):</span>
                    <span>${resultados.fatoresConcentracao.Kf.toFixed(3)}</span>
                </div>
                <div class="resultado-item">
                    <span>Kfs (Fadiga Torção):</span>
                    <span>${resultados.fatoresConcentracao.Kfs.toFixed(3)}</span>
                </div>
                <div class="resultado-item">
                    <span>q (Sensibilidade):</span>
                    <span>${resultados.fatoresConcentracao.q.toFixed(3)}</span>
                </div>
            </div>
        </div>

        <div class="card-resultado">
            <h4>📊 Limites de Fadiga</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <strong>Se' (Básico):</strong><br>
                    ${Se_prime_MPa.toFixed(1)} MPa
                    ${resultados.limiteFadiga.Se_prime.limiteAtingido ? '<br><small style="color: #e67e22;">(Limite aplicado)</small>' : ''}
                </div>
                <div>
                    <strong>Se (Corrigido):</strong><br>
                    ${Se_MPa.toFixed(1)} MPa
                </div>
                <div>
                    <strong>Sut:</strong><br>
                    ${resultados.configuracao.Sut} MPa
                </div>
                <div>
                    <strong>Sy:</strong><br>
                    ${resultados.configuracao.Sy} MPa
                </div>
            </div>
        </div>

        <div class="card-resultado">
            <h4>⚙️ Fatores de Correção Aplicados</h4>
            <table class="tabela-resultados">
                <thead>
                    <tr>
                        <th>Fator</th>
                        <th>Valor</th>
                        <th>Descrição</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Ccarg</td>
                        <td>${resultados.limiteFadiga.fatores.Ccarg.toFixed(3)}</td>
                        <td>Fator de Carga (${resultados.configuracao.tipoCarga})</td>
                    </tr>
                    <tr>
                        <td>Ctam</td>
                        <td>${resultados.limiteFadiga.fatores.Ctam.toFixed(3)}</td>
                        <td>Fator de Tamanho</td>
                    </tr>
                    <tr>
                        <td>Ctemp</td>
                        <td>${resultados.limiteFadiga.fatores.Ctemp.toFixed(3)}</td>
                        <td>Fator de Temperatura (${resultados.configuracao.temperatura}°C)</td>
                    </tr>
                    <tr>
                        <td>Csuperf</td>
                        <td>${resultados.limiteFadiga.fatores.Csuperf.toFixed(3)}</td>
                        <td>Fator de Superfície (${resultados.configuracao.acabamento})</td>
                    </tr>
                    <tr>
                        <td>Cconf</td>
                        <td>${resultados.limiteFadiga.fatores.Cconf.toFixed(3)}</td>
                        <td>Fator de Confiabilidade (${resultados.configuracao.confiabilidade}%)</td>
                    </tr>
                    <tr style="font-weight: bold; background: #f8f9fa;">
                        <td>Produto</td>
                        <td>${resultados.limiteFadiga.fatores.produto.toFixed(3)}</td>
                        <td>Produto de todos os fatores C</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="card-resultado">
            <h4>💡 Detalhes Técnicos</h4>
            <div class="detalhes-tecnicos">
                <strong>Cálculo do fator de sensibilidade (q):</strong><br>
                Sut = <span class="variavel">${resultados.fatoresConcentracao.Sut_Kpsi.toFixed(1)} Kpsi</span><br>
                A = <span class="variavel">${resultados.fatoresConcentracao.A.toFixed(4)} in^(1/2)</span><br>
                r = <span class="variavel">${resultados.fatoresConcentracao.raio_polegadas.toFixed(4)} in</span><br>
                <span class="formula">q = 1 / (1 + A/√r)</span> = <span class="valor">${resultados.fatoresConcentracao.q.toFixed(3)}</span><br><br>
                
                <strong>Cálculo de Kf e Kfs:</strong><br>
                <span class="formula">Kf = 1 + q(Kt - 1)</span> = 1 + ${resultados.fatoresConcentracao.q.toFixed(3)}(${resultados.fatoresConcentracao.Kt.toFixed(3)} - 1) = <span class="valor">${resultados.fatoresConcentracao.Kf.toFixed(3)}</span><br>
                <span class="formula">Kfs = 1 + q(Kts - 1)</span> = 1 + ${resultados.fatoresConcentracao.q.toFixed(3)}(${resultados.fatoresConcentracao.Kts.toFixed(3)} - 1) = <span class="valor">${resultados.fatoresConcentracao.Kfs.toFixed(3)}</span>
            </div>
        </div>

        <div class="card-resultado ${!resultados.segura ? 'critico' : ''}">
            <h4>🎯 Conclusão da Análise</h4>
            <p>${gerarRecomendacoesCompletas(resultados)}</p>
        </div>
    `;

    container.innerHTML = html;
    inicializarGeradorPDF(resultados);
}

function gerarRecomendacaoSeguranca(n) {
    if (n >= 3) return '✅ Excelente';
    if (n >= 2) return '✅ Adequado';
    if (n >= 1.5) return '⚠️ Atenção';
    if (n >= 1) return '🚨 Crítico';
    return '❌ Insuficiente';
}

function gerarRecomendacoesCompletas(resultados) {
    const n = resultados.fatorSeguranca;
    
    if (n >= 3) {
        return "✅ O dimensionamento está EXCELENTE. O componente possui margem de segurança significativa e atende plenamente aos requisitos de fadiga para vida infinita.";
    } else if (n >= 2) {
        return "✅ O dimensionamento está ADEQUADO. O fator de segurança está dentro da faixa recomendada para aplicações industriais padrão.";
    } else if (n >= 1.5) {
        return "⚠️ O dimensionamento requer ATENÇÃO. Recomenda-se monitorar o componente em serviço e considerar melhorias no acabamento superficial ou pequeno aumento nas dimensões.";
    } else if (n >= 1) {
        return "🚨 O dimensionamento é CRÍTICO. Recomenda-se URGENTEMENTE redimensionar o componente, aumentar as dimensões ou selecionar material de maior resistência.";
    } else {
        return "❌ FALHA IMINENTE. O dimensionamento NÃO ATENDE aos requisitos mínimos de segurança. Redimensione IMEDIATAMENTE.";
    }
}

function exportarResultados() {
    if (!resultadosCalculados) {
        alert('Nenhum resultado disponível para exportar.');
        return;
    }

    const conteudo = document.getElementById('conteudoResultados').innerHTML;
    const blob = new Blob([`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Resultados da Análise de Fadiga</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .card-resultado { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .resultados-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Relatório de Análise de Fadiga</h1>
            <p>Gerado em: ${new Date().toLocaleString()}</p>
            ${conteudo}
        </body>
        </html>
    `], { type: 'text/html' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-fadiga-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

function voltarParaAnalise() {
    window.location.href = 'analise.html';
}

function mostrarErro(mensagem) {
    const container = document.getElementById('conteudoResultados');
    container.innerHTML = `
        <div class="card-resultado critico">
            <h4>❌ Erro</h4>
            <p>${mensagem}</p>
            <button onclick="voltarParaAnalise()" class="btn-voltar">Voltar à Análise</button>
        </div>
    `;
}
function inicializarGeradorPDF(resultados) {
    // Tornar os dados globais para o geradorPDF acessar
    window.dadosParaPDF = {
        resultados: resultados,
        dadosFormulario: dadosFormulario,
        dadosAnalise: dadosAnalise
    };
    
    // Mostrar botão de gerar gráfico
    document.getElementById('btnGerarGrafico').style.display = 'block';
    
    // Inicializar o gerador de PDF
    if (window.geradorPDF) {
        window.geradorPDF.inicializar(resultados, dadosFormulario, dadosAnalise);
    }
}

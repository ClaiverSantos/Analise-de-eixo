// =============================================
// CONFIGURADOR DE MATERIAL E ANÁLISE ATUALIZADO
// =============================================

class ConfiguradorAnalise {
    constructor() {
        this.config = {
            // Propriedades do Material
            tipoMaterial: 'aco', // 'aco' ou 'ferro'
            Sut: 1515.8,
            Sy: 1240.2,
            // Tipo de Análise
            tipoAnalise: 'infinita', // 'infinita' ou 'finita'
            ciclosDesejados: 1000000, // Para vida finita
            // Acabamento superficial
            acabamento: 'retificado', // 'retificado', 'usinado', 'laminado', 'forjado'
            // Confiabilidade
            confiabilidade: 90, // 50, 90, 95, 99, 99.9, 99.99, 99.999 (%)
            // Temperatura
            temperatura: 20, // °C
            // Outros fatores
            tipoCarga: 'flexao', // 'flexao', 'axial', 'torsao'
            ambiente: 'normal' // 'normal', 'corrosivo'
        };
    }

    // Interface para configurar a análise
    gerarInterfaceConfiguracao() {
        return `
            <div class="painel-configuracao">
                <h3>⚙️ Configuração da Análise de Fadiga (Metodologia Fatores C)</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                    <!-- Coluna 1: Propriedades do Material -->
                    <div>
                        <h4>📦 Propriedades do Material</h4>
                        
                        <div class="form-group">
                            <label for="tipoMaterialSelect">Tipo de Material:</label>
                            <select id="tipoMaterialSelect" style="width: 100%; padding: 8px; margin: 5px 0;">
                                <option value="aco" ${this.config.tipoMaterial === 'aco' ? 'selected' : ''}>Aço</option>
                                <option value="ferro" ${this.config.tipoMaterial === 'ferro' ? 'selected' : ''}>Ferro Fundido</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="sutInput">Sut (Resistência Última - MPa):</label>
                            <input type="number" id="sutInput" value="${this.config.Sut}" step="0.1" 
                                   style="width: 100%; padding: 8px; margin: 5px 0;">
                        </div>
                        
                        <div class="form-group">
                            <label for="syInput">Sy (Limite de Escoamento - MPa):</label>
                            <input type="number" id="syInput" value="${this.config.Sy}" step="0.1"
                                   style="width: 100%; padding: 8px; margin: 5px 0;">
                        </div>
                        
                        <div class="form-group">
                            <label for="acabamentoSelect">Acabamento Superficial:</label>
                            <select id="acabamentoSelect" style="width: 100%; padding: 8px; margin: 5px 0;">
                                <option value="retificado" ${this.config.acabamento === 'retificado' ? 'selected' : ''}>Retificado</option>
                                <option value="usinado" ${this.config.acabamento === 'usinado' ? 'selected' : ''}>Usinado ou Estirado a Frio</option>
                                <option value="laminado" ${this.config.acabamento === 'laminado' ? 'selected' : ''}>Laminado a Quente</option>
                                <option value="forjado" ${this.config.acabamento === 'forjado' ? 'selected' : ''}>Forjado</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Coluna 2: Tipo de Análise -->
                    <div>
                        <h4>📊 Tipo de Análise</h4>
                        
                        <div class="form-group">
                            <label>Tipo de Vida:</label>
                            <div style="margin: 10px 0;">
                                <label style="display: block; margin: 5px 0;">
                                    <input type="radio" name="tipoAnalise" value="infinita" 
                                           ${this.config.tipoAnalise === 'infinita' ? 'checked' : ''}
                                           onchange="atualizarVisibilidadeCiclos()">
                                    Vida Infinita (N > 10⁶ ciclos)
                                </label>
                                <label style="display: block; margin: 5px 0;">
                                    <input type="radio" name="tipoAnalise" value="finita" 
                                           ${this.config.tipoAnalise === 'finita' ? 'checked' : ''}
                                           onchange="atualizarVisibilidadeCiclos()">
                                    Vida Finita (N específico)
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group" id="grupoCiclos" style="${this.config.tipoAnalise === 'infinita' ? 'display: none;' : ''}">
                            <label for="ciclosInput">Número de Ciclos Desejados (N):</label>
                            <input type="number" id="ciclosInput" value="${this.config.ciclosDesejados}" 
                                   step="1000" style="width: 100%; padding: 8px; margin: 5px 0;">
                            <small style="color: #666;">Ex: 1000000 para 1 milhão de ciclos</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="confiabilidadeSelect">Confiabilidade:</label>
                            <select id="confiabilidadeSelect" style="width: 100%; padding: 8px; margin: 5px 0;">
                                <option value="50" ${this.config.confiabilidade === 50 ? 'selected' : ''}>50%</option>
                                <option value="90" ${this.config.confiabilidade === 90 ? 'selected' : ''}>90%</option>
                                <option value="95" ${this.config.confiabilidade === 95 ? 'selected' : ''}>95%</option>
                                <option value="99" ${this.config.confiabilidade === 99 ? 'selected' : ''}>99%</option>
                                <option value="99.9" ${this.config.confiabilidade === 99.9 ? 'selected' : ''}>99.9%</option>
                                <option value="99.99" ${this.config.confiabilidade === 99.99 ? 'selected' : ''}>99.99%</option>
                                <option value="99.999" ${this.config.confiabilidade === 99.999 ? 'selected' : ''}>99.999%</option>
                                <option value="99.999" ${this.config.confiabilidade === 99.9999 ? 'selected' : ''}>99.999%</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Configurações Avançadas -->
                <details style="margin: 15px 0;">
                    <summary>⚡ Configurações Avançadas</summary>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                        <div>
                            <div class="form-group">
                                <label for="tipoCargaSelect">Tipo de Carregamento:</label>
                                <select id="tipoCargaSelect" style="width: 100%; padding: 8px;">
                                    <option value="flexao" ${this.config.tipoCarga === 'flexao' ? 'selected' : ''}>Flexão</option>
                                    <option value="axial" ${this.config.tipoCarga === 'axial' ? 'selected' : ''}>Axial</option>
                                    <option value="torsao" ${this.config.tipoCarga === 'torsao' ? 'selected' : ''}>Torção</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <div class="form-group">
                                <label for="temperaturaInput">Temperatura de Trabalho (°C):</label>
                                <input type="number" id="temperaturaInput" value="${this.config.temperatura}" 
                                       style="width: 100%; padding: 8px;">
                            </div>
                        </div>
                    </div>
                </details>
                
                <button onclick="aplicarConfiguracaoEcalcular()" class="verde" style="margin-top: 15px;">
                    ✅ Aplicar Configuração e Calcular
                </button>
            </div>
        `;
    }

    // Obter configuração atualizada da interface
    obterConfiguracao() {
        return {
            tipoMaterial: document.getElementById('tipoMaterialSelect').value,
            Sut: parseFloat(document.getElementById('sutInput').value) || 1515.8,
            Sy: parseFloat(document.getElementById('syInput').value) || 1240.2,
            tipoAnalise: document.querySelector('input[name="tipoAnalise"]:checked').value,
            ciclosDesejados: parseInt(document.getElementById('ciclosInput').value) || 1000000,
            acabamento: document.getElementById('acabamentoSelect').value,
            confiabilidade: parseFloat(document.getElementById('confiabilidadeSelect').value),
            temperatura: parseFloat(document.getElementById('temperaturaInput').value) || 20,
            tipoCarga: document.getElementById('tipoCargaSelect').value,
            ambiente: 'normal'
        };
    }
}

// =============================================
// ANALISADOR DE FADIGA ATUALIZADO COM CORREÇÕES
// =============================================

class AnalisadorFadiga {
    constructor(dadosEixo, configuracao, resultadosEstatica) {
        this.dadosEixo = dadosEixo;
        this.config = configuracao;
        this.resultadosEstatica = resultadosEstatica;
    }

    // ========== FATORES C CORRIGIDOS ==========

    // Fator de Carga (Ccarg) - CORRETO
    calcularCcarg(tipoCarga) {
        const fatores = {
            'flexao': 1.0,
            'torsao': 1.0,
            'axial': 0.70
        };
        return fatores[tipoCarga] || 1.0;
    }

    // Fator de Tamanho (Ctam) - CORRIGIDO
    calcularCtam(mudanca) {
        if (!mudanca || !mudanca.diametro_maior) {
            return 1.0;
        }
        
        // Usar o diâmetro maior (D) em mm
        const D_mm = mudanca.diametro_maior;
        
        if (D_mm <= 8) { // D <= 8mm
            return 1.0;
        } else { // D > 8mm
            return 1.189 * Math.pow(D_mm, -0.097);
        }
    }

    // Fator de Temperatura (Ctemp) - CORRETO
    calcularCtemp(temperatura) {
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

    // Fator de Superfície (Csuperf) - CORRETO
    calcularCsuperf(acabamento, Sut, tipoMaterial) {
        const Sut_MPa = Sut;
        
        const tabelaMPa = {
            'retificado': { A: 1.58, b: -0.085 },
            'usinado': { A: 4.51, b: -0.265 },
            'laminado': { A: 57.7, b: -0.718 },
            'forjado': { A: 272, b: -0.995 }
        };

        const tabelaKpsi = {
            'retificado': { A: 1.34, b: -0.085 },
            'usinado': { A: 2.7, b: -0.265 },
            'laminado': { A: 14.4, b: -0.718 },
            'forjado': { A: 39.9, b: -0.995 }
        };

        // Seleção da tabela baseada no tipo de material
        let tabela;
        let Sut_ajustado;
        
        if (tipoMaterial === 'aco') {
            // Para aço usa a tabela MPa (primeira tabela)
            tabela = tabelaMPa;
            Sut_ajustado = Sut_MPa;
        } else if (tipoMaterial === 'ferro') {
            // Para ferro usa a tabela Kpsi (segunda tabela)
            tabela = tabelaKpsi;
            Sut_ajustado = Sut_MPa; // Mantém em MPa pois a tabela Kpsi já está ajustada
        } else {
            // Material desconhecido, usa padrão (MPa)
            tabela = tabelaMPa;
            Sut_ajustado = Sut_MPa;
        }

        const coeficientes = tabela[acabamento] || tabela['usinado'];
        
        if (!coeficientes) {
            console.warn(`Acabamento '${acabamento}' não encontrado, usando 'usinado' como padrão`);
            return this.calcularCsuperf('usinado', Sut, tipoMaterial);
        }

        return coeficientes.A * Math.pow(Sut_ajustado, coeficientes.b);
    }

    // Fator de Confiabilidade (Cconf) - CORRETO
    calcularCconf(confiabilidade) {
        const fatores = {
            50: 1.000,
            90: 0.897,
            95: 0.868,
            99: 0.814,
            99.9: 0.753,
            99.99: 0.702,
            99.999: 0.659,
            99.9999: 0.620
        };
        
        const chaves = Object.keys(fatores).map(Number).sort((a, b) => a - b);
        
        if (confiabilidade <= chaves[0]) return fatores[chaves[0]];
        if (confiabilidade >= chaves[chaves.length - 1]) return fatores[chaves[chaves.length - 1]];
        
        for (let i = 0; i < chaves.length - 1; i++) {
            if (confiabilidade >= chaves[i] && confiabilidade <= chaves[i + 1]) {
                const fator = (confiabilidade - chaves[i]) / (chaves[i + 1] - chaves[i]);
                return fatores[chaves[i]] + fator * (fatores[chaves[i + 1]] - fatores[chaves[i]]);
            }
        }
        
        return fatores[95];
    }

    // Limite de Fadiga Básico (Se') - CORRIGIDO
    // Limite de Fadiga Básico (Se') - CORRIGIDO COM VALORES APROXIMADOS
    calcularSePrime(Sut, tipoMaterial) {
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

    // ========== FATORES DE CONCENTRAÇÃO DE TENSÃO ==========
    // (Mantidos iguais - já estavam corretos)

    calcularKt(mudanca) {
        if (!mudanca || !mudanca.diametro_maior || !mudanca.diametro_menor) {
            return 1.5;
        }

        const D = mudanca.diametro_maior;
        const d = mudanca.diametro_menor;
        const r = mudanca.raio || 0.001;
        
        const D_d = D / d;
        const r_d = r / d;

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
        tabela.sort((a, b) => b.D_d - a.D_d);

        let pontoInferior = null;
        let pontoSuperior = null;

        for (let i = 0; i < tabela.length - 1; i++) {
            if (D_d >= tabela[i + 1].D_d && D_d <= tabela[i].D_d) {
                pontoInferior = tabela[i + 1];
                pontoSuperior = tabela[i];
                break;
            }
        }

        if (!pontoInferior || !pontoSuperior) {
            if (D_d >= tabela[0].D_d) {
                pontoInferior = pontoSuperior = tabela[0];
            } else if (D_d <= tabela[tabela.length - 1].D_d) {
                pontoInferior = pontoSuperior = tabela[tabela.length - 1];
            } else {
                pontoInferior = tabela[tabela.length - 1];
                pontoSuperior = tabela[0];
            }
        }

        let A, b;
        
        if (pontoInferior.D_d === pontoSuperior.D_d) {
            A = pontoInferior.A;
            b = pontoInferior.b;
        } else {
            const fator = (D_d - pontoInferior.D_d) / (pontoSuperior.D_d - pontoInferior.D_d);
            A = pontoInferior.A + fator * (pontoSuperior.A - pontoInferior.A);
            b = pontoInferior.b + fator * (pontoSuperior.b - pontoInferior.b);
        }

        const Kt = A * Math.pow(r_d, b);

        const limites = {
            "flexão": { min: 1.0, max: 5.0 },
            "torção": { min: 1.0, max: 4.0 }
        };

        const limite = limites[tipo] || { min: 1.0, max: 5.0 };
        
        return Math.max(limite.min, Math.min(limite.max, Kt));
    }


// ========== CÁLCULO DO FATOR DE SENSIBILIDADE AO ENTALHE (q) ==========

    calcularFatorSensibilidade(Sut_Kpsi, raio_m) {
        // Converter raio de metros para polegadas
    const raio_polegadas = raio_m / 25.4; 
    
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

  
    calcularKfKfs(mudanca, Sut_Kpsi) {
        const raio = mudanca.raio || 0.001;
        const Kt = this.calcularKt(mudanca);
        const Kts = this.calcularKts(mudanca);
        
        // Calcular fator de sensibilidade
        const qResult = this.calcularFatorSensibilidade(Sut_Kpsi, raio);
        const q = qResult.q;
        
        // Calcular Kf e Kfs
        const Kf = 1 + q * (Kt - 1);
        const Kfs = 1 + q * (Kts - 1);
        
        // ========== NOVO: CÁLCULO DAS TENSÕES CORRIGIDAS ==========
        const tensaoFlexaoOriginal = mudanca.tensaoFlexao; // Em Pa (do calculos.js)
        const tensaoTorsaoOriginal = mudanca.tensaoTorsao; // Em Pa (do calculos.js)
        
        // Aplicar fatores de concentração de fadiga
        const tensaoFlexaoCorrigida = Kf * tensaoFlexaoOriginal;
        const tensaoTorsaoCorrigida = Kfs * tensaoTorsaoOriginal;
        
        // Calcular σa conforme a regra especificada: σa = σ_corrigido e σa = √(3 × τ_corrigido²)
        const sigmaVonMisesCorrigido = Math.sqrt(
            3 * Math.pow(tensaoTorsaoCorrigida, 2)
        );
        
        return {
            Kf: Kf,
            Kfs: Kfs,
            q: q,
            A: qResult.A,
            raio_polegadas: qResult.raio_polegadas,
            Kt: Kt,
            Kts: Kts,
            // NOVOS: Tensões corrigidas
            tensoesCorrigidas: {
                flexao: {
                    original: tensaoFlexaoOriginal,
                    corrigida: tensaoFlexaoCorrigida,
                    fator: Kf
                },
                torsao: {
                    original: tensaoTorsaoOriginal,
                    corrigida: tensaoTorsaoCorrigida,
                    fator: Kfs
                },
                vonMises: {
                    // REMOVIDO: original: mudanca.sigma_vonMises,
                    corrigido: sigmaVonMisesCorrigido
                }
            }
        };
    }



// ========== ATUALIZAR O CÁLCULO DO LIMITE DE FADIGA (Versão Corrigida para Retorno de Kf/Kfs) ==========

    calcularLimiteFadigaInfinita() {
        const mudancaCritica = this.resultadosEstatica.mudancaMaisCritica;
        
        // 1. Calcular Se' com conversão correta
        const sePrimeResult = this.calcularSePrime(this.config.Sut, this.config.tipoMaterial);
        const Se_prime_Pa = sePrimeResult.Se_prime_MPa * 1e6;
        
        // 2. Calcular todos os fatores C
        const Ccarg = this.calcularCcarg(this.config.tipoCarga);
        const Ctam = this.calcularCtam(mudancaCritica);
        const Ctemp = this.calcularCtemp(this.config.temperatura);
        const Csuperf = this.calcularCsuperf(this.config.acabamento, this.config.Sut, this.config.tipoMaterial);
        const Cconf = this.calcularCconf(this.config.confiabilidade);
        
        // 3. Calcular Kf e Kfs (Fatores de Concentração de Fadiga) COM TENSÕES CORRIGIDAS
        const kfKfsResult = this.calcularKfKfs(mudancaCritica, sePrimeResult.Sut_Kpsi);
        
        // 4. Calcular Se (limite de fadiga corrigido) - APENAS MULTIPLICAR PELOS FATORES C
        const fatoresC = Ccarg * Ctam * Ctemp * Csuperf * Cconf;
        const Se_Pa = Se_prime_Pa * fatoresC; // SEM DIVISÃO POR Kf/Kfs
        
        return {
            Se_prime: Se_prime_Pa,
            Se: Se_Pa,
            fatores: { 
                Ccarg, Ctam, Ctemp, Csuperf, Cconf,
                Kt: kfKfsResult.Kt,
                Kts: kfKfsResult.Kts,
                Kf: kfKfsResult.Kf,
                Kfs: kfKfsResult.Kfs,
                q: kfKfsResult.q,
                Kt_efetivo: this.config.tipoCarga === 'torsao' ? kfKfsResult.Kts : kfKfsResult.Kt,
                // INCLUIR AS TENSÕES CORRIGIDAS AQUI
                tensoesCorrigidas: kfKfsResult.tensoesCorrigidas
            },
            fatoresC_multiplos: fatoresC,
            detalhes: {
                Se_prime_MPa: sePrimeResult.Se_prime_MPa,
                Se_MPa: Se_Pa / 1e6,
                Se_prime_Kpsi: sePrimeResult.Se_prime_Kpsi,
                Sut_Kpsi: sePrimeResult.Sut_Kpsi,
                limiteAtingido: sePrimeResult.limiteAtingido,
                // Detalhes do cálculo de q para o HTML
                q_calculo: {
                    A: kfKfsResult.A,
                    raio_polegadas: kfKfsResult.raio_polegadas,
                    raio_mm: (mudancaCritica.raio || 0.001) * 1000
                }
            }
        };
    }
        // ========== ANÁLISE COMPLETA ==========

    executarAnaliseFadiga() {
        const mudancaCritica = this.resultadosEstatica.mudancaMaisCritica;
        if (!mudancaCritica) {
            throw new Error('Nenhuma mudança crítica encontrada');
        }

        let limiteFadiga, tipoLimite;
        
        if (this.config.tipoAnalise === 'infinita') {
            limiteFadiga = this.calcularLimiteFadigaInfinita();
            tipoLimite = 'infinita';
        } else {
            limiteFadiga = this.calcularLimiteFadigaFinita(this.config.ciclosDesejados);
            tipoLimite = 'finita';
        }

        const tensaoMaxima_Pa = mudancaCritica.tensao_max * 1e6;
        const limiteFadigaValor = tipoLimite === 'infinita' ? limiteFadiga.Se : limiteFadiga.Sf;
        const fatorSeguranca = limiteFadigaValor / tensaoMaxima_Pa;

        return {
            configuracao: this.config,
            tipoAnalise: tipoLimite,
            limiteFadiga: limiteFadiga,
            mudancaCritica: mudancaCritica,
            tensaoMaxima: tensaoMaxima_Pa,
            fatorSeguranca: fatorSeguranca,
            segura: fatorSeguranca >= 1.5,
            parametrosGeometricos: {
                D: mudancaCritica.diametro_maior,
                d: mudancaCritica.diametro_menor,
                r: mudancaCritica.raio || 0.001,
                D_d: mudancaCritica.diametro_maior / mudancaCritica.diametro_menor,
                r_d: (mudancaCritica.raio || 0.001) / mudancaCritica.diametro_menor,
                tipo_carga: this.config.tipoCarga,
                diametro_mm: mudancaCritica.diametro_menor * 1000
            }
        };
    }
}


// =============================================
// GERENCIADOR DE RESULTADOS ATUALIZADO
// =============================================

class GerenciadorDiagramas {
    inicializar(dadosEixo, configuracao, resultadosEstatica) {
        this.dadosEixo = dadosEixo;
        this.config = configuracao;
        this.resultadosEstatica = resultadosEstatica;
    }

    gerarHTMLResultados() {
        const analisador = new AnalisadorFadiga(this.dadosEixo, this.config, this.resultadosEstatica);
        const resultados = analisador.executarAnaliseFadiga();
    window.gerenciadorAtual = this;
        // Variáveis de fácil acesso
    const Kt = resultados.limiteFadiga.fatores.Kt;
    const Kts = resultados.limiteFadiga.fatores.Kts;
    const Kf = resultados.limiteFadiga.fatores.Kf;
    const Kfs = resultados.limiteFadiga.fatores.Kfs;
    const q_val = resultados.limiteFadiga.fatores.q;
    const A_val = resultados.limiteFadiga.detalhes.q_calculo.A;
    const raio_polegadas = resultados.limiteFadiga.detalhes.q_calculo.raio_polegadas;
    const raio_mm = resultados.limiteFadiga.detalhes.q_calculo.raio_mm;

    const limiteMsg = resultados.limiteFadiga.detalhes.limiteAtingido ? 
        ` (Limite de ${resultados.limiteFadiga.detalhes.Se_prime_Kpsi.toFixed(0)} Kpsi aplicado)` : '';

    return `
        <div class="resultados-fadiga">
            <h3>📊 Resultados da Análise de Fadiga</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div class="card-resultado">
                    <h4>⚙️ Configuração da Análise</h4>
                    <ul>
                        <li><strong>Material:</strong> ${resultados.configuracao.tipoMaterial === 'aco' ? 'Aço' : 'Ferro Fundido'}</li>
                        <li><strong>Diâmetro menor:</strong> ${resultados.parametrosGeometricos.diametro_mm.toFixed(1)} mm</li>
                        <li><strong>Tipo de Análise:</strong> ${resultados.tipoAnalise}</li>
                        <li><strong>Tipo de Carga:</strong> ${resultados.configuracao.tipoCarga}</li>
                        <li><strong>Sut:</strong> ${resultados.configuracao.Sut} MPa (${resultados.limiteFadiga.detalhes.Sut_Kpsi.toFixed(0)} Kpsi)</li>
                        <li><strong>Sy:</strong> ${resultados.configuracao.Sy} MPa</li>
                        <li><strong>Acabamento:</strong> ${resultados.configuracao.acabamento}</li>
                        <li><strong>Confiabilidade:</strong> ${resultados.configuracao.confiabilidade}%</li>
                        ${resultados.tipoAnalise === 'finita' ? 
                            `<li><strong>Ciclos Desejados:</strong> ${resultados.configuracao.ciclosDesejados.toLocaleString()}</li>` : ''}
                    </ul>
                </div>
                
                <div class="card-resultado">
                    <h4>📈 Propriedades de Fadiga</h4>
                    <ul>
                        <li><strong>Se' (Básico):</strong> ${resultados.limiteFadiga.detalhes.Se_prime_MPa.toFixed(1)} MPa${limiteMsg}</li>
                        <li><strong>Limite de Fadiga ($\text{Se}$):</strong> ${(resultados.tipoAnalise === 'infinita' ? resultados.limiteFadiga.detalhes.Se_MPa : resultados.limiteFadiga.detalhes.Sf_MPa).toFixed(1)} MPa</li>
                        <li><strong>Tensão Máxima ($\sigma_{\text{max}}$):</strong> ${(resultados.tensaoMaxima / 1e6).toFixed(1)} MPa</li>
                    </ul>
                </div>
            </div>

            <div class="card-resultado">
                <h4>🔧 Fatores de Correção Aplicados</h4>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                    <div><strong>Ccarg (Carga):</strong> ${resultados.limiteFadiga.fatores.Ccarg.toFixed(3)}</div>
                    <div><strong>Ctam (Tamanho):</strong> ${resultados.limiteFadiga.fatores.Ctam.toFixed(3)}</div>
                    <div><strong>Ctemp (Temperatura):</strong> ${resultados.limiteFadiga.fatores.Ctemp.toFixed(3)}</div>
                    <div><strong>Csuperf (Superfície):</strong> ${resultados.limiteFadiga.fatores.Csuperf.toFixed(3)}</div>
                    <div><strong>Cconf (Confiabilidade):</strong> ${resultados.limiteFadiga.fatores.Cconf.toFixed(3)}</div>
                    <div><strong>Produto dos Fatores C:</strong> ${resultados.limiteFadiga.fatoresC_multiplos.toFixed(3)}</div>
                    <div><strong>Kt (Estático):</strong> ${Kt.toFixed(3)}</div>
                    <div><strong>Kts (Estático):</strong> ${Kts.toFixed(3)}</div>
                </div>
            </div>

            <div class="card-resultado">
                <h4>📐 Detalhes do Cálculo</h4>
                <div style="font-family: monospace; background: #f5f5f5; padding: 15px; border-radius: 5px;">
                    <div><strong>Conversão Sut:</strong> ${resultados.configuracao.Sut} MPa / 6.89476 = ${resultados.limiteFadiga.detalhes.Sut_Kpsi.toFixed(1)} Kpsi</div>
                    
                    ${resultados.limiteFadiga.detalhes.limiteAtingido ? 
                        resultados.configuracao.tipoMaterial === 'aco' ?
                            `<div><strong>Limite Aplicado (Aço):</strong> Sut > 200 Kpsi → Se' = 100 Kpsi ≈ 700 MPa</div>` :
                            `<div><strong>Limite Aplicado (Ferro):</strong> Sut > 60 Kpsi → Se' = 24 Kpsi ≈ 160 MPa</div>`
                        :
                        `<div><strong>Cálculo Se':</strong> ${resultados.configuracao.tipoMaterial === 'aco' ? '0.5' : '0.4'} × ${resultados.limiteFadiga.detalhes.Sut_Kpsi.toFixed(1)} = ${resultados.limiteFadiga.detalhes.Se_prime_Kpsi.toFixed(1)} Kpsi</div>
                        <div><strong>Conversão Exata:</strong> ${resultados.limiteFadiga.detalhes.Se_prime_Kpsi.toFixed(1)} Kpsi × 6.89476 = ${(resultados.limiteFadiga.detalhes.Se_prime_Kpsi * 6.89476).toFixed(1)} MPa</div>`
                    }
                    
                    ${resultados.limiteFadiga.detalhes.limiteAtingido ? 
                        `<div><strong>Valor Aproximado Adotado:</strong> Se' = ${resultados.limiteFadiga.detalhes.Se_prime_MPa} MPa</div>` :
                        ''
                    }
                    
                    <hr style="margin: 10px 0;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Fatores de Concentração de Fadiga</div>
                    <div><strong>Raio (r):</strong> ${resultados.limiteFadiga.detalhes.q_calculo.raio_polegadas.toFixed(3)} in (${resultados.limiteFadiga.detalhes.q_calculo.raio_mm.toFixed(2)} mm)</div>
                    <div><strong>Constante de Material (A):</strong> ${resultados.limiteFadiga.detalhes.q_calculo.A.toFixed(4)} in^(1/2)</div>
                    <div><strong>Fator de Sensibilidade (q):</strong> 1 / (1 + A/r) = 1 / (1 + ${resultados.limiteFadiga.detalhes.q_calculo.A.toFixed(4)} / ${resultados.limiteFadiga.detalhes.q_calculo.raio_polegadas.toFixed(3)}) = <strong>${resultados.limiteFadiga.fatores.q.toFixed(3)}</strong></div>
                    <div><strong>Kf (Flexão):</strong> 1 + q(Kt - 1) = 1 + ${resultados.limiteFadiga.fatores.q.toFixed(3)}(${resultados.limiteFadiga.fatores.Kt.toFixed(3)} - 1) = <strong>${resultados.limiteFadiga.fatores.Kf.toFixed(3)}</strong></div>
                    <div><strong>Kfs (Torção):</strong> 1 + q(Kts - 1) = 1 + ${resultados.limiteFadiga.fatores.q.toFixed(3)}(${resultados.limiteFadiga.fatores.Kts.toFixed(3)} - 1) = <strong>${resultados.limiteFadiga.fatores.Kfs.toFixed(3)}</strong></div>

                    <hr style="margin: 10px 0;">
                    <div style="font-weight: bold; margin: 15px 0 5px 0; color: #007bff;">Tensões Corrigidas</div>
                    ${resultados.limiteFadiga.fatores.tensoesCorrigidas ? `
                        <div><strong>σ Flexão Original:</strong> ${(resultados.limiteFadiga.fatores.tensoesCorrigidas.flexao.original / 1e6).toFixed(1)} MPa</div>
                        <div><strong>σ Flexão Corrigida:</strong> Kf × σ = ${resultados.limiteFadiga.fatores.Kf.toFixed(3)} × ${(resultados.limiteFadiga.fatores.tensoesCorrigidas.flexao.original / 1e6).toFixed(1)} = <strong>${(resultados.limiteFadiga.fatores.tensoesCorrigidas.flexao.corrigida / 1e6).toFixed(1)} MPa</strong></div>

                        <div><strong>τ Cisalhamento Original:</strong> ${(resultados.limiteFadiga.fatores.tensoesCorrigidas.torsao.original / 1e6).toFixed(1)} MPa</div>
                        <div><strong>τ Cisalhamento Corrigido:</strong> Kfs × τ = ${resultados.limiteFadiga.fatores.Kfs.toFixed(3)} × ${(resultados.limiteFadiga.fatores.tensoesCorrigidas.torsao.original / 1e6).toFixed(1)} = <strong>${(resultados.limiteFadiga.fatores.tensoesCorrigidas.torsao.corrigida / 1e6).toFixed(1)} MPa</strong></div>

                        <div><strong>σ' Von Mises Corrigido:</strong> √[3 × (${resultados.limiteFadiga.fatores.Kfs.toFixed(3)}×τ)²] = √[3 × ${(resultados.limiteFadiga.fatores.tensoesCorrigidas.torsao.corrigida / 1e6).toFixed(1)}²] = <strong>${(resultados.limiteFadiga.fatores.tensoesCorrigidas.vonMises.corrigido / 1e6).toFixed(1)} MPa</strong></div>
                    ` : `
                        <div style="color: #dc3545;">⚠️ Dados de tensões corrigidas não disponíveis</div>
                    `}

                    <hr style="margin: 10px 0;">
                    <div><strong>Cálculo Se Final:</strong> Se' × (Ccarg × Ctam × Ctemp × Csuperf × Cconf)</div>
                    <div><strong>Se =</strong> ${resultados.limiteFadiga.detalhes.Se_prime_MPa.toFixed(1)} × ${resultados.limiteFadiga.fatoresC_multiplos.toFixed(3)} = ${resultados.limiteFadiga.detalhes.Se_MPa.toFixed(1)} MPa</div>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <button onclick="gerarDiagramaFadiga()" class="btn-diagrama" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    font-size: 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                ">
                    📈 Obter Diagrama de Fadiga
                </button>
            </div>
        </div>
        `;
    }
}
// =============================================
// FUNÇÕES GLOBAIS ATUALIZADAS
// =============================================

let configuradorGlobal = new ConfiguradorAnalise();

// Atualizar visibilidade do campo de ciclos
window.atualizarVisibilidadeCiclos = function() {
    const grupoCiclos = document.getElementById('grupoCiclos');
    const tipoSelecionado = document.querySelector('input[name="tipoAnalise"]:checked').value;
    grupoCiclos.style.display = tipoSelecionado === 'finita' ? 'block' : 'none';
};

// Aplicar configuração E CALCULAR
window.aplicarConfiguracaoEcalcular = function() {
    const novaConfig = configuradorGlobal.obterConfiguracao();
    configuradorGlobal.config = novaConfig;
    
    // Executar análise com nova configuração
    window.executarAnaliseComConfiguracao();
};

// Inicializar a guia de diagramas
window.iniciarCalculosFadiga = function() {
    const container = document.getElementById('conteudoDiagramas');
    
    if (!window.ultimosResultados) {
        container.innerHTML = '<p>Erro: Nenhum resultado anterior encontrado</p>';
        return;
    }

    // Mostrar interface de configuração
    container.innerHTML = configuradorGlobal.gerarInterfaceConfiguracao();
};

// Função para executar análise após configuração
window.executarAnaliseComConfiguracao = function() {
    const container = document.getElementById('conteudoDiagramas');
    
    try {
        const gerenciador = new GerenciadorDiagramas();
        gerenciador.inicializar(
            window.ultimosResultados.dadosEixo, 
            configuradorGlobal.config,
            window.ultimosResultados
        );
        
        container.innerHTML = gerenciador.gerarHTMLResultados();
        
    } catch (error) {
        container.innerHTML = `
            <div style="color: red; padding: 20px; background: #fee;">
                <h3>❌ Erro na Análise</h3>
                <p>${error.message}</p>
                <details>
                    <summary>Detalhes do erro</summary>
                    <pre>${error.stack}</pre>
                </details>
            </div>
        `;
        console.error(error);
    }
};

// Atualizar a função abrirDiagramasFadiga
window.abrirDiagramasFadiga = function(resultadosCalculos) {
    const guiaDiagramas = document.createElement('div');
    guiaDiagramas.className = 'guia-calculos';
    guiaDiagramas.id = 'guiaDiagramas';
    
    guiaDiagramas.innerHTML = `
        <div class="cabecalho-calculos">
            <h2>📈 Análise de Fadiga - Configuração</h2>
            <button onclick="fecharDiagramas()" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                Fechar ×
            </button>
        </div>
        <div class="conteudo-calculos">
            <div id="conteudoDiagramas">
                <div style="text-align: center; padding: 40px;">
                    <h3>⚙️ Configurando Análise...</h3>
                    <p>Informe as propriedades do material e tipo de análise</p>
                </div>
            </div>
        </div>
    `;
    
    window.fecharCalculos();
    document.body.appendChild(guiaDiagramas);
    document.getElementById('guiaDiagramas').style.display = 'block';
    
    // Inicializar configuração
    setTimeout(() => {
        window.ultimosResultados = resultadosCalculos;
        window.iniciarCalculosFadiga();
    }, 100);
};

// Função para fechar os diagramas
window.fecharDiagramas = function() {
    const guia = document.getElementById('guiaDiagramas');
    if (guia) {
        guia.remove();
    }
};
function gerarDiagramaFadiga() {
    console.log("Gerando diagrama de fadiga...");
    
    try {
        // Obter os dados do gerenciador atual
        const gerenciador = window.gerenciadorDiagramas || new GerenciadorDiagramas();
        
        if (gerenciador.dadosEixo && gerenciador.config && gerenciador.resultadosEstatica) {
            const diagrama = new DiagramaFadiga();
            diagrama.inicializar(
                gerenciador.dadosEixo,
                gerenciador.config,
                gerenciador.resultadosEstatica
            );
        } else {
            alert('Erro: Dados de análise não encontrados. Execute a análise primeiro.');
        }
    } catch (error) {
        console.error('Erro ao gerar diagrama:', error);
        alert('Erro ao gerar diagrama: ' + error.message);
    }
}
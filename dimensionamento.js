// Fatores de confiabilidade
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

let dadosAnalise = null;
let dimensionamentos = [];
let proximoId = 1;

// =============================================
// CLASSE CALCULADOR DE DIMENSIONAMENTO
// =============================================

class CalculadorDimensionamento {
    constructor(dadosAnalise, metodo = 'goodman', Nf = 2.0) {
        this.dadosAnalise = dadosAnalise;
        this.metodo = metodo;
        this.Nf = Nf;
        this.config = dadosAnalise.dadosFormulario;
    }

    // Método principal para calcular o dimensionamento
    calcularDimensionamento(dimensionamento) {
        try {
            // 1. Calcular fatores de concentração de tensão
            const fatoresConcentracao = this.calcularFatoresConcentracao(dimensionamento);
            
            // 2. Calcular limite de fadiga corrigido (Se)
            const limiteFadiga = this.calcularLimiteFadiga(dimensionamento);
            
            // 3. Calcular diâmetro mínimo necessário
            const resultado = this.calcularDiametroMinimo(dimensionamento, fatoresConcentracao, limiteFadiga);
            
            return {
                ...resultado,
                dimensionamento: dimensionamento,
                fatoresConcentracao: fatoresConcentracao,
                limiteFadiga: limiteFadiga,
                metodo: this.metodo,
                Nf: this.Nf
            };
            
        } catch (error) {
            console.error('Erro no cálculo de dimensionamento:', error);
            return {
                erro: error.message,
                dimensionamento: dimensionamento,
                metodo: this.metodo
            };
        }
    }

    // ========== CÁLCULO DE FATORES DE CONCENTRAÇÃO ==========

    calcularFatoresConcentracao(dimensionamento) {
        const ponto = {
            diametro_maior: dimensionamento.D,
            diametro_menor: dimensionamento.d,
            raio: dimensionamento.r
        };

        // Calcular Kt e Kts usando a mesma lógica do código fornecido
        const Kt = this.calcularKt(ponto);
        const Kts = this.calcularKts(ponto);
        
        // Calcular fator de sensibilidade (q)
        const Sut_Kpsi = this.config.material.Sut / 6.89476;
        const qResult = this.calcularFatorSensibilidade(Sut_Kpsi, dimensionamento.r);
        const q = qResult.q;
        
        // Calcular Kf e Kfs
        const Kf = 1 + q * (Kt - 1);
        const Kfs = 1 + q * (Kts - 1);
        
        return {
            Kt: Kt,
            Kts: Kts,
            Kf: Kf,
            Kfs: Kfs,
            q: q,
            A: qResult.A,
            raio_polegadas: qResult.raio_polegadas,
            Sut_Kpsi: qResult.Sut_Kpsi
        };
    }

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

    calcularFatorSensibilidade(Sut_Kpsi, raio_mm) {
        const raio_polegadas = raio_mm / 25.4; 
        
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
        
        let A_valor;
        
        if (Sut_Kpsi <= tabelaSutA[0].Sut) {
            A_valor = tabelaSutA[0].A;
        } else if (Sut_Kpsi >= tabelaSutA[tabelaSutA.length - 1].Sut) {
            A_valor = tabelaSutA[tabelaSutA.length - 1].A;
        } else {
            for (let i = 0; i < tabelaSutA.length - 1; i++) {
                if (Sut_Kpsi >= tabelaSutA[i].Sut && Sut_Kpsi <= tabelaSutA[i + 1].Sut) {
                    const fator = (Sut_Kpsi - tabelaSutA[i].Sut) / (tabelaSutA[i + 1].Sut - tabelaSutA[i].Sut);
                    A_valor = tabelaSutA[i].A + fator * (tabelaSutA[i + 1].A - tabelaSutA[i].A);
                    break;
                }
            }
        }
        
        const raiz_raio = Math.sqrt(raio_polegadas);
        const q = 1 / (1 + (A_valor / raiz_raio));
        
        return {
            q: q,
            A: A_valor,
            raio_polegadas: raio_polegadas,
            Sut_Kpsi: Sut_Kpsi
        };
    }

    // ========== CÁLCULO DO LIMITE DE FADIGA ==========

    calcularLimiteFadiga(dimensionamento) {
        const Se_prime = this.calcularSePrime();
        const fatoresC = this.calcularFatoresCorrecao(dimensionamento);
        
        const Se = Se_prime.Se_prime_MPa * 1e6 * fatoresC.produto;
        
        return {
            Se_prime: Se_prime,
            Se: Se,
            fatores: fatoresC
        };
    }

    calcularSePrime() {
        const Sut = this.config.material.Sut;
        const tipoMaterial = this.config.tipoMaterial || 'aco';
        
        const Sut_Kpsi = Sut / 6.89476;
        
        let Se_prime_Kpsi;
        let Se_prime_MPa;
        
        if (tipoMaterial === 'aco') {
            if (Sut_Kpsi > 200) {
                Se_prime_Kpsi = 100;
                Se_prime_MPa = 700;
            } else {
                Se_prime_Kpsi = 0.5 * Sut_Kpsi;
                Se_prime_MPa = Se_prime_Kpsi * 6.89476;
            }
        } else if (tipoMaterial === 'ferro') {
            if (Sut_Kpsi > 60) {
                Se_prime_Kpsi = 24;
                Se_prime_MPa = 160;
            } else {
                Se_prime_Kpsi = 0.4 * Sut_Kpsi;
                Se_prime_MPa = Se_prime_Kpsi * 6.89476;
            }
        } else {
            Se_prime_Kpsi = 0.5 * Sut_Kpsi;
            Se_prime_Kpsi = Math.min(Se_prime_Kpsi, 100);
            Se_prime_MPa = Se_prime_Kpsi * 6.89476;
        }
        
        return {
            Se_prime_MPa: Se_prime_MPa,
            Se_prime_Kpsi: Se_prime_Kpsi,
            Sut_Kpsi: Sut_Kpsi,
            limiteAtingido: (tipoMaterial === 'aco' && Sut_Kpsi > 200) || (tipoMaterial === 'ferro' && Sut_Kpsi > 60)
        };
    }

    calcularFatoresCorrecao(dimensionamento) {
        const Ccarg = this.calcularCcarg();
        const Ctam = this.calcularCtam(dimensionamento);
        const Ctemp = this.calcularCtemp();
        const Csuperf = this.calcularCsuperf();
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

    calcularCtam(dimensionamento) {
        const D_mm = dimensionamento.D;
        
        if (D_mm <= 8) {
            return 1.0;
        } else {
            return 1.189 * Math.pow(D_mm, -0.097);
        }
    }

    calcularCtemp() {
        const temperatura = this.config.temperatura || 20;
        
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
        const acabamento = this.config.material.acabamento || 'retificado';
        const Sut_MPa = this.config.material.Sut;
        
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
        const confiabilidade = this.config.confiabilidade || 50;
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

    // ========== CÁLCULO DO DIÂMETRO MÍNIMO ==========

// ========== CÁLCULO DO DIÂMETRO MÍNIMO ==========

calcularDiametroMinimo(dimensionamento, fatoresConcentracao, limiteFadiga) {
    const form = this.dadosAnalise.dadosFormulario;
    
    console.log('=== VERIFICANDO DADOS DO FORMULÁRIO ===');
    console.log('Dados completos do formulário:', form);
    
    // OBTER CARREGAMENTOS - verificar diferentes fontes possíveis
    let momento, torque;
    
    // 1. Tentar obter do formulário primeiro
    if (form && form.carregamentos) {
        momento = form.carregamentos.momento || 0;
        torque = form.carregamentos.torque || 0;
        console.log('Dados do formulário - momento:', momento, 'torque:', torque, 'unidade:', form.carregamentos.unidade);
    } 
    // 2. Tentar obter do ponto selecionado (dados do desenho)
    else if (this.dadosAnalise.analiseAvancada && this.dadosAnalise.analiseAvancada.pontoSelecionado) {
        const ponto = this.dadosAnalise.analiseAvancada.pontoSelecionado;
        momento = ponto.momentoFletor || 0;
        torque = ponto.torque || 0;
        console.log('Dados do ponto - momento:', momento, 'torque:', torque);
    }
    // 3. Valor padrão se não encontrar
    else {
        momento = 0;
        torque = 0;
        console.warn('⚠️ Não foram encontrados dados de carregamento, usando valores padrão');
    }
    
    // CORREÇÃO: Garantir que estamos usando os valores corretos
    // Ma = Momento fletor alternante (deve ser o valor do campo "momento")
    // Tm = Torque médio (deve ser o valor do campo "torque")
    const Ma = momento;  // Momento fletor alternante
    const Tm = torque;   // Torque médio
    
    // Converter unidades se necessário
    const unidadeTorque = form.carregamentos?.unidade;
    if (unidadeTorque === 'lb-in') {
        // Converter lb-in para N·m
        console.log('Convertendo de lb-in para N·m');
        console.log('Antes - Ma:', Ma, 'Tm:', Tm);
        Ma = Ma * 0.112985;
        Tm = Tm * 0.112985;
        console.log('Depois - Ma:', Ma, 'Tm:', Tm);
    }
    
    const Mm = 0; // Momento médio (assumindo 0 para simplificação)
    const Ta = 0; // Torque alternante = 0 (só temos torque médio)

    console.log('=== DADOS CORRIGIDOS PARA CÁLCULO ===');
    console.log('Carregamentos FINAIS:', { 
        Ma: `${Ma} N·m (momento fletor alternante)`,
        Mm: `${Mm} N·m (momento médio)`, 
        Ta: `${Ta} N·m (torque alternante)`,
        Tm: `${Tm} N·m (torque médio)`
    });

    // Resto do código permanece igual...
    console.log('Propriedades:', { 
        Sut: `${this.config.material.Sut} MPa -> ${this.config.material.Sut * 1e6} Pa`, 
        Sy: `${this.config.material.Sy} MPa -> ${this.config.material.Sy * 1e6} Pa`,
        Se: `${(limiteFadiga.Se/1e6).toFixed(1)} MPa -> ${limiteFadiga.Se} Pa`
    });
    console.log('Fatores de concentração:', fatoresConcentracao);
    console.log('Configuração:', { metodo: this.metodo, Nf: this.Nf });

    let diametroMinimo;

    if (this.metodo === 'goodman') {
        console.log('=== CÁLCULO GOODMAN MODIFICADO ===');
        diametroMinimo = this.calcularGoodman(Ma, Mm, Ta, Tm, fatoresConcentracao, limiteFadiga.Se, this.config.material.Sut * 1e6, this.Nf);
    } else {
        console.log('=== CÁLCULO ASME ===');
        diametroMinimo = this.calcularASME(Ma, Ta, Tm, fatoresConcentracao, limiteFadiga.Se, this.config.material.Sy * 1e6, this.Nf);
    }

    console.log('=== DIÂMETRO MÍNIMO CALCULADO ===');
    console.log(`Diâmetro mínimo: ${diametroMinimo.toFixed(4)} mm`);

    // Calcular fator de segurança real para a configuração atual usando o MESMO MÉTODO
    const fatorSegurancaReal = this.calcularFatorSegurancaReal(
        dimensionamento.d, Ma, Ta, Tm, fatoresConcentracao, limiteFadiga.Se, this.config.material.Sut * 1e6, this.config.material.Sy * 1e6, this.metodo
    );

    console.log('=== FATOR DE SEGURANÇA REAL ===');
    console.log(`Diâmetro atual: ${dimensionamento.d} mm`);
    console.log(`Fator de segurança real: ${fatorSegurancaReal.toFixed(4)}`);
    console.log(`Atende requisitos (Nf >= ${this.Nf}): ${fatorSegurancaReal >= this.Nf}`);
    console.log(`Diferença percentual: ${((dimensionamento.d - diametroMinimo) / diametroMinimo * 100).toFixed(2)}%`);
    console.log('============================================');

    return {
        diametroMinimo: diametroMinimo,
        fatorSeguranca: fatorSegurancaReal,
        atendeRequisitos: fatorSegurancaReal >= this.Nf,
        diferencaPercentual: ((dimensionamento.d - diametroMinimo) / diametroMinimo * 100),
        carregamentos: {
            Ma: Ma,
            Mm: Mm,
            Ta: Ta,
            Tm: Tm,
            unidades: 'N·m'
        }
    };
}

calcularGoodman(Ma, Mm, Ta, Tm, fatores, Se, Sut, Nf) {
    const Kf = fatores.Kf;
    const Kfs = fatores.Kfs;
    
    // Para simplificação, assumindo Kfm = Kf e Kfsm = Kfs
    const Kfm = Kf;
    const Kfsm = Kfs;

    console.log('--- Detalhes do cálculo Goodman ---');
    console.log('Kf:', Kf, 'Kfs:', Kfs);
    console.log('Ma:', Ma, 'Nm (alternante), Mm:', Mm, 'Nm (médio)');
    console.log('Ta:', Ta, 'Nm (alternante), Tm:', Tm, 'Nm (médio)');

    // Goodman Modificado: d = [ (32 * Nf / π) * (A + B) ]^(1/3)
    // Onde A = √[(Kf * Ma)² + 0.75*(Kfs * Ta)²] / Se
    // E B = √[(Kfm * Mm)² + 0.75*(Kfsm * Tm)²] / Sut
    
    const termoA_numerador = Math.sqrt(Math.pow(Kf * Ma, 2) + 0.75 * Math.pow(Kfs * Ta, 2));
    const termoA = termoA_numerador / Se;
    
    const termoB_numerador = Math.sqrt(Math.pow(Kfm * Mm, 2) + 0.75 * Math.pow(Kfsm * Tm, 2));
    const termoB = termoB_numerador / Sut;
    
    const termoTotal = termoA + termoB;
    
    console.log('Termo A (alternante):', termoA, `= ${termoA_numerador} / ${Se}`);
    console.log('Termo B (médio):', termoB, `= ${termoB_numerador} / ${Sut}`);
    console.log('Termo total (A + B):', termoTotal);
    
    const d_cubico = (32 * Nf / Math.PI) * termoTotal;
    const d_metros = Math.pow(d_cubico, 1/3);
    
    console.log('d³ =', d_cubico);
    console.log('d =', d_metros, 'metros =', d_metros * 1000, 'mm');
    
    // Converter para mm para retorno
    return d_metros * 1000;
}

calcularASME(Ma, Ta, Tm, fatores, Se, Sy, Nf) {
    const Kf = fatores.Kf;
    
    console.log('--- Detalhes do cálculo ASME ---');
    console.log('Kf:', Kf);
    console.log('Ma:', Ma, 'Nm (alternante), Ta:', Ta, 'Nm (alternante), Tm:', Tm, 'Nm (médio)');

    // ASME: d = [ (32 * Nf / π) * √( (Kf * Ma / Se)² + 0.75 * (Tm / Sy)² ) ]^(1/3)
    
    const termo1 = Math.pow(Kf * Ma / Se, 2);
    const termo2 = 0.75 * Math.pow(Tm / Sy, 2);
    const termoRaiz = Math.sqrt(termo1 + termo2);
    
    console.log('Termo 1 (flexão):', termo1, `= (${Kf} * ${Ma} / ${Se})²`);
    console.log('Termo 2 (torção):', termo2, `= 0.75 * (${Tm} / ${Sy})²`);
    console.log('√(termo1 + termo2):', termoRaiz);
    
    const d_cubico = (32 * Nf / Math.PI) * termoRaiz;
    const d_metros = Math.pow(d_cubico, 1/3);
    
    console.log('d³ =', d_cubico);
    console.log('d =', d_metros, 'metros =', d_metros * 1000, 'mm');
    
    // Converter para mm para retorno
    return d_metros * 1000;
}

calcularFatorSegurancaReal(d, Ma, Ta, Tm, fatores, Se, Sut, Sy, metodo = 'goodman') {
    // d está em mm, converter para metros para cálculos
    const d_metros = d / 1000;
    
    const Kf = fatores.Kf;
    const Kfs = fatores.Kfs;
    const Kfm = Kf;
    const Kfsm = Kfs;
    
    const Mm = 0; // Momento médio

    console.log('--- Cálculo do Fator de Segurança Real ---');
    console.log('Diâmetro:', d, 'mm =', d_metros, 'm');
    console.log('Método:', metodo);
    console.log('Carregamentos:', { Ma, Mm, Ta, Tm });

    let Nf;

    if (metodo === 'goodman') {
        // Goodman Modificado: Nf = (π * d³) / (32 * [A + B])
        const termoA_numerador = Math.sqrt(Math.pow(Kf * Ma, 2) + 0.75 * Math.pow(Kfs * Ta, 2));
        const termoA = termoA_numerador / Se;
        
        const termoB_numerador = Math.sqrt(Math.pow(Kfm * Mm, 2) + 0.75 * Math.pow(Kfsm * Tm, 2));
        const termoB = termoB_numerador / Sut;
        
        const denominador = termoA + termoB;
        
        console.log('Goodman - Termo A (alternante):', termoA);
        console.log('Goodman - Termo B (médio):', termoB);
        console.log('Goodman - Denominador (A+B):', denominador);
        
        if (denominador <= 0) {
            console.log('Goodman - Denominador <= 0, retornando Infinity');
            return Infinity;
        }
        
        const numerador = Math.PI * Math.pow(d_metros, 3);
        Nf = numerador / (32 * denominador);
        
        console.log('Goodman - Numerador (π * d³):', numerador);
        console.log('Goodman - Nf =', Nf);
        
    } else {
        // ASME: Nf = (π * d³) / (32 * √[ (Kf * Ma / Se)² + 0.75 * (Tm / Sy)² ])
        const termo1 = Math.pow(Kf * Ma / Se, 2);
        const termo2 = 0.75 * Math.pow(Tm / Sy, 2);
        const termoRaiz = Math.sqrt(termo1 + termo2);
        
        console.log('ASME - Termo 1 (flexão):', termo1);
        console.log('ASME - Termo 2 (torção):', termo2);
        console.log('ASME - √(termo1 + termo2):', termoRaiz);
        
        if (termoRaiz <= 0) {
            console.log('ASME - Termo raiz <= 0, retornando Infinity');
            return Infinity;
        }
        
        const numerador = Math.PI * Math.pow(d_metros, 3);
        Nf = numerador / (32 * termoRaiz);
        
        console.log('ASME - Numerador (π * d³):', numerador);
        console.log('ASME - Nf =', Nf);
    }

    return Nf;
}
    
}

// =============================================
// FUNÇÕES PRINCIPAIS DO DIMENSIONAMENTO
// =============================================

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarDadosAnalise();
    carregarDimensionamentosSalvos();
    atualizarInterfaceLista();
});

function carregarDadosAnalise() {
    try {
        const dadosSalvos = localStorage.getItem('analise_avancada_results');
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            dadosAnalise = dados;
            exibirInformacoesPonto();
        }
    } catch (error) {
        console.error('Erro ao carregar dados da análise:', error);
        mostrarErro('Erro ao carregar dados do ponto selecionado.');
    }
}

function exibirInformacoesPonto() {
    const container = document.getElementById('infoPontoDimensionamento');
    if (!dadosAnalise || !container) return;

    // VERIFICAR DIFERENTES FONTES DE DADOS
    const ponto = dadosAnalise.analiseAvancada?.pontoSelecionado;
    const form = dadosAnalise.dadosFormulario;

    if (!ponto && !form) {
        container.innerHTML = '<p class="text-muted">⚠️ Nenhum dado disponível</p>';
        return;
    }

    let html = '';

    if (ponto) {
        // Dados do desenho disponíveis
        html += `
            <div class="info-item">
                <strong>Tipo:</strong> ${formatarTipo(ponto.tipo)}
            </div>
            <div class="info-item">
                <strong>Posição:</strong> ${ponto.posicao} mm
            </div>
        `;
    } else {
        // Apenas dados do formulário
        html += `
            <div class="info-item">
                <strong>Tipo:</strong> 📝 Dados Manuais
            </div>
        `;
    }

    // Dados do material (sempre do formulário)
    if (form && form.material) {
        html += `
            <div class="info-item">
                <strong>Material:</strong> Sut = ${form.material.Sut} ${form.material.unidade}, Sy = ${form.material.Sy} ${form.material.unidade}
            </div>
        `;
    }

    // Dados de carregamento (verificar diferentes fontes)
    let momento, torque, unidade;
    
    if (form && form.carregamentos) {
        momento = form.carregamentos.momento;
        torque = form.carregamentos.torque;
        unidade = form.carregamentos.unidade;
    } else if (ponto) {
        momento = ponto.momentoFletor;
        torque = ponto.torque;
        unidade = 'Nm';
    }

    if (momento !== undefined && torque !== undefined) {
        html += `
            <div class="info-item">
                <strong>Momento Fletor:</strong> ${momento} ${unidade}
            </div>
            <div class="info-item">
                <strong>Torque:</strong> ${torque} ${unidade}
            </div>
        `;
    }

    container.innerHTML = html;
}

function formatarTipo(tipo) {
    const tipos = {
        'mancal': '⚙️ Mancal',
        'carga': '📌 Carga',
        'mudanca': '📐 Mudança de Diâmetro'
    };
    return tipos[tipo] || tipo;
}

function adicionarDimensionamento() {
    const d = parseFloat(document.getElementById('novoDiametroMenor').value);
    const D = parseFloat(document.getElementById('novoDiametroMaior').value);
    const r = parseFloat(document.getElementById('novoRaio').value);
    const descricao = document.getElementById('novaDescricao').value || `Configuração ${proximoId}`;

    // Validações
    if (!d || !D || !r) {
        alert('⚠️ Preencha todos os campos obrigatórios (d, D, r)');
        return;
    }

    if (d >= D) {
        alert('⚠️ O diâmetro menor (d) deve ser menor que o diâmetro maior (D)');
        return;
    }

    if (r <= 0) {
        alert('⚠️ O raio deve ser maior que zero');
        return;
    }

    const novoDimensionamento = {
        id: proximoId++,
        descricao: descricao,
        d: d,
        D: D,
        r: r,
        relacao: (D / d).toFixed(2),
        selecionado: true,
        timestamp: new Date().toISOString()
    };

    dimensionamentos.push(novoDimensionamento);
    salvarDimensionamentos();
    atualizarInterfaceLista();
    limparFormularioAdicao();

    // Feedback visual
    mostrarFeedback(`✅ "${descricao}" adicionada com sucesso!`);
}

function limparFormularioAdicao() {
    document.getElementById('novoDiametroMenor').value = '';
    document.getElementById('novoDiametroMaior').value = '';
    document.getElementById('novoRaio').value = '';
    document.getElementById('novaDescricao').value = '';
}

function mostrarFeedback(mensagem) {
    // Criar elemento de feedback temporário
    const feedback = document.createElement('div');
    feedback.className = 'alert alert-success alert-dismissible fade show';
    feedback.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.card-body').prepend(feedback);
    
    // Remover após 3 segundos
    setTimeout(() => {
        feedback.remove();
    }, 3000);
}

function atualizarInterfaceLista() {
    const listaVazia = document.getElementById('listaVazia');
    const listaDimensionamentos = document.getElementById('listaDimensionamentos');
    const tbody = document.getElementById('tabelaDimensionamentos');
    const btnExecutar = document.getElementById('btnExecutar');
    const btnExportar = document.getElementById('btnExportar');

    if (dimensionamentos.length === 0) {
        listaVazia.style.display = 'block';
        listaDimensionamentos.style.display = 'none';
        btnExecutar.disabled = true;
        btnExportar.disabled = true;
        return;
    }

    listaVazia.style.display = 'none';
    listaDimensionamentos.style.display = 'block';

    // Habilitar botões se houver dimensionamentos selecionados
    const temSelecionados = dimensionamentos.some(d => d.selecionado);
    btnExecutar.disabled = !temSelecionados;
    btnExportar.disabled = dimensionamentos.length === 0;

    tbody.innerHTML = dimensionamentos.map(dim => `
        <tr class="${dim.selecionado ? 'dimensionamento-selecionado' : ''}" id="row-${dim.id}">
            <td>
                <input type="checkbox" ${dim.selecionado ? 'checked' : ''} 
                    onchange="toggleSelecionado(${dim.id})">
            </td>
            <td>${dim.descricao}</td>
            <td>${dim.d} mm</td>
            <td>${dim.D} mm</td>
            <td>${dim.r} mm</td>
            <td>${dim.relacao}</td>
            <td>
                <button type="button" onclick="editarDimensionamento(${dim.id})" class="btn btn-warning btn-sm btn-acao">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" onclick="removerDimensionamento(${dim.id})" class="btn btn-danger btn-sm btn-acao">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function toggleSelecionado(id) {
    const dimensionamento = dimensionamentos.find(d => d.id === id);
    if (dimensionamento) {
        dimensionamento.selecionado = !dimensionamento.selecionado;
        salvarDimensionamentos();
        atualizarInterfaceLista();
    }
}

function selecionarTodos() {
    dimensionamentos.forEach(d => d.selecionado = true);
    salvarDimensionamentos();
    atualizarInterfaceLista();
}

function limparSelecoes() {
    dimensionamentos.forEach(d => d.selecionado = false);
    salvarDimensionamentos();
    atualizarInterfaceLista();
}

function removerSelecionados() {
    const selecionados = dimensionamentos.filter(d => d.selecionado);
    if (selecionados.length === 0) {
        alert('⚠️ Nenhum dimensionamento selecionado para remover');
        return;
    }

    if (confirm(`Deseja remover ${selecionados.length} dimensionamento(s) selecionado(s)?`)) {
        dimensionamentos = dimensionamentos.filter(d => !d.selecionado);
        salvarDimensionamentos();
        atualizarInterfaceLista();
        mostrarFeedback('🗑️ Dimensionamentos removidos com sucesso!');
    }
}

function removerDimensionamento(id) {
    if (confirm('Deseja remover este dimensionamento?')) {
        dimensionamentos = dimensionamentos.filter(d => d.id !== id);
        salvarDimensionamentos();
        atualizarInterfaceLista();
        mostrarFeedback('🗑️ Dimensionamento removido!');
    }
}

function editarDimensionamento(id) {
    const dim = dimensionamentos.find(d => d.id === id);
    if (!dim) return;

    // Preencher formulário com dados existentes
    document.getElementById('novoDiametroMenor').value = dim.d;
    document.getElementById('novoDiametroMaior').value = dim.D;
    document.getElementById('novoRaio').value = dim.r;
    document.getElementById('novaDescricao').value = dim.descricao;

    // Remover o antigo
    dimensionamentos = dimensionamentos.filter(d => d.id !== id);
    salvarDimensionamentos();
    atualizarInterfaceLista();

    mostrarFeedback('✏️ Edite os valores e clique em "Adicionar" para salvar as alterações');
}

function salvarDimensionamentos() {
    try {
        localStorage.setItem('dimensionamentos_salvos', JSON.stringify({
            dimensionamentos: dimensionamentos,
            proximoId: proximoId
        }));
    } catch (error) {
        console.error('Erro ao salvar dimensionamentos:', error);
    }
}

function carregarDimensionamentosSalvos() {
    try {
        const salvos = localStorage.getItem('dimensionamentos_salvos');
        if (salvos) {
            const dados = JSON.parse(salvos);
            dimensionamentos = dados.dimensionamentos || [];
            proximoId = dados.proximoId || 1;
        }
    } catch (error) {
        console.error('Erro ao carregar dimensionamentos:', error);
    }
}

function executarDimensionamento() {
    const dimensionamentosSelecionados = dimensionamentos.filter(d => d.selecionado);
    
    if (dimensionamentosSelecionados.length === 0) {
        alert('⚠️ Selecione pelo menos um dimensionamento para executar a análise');
        return;
    }

    const metodo = document.getElementById('metodoDimensionamento').value;
    const fatorSeguranca = parseFloat(document.getElementById('fatorSeguranca').value) || 2.0;
    const tolerancia = parseFloat(document.getElementById('tolerancia').value) || 5;

    simularProcessoDimensionamento(dimensionamentosSelecionados, metodo, fatorSeguranca, tolerancia);
}

function simularProcessoDimensionamento(dimensionamentosSelecionados, metodo, fatorSeguranca, tolerancia) {
    const progresso = document.getElementById('progressoCalculo');
    const resultados = document.getElementById('resultadosDimensionamento');
    
    progresso.style.display = 'block';
    resultados.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> Calculando dimensionamentos (${metodo.toUpperCase()})...</p>`;

    let progressoAtual = 0;
    const totalPassos = 10;
    const passo = 100 / totalPassos;

    const intervalo = setInterval(() => {
        progressoAtual += passo;
        progresso.querySelector('.progress-bar').style.width = `${progressoAtual}%`;
        
        if (progressoAtual >= 100) {
            clearInterval(intervalo);
            const resultadosCalculados = executarCalculosReais(dimensionamentosSelecionados, metodo, fatorSeguranca);
            exibirResultadosDimensionamento(resultadosCalculados, metodo, fatorSeguranca);
            progresso.style.display = 'none';
        }
    }, 200);
}

function executarCalculosReais(dimensionamentos, metodo, Nf) {
    const calculador = new CalculadorDimensionamento(dadosAnalise, metodo, Nf);
    
    return dimensionamentos.map(dim => {
        return calculador.calcularDimensionamento(dim);
    });
}

function exibirResultadosDimensionamento(resultadosCalculados, metodo, fatorSeguranca) {
    const resultados = document.getElementById('resultadosDimensionamento');
    
    // Filtrar resultados com erro
    const resultadosValidos = resultadosCalculados.filter(r => !r.erro);
    const resultadosComErro = resultadosCalculados.filter(r => r.erro);

    let html = `
        <h4><i class="fas fa-chart-bar"></i> Resultados dos Dimensionamentos - ${metodo.toUpperCase()}</h4>
        <p class="text-muted">
            ${resultadosValidos.length} configuração(ões) analisada(s) | 
            Fator de segurança alvo: ${fatorSeguranca} |
            ${resultadosComErro.length > 0 ? `<span class="text-danger">${resultadosComErro.length} com erro</span>` : ''}
        </p>
    `;

    // Ordenar por melhor fator de segurança
    resultadosValidos.sort((a, b) => b.fatorSeguranca - a.fatorSeguranca);

    resultadosValidos.forEach((resultado, index) => {
        const isMelhor = index === 0 && resultado.atendeRequisitos;
        const classeResultado = isMelhor ? 'melhor-resultado' : (resultado.atendeRequisitos ? 'resultado-item' : 'resultado-erro');
        
        html += `
            <div class="${classeResultado}">
                <div class="row">
                    <div class="col-md-6">
                        <h5>${resultado.dimensionamento.descricao}</h5>
                        <div class="diametro-resultado">
                            d = Ø${resultado.dimensionamento.d}mm | D = Ø${resultado.dimensionamento.D}mm | r = ${resultado.dimensionamento.r}mm
                        </div>
                        <div><strong>Relação D/d:</strong> ${resultado.dimensionamento.relacao}</div>
                        <div><strong>Diâmetro mínimo calculado:</strong> Ø${resultado.diametroMinimo.toFixed(2)} mm</div>
                        <div><strong>Diferença:</strong> <span class="${resultado.diferencaPercentual >= 0 ? 'text-success' : 'text-danger'}">${resultado.diferencaPercentual.toFixed(1)}%</span></div>
                    </div>
                    <div class="col-md-6">
                        <div><strong>Fator de Segurança:</strong> ${resultado.fatorSeguranca.toFixed(2)}</div>
                        <div><strong>Status:</strong> 
                            ${resultado.atendeRequisitos ? 
                                '<span class="text-success">✓ Atende aos requisitos</span>' : 
                                '<span class="text-danger">✖ Não atende</span>'}
                        </div>
                        <div><strong>Kf:</strong> ${resultado.fatoresConcentracao.Kf.toFixed(3)}</div>
                        <div><strong>Kfs:</strong> ${resultado.fatoresConcentracao.Kfs.toFixed(3)}</div>
                        <div><strong>Se:</strong> ${(resultado.limiteFadiga.Se / 1e6).toFixed(1)} MPa</div>
                    </div>
                </div>
                ${isMelhor ? '<div class="mt-2"><small class="text-success"><i class="fas fa-trophy"></i> Melhor configuração</small></div>' : ''}
            </div>
        `;
    });

    // Exibir erros
    if (resultadosComErro.length > 0) {
        html += `
            <div class="resultado-erro mt-3">
                <h6><i class="fas fa-exclamation-triangle"></i> Configurações com erro:</h6>
                ${resultadosComErro.map(r => `
                    <div class="mb-2">
                        <strong>${r.dimensionamento.descricao}:</strong> ${r.erro}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Estatísticas resumidas
    const atendemRequisitos = resultadosValidos.filter(r => r.atendeRequisitos).length;
    html += `
        <div class="mt-3 p-3 bg-light rounded">
            <h6><i class="fas fa-chart-pie"></i> Estatísticas:</h6>
            <div class="row">
                <div class="col-md-3">Total: ${resultadosCalculados.length}</div>
                <div class="col-md-3 text-success">Atendem: ${atendemRequisitos}</div>
                <div class="col-md-3 text-danger">Não Atendem: ${resultadosValidos.length - atendemRequisitos}</div>
                <div class="col-md-3 text-warning">Erros: ${resultadosComErro.length}</div>
            </div>
            <div class="mt-2">
                <small><strong>Método:</strong> ${metodo === 'goodman' ? 'Goodman Modificado' : 'ASME'}</small>
            </div>
        </div>
    `;

    resultados.innerHTML = html;
}

function exportarResultados() {
    if (dimensionamentos.length === 0) {
        alert('⚠️ Nenhum dimensionamento para exportar');
        return;
    }

    const dadosExportacao = {
        dimensionamentos: dimensionamentos,
        dadosAnalise: dadosAnalise,
        timestamp: new Date().toISOString(),
        parametros: {
            fatorSeguranca: document.getElementById('fatorSeguranca').value,
            tolerancia: document.getElementById('tolerancia').value,
            metodo: document.getElementById('metodoDimensionamento').value
        }
    };
    
    const blob = new Blob([JSON.stringify(dadosExportacao, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dimensionamentos-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    mostrarFeedback('📥 Resultados exportados com sucesso!');
}

function voltarParaAnalise() {
    window.location.href = 'analise_avancada.html';
}

function mostrarErro(mensagem) {
    const resultados = document.getElementById('resultadosDimensionamento');
    resultados.innerHTML = `
        <div class="resultado-erro">
            <h4><i class="fas fa-exclamation-triangle text-danger"></i> Erro no Dimensionamento</h4>
            <p>${mensagem}</p>
        </div>
    `;
}
// Dados da análise carregados do localStorage
let dadosAnalise = null;
let pontoSelecionado = null;

// Fatores de conversão
const fatoresConversao = {
    dimensao: {
        mm: 1,
        in: 25.4
    },
    tensao: {
        MPa: 1,
        KPSI: 6.89476
    },
    torque: {
        'Nm': 1,
        'lb-in': 0.112985
    }
};

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    carregarDadosAnalise();
    inicializarEventos();
    atualizarUnidades();
});

function carregarDadosAnalise() {
    try {
        const dadosSalvos = localStorage.getItem('analise_avancada_results');
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            if (dados.analiseAvancada) {
                dadosAnalise = dados.analiseAvancada;
                pontoSelecionado = dadosAnalise.pontoSelecionado;
                exibirInformacoesPonto();
                preencherDadosIniciais();
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados da análise:', error);
        mostrarErro('Erro ao carregar dados do ponto selecionado.');
    }
}

function exibirInformacoesPonto() {
    const container = document.getElementById('infoPontoSelecionado');
    if (!pontoSelecionado || !container) return;

    container.innerHTML = `
        <div class="info-item">
            <strong>Tipo:</strong> ${formatarTipo(pontoSelecionado.tipo)}
        </div>
        <div class="info-item">
            <strong>Posição:</strong> ${pontoSelecionado.posicao} mm
        </div>
        <div class="info-item">
            <strong>Diâmetro Menor:</strong> Ø${pontoSelecionado.diametro_menor} mm
        </div>
        <div class="info-item">
            <strong>Diâmetro Maior:</strong> Ø${pontoSelecionado.diametro_maior} mm
        </div>
        <div class="info-item">
            <strong>Raio:</strong> ${pontoSelecionado.raio || 'Não informado'} mm
        </div>
        <div class="info-item">
            <strong>Momento Fletor:</strong> ${pontoSelecionado.momentoFletor.toFixed(2)} Nm
        </div>
        <div class="info-item">
            <strong>Torque:</strong> ${pontoSelecionado.torque.toFixed(0)} Nm
        </div>
    `;
}

function formatarTipo(tipo) {
    const tipos = {
        'mancal': '⚙️ Mancal',
        'carga': '📌 Carga',
        'mudanca': '📐 Mudança de Diâmetro'
    };
    return tipos[tipo] || tipo;
}

function inicializarEventos() {
    // Eventos de mudança de unidades
    document.getElementById('unidadeDimensao').addEventListener('change', atualizarUnidades);
    document.getElementById('unidadeTensao').addEventListener('change', atualizarUnidades);
    document.getElementById('unidadeTorque').addEventListener('change', atualizarUnidades);
    
    // Evento para mostrar/ocultar ciclos
    document.getElementById('vidaUtil').addEventListener('change', function() {
        document.getElementById('ciclosGroup').style.display = 
            this.value === 'finita' ? 'block' : 'none';
    });

    // NOVO: Evento para mostrar/ocultar Configurações Adicionais
    const toggle = document.getElementById('toggleConfiguracoesAdicionais');
    const conteudo = document.getElementById('conteudoConfiguracoesAdicionais');
    
    // Inicia a seção de Configurações Adicionais oculta
    // Usamos a classe CSS para a transição suave
    // O conteúdo já está oculto no CSS com max-height: 0;

    toggle.addEventListener('click', function() {
        // Alterna a classe 'aberto'
        conteudo.classList.toggle('aberto');

        // Se o conteúdo estiver aberto, o ícone já é rotacionado pelo CSS.
        // Se precisar de fallback (sem CSS de transição):
        /*
        const icone = document.getElementById('iconeConfiguracoesAdicionais');
        if (conteudo.classList.contains('aberto')) {
            icone.textContent = '▲'; 
        } else {
            icone.textContent = '▼';
        }
        */
    });
}

function atualizarUnidades() {
    const unidadeDimensao = document.getElementById('unidadeDimensao').value;
    const unidadeTensao = document.getElementById('unidadeTensao').value;
    const unidadeTorque = document.getElementById('unidadeTorque').value;

    // Atualizar labels de unidades
    document.getElementById('unidadeD').textContent = unidadeDimensao;
    document.getElementById('unidaded').textContent = unidadeDimensao;
    document.getElementById('unidadeRaio').textContent = unidadeDimensao;
    document.getElementById('unidadeSut').textContent = unidadeTensao;
    document.getElementById('unidadeSy').textContent = unidadeTensao;
    document.getElementById('unidadeTorqueInput').textContent = unidadeTorque;
    document.getElementById('unidadeMomento').textContent = unidadeTorque;
}

function preencherDadosIniciais() {
    if (!pontoSelecionado) return;

    // Preencher dados geométricos
    if (pontoSelecionado.diametro_maior > 0) {
        document.getElementById('diametroMaior').value = pontoSelecionado.diametro_maior;
    }
    if (pontoSelecionado.diametro_menor > 0) {
        document.getElementById('diametroMenor').value = pontoSelecionado.diametro_menor;
    }
    if (pontoSelecionado.raio > 0) {
        document.getElementById('raio').value = pontoSelecionado.raio;
    }

    // Preencher carregamentos
    if (pontoSelecionado.torque > 0) {
        document.getElementById('torque').value = pontoSelecionado.torque;
    }
    if (pontoSelecionado.momentoFletor > 0) {
        document.getElementById('momento').value = pontoSelecionado.momentoFletor.toFixed(2);
    }
}

function coletarDadosFormulario() {
    const unidadeDimensao = document.getElementById('unidadeDimensao').value;
    const unidadeTensao = document.getElementById('unidadeTensao').value;
    const unidadeTorque = document.getElementById('unidadeTorque').value;

    return {
        dadosFormulario: {
            geometricos: {
                D: getValorNumerico('diametroMaior'),
                d: getValorNumerico('diametroMenor'),
                r: getValorNumerico('raio'),
                unidade: unidadeDimensao
            },
            material: {
                Sut: getValorNumerico('sut'),
                Sy: getValorNumerico('sy'),
                acabamento: document.getElementById('acabamento').value,
                unidade: unidadeTensao
            },
            carregamentos: {
                torque: getValorNumerico('torque'),
                momento: getValorNumerico('momento'),
                unidade: unidadeTorque
            },
            vidaUtil: {
                tipo: document.getElementById('vidaUtil').value,
                ciclos: document.getElementById('vidaUtil').value === 'finita' ? 
                       getValorNumerico('ciclos') : null
            },
            // NOVOS CAMPOS
            confiabilidade: parseFloat(document.getElementById('confiabilidade').value) || 50,
            temperatura: parseFloat(document.getElementById('temperatura').value) || 20,
            tipoCarga: document.getElementById('tipoCarga').value,
            tipoMaterial: 'aco' // Padrão para aço, pode ser ajustado se necessário
        },
        analiseAvancada: dadosAnalise
    };
}

function getValorNumerico(id) {
    const valor = document.getElementById(id).value;
    return valor === '' ? null : parseFloat(valor);
}

function validarDados(dados) {
    const camposObrigatorios = [];
    
    // Verificar se há dados suficientes para cálculo
    const dadosGeometricos = Object.values(dados.dadosFormulario.geometricos).filter(v => v !== null && typeof v === 'number');
    const dadosMaterial = Object.values(dados.dadosFormulario.material).filter(v => v !== null && typeof v === 'number' || v !== '');
    const dadosCarregamento = Object.values(dados.dadosFormulario.carregamentos).filter(v => v !== null && typeof v === 'number');
    
    if (dadosGeometricos.length === 0) {
        camposObrigatorios.push('pelo menos uma dimensão geométrica');
    }
    
    if (dadosMaterial.length < 2) { // Pelo menos Sut/Sy e acabamento
        camposObrigatorios.push('propriedades do material');
    }
    
    if (dadosCarregamento.length === 0) {
        camposObrigatorios.push('pelo menos um carregamento');
    }
    
    return camposObrigatorios;
}

function calcularAnaliseAvancada() {
    const dados = coletarDadosFormulario();
    const camposFaltantes = validarDados(dados);
    
    if (camposFaltantes.length > 0) {
        alert(`⚠️ Preencha ${camposFaltantes.join(' e ')} para realizar o cálculo.`);
        return;
    }
    
    // Salvar dados no localStorage e redirecionar para resultado.html
    try {
        localStorage.setItem('analise_avancada_results', JSON.stringify(dados));
        window.location.href = 'resultado.html';
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        mostrarErro('Erro ao salvar dados para análise.');
    }
}

    function limparFormulario() {
        console.log('Iniciando limpeza completa...');
        
        // 1. Salvar apenas os dados do formulário atual (se existirem)
        const dadosAtuais = coletarDadosFormulario();
        const dadosParaSalvar = {
            dadosFormulario: dadosAtuais.dadosFormulario,
            // Não salvar dados do desenho
            dadosReferencia: {
                pontoSelecionado: null,
                analiseAvancada: null
            }
        };
        
        // 2. Limpar os campos do formulário
        document.getElementById('formAnaliseAvancada').reset();
        document.getElementById('ciclosGroup').style.display = 'none';
        document.getElementById('acabamento').value = 'retificado';
        document.getElementById('confiabilidade').value = '50';
        document.getElementById('temperatura').value = '20';
        document.getElementById('tipoCarga').value = 'flexao';
        
        // 3. LIMPAR COMPLETAMENTE os dados do desenho
        pontoSelecionado = null;
        dadosAnalise = null;
        
        // 4. Salvar apenas dados do formulário (sem dados do desenho)
        localStorage.setItem('analise_avancada_results', JSON.stringify(dadosParaSalvar));
        
        // 5. Limpar a exibição das informações do ponto
        const container = document.getElementById('infoPontoSelecionado');
        if (container) {
            container.innerHTML = '<p style="color: #666;">⚠️ Nenhum desenho carregado - digite os valores manualmente</p>';
        }
        
        console.log('Limpeza completa realizada - dados do desenho removidos');
    }
function voltarParaResultados() {
    window.location.href = 'resultados.html';
}

function mostrarErro(mensagem) {
    alert('❌ ' + mensagem);
}
function realizarDimensionamento() {
    // Coletar dados do formulário atual
    const dados = coletarDadosFormulario();
    const camposFaltantes = validarDados(dados);
    
    if (camposFaltantes.length > 0) {
        alert(`⚠️ Preencha ${camposFaltantes.join(' e ')} para realizar o dimensionamento.`);
        return;
    }
    
    try {
        // Salvar dados para uso na página de dimensionamento
        localStorage.setItem('analise_avancada_results', JSON.stringify(dados));
        
        // Redirecionar para a página de dimensionamento
        window.location.href = 'dimensionamento.html';
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        mostrarErro('Erro ao salvar dados para dimensionamento.');
    }
}
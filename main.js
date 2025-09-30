// Dados globais que serão compartilhados entre as páginas
let dadosEixo = {
    desenhoFeito: false,
    geometria: null,
    dadosCalculo: null
};

// Função para carregar dados do localStorage
function carregarDados() {
    const dadosSalvos = localStorage.getItem('dadosEixo');
    if (dadosSalvos) {
        dadosEixo = JSON.parse(dadosSalvos);
    }
    return dadosEixo;
}

// Função para salvar dados no localStorage
function salvarDados(novosDados) {
    // Primeiro carrega os dados atuais
    const dadosAtuais = carregarDados();
    // Depois mescla com os novos dados
    dadosEixo = { ...dadosAtuais, ...novosDados };
    localStorage.setItem('dadosEixo', JSON.stringify(dadosEixo));
    return dadosEixo;
}

// Função para limpar dados (útil para nova análise)
function limparDados() {
    dadosEixo = {
        desenhoFeito: false,
        geometria: null,
        dadosCalculo: null
    };
    localStorage.removeItem('dadosEixo');
    localStorage.removeItem('modoAnalise');
}

// --- FUNÇÕES DE NAVEGAÇÃO ---

function iniciarAnaliseDesenho() {
    // Salva no localStorage que vamos começar pelo desenho
    localStorage.setItem('modoAnalise', 'desenho');
    salvarDados({}); // Inicializa dados vazios
    window.location.href = 'eixo.html';
}

function iniciarAnaliseDados() {
    // Salva no localStorage que vamos começar pelos dados
    localStorage.setItem('modoAnalise', 'dados');
    salvarDados({}); // Inicializa dados vazios
    window.location.href = 'analise.html';
}

function continuarParaCalculos() {
    try {
        // Verifica se o desenhador existe e é válido
        if (!window.desenhadorEixo || !window.desenhadorEixo.validarParaCalculo) {
            throw new Error('Sistema de desenho não carregado corretamente');
        }
        
        window.desenhadorEixo.validarParaCalculo();
        
        // Captura os dados do desenho
        const dadosDesenho = {
            desenhoFeito: true,
            geometria: window.desenhadorEixo.obterDadosParaCalculo(),
            timestamp: new Date().toISOString()
        };
        
        console.log('Salvando dados do eixo:', dadosDesenho);
        
        // Salva os dados
        salvarDados(dadosDesenho);
        
        // Redireciona para análise
        window.location.href = 'analise-eixo.html';
    } catch (error) {
        alert('Erro: ' + error.message);
        console.error('Erro ao continuar para cálculos:', error);
    }
}

function voltarParaMenu() {
    window.location.href = 'index.html';
}

function voltarParaDesenho() {
    window.location.href = 'eixo.html';
}

// --- INICIALIZAÇÃO GLOBAL ---

// Tornar funções disponíveis globalmente
if (typeof window !== 'undefined') {
    window.carregarDados = carregarDados;
    window.salvarDados = salvarDados;
    window.limparDados = limparDados;
    window.iniciarAnaliseDesenho = iniciarAnaliseDesenho;
    window.iniciarAnaliseDados = iniciarAnaliseDados;
    window.continuarParaCalculos = continuarParaCalculos;
    window.voltarParaMenu = voltarParaMenu;
    window.voltarParaDesenho = voltarParaDesenho;
}

// Carregar dados ao inicializar
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js carregado - Dados atuais:', carregarDados());
});
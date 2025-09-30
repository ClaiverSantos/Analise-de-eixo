/**
 * main.js - Funções Globais de Persistência e Integração
 *
 * Objetivo: Gerenciar o salvamento e carregamento dos dados do eixo (geometria)
 * no LocalStorage para que sejam compartilhados entre eixo.html e analise.html.
 */

// --- CONFIGURAÇÃO DE CHAVE ---
// Esta é a chave padronizada que a página de análise espera para carregar o eixo.
const CHAVE_EIXO = 'dados_eixo'; 

// Dados globais (apenas para referência em memória, a fonte primária é o LocalStorage)
let dadosEixo = {
    desenhoFeito: false,
    geometria: null,
    dadosCalculo: null
};

// --- FUNÇÕES DE PERSISTÊNCIA ---

/**
 * Carrega o objeto de dados do eixo do LocalStorage.
 * NOTA: Também trata de chaves que podem ser usadas para análise avançada.
 */
function carregarDados() {
    const dadosSalvos = localStorage.getItem(CHAVE_EIXO); 
    
    if (dadosSalvos) {
        try {
            const parsed = JSON.parse(dadosSalvos);
            
            // Verifica se o JSON é o resultado da análise avançada (chave secundária)
            if (parsed && parsed.analiseAvancada && parsed.analiseAvancada.dadosEixo) {
                // Se for resultado, retorna apenas os dados do eixo contidos nele.
                dadosEixo = parsed.analiseAvancada.dadosEixo;
            } else {
                // Se for a estrutura normal de desenho (a que você espera)
                dadosEixo = parsed;
            }
        } catch (e) {
            console.error("Erro ao fazer parse dos dados carregados:", e);
            // Retorna o objeto base em caso de falha no parsing
            return { desenhoFeito: false, geometria: null };
        }
    }
    return dadosEixo;
}

/**
 * Salva um objeto de dados no LocalStorage sob a chave 'dados_eixo'.
 * @param {object} novosDados - Os dados a serem mesclados e salvos (ex: {desenhoFeito: true, geometria: {...}}).
 */
function salvarDados(novosDados) {
    // Primeiro carrega e depois mescla com os novos dados
    const dadosAtuais = carregarDados(); 
    dadosEixo = { ...dadosAtuais, ...novosDados };
    
    // **CHAVE CORRIGIDA:** Garante que estamos salvando com 'dados_eixo'
    localStorage.setItem(CHAVE_EIXO, JSON.stringify(dadosEixo)); 
    return dadosEixo;
}

/**
 * Função para limpar todos os dados persistidos relacionados ao eixo.
 */
function limparDados() {
    dadosEixo = {
        desenhoFeito: false,
        geometria: null,
        dadosCalculo: null
    };
    // Limpa todas as chaves importantes
    localStorage.removeItem(CHAVE_EIXO);
    localStorage.removeItem('modoAnalise');
    localStorage.removeItem('analise_avancada_results');
}

// --- FUNÇÕES DE NAVEGAÇÃO E INTEGRAÇÃO ---

function iniciarAnaliseDesenho() {
    localStorage.setItem('modoAnalise', 'desenho');
    salvarDados({}); // Inicializa dados vazios
    window.location.href = 'eixo.html';
}

function iniciarAnaliseDados() {
    localStorage.setItem('modoAnalise', 'dados');
    salvarDados({}); // Inicializa dados vazios
    window.location.href = 'analise.html';
}

/**
 * Função chamada pelo botão "Continuar para Análise" na página de desenho.
 * Realiza a validação, obtém os dados e salva ANTES de redirecionar.
 */
window.continuarParaCalculos = function() {
    try {
        // 1. Verifica se o desenhador da página eixo.html está carregado
        if (!window.desenhadorEixo || !window.desenhadorEixo.validarParaCalculo) {
            throw new Error('Sistema de desenho não carregado corretamente.');
        }
        
        // 2. Valida o desenho (verifica mancais, comprimento, etc.)
        window.desenhadorEixo.validarParaCalculo();
        
        // 3. Obtém a estrutura de dados para cálculo
        const dadosGeometria = window.desenhadorEixo.obterDadosParaCalculo();
        
        const dadosDesenho = {
            desenhoFeito: true,
            geometria: dadosGeometria,
            timestamp: new Date().toISOString()
        };
        
        console.log('Salvando dados do eixo para análise:', dadosDesenho);
        
        // 4. Salva os dados na chave correta (via função global)
        salvarDados(dadosDesenho);
        
        // 5. Redireciona
        window.location.href = 'analise-eixo.html';
    } catch (error) {
        alert('Erro ao continuar: ' + error.message);
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

// Torna as funções essenciais disponíveis globalmente
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

// Carregar dados ao inicializar (apenas para log e preenchimento inicial da variável dadosEixo)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js carregado - Chave de persistência:', CHAVE_EIXO);
    carregarDados();
});
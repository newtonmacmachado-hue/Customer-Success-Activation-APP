import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Account, Meeting, SuccessPlan, Opportunity } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatBotProps {
  data: {
    accounts: Account[];
    meetings: Meeting[];
    successPlans: SuccessPlan[];
    opportunities: Opportunity[];
  };
}

const ChatBot: React.FC<ChatBotProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou o assistente de IA da sua plataforma de Customer Success. Posso analisar suas contas, sugerir ações ou resumir dados. Como posso ajudar?', timestamp: new Date() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ai = useMemo(() => {
    if (process.env.GEMINI_API_KEY) {
      return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return null;
  }, []);

  // --- BLINDAGEM DO CONTEXTO DA IA ---
  const chat = useMemo(() => {
    if (ai) {
      // Proteção total contra listas nulas ou indefinidas vindo do banco
      const safeAccounts = data?.accounts || [];
      const safeMeetings = data?.meetings || [];
      const safeOpportunities = data?.opportunities || [];

      const dataContext = JSON.stringify({
        accounts: safeAccounts.map(a => {
          const mainProduct = (a.products && a.products.length > 0) ? a.products[0] : null;
          const pendingActs = (a.activities || []).filter(act => act.status === 'Pending');
          
          return {
            name: a.name || 'Conta sem nome',
            segment: a.segment || 'Geral',
            healthScore: mainProduct ? (mainProduct.healthScore || 0) : 'N/A',
            mrr: mainProduct ? (mainProduct.mrr || 0) : 0,
            pendingActivities: pendingActs.map(act => act.title || 'Tarefa sem título')
          };
        }),
        recentMeetings: safeMeetings.slice(0, 5).map(m => ({
          account: m.accountName || 'Desconhecida',
          date: m.date || 'Sem data',
          summary: m.summary || 'Sem resumo'
        })),
        pipeline: safeOpportunities.map(o => ({
          title: o.title || 'Oportunidade',
          value: Number(o.value) || 0,
          probability: Number(o.probability) || 0
        }))
      });

      const systemInstruction = `
        Você é um analista sênior de Customer Success AI integrado a uma plataforma de gestão (CS Platform).
        
        Abaixo estão os DADOS REAIS da carteira atual em formato JSON. Use-os para responder às perguntas do usuário.
        DADOS: ${dataContext}
        
        Diretrizes:
        1. Responda de forma concisa e direta, focada em negócios.
        2. Se perguntarem sobre contas em risco, verifique o Health Score (menor que 70 é risco).
        3. Se perguntarem sobre oportunidades, olhe o pipeline.
        4. Sempre cite valores monetários em R$ quando relevante.
        5. Seja proativo: se vir uma conta com saúde baixa, sugira um Playbook de Risco.
        6. Formate a resposta usando Markdown simples (negrito, listas) para melhor leitura.
        7. Caso não existam dados no JSON fornecido, informe que a base está vazia e convide o usuário a cadastrar a primeira conta.
      `;

      return ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4,
        }
      });
    }
    return null;
  }, [ai, data]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (!chat) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "A IA não pôde ser inicializada. Verifique se a chave API do Gemini está configurada e se os dados da plataforma carregaram corretamente.", 
        timestamp: new Date() 
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const streamResponse = await chat.sendMessageStream({ message: userMessage.text });
      
      let fullText = '';
      let isFirstChunk = true;

      for await (const chunk of streamResponse) {
        fullText += chunk.text;
        
        if (isFirstChunk) {
          setMessages(prev => [...prev, { role: 'model', text: fullText, timestamp: new Date() }]);
          isFirstChunk = false;
        } else {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { 
              ...newMessages[newMessages.length - 1], 
              text: fullText 
            };
            return newMessages;
          });
        }
        scrollToBottom();
      }

    } catch (error) {
      console.error("Erro no ChatBot:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Ocorreu um erro ao conectar com a IA. Por favor, tente novamente em instantes.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[150] p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        )}
      </button>

      {/* Janela do Chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[90vw] h-[600px] max-h-[70vh] bg-white rounded-3xl shadow-2xl border border-slate-200 z-[150] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-slate-900 p-6 flex items-center space-x-4">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
             </div>
             <div>
                <h3 className="text-white font-black text-lg">AI Assistant</h3>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Powered by Gemini 3.1 Pro</p>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
             {messages.map((msg, idx) => (
               <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                  }`}>
                    {msg.role === 'model' ? (
                       <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                    ) : (
                       msg.text
                    )}
                    <span className={`text-[9px] font-bold block mt-2 opacity-60 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
               </div>
             ))}
             {isLoading && (
               <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center space-x-2">
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                  </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
             <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Pergunte sobre suas contas..."
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-5 pr-12 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
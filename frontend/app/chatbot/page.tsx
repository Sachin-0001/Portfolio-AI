'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ type: string; metadata: any }>;
  structuredData?: {
    type: 'projects' | 'skills' | 'achievements' | 'experience' | 'socials' | 'resume';
    data: any;
  };
  isTyping?: boolean;
  displayedContent?: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [showInitialMessage, setShowInitialMessage] = useState(true);
  const [isWakingBackend, setIsWakingBackend] = useState(false);
  const [isFirstRequest, setIsFirstRequest] = useState(true);
  const [floatingFacts, setFloatingFacts] = useState<Array<{id: number; fact: string; left: string; top: string; delay: number}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialMessage = "What do you wish to learn about me today?";
  
  const techFacts = [
    "The first computer bug was an actual moth trapped in a Harvard Mark II computer in 1947.",
    "Python was named after the comedy group Monty Python, not the snake.",
    "The first 1GB hard drive was released in 1980 and weighed over 500 pounds.",
    "JavaScript was created in just 10 days by Brendan Eich in 1995.",
    "The first domain name ever registered was Symbolics.com on March 15, 1985.",
    "There are over 700 programming languages in use today.",
    "The term 'debugging' came from removing actual insects from early computers.",
    "Google processes over 8.5 billion searches per day.",
    "The average developer writes about 50-100 lines of code per day.",
    "Git was created by Linus Torvalds in just two weeks.",
    "The '@' symbol in email addresses was chosen in 1971 by Ray Tomlinson.",
    "React was developed by Facebook and released to the public in 2013.",
    "Docker containers share the host OS kernel, making them more efficient than VMs.",
    "TypeScript is a superset of JavaScript that adds static typing.",
    "The term 'cloud computing' was first used in 1996.",
  ];

  // Generate floating facts when backend is waking up
  useEffect(() => {
    if (isWakingBackend) {
      // Create initial floating facts
      const facts = techFacts.map((fact, index) => ({
        id: index,
        fact,
        left: `${Math.random() * 80 + 10}%`,
        top: `${Math.random() * 80 + 10}%`,
        delay: index * 0.8,
      }));
      setFloatingFacts(facts);
    } else {
      setFloatingFacts([]);
    }
  }, [isWakingBackend]);

  // Typing animation for initial message
  useEffect(() => {
    if (showInitialMessage && displayedText.length < initialMessage.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(initialMessage.slice(0, displayedText.length + 1));
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, showInitialMessage]);

  // Typing animation for assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isTyping) {
      const currentLength = lastMessage.displayedContent?.length || 0;
      const fullContent = lastMessage.content;
      
      if (currentLength < fullContent.length) {
        const timeout = setTimeout(() => {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.isTyping) {
              lastMsg.displayedContent = fullContent.slice(0, currentLength + 1);
            }
            return newMessages;
          });
        }, 5); // Adjust speed here (lower = faster)
        return () => clearTimeout(timeout);
      } else {
        // Typing complete
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.isTyping) {
            lastMsg.isTyping = false;
            lastMsg.displayedContent = fullContent;
          }
          return newMessages;
        });
      }
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    setShowInitialMessage(false);
    const userMessage = input.trim();
    
    // Check for special commands
    if (userMessage.toLowerCase() === '/about') {
      window.open('/about', '_blank');
      setInput('');
      return;
    }
    
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    // Show backend waking loader only for first request
    if (isFirstRequest) {
      setIsWakingBackend(true);
    }

    try {
      // Call the backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      setIsWakingBackend(false); // Hide loader once response is received
      setIsFirstRequest(false); // Mark that first request is complete

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response with typing animation
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        sources: data.sources,
        structuredData: data.structured_data,
        isTyping: true,
        displayedContent: '',
      }]);
    } catch (error) {
      setIsWakingBackend(false); // Hide loader on error
      setIsFirstRequest(false);
      console.error('Error calling API:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-zinc-950 to-rose-950 relative overflow-hidden" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Backend Waking Loader with Floating Tech Facts */}
      {isWakingBackend && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900/95 via-zinc-950/95 to-rose-950/95 backdrop-blur-sm">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>

          {/* Floating tech facts as bubbles */}
          {floatingFacts.map((item) => (
            <div
              key={item.id}
              className="absolute animate-float-bubble"
              style={{
                left: item.left,
                top: item.top,
                animationDelay: `${item.delay}s`,
              }}
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/30 to-orange-500/30 rounded-2xl blur-xl"></div>
                <div className="relative backdrop-blur-xl bg-slate-800/60 border border-rose-500/40 rounded-2xl p-4 shadow-2xl max-w-xs">
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-sm">
                      💡
                    </div>
                    <p className="text-gray-100 text-sm leading-relaxed">
                      {item.fact}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Central loading indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-full blur-2xl opacity-60 animate-pulse"></div>
              <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-rose-600 flex items-center justify-center shadow-2xl">
                <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-rose-400 via-orange-400 to-rose-500 bg-clip-text text-transparent">
                Waking up the backend...
              </h2>
              <p className="text-gray-400 text-sm">
                This may take up to 60 seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header with glassmorphism */}
      <div className="relative border-b border-rose-500/20 backdrop-blur-xl bg-black/30">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-orange-500/5"></div>
        <div className="relative max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl blur-md group-hover:blur-lg transition-all opacity-60"></div>
              {/* <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-105 transition-transform">
                💬
              </div> */}
            </div>
            <div>
              <h1 className="text-white font-bold text-xl bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                S.A.C.H.I.N
              </h1>
              <p className="text-xs text-gray-400 font-medium">Smart Assistant for Career History & Information</p>
            </div>
          </div>
          <a
            href="/"
            className="group relative px-5 py-2.5 rounded-xl overflow-hidden transition-all hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 border border-rose-500/30 rounded-xl group-hover:border-rose-400/50 transition-colors"></div>
            <span className="relative text-gray-300 group-hover:text-white transition-colors font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </span>
          </a>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Initial Message with enhanced animation */}
          {showInitialMessage && messages.length === 0 && (
            <div className="flex justify-center items-center min-h-[65vh]">
              <div className="text-center space-y-8 animate-fade-in">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                  {/* <div className="relative w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-rose-600 flex items-center justify-center text-5xl shadow-2xl transform hover:scale-110 transition-transform">
                    💬
                  </div> */}
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-semibold bg-gradient-to-r from-rose-400 via-orange-400 to-rose-500 bg-clip-text text-transparent leading-tight">
                    {displayedText}
                    <span className="animate-pulse text-rose-400">|</span>
                  </h2>
                  <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed">
                    Ask me about skills, projects, experience, achievements, or anything else you'd like to know!
                  </p>
                  
                  {/* Suggested prompts */}
                  <div className="flex flex-wrap justify-center gap-3 pt-6">
                    {['Show me your projects', 'What are your skills?', 'Tell me about your experience'].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(prompt)}
                        className="group relative px-4 py-2 rounded-xl overflow-hidden transition-all hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-orange-500/10 group-hover:from-rose-500/20 group-hover:to-orange-500/20 transition-all"></div>
                        <div className="absolute inset-0 border border-rose-500/20 rounded-xl group-hover:border-rose-400/40 transition-colors"></div>
                        <span className="relative text-sm text-gray-400 group-hover:text-rose-300 transition-colors">
                          {prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((message, index) => (
            <div key={index} className="mb-8 animate-slide-up">
              {message.role === 'user' ? (
                // User message in a bubble on the right
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-3xl px-6 py-4 bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25">
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ) : (
                // Assistant message in free space on the left
                <div className="space-y-4">
                  <div className="prose text-lg prose-invert prose-xl max-w-none prose-headings:text-rose-300 prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-5xl prose-h1:mb-6 prose-h1:mt-8 prose-h2:text-4xl prose-h2:mb-5 prose-h2:mt-7 prose-h3:text-3xl prose-h3:mb-4 prose-h3:mt-6 prose-p:text-gray-100 prose-p:leading-loose prose-p:mb-5 prose-p:text-xl prose-strong:text-white prose-strong:font-bold prose-strong:text-2xl prose-em:text-gray-300 prose-em:italic prose-ul:text-gray-100 prose-ul:my-5 prose-ul:space-y-3 prose-ol:text-gray-100 prose-ol:my-5 prose-ol:space-y-3 prose-li:text-gray-100 prose-li:leading-loose prose-li:text-xl prose-code:text-rose-300 prose-code:bg-slate-800/50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-lg prose-code:font-normal prose-pre:bg-slate-800/50 prose-pre:border prose-pre:border-rose-500/20 prose-pre:rounded-xl prose-pre:p-4 prose-blockquote:border-l-4 prose-blockquote:border-rose-400 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-300 prose-blockquote:my-6 prose-blockquote:text-xl prose-a:text-rose-400 prose-a:no-underline prose-a:font-medium hover:prose-a:text-rose-300 prose-a:transition-colors prose-hr:border-rose-500/20 prose-hr:my-8" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.displayedContent || message.content}
                    </ReactMarkdown>
                    {message.isTyping && (
                      <span className="inline-block w-1 h-5 bg-rose-400 animate-pulse ml-1"></span>
                    )}
                  </div>
                  
                  {/* Render structured data */}
                  {message.structuredData && !message.isTyping && (
                    <div className="mt-6 space-y-3">
                      {message.structuredData.type === 'projects' && (
                        <div className="grid gap-4">
                          {message.structuredData.data.map((project: any) => (
                            <div key={project.id} className="group relative rounded-2xl overflow-hidden backdrop-blur-sm bg-slate-800/30 border border-rose-500/20 hover:border-rose-400/40 transition-all p-5 hover:shadow-lg hover:shadow-rose-500/10">
                              <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-rose-300 transition-colors">
                                {project.name}
                              </h3>
                              <p className="text-gray-300 text-sm mb-3 leading-relaxed">{project.description}</p>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {project.tags.map((tag: string, idx: number) => (
                                  <span key={idx} className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              {project.link && (
                                <a href={project.link} target="_blank" rel="noopener noreferrer" 
                                   className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-sm font-medium transition-colors">
                                  View Project
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {message.structuredData.type === 'skills' && (
                        <div className="flex flex-wrap gap-2">
                          {message.structuredData.data.map((skill: string, idx: number) => (
                            <span key={idx} className="px-4 py-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 text-rose-200 font-medium text-sm hover:scale-105 transition-transform">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {message.structuredData.type === 'achievements' && (
                        <div className="grid gap-3">
                          {message.structuredData.data.map((achievement: any, idx: number) => (
                            <div key={idx} className="rounded-2xl backdrop-blur-sm bg-slate-800/30 border border-rose-500/20 p-4">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">🏆</span>
                                <div className="flex-1">
                                  <h3 className="text-white font-semibold text-base mb-1">{achievement.title}</h3>
                                  <p className="text-gray-300 text-sm mb-2 leading-relaxed">{achievement.description}</p>
                                  <span className="text-rose-400 text-xs font-medium">{achievement.date}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {message.structuredData.type === 'experience' && (
                        <div className="grid gap-3">
                          {message.structuredData.data.map((exp: any, idx: number) => (
                            <div key={idx} className="rounded-2xl backdrop-blur-sm bg-slate-800/30 border border-rose-500/20 p-5">
                              <h3 className="text-white font-semibold text-lg mb-1">{exp.role}</h3>
                              <p className="text-rose-400 font-medium text-sm mb-2">{exp.company}</p>
                              <p className="text-gray-400 text-xs mb-3">{exp.start_date} - {exp.end_date || 'Present'}</p>
                              <p className="text-gray-300 text-sm leading-relaxed">{exp.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {message.structuredData.type === 'socials' && (
                        <div className="grid gap-2">
                          {message.structuredData.data.map((social: any, idx: number) => (
                            <a key={idx} href={social.link} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-3 rounded-xl backdrop-blur-sm bg-slate-800/30 border border-rose-500/20 hover:border-rose-400/40 p-4 transition-all hover:scale-[1.02]">
                              <span className="text-xl">{social.icon || '🔗'}</span>
                              <div className="flex-1">
                                <p className="text-white font-medium text-sm">{social.platform}</p>
                              </div>
                              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      )}
                      
                      {message.structuredData.type === 'resume' && (
                        <div className="group relative rounded-2xl overflow-hidden backdrop-blur-sm bg-slate-800/30 border border-rose-500/20 hover:border-rose-400/40 transition-all p-5 hover:shadow-lg hover:shadow-rose-500/10">
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg">
                                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-rose-300 transition-colors">
                                  My Professional Resume
                                </h3>
                                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                                  Download my complete resume to learn more about my professional background, technical skills, work experience, and achievements.
                                </p>
                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-4">
                                  <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">PDF Format</span>
                                  <span>•</span>
                                  <span>{message.structuredData.data.filename}</span>
                                </div>
                              </div>
                            </div>
                            <a 
                              href={message.structuredData.data.url} 
                              download={message.structuredData.data.filename}
                              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-medium hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-rose-500/50 hover:scale-[1.02]"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download Resume
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Enhanced Loading Indicator */}
          {isLoading && (
            <div className="mb-8 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-gray-400 text-sm">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced Input Area with glassmorphism */}
      <div className="relative border-t border-rose-500/20 backdrop-blur-xl bg-black/30">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-orange-500/5"></div>
        <div className="relative max-w-5xl mx-auto px-6 py-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <textarea
                ref={inputRef as any}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="w-full backdrop-blur-xl bg-slate-800/50 border border-rose-500/30 rounded-3xl px-7 py-5 pr-16 text-white placeholder-gray-400 focus:outline-none focus:border-rose-400/50 focus:bg-slate-800/70 transition-all shadow-lg resize-none min-h-[60px] max-h-[200px]"
                disabled={isLoading}
                rows={1}
                style={{ overflow: 'auto' }}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 group/btn"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl blur-md opacity-60 group-hover/btn:opacity-100 group-hover/btn:blur-lg transition-all"></div>
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform group-hover/btn:scale-105 transition-all">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
          <p className="text-sm text-center text-gray-500 mt-4 leading-relaxed">
            2026 Sachin Suresh© All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes float-bubble {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(-30px) translateX(20px) scale(1.05);
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) translateX(-10px) scale(0.95);
            opacity: 0;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-float-bubble {
          animation: float-bubble 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
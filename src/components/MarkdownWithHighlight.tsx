'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface MarkdownWithHighlightProps {
  content: string;
  className?: string;
}

export function MarkdownWithHighlight({ content, className = '' }: MarkdownWithHighlightProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: 'Code copied',
        description: 'Code block copied to clipboard',
        variant: 'default',
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy code to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeContent = String(children).replace(/\n$/, '');

            if (!inline && match) {
              return (
                <div className="relative group">
                  <button
                    onClick={() => handleCopyCode(codeContent)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(255,107,107,0.2)] hover:bg-[rgba(255,107,107,0.4)] rounded p-1.5 text-white"
                    title="Copy code"
                  >
                    {copiedCode === codeContent ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{ borderRadius: '0.5rem', marginTop: '0.5rem' }}
                    showLineNumbers={codeContent.split('\n').length > 5}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return <code className={className} {...props}>{children}</code>;
          },
          pre({ children }: any) {
            return <>{children}</>;
          },
          h1({ children }: any) {
            return <h1 className="text-2xl font-bold text-[#FFFFFF] mt-6 mb-4">{children}</h1>;
          },
          h2({ children }: any) {
            return <h2 className="text-xl font-semibold text-[#FFFFFF] mt-5 mb-3">{children}</h2>;
          },
          h3({ children }: any) {
            return <h3 className="text-lg font-medium text-[#FFFFFF] mt-4 mb-2">{children}</h3>;
          },
          p({ children }: any) {
            return <p className="text-[rgba(255,255,255,0.85)] mb-4 leading-relaxed">{children}</p>;
          },
          ul({ children }: any) {
            return <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">{children}</ul>;
          },
          ol({ children }: any) {
            return <ol className="list-decimal list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">{children}</ol>;
          },
          li({ children }: any) {
            return <li className="ml-4">{children}</li>;
          },
          a({ children, href }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF6B6B] hover:underline transition-colors"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-4 border-[rgba(255,107,107,0.5)] pl-4 italic text-[rgba(255,255,255,0.7)] my-4">
                {children}
              </blockquote>
            );
          },
          strong({ children }: any) {
            return <strong className="font-semibold text-[#FFFFFF]">{children}</strong>;
          },
          em({ children }: any) {
            return <em className="italic text-[rgba(255,255,255,0.9)]">{children}</em>;
          },
          hr() {
            return <hr className="border-[rgba(255,255,255,0.1)] my-6" />;
          },
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }: any) {
            return <thead className="bg-[rgba(255,255,255,0.05)]">{children}</thead>;
          },
          tbody({ children }: any) {
            return <tbody className="divide-y divide-[rgba(255,255,255,0.1)]">{children}</tbody>;
          },
          tr({ children }: any) {
            return <tr className="hover:bg-[rgba(255,255,255,0.02)]">{children}</tr>;
          },
          th({ children }: any) {
            return <th className="px-4 py-2 text-left text-sm font-semibold text-[#FFFFFF] border-b border-[rgba(255,255,255,0.1)]">
              {children}
            </th>;
          },
          td({ children }: any) {
            return <td className="px-4 py-2 text-sm text-[rgba(255,255,255,0.85)]">
              {children}
            </td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        .markdown-content :global(pre) {
          background: #161B22;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        .markdown-content :global(code) {
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
          font-size: 0.875rem;
        }
        .markdown-content :global(.token.comment),
        .markdown-content :global(.token.prolog),
        .markdown-content :global(.token.doctype),
        .markdown-content :global(.token.cdata) {
          color: #999;
        }
        .markdown-content :global(.token.punctuation) {
          color: #999;
        }
        .markdown-content :global(.token.namespace) {
          opacity: 0.7;
        }
        .markdown-content :global(.token.property),
        .markdown-content :global(.token.tag),
        .markdown-content :global(.token.boolean),
        .markdown-content :global(.token.number),
        .markdown-content :global(.token.constant),
        .markdown-content :global(.token.symbol),
        .markdown-content :global(.token.deleted) {
          color: #FF6B6B;
        }
        .markdown-content :global(.token.selector),
        .markdown-content :global(.token.attr-name),
        .markdown-content :global(.token.string),
        .markdown-content :global(.token.char),
        .markdown-content :global(.token.builtin),
        .markdown-content :global(.token.inserted) {
          color: #10B981;
        }
        .markdown-content :global(.token.operator),
        .markdown-content :global(.token.entity),
        .markdown-content :global(.token.url),
        .markdown-content :global(.token.variable) {
          color: #F59E0B;
        }
      `}</style>
    </div>
  );
}

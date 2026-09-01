import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';

const BLANK_LINE_MARKER = '\u200B';
const CONSECUTIVE_NEWLINES = /(\r?\n){2,}/g;

function preserveBlankLines(content: string) {
  return content.replace(CONSECUTIVE_NEWLINES, (newlines) => {
    const lineBreakCount = newlines.match(/\n/g)?.length ?? 0;
    const blankLineCount = lineBreakCount - 1;
    const blankLines = Array.from({ length: blankLineCount }, () => BLANK_LINE_MARKER).join('\n\n');

    return `\n\n${blankLines}\n\n`;
  });
}

const components: Components = {
  a: ({ children, href, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  p: ({ children }) =>
    children === BLANK_LINE_MARKER ? <div aria-hidden="true" className="deployment-blank-line" /> : <p>{children}</p>,
};

export default function DeploymentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
      {preserveBlankLines(content)}
    </ReactMarkdown>
  );
}

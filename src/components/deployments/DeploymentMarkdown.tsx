import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';

const components: Components = {
  a: ({ children, href, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};

export default function DeploymentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

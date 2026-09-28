// Re-mounts on every navigation → smooth page-enter animation.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fx-page">{children}</div>;
}

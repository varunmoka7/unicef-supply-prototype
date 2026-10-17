export default function PageHead({ title, lede, rules }: { title: string; lede?: string; rules?: string[] }): JSX.Element {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {lede && <p>{lede}</p>}
      {rules && rules.length > 0 && (
        <details className="rules">
          <summary>How to read this</summary>
          <ol>{rules.map((r, i) => <li key={i}>{r}</li>)}</ol>
        </details>
      )}
    </div>
  );
}
